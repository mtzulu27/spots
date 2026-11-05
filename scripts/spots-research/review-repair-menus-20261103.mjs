import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {integrateCatalog} from './integrate-catalog.mjs';
const root='docs/catalog-review/discovery/video-intake-20261103';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const save=(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const mode=process.argv[2],now=new Date().toISOString();
if(mode==='build'){
  const source='docs/catalog-review/benchmarks/sabormolido-menupp-links-2026-11-03T14-27-06-510Z.json';
  const report=await read(source),items=[],omissions=[];
  for(const menu of report.menus){
    if(menu.locationId!=='zcIFnDt9u7eiHdkda67p'){omissions.push({source:menu.source,reason:'different_branch_not_Cali'});continue;}
    const cats=new Map(menu.categories.map(c=>[c.id,c]));
    const primary=menu.metadata.name.trim()==='Menú  Principal';
    for(const p of menu.products){
      const c=cats.get(p.product_category);if(!c)throw Error('Missing category');
      let ancestor=c,disabled=!!p.disabled;const seen=new Set();
      while(ancestor&&!seen.has(ancestor.id)){seen.add(ancestor.id);disabled ||= !!ancestor.disabled;ancestor=cats.get(ancestor.hierarchy);}
      if(disabled||/promo|2x1/i.test(p.product_name)){omissions.push({menu:menu.metadata.name,id:p.id,reason:'disabled_or_promotional'});continue;}
      const section=c.name.trim(),upper=section.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
      const category=/POSTRE|DULCE/.test(upper)?'desserts':/ACOMPAN|EXTRA/.test(upper)?'extras':/ENTRADA|COMPARTIR|SNACK|SOPA/.test(upper)?'starters':/^(RES|CERDO|AVES|PESCA|FUERTES|COMIDA|ARROCES|ARROCES Y PASTAS|HUEVOS TRADICIONALES)$/.test(upper)?'mains':'drinks';
      for(const v of p.price??[]){
        if(v.disable||v.noStock||!(Number(v.price)>0))continue;
        items.push({name:p.product_name.trim(),category,presentation:[v.label?.trim(),section,...(primary?[]:[menu.metadata.name.trim()])].filter(Boolean).join(' · '),price:Number(v.price),currency:'COP',sourceUrl:menu.source,sourceProductId:p.id,sourceMenu:menu.metadata.name.trim(),menuSection:section,verifiedAt:now,calculationIncluded:true,...(menu.metadata.name==='Brunch'?{availabilityNote:'Brunch: fines de semana y festivos según Instagram; consultar disponibilidad.'}:{})});
      }
    }
  }
  await save(`${root}/sabormolidocali/menu-repair-review.json`,{checkedAt:now,source,items,omissions,reviewStatus:'awaiting_agent_review'});
  const web=await read('docs/catalog-review/benchmarks/macanudohifi.com-website-2026-11-03T14-05-33-192Z.json');
  const page=web.pages.find(p=>p.finalUrl==='https://macanudohifi.com/menu-licores/');assert.ok(page);
  const text=page.text.replace(/^Menu-Licores - Macanudo Saltar al contenido principal /,'').split(' Para Tomar ')[0];
  const sections=['Champaña','Cocteles Clásicos','Cocteles Ginebra Premium','Coñagc','G&T Premium','Ginebra','Mezcal','Otros','Ron','Tequila','Vino','Vodka','Whiskey'];
  const liquorItems=[];let offset=0;
  for(let i=0;i<sections.length;i++){
    const title=sections[i];assert.ok(text.startsWith(title,offset),`Unexpected section ${title}`);
    const start=offset+title.length;
    let end=text.length;
    if(i+1<sections.length){end=text.indexOf(` ${sections[i+1]} `,start);assert.ok(end>=0,`Missing next section ${sections[i+1]}`);}
    const body=text.slice(start,end).trim();
    const pattern=/([^$]+?)\s+((?:(?:Botella|Media|Shot|Copa):\s*\$[\d.]+\s*)+|\$\s*\d+\s*k)/g;
    let last=0;
    for(const m of body.matchAll(pattern)){
      assert.equal(body.slice(last,m.index).trim(),'');last=m.index+m[0].length;
      const name=m[1].trim();const entries=[...m[2].matchAll(/(Botella|Media|Shot|Copa):\s*\$([\d.]+)/g)];
      const values=entries.length?entries.map(v=>({presentation:v[1],price:Number(v[2].replaceAll('.',''))})):[{presentation:'Individual',price:Number(m[2].match(/\d+/)[0])*1000}];
      for(const value of values){
        const item={name,category:'drinks',...value,currency:'COP',sourceUrl:page.finalUrl,menuSection:title,verifiedAt:now,calculationIncluded:true};
        const found=liquorItems.find(x=>x.name===name&&x.presentation===item.presentation);if(found){assert.equal(found.price,item.price,`Conflicting price ${name}`);continue;}
        liquorItems.push(item);
      }
    }
    assert.equal(body.slice(last).trim(),'',`Unparsed text in ${title}`);offset=end+1;
  }
  await save(`${root}/macanudo.hifi/menu-repair-review.json`,{checkedAt:now,source:page.finalUrl,items:liquorItems,reviewStatus:'awaiting_agent_review'});
  console.log(JSON.stringify({sabor:items.length,saborMenus:[...new Set(items.map(i=>i.sourceMenu))],macanudoLiquorItems:liquorItems.length}));
}else if(mode==='apply'){
  const catalogPath='apps/mobile/public/spots-catalog.json';
  for(const username of ['sabormolidocali','macanudo.hifi']){
    const dir=`${root}/${username}`,review=await read(`${dir}/menu-repair-review.json`),consolidated=await read(`${dir}/consolidated.json`),catalog=await read(catalogPath);
    const spot=catalog.spots.find(s=>s.instagram===`https://www.instagram.com/${username}/`);assert.ok(spot);
    const branch=catalog.branches.find(b=>b.spot_id===spot.id);assert.ok(branch);
    let items=review.items;
    if(username==='macanudo.hifi')items=[...branch.menu_items,...items];
    const keys=items.map(i=>JSON.stringify([i.name,i.category,i.presentation]));assert.equal(new Set(keys).size,keys.length);
    const remove=new Set(username==='sabormolidocali'?['brunch_menu_review','seasonal_menu_review','drinks_menu_review']:['liquor_presentations_review']);
    const missing=branch.missing_fields.filter(s=>!remove.has(s));
    const data={id:branch.id,slug:branch.slug,menu_items:items,budget_scenarios:branch.budget_scenarios,menu_items_verified_at:now,missing_fields:missing};
    if(username==='sabormolidocali')data.supplemental_info='Carta principal, snacks, temporada y brunch de la sede Cali revisados. Brunch: fines de semana y festivos según Instagram. No se copian cartas de Buenaventura. Un enlace adicional de carta devuelve 404 tras los cuatro intentos; esa carta no se considera leída. Horarios de reservas inactivos no se usan como apertura.';
    const parentMissing=spot.missing_fields.filter(s=>!remove.has(s));
    const input={schemaVersion:1,data:{id:spot.id,slug:spot.slug,missing_fields:parentMissing},write:{mode:'update',fields:['missing_fields']},branches:[{data,write:{mode:'update',fields:Object.keys(data).filter(k=>!['id','slug'].includes(k))}}]};
    await save(`${dir}/menu-repair-update.json`,input);
    const result=await integrateCatalog(`${dir}/menu-repair-update.json`,catalogPath,{});await save(`${dir}/menu-repair-integration.json`,result);
    const target=consolidated.branches.find(b=>b.data.slug===branch.slug);Object.assign(target.data,data);target.write.fields=[...new Set([...target.write.fields,...Object.keys(data).filter(k=>!['id','slug'].includes(k))])];
    consolidated.data.missing_fields=parentMissing;consolidated.pending=consolidated.pending.filter(s=>!remove.has(s));
    consolidated.fieldDecisions.push({field:'menu_items',status:'preferred',checkedAt:now,sources:[review.source],reason:'Revisión correctiva de cartas omitidas; excluye ramas ajenas y ancestros inactivos. Presentaciones separadas y escenarios existentes validados por el integrador.'});
    await save(`${dir}/consolidated.json`,consolidated);
    review.reviewStatus='reviewed_and_integrated';review.finishedAt=now;await save(`${dir}/menu-repair-review.json`,review);
    const summary=await read(`${root}/integration-summary.json`),entry=summary.created.find(s=>s.id===spot.id);entry.pending=consolidated.pending;entry.branches.find(b=>b.id===branch.id).items=items.length;await save(`${root}/integration-summary.json`,summary);
    console.log(JSON.stringify({username,id:spot.id,menuItems:items.length,status:result.status}));
  }
}else throw Error('Expected build or apply');
