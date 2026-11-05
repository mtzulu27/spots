import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('.menu-product-card').first().waitFor({timeout:30000});
  await page.waitForTimeout(1000);
  const result = await page.evaluate(() => {
    const clean = value => (value || '').replace(/\s+/g,' ').trim();
    const tabs = [...document.querySelectorAll('.q-tab')].map(x=>clean(x.innerText));
    const sections = [...document.querySelectorAll('[id^="category-"]')].filter(section=>section.querySelector('.menu-product-card') || clean(section.querySelector('.menu-category-description')?.textContent) || clean(section.querySelector('.menu-category-title')?.textContent)).map((section,index)=>({
      id:section.id, name:tabs[index], heading:clean(section.querySelector('.menu-category-title')?.textContent),
      note:clean(section.querySelector('.menu-category-description')?.textContent),
      products:[...section.querySelectorAll('.menu-product-card')].map(card=>({
        name:clean(card.querySelector('.menu-product-title')?.textContent),
        description:clean(card.querySelector('span.menu-product-description')?.textContent),
        status:[...card.querySelectorAll('[role="status"]')].map(x=>clean(x.textContent)),
        prices:[...card.querySelectorAll('.row.full-width.wrap.q-my-sm')].map(row=>({variant:clean(row.querySelector('.price-label')?.textContent),rawPrice:clean(row.querySelector('span.text-bold')?.textContent)})),
        text:card.innerText
      }))
    }));
    return {sourceUrl:location.href,checkedAt:new Date().toISOString(),tabs,sections,text:document.body.innerText};
  });
  if(result.tabs.length !== result.sections.length) throw new Error('Section count mismatch');
  fs.writeFileSync(process.argv[3], JSON.stringify(result, null, 2));
  await page.keyboard.press('Escape');
  const missing = result.sections.flatMap(s=>s.products.filter(x=>!x.prices.length || x.prices.some(p=>!p.rawPrice || p.rawPrice==='26')));
  result.priceDetails = [];
  for(const item of missing){
    await page.keyboard.press('Escape');
    await page.locator('.menu-product-title').filter({hasText:item.name}).first().click({timeout:5000}).catch(async()=>page.locator('.menu-product-title').filter({hasText:item.name}).first().dispatchEvent('click'));
    await page.waitForTimeout(500);
    result.priceDetails.push({name:item.name,text:await page.locator('body').innerText(),html:await page.locator('.q-dialog').last().innerHTML({timeout:1500}).catch(()=>null)});
    await page.keyboard.press('Escape');
  }
  fs.writeFileSync(process.argv[3], JSON.stringify(result, null, 2));
  console.log(JSON.stringify({sections:result.sections.map(x=>({name:x.name,id:x.id,products:x.products.length,note:x.note})),noPrice:result.sections.flatMap(s=>s.products.filter(x=>!x.prices.length)),cards:result.sections.reduce((n,s)=>n+s.products.length,0)}, null, 2));
} finally { await browser.close(); }
