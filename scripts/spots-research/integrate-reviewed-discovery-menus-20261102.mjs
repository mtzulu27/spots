import fs from 'node:fs/promises';
import {integrateCatalog} from './integrate-catalog.mjs';

const root='docs/catalog-review/discovery/profiles-20261102';
const catalog='apps/mobile/public/spots-catalog.json';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const save=(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const verifiedAt=new Date().toISOString();
const raw=await read('docs/catalog-review/benchmarks/bigbilly-menupp-links-2026-11-03T04-35-37-343Z.json');
const items=[];
for(const menu of raw.menus) {
  const categories=new Map(menu.categories.map(c=>[c.id,c]));
  for(const product of menu.products) {
    const section=categories.get(product.product_category);
    if(product.disabled||!section||section.disabled||categories.get(section.hierarchy)?.disabled)continue;
    const category=/BEBIDA|CERVEZA|MALTEADA/.test(section.name)?'drinks':/ADICIONES/.test(section.name)?'extras':/PAPAS AMERICANAS/.test(section.name)?'starters':'mains';
    for(const price of product.price??[]) {
      if(price.disable||!Number.isFinite(Number(price.price))||Number(price.price)<=0)continue;
      const presentation=[price.label?.trim(),menu.metadata.name].filter(Boolean).join(' · ');
      const item={name:product.product_name.trim(),category,presentation,price:Number(price.price),currency:'COP',menuSection:section.name.trim(),sourceUrl:menu.source,sourceProductId:product.id,verifiedAt,calculationIncluded:true};
      // Conflicting repeated presentation prices remain visible only in source evidence.
      const collision=items.find(i=>i.name===item.name&&i.category===category&&i.presentation===presentation);
      if(collision){if(collision.price!==item.price)collision.calculationIncluded=false;continue;}
      items.push(item);
    }
  }
}
const line=(name,category,presentation)=>({name,category,presentation,quantity:1,groupSize:1});
const normal='Normal · Menú noche',night='Menú noche';
const scenarios=[
  {concept:'Hamburguesa y gaseosa',note:'Consumo individual propuesto del menú noche; no es promedio ni consumo mínimo.',lines:[line('BILLY BURGER','mains',normal),line('COCA COLA BOTELLA','drinks',night)]},
  {concept:'Hamburguesa, papas y gaseosa',note:'Consumo individual propuesto del menú noche, sin usar un combo de contenido no comprobado.',lines:[line('SWEET BACON','mains',normal),line('PAPAS A LA FRANCESA','extras',night),line('COCA COLA BOTELLA','drinks',night)]},
  {concept:'Costillas y malteada',note:'Consumo individual propuesto del menú noche; el restaurante puede actualizar los precios.',lines:[line('COSTILLA ST LOUIS','mains',night),line('OREO','drinks',night)]},
];
const c=await read(catalog),spot=c.spots.find(s=>s.slug==='big-billy'),branch=c.branches.find(b=>b.spot_id===spot.id);
const totals=scenarios.map(s=>s.lines.reduce((sum,l)=>{
  const matches=items.filter(i=>i.name===l.name&&i.category===l.category&&i.presentation===l.presentation&&i.calculationIncluded!==false);
  if(matches.length!==1)throw Error(`Missing or ambiguous: ${l.name}/${l.category}`);
  return sum+matches[0].price;
},0));
if(!(totals[0]<totals[1]&&totals[1]<totals[2]))throw Error('Scenarios not increasing');
const input=await read(`${root}/bigbilly.co/consolidated.json`);
input.data={id:spot.id,slug:spot.slug};input.write={mode:'update',fields:[]};
const data={id:branch.id,slug:branch.slug,menu_items:items,menu_items_verified_at:verifiedAt,budget_scenarios:scenarios,min_budget:totals[0],typical_budget:totals[0],max_budget:totals[2],budget_basis:'Parche tranqui: Billy Burger normal y Coca Cola botella por persona, del menú noche. Sin propina.',menu_calculation_note:'Precios regulares en COP. Menús día/noche y presentaciones separados; horarios de disponibilidad de cada menú por confirmar. Productos inactivos y precios cero excluidos. Precio contradictorio de pancake conservado solo como no calculable.',missing_fields:['google_places','coordinates','weekly_hours']};
input.branches=[{data,write:{mode:'update',fields:Object.keys(data).filter(k=>!['id','slug'].includes(k))}}];
input.fieldDecisions.push({fields:input.branches[0].write.fields,source:raw.source,status:'preferred',consultedAt:verifiedAt,reason:'Inventario activo de la carta oficial revisado; escenarios elegidos explícitamente, no promedios.'});
await save(`${root}/bigbilly.co/menu-consolidated.json`,input);
await save(`${root}/bigbilly.co/menu-integration.json`,await integrateCatalog(`${root}/bigbilly.co/menu-consolidated.json`,catalog,{}));
console.log(JSON.stringify({spot:spot.id,branch:branch.id,items:items.length,scenarioBudgets:totals}));
