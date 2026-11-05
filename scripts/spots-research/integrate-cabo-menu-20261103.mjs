import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {integrateCatalog} from './integrate-catalog.mjs';
import {scenarioBudget} from '../../apps/mobile/lib/budget-scenarios.ts';

const root='docs/catalog-review/discovery/profiles-20261102/caboleones';
const catalog='apps/mobile/public/spots-catalog.json';
const report=JSON.parse(await fs.readFile('docs/catalog-review/benchmarks/app.caboleones.com-website-2026-11-03T04-38-16-835Z.json','utf8'));
const page=report.pages.find(p=>p.finalUrl?.includes('/menu?'));
const tables=[
  ['Tardeo 16:00-18:30','starters','Burrata|57900;Tostada de Burrata|25500;Empadas x6|26000;Waffle de Pandebono|28000;Croissant Brisa del Cabo|25500;Croissant Nieve de Almendras|8500;Croissant Bosque Nevado|21000;Croissant Ibérico|25500;Croissant Tradicional|8500'],
  ['Tardeo 16:00-18:30','drinks','Lulada Cabo|25000;Latte Frío|11500;Americano|10000;Capuchino|11500;Latte|11500;Capuchino Con Vainilla|12000;Tinto de Verano|27000'],
  ['Sangrías','drinks','Jarra de Sangría|150000;Copa de Sangría|47000;Soda Refrescante|18000'],
  ['Coctelería de Autor','drinks','Pole Position|75000;Espíritu de la Sabana|82000;Ocaso Reposado|65000;Diamante Carmesí|75000;Flor de Ébano|60000;Savage 1800|67000;Cabo Cover Club|55000'],
  ['Coctelería Clásica','drinks','Gin & Tonic|67000'],
  ['Mocktails','drinks','Mojito sin Licor|30000;Gin & Tonic sin Licor|30000'],
  ['Platos para Compartir','starters','Carpaccio de Lomo de Res|65000;Carpaccio de Pulpo|62000;Ceviche de Pulpo|75000;Camarones Costeros|62000;Burrata|57900;Ceviche de Corvina|56000;Ceviche de Chicharron|45000;Patatas Costeras|39000;Cabo Crunch|39000'],
  ['Platos para Compartir','mains','Lomo Viche|79000;Pulpo a la Parrilla|95000;Salmón Ámbar|77000;Fish and Chips|39000;Costillas San Luis|77000;Mini Burgers x3|50000'],
  ['Postres','desserts','Brownie|25000;Cheesecake de Frutos rojos|25000'],
  ['Licor','drinks','Montelobos|600000|Botella;Montelobos|60000|Shot;Ginebra Hendricks Original|480000|Botella;Ginebra Hendricks Original|48000|Shot;Ginebra Hendricks Lunar|480000|Botella;Ginebra Hendricks Lunar|48000|Shot;Ginebra Hendricks Orbium|480000|Botella;Ginebra Hendricks Orbium|48000|Shot;Ginebra Bombay Bramble|380000|Botella;Ginebra Bombay Bramble|40000|Shot;Woodford Reserve|390000|Botella;Woodford Reserve|39000|Shot;Drambuie|380000|Botella;Drambuie|38000|Shot;Macallan Double Cask 12|800000|Botella;Macallan Double Cask 12|80000|Shot;Whisky Glenfiddich 12|450000|Botella;Whisky Glenfiddich 12|45000|Shot;Macallan Sherry Oak Cask 12|900000|Botella;Macallan Sherry Oak Cask 12|90000|Shot;Whisky Glenfiddich 15|550000|Botella;Whisky Glenfiddich 15|55000|Shot;Whisky Glenfiddich 18|780000|Botella;Whisky Glenfiddich 18|78000|Shot;Whisky Jack Daniels Nº7|350000|Botella;Whisky Jack Daniels Nº7|35000|Shot;Monkey Shoulder|380000|Botella;Monkey Shoulder|38000|Shot;Vodka Grey Goose|500000|Botella;Vodka Grey Goose|50000|Shot;Skyy Vodka|210000;Ketel One|410000;Patrón Cristalino|700000|Botella;Patrón Cristalino|70000|Shot;Patron Añejo|650000|Botella;Patron Añejo|65000|Shot;Patrón Reposado|500000|Botella;Patrón Reposado|50000|Shot;Patrón Silver|480000|Botella;Patrón Silver|48000|Shot;Jimador Cristalino|400000;Jimador Reposado|290000;Maestro Dobel|679900|Botella;Maestro Dobel|67000|Shot;Tequila 1800 Cristalino|679900|Botella;Tequila 1800 Cristalino|67000|Shot;Ron Sailor Jerry|220000|Botella;Ron Sailor Jerry|22000|Shot;Ron Santa Teresa 1796|550000|Botella;Ron Santa Teresa 1796|55000|Shot;Aguardiente Blanco|175000|Botella;Aguardiente Fiesta|175000|Botella'],
  ['Bebidas','drinks','Red Bull|16000;Agua Hatsu|10000;Sodas Costeras|18000;Soda Bretaña|10000;Ginger Canada Dry|10000;Tónica Mil976 Ocean|16000;Te Hatsu Blanco|16000;Te Hatsu Rosado|16000;Te Hatsu Amarillo|16000;Stella Artois|16000;Corona|16000;Aperol Spritz|48000;Club Colombia|14900;Corona Cero|16000;Expreso|8500'],
  ['Vinos','drinks','Lambrusco piccini|150000;Vino Tinto Marques Cabernet|410000;Vino Reserve Malbec|230000|Tinto;Vino Reserve Malbec|230000|Rosado;Vino Blanco Trivento White Malbec Reserve|240000;Vino Tinto Adobe Carmenere|200000|Botella;Vino Tinto Adobe Carmenere|40000|Copa;Vino Blanco Adobe Chardonnay|200000|Botella;Vino Blanco Adobe Chardonnay|40000|Copa;Vino Tinto Coyam Blend|600000;Vino Blanco Adobe Sauvignon Blanc|200000'],
];
const items=[];
for(const [section,category,table]of tables)for(const row of table.split(';')){
  const [name,amount,presentation='']=row.split('|'),price=Number(amount);
  const start=page.text.indexOf(name);
  assert.ok(start>=0,`Missing product ${name}`);
  const literal=`$ ${new Intl.NumberFormat('es-CO').format(price)}`;
  const occurrences=[...page.text.matchAll(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))];
  assert.ok(occurrences.some(m=>page.text.slice(m.index,m.index+800).includes(literal)),`Missing contextual price ${name}: ${literal}`);
  items.push({name,price,category,presentation:section.startsWith('Tardeo')?section:presentation,currency:'COP',menuSection:section,sourceUrl:page.finalUrl,verifiedAt:new Date().toISOString(),calculationIncluded:true});
}
const line=(name,category,groupSize=1)=>({name,category,presentation:'',quantity:1,groupSize});
const scenarios=[
  {concept:'Entrada compartida y cóctel',note:'Un Cabo Crunch compartido entre dos y un cóctel por persona. Compartir entre dos es una propuesta, no un rendimiento confirmado. Sin propina.',lines:[line('Cabo Crunch','starters',2),line('Cabo Cover Club','drinks')]},
  {concept:'Camarones y cóctel de autor',note:'Una entrada de camarones compartida entre dos y un cóctel por persona. Rendimiento propuesto, no confirmado. Sin propina.',lines:[line('Camarones Costeros','starters',2),line('Pole Position','drinks')]},
  {concept:'Platos compartidos, cóctel y postre',note:'Lomo, pulpo y brownie compartidos entre dos, con un cóctel por persona. Rendimiento propuesto, no confirmado. El restaurante puede actualizar los precios.',lines:[line('Lomo Viche','mains',2),line('Pulpo a la Parrilla','mains',2),line('Espíritu de la Sabana','drinks'),line('Brownie','desserts',2)]},
];
const totals=scenarios.map(s=>scenarioBudget(items,2,s).perPerson);
assert.deepEqual(totals,[74500,106000,181500]);
const c=JSON.parse(await fs.readFile(catalog,'utf8')),s=c.spots.find(s=>s.slug==='cabo-leones'),b=c.branches.find(b=>b.spot_id===s.id);
const data={id:b.id,slug:b.slug,menu_url:page.finalUrl,menu_items:items,budget_scenarios:scenarios,min_budget:totals[0],typical_budget:totals[0],max_budget:totals[2],budget_basis:'Parche tranqui: Cabo Crunch compartido entre dos y Cabo Cover Club por persona. Sin propina.',menu_items_verified_at:new Date().toISOString(),menu_calculation_note:'Precios fijos de la carta oficial. Tardeo tiene disponibilidad 16:00-18:30, no es horario de apertura. Se excluyen precios desde, combo promocional y productos de nicotina. No se supone presentación cuando no está indicada.',missing_fields:(b.missing_fields??[]).filter(k=>k!=='menu_review')};
const input={schemaVersion:1,data:{id:s.id,slug:s.slug},write:{mode:'update',fields:[]},branches:[{data,write:{mode:'update',fields:Object.keys(data).filter(k=>!['id','slug'].includes(k))}}],fieldDecisions:[{fields:['menu_items','budget_scenarios'],source:page.finalUrl,status:'preferred',reason:'Inventario de precios fijos revisado por sección y presentación; COP conservado del establecimiento colombiano, no inferido solo del símbolo.'}],coverage:{menu:'fixed_prices_reviewed',highlights:'blocked_missing_devtools',googlePlaces:'blocked_missing_api_key'},pending:['Cócteles con precio desde: falta precio por variante; no se usan para calcular.','No se interpreta el horario Tardeo como apertura semanal.']};
await fs.writeFile(`${root}/menu-consolidated.json`,JSON.stringify(input,null,2)+'\n');
await fs.writeFile(`${root}/menu-integration.json`,JSON.stringify(await integrateCatalog(`${root}/menu-consolidated.json`,catalog,{}),null,2)+'\n');
console.log(JSON.stringify({place:s.name,items:items.length,budgets:totals}));
