import fs from 'node:fs';
const root='/Users/mateo/Documents/Playground'; const now=new Date().toISOString();
const menuUrl='https://www.rappi.com.co/restaurantes/900053811-platillos-voladores';
const sourceUrl='https://platillosvoladores.com/pages/la-carta';
const rows=[
  ['Tofu al Curry Verde',52000,'vegetariano'],
  ['Quinua al Wok',55000,'vegetariano'],
  ['Pollo al Curry Verde',56000,'aves'],
  ['Pollo Guayaba',63000,'aves'],
  ['Encocado de Camarones',86000,'pescados y mariscos'],
];
const menu=rows.map(([name,price,category])=>({name,price,category,menuSection:category,sourceUrl:menuUrl,verifiedAt:now,calculationIncluded:true}));
const sorted=[...rows].sort((a,b)=>a[1]-b[1]);
const budget=[['Parche tranqui',sorted[0]],['Parche completo',sorted[2]],['Con toda',sorted.at(-1)]].map(([label,row])=>({concept:`${label} en Platillos Voladores`,note:'Referencia calculada con precios publicados; no es consumo mínimo ni promedio.',lines:[{name:row[0],category:row[2],quantity:1,groupSize:1}]}));
for(const file of [`${root}/apps/mobile/public/spots-catalog.json`,`${root}/apps/mobile/dist/spots-catalog.json`]){
 const c=JSON.parse(fs.readFileSync(file,'utf8')); const b=c.branches.find(x=>x.slug==='platillos-voladores-centenario'); if(!b)throw new Error('branch missing');
 Object.assign(b,{menu_url:menuUrl,menu_items:menu,budget_scenarios:budget,budget_basis:`Precios públicos consultados en ${menuUrl}; identidad y horarios contrastados en ${sourceUrl}.`,phone:'+57 317 639 3003',address:'Av. 3 N #7-19, Cali, Colombia',hours:'Lun-Jue 12:00-15:00 / 19:00-22:00 · Vie 12:00-15:00 / 19:00-23:00 · Sáb 12:00-16:00 / 19:00-23:00 · Dom cerrado',latitude:3.4536271,longitude:-76.5371911,coordinates_source:'https://www.visitcali.travel/platillos-voladores/',updated_at:now}); c.generatedAt=now; fs.writeFileSync(file,JSON.stringify(c,null,2)+'\n');
}
console.log('updated platillos-voladores-centenario');
