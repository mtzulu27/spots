import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir = 'docs/catalog-review/cafe-gardenia-2026-09-05';
const catalogPath = 'apps/mobile/public/spots-catalog.json';
const beforeText = fs.readFileSync(catalogPath, 'utf8');
const catalog = JSON.parse(beforeText);
const now = new Date().toISOString();
const normalize = x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const stats = items => Object.fromEntries(['mains','drinks','starters','desserts','extras'].flatMap(category => {
  const prices = items.filter(x=>x.category===category && x.calculationIncluded).map(x=>x.price);
  return prices.length ? [[category,{minimum:Math.min(...prices),maximum:Math.max(...prices),average:prices.reduce((a,b)=>a+b,0)/prices.length,sampleSize:prices.length}]] : [];
}));
const results = [];
for(const [key,id] of [['granada',528],['rio',529]]) {
  const source = JSON.parse(fs.readFileSync(`${dir}/menu-${key}-dom.json`,'utf8'));
  assert.equal(source.tabs.length, source.sections.length);
  assert(source.sourceUrl === catalog.branches.find(b=>b.id===id).menu_url);
  const items = [], unresolved = [], duplicates = [], seen = new Map();
  let cards = 0, variants = 0;
  for(const section of source.sections) for(const product of section.products) {
    cards++;
    const n = normalize(product.name), s = normalize(section.name);
    for(const option of product.prices.length ? product.prices : [{variant:'',rawPrice:''}]) {
      variants++;
      const item = {
        name:product.name + (option.variant ? ` - ${option.variant}` : ''),
        originalName:product.name, variant:option.variant,
        description:product.description, menuSection:section.name,
        sectionConditions:section.note, rawPrice:option.rawPrice,
        sourceUrl:source.sourceUrl, sourceSectionId:section.id,
        verifiedAt:source.checkedAt, availability:product.status.includes('Agotado') ? 'sold_out' : 'listed',
        category:'extras', calculationIncluded:true,
        unit:'porción', conditions:section.note || null
      };
      // Preserve unusual/missing source values for review instead of inventing their scale.
      if(!/^\d{1,3}(\.\d{3})+$/.test(option.rawPrice)) {
        unresolved.push({...item,price:null,priceStatus:option.rawPrice ? 'ambiguous' : 'not_published',reason:option.rawPrice ? `La sede muestra ${option.rawPrice}; escala por confirmar.` : 'La tarjeta no publica un precio numérico.'});
        continue;
      }
      item.price = Number(option.rawPrice.replaceAll('.',''));
      item.priceStatus = 'verified';
      const dedupeKey = JSON.stringify([n,normalize(option.variant),item.price]);
      if(seen.has(dedupeKey)) {
        const original=seen.get(dedupeKey);
        original.alsoInSections ??= [];
        original.alsoInSections.push(section.name);
        duplicates.push({name:item.name,price:item.price,keptSection:original.menuSection,repeatedSection:section.name});
        continue;
      }
      if(s.includes('brunch') || s.includes('plato') || s.includes('sanduch') || s.includes('infantil')) item.category='mains';
      if(s==='sopas') item.category=n.includes('sanduche') ? 'mains' : 'starters';
      if(s==='entradas' || ['queso madeja','canasta de panes'].includes(n)) item.category='starters';
      if(s==='pasteleria') item.category='desserts';
      if(s==='panaderia' && /almendras|chocolate|pistacho|guayaba|rollo/.test(n)) item.category='desserts';
      if(/bebidas|cafe de origen|cerveza|cocteles/.test(s)) {item.category='drinks';item.unit=option.variant || 'bebida individual';}
      if(n==='affogato') {item.category='desserts'; item.unit='porción';}
      if(s==='adiciones' || n.startsWith('adicion')) {item.category='extras';item.unit='adición';}
      let exclusion='';
      if(product.status.includes('Agotado')) exclusion='Agotado en la carta consultada.';
      else if(/botella|jarra/.test(normalize(option.variant))) exclusion='Presentación para compartir; no es una bebida individual.';
      else if(['tabla gardenia','queso madeja','canasta de panes'].includes(n)) {exclusion='Presentación para compartir; fuera de la cesta individual.';item.unit='para compartir';}
      else if(s.includes('infantil')) {exclusion='Porción infantil; fuera de la muestra de adultos.';item.unit='porción infantil';}
      else if(/incluye bebida/i.test(section.note)) exclusion='Menú de almuerzo con bebida y media sopa, de 12:00 a 14:00; se evita sumar otra bebida.';
      else if(item.category==='extras') exclusion='Adición o panadería salada; no corresponde a los cuatro rubros de la cesta seleccionada.';
      if(exclusion) {item.calculationIncluded=false;item.exclusionReason=exclusion;}
      seen.set(dedupeKey,item);
      items.push(item);
    }
  }
  assert.equal(variants,items.length+duplicates.length+unresolved.length);
  const summaries=stats(items);
  assert(['mains','drinks','starters','desserts'].every(c=>summaries[c]?.sampleSize>0));
  const basket=summaries.mains.average+summaries.drinks.average;
  const money=n=>Math.round(n).toLocaleString('es-CO');
  const branch=catalog.branches.find(b=>b.id===id);
  const before=structuredClone(branch);
  Object.assign(branch,{
    menu_items:items, menu_items_verified_at:source.checkedAt,
    min_budget:Math.round(basket), updated_at:now,
    budget_basis:`Referencia por persona: un plato individual promedio ($${money(summaries.mains.average)}) + una bebida individual promedio ($${money(summaries.drinks.average)}). Total aproximado: $${money(basket)}.`,
    menu_calculation_note:`Bebidas incluye opciones con y sin alcohol. Se excluyen del promedio botellas, jarras, platos explícitamente para compartir, menú infantil, adiciones y agotados${key==='granada'?', y el almuerzo de 12:00 a 14:00 que ya incluye bebida y media sopa':''}. Impuesto al consumo incluido; propina sugerida del 10% voluntaria. ${unresolved.length} precios de la carta por confirmar.`
  });
  results.push({branchId:id,slug:branch.slug,sourceUrl:source.sourceUrl,checkedAt:source.checkedAt,sourceCards:cards,variantRows:variants,productsStored:items.length,duplicates,unresolved,sections:source.sections.map(s=>({name:s.name,cards:s.products.length,note:s.note})),summaries,budget:{basket:'1 plato individual + 1 bebida individual',exact:basket,published:branch.min_budget},items,before,after:branch});
}
const report={version:1,checkedAt:now,status:'extracted_with_source_price_gaps',method:'Tarjetas DOM de cada carta, variantes por fila de precio; sin OCR.',branches:results};
console.log(JSON.stringify(results.map(({slug,sourceCards,variantRows,productsStored,duplicates,unresolved,summaries,budget})=>({slug,sourceCards,variantRows,productsStored,duplicates,unresolved:unresolved.map(x=>({name:x.name,rawPrice:x.rawPrice})),summaries,budget})),null,2));
if(process.argv.includes('--apply')) {
  assert.equal(fs.readFileSync(catalogPath,'utf8'),beforeText,'El catálogo cambió durante la extracción.');
  fs.writeFileSync(`${dir}/menu-integration-before.json`,JSON.stringify(results.map(x=>x.before),null,2)+'\n');
  const spot=catalog.spots.find(x=>x.id===442);
  spot.missing_fields=[...new Set([...(spot.missing_fields||[]).filter(x=>x!=='menu_items'),'menu_source_price_gaps'])];
  spot.catalog_status='needs_info';
  spot.updated_at=now;
  catalog.generatedAt=now;
  fs.writeFileSync(`${dir}/menu-extraction.json`,JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
  const reviewPath=`${dir}/review.json`;
  const review=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
  review.reviewedAt=now;
  review.menu={url:'https://app.menupp.co/restaurant/cafegardenia',status:'complete',pagesReviewed:2,pagesTotal:2,productsExtracted:results.reduce((n,r)=>n+r.productsStored,0),sourceCardsReviewed:results.reduce((n,r)=>n+r.sourceCards,0),unresolvedPrices:results.flatMap(r=>r.unresolved.map(x=>({branch:r.slug,name:x.name,rawPrice:x.rawPrice}))),evidence:'menu-extraction.json',note:'Inventario completo revisado e integrado. Los valores ausentes o ambiguos quedan en el expediente y fuera del cálculo.'};
  review.nonCriticalMissing=['Horario general de festivos','Confirmar cuatro precios ausentes o ambiguos en la fuente'];
  review.comparison.push({field:'menu_items',action:'add',confidence:'high',evidence:['menu-rio-dom.json','menu-granada-dom.json'],before:0,after:review.menu.productsExtracted});
  fs.writeFileSync(reviewPath,JSON.stringify(review,null,2)+'\n');
}
