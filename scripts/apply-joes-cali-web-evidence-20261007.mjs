import fs from 'node:fs';
const root='/Users/mateo/Documents/Playground';
const now=new Date().toISOString();
const menuUrl='https://www.rappi.com.co/restaurantes/900426279-joes-all-day-breakfast';
const venueUrl='https://es.restaurantguru.com/amp/Joes-Diner-Cali';
const rows=[
  ["The classic frenchies",27900,'desayunos'],
  ['Banana berry frenchies',30600,'desayunos'],
  ["Joe's burger",37900,'hamburguesas'],
  ["Joes big dog",40000,'hot dogs'],
  ["Joe's Rib's & Roll",53500,'platos fuertes'],
  ['All American Steak',54900,'platos fuertes'],
];
const menu=rows.map(([name,price,category])=>({name,price,category,menuSection:category,sourceUrl:menuUrl,verifiedAt:now,calculationIncluded:true}));
const sorted=[...rows].sort((a,b)=>a[1]-b[1]);
const budget=[['Parche tranqui',sorted[0]],['Parche completo',sorted[2]],['Con toda',sorted.at(-1)]].map(([label,row])=>({concept:`${label} en Joe's`,note:'Referencia calculada con precios publicados; no es consumo mínimo ni promedio.',lines:[{name:row[0],category:row[2],quantity:1,groupSize:1}]}));
for(const file of [`${root}/apps/mobile/public/spots-catalog.json`,`${root}/apps/mobile/dist/spots-catalog.json`]){
  const c=JSON.parse(fs.readFileSync(file,'utf8')); const b=c.branches.find(x=>x.slug==='joes-cali');
  if(!b) throw new Error('joes-cali not found');
  Object.assign(b,{menu_url:menuUrl,menu_items:menu,budget_scenarios:budget,budget_basis:`Precios públicos consultados en ${menuUrl}; sede y horarios contrastados en ${venueUrl}.`,address:'Cra. 116 #16-131, Cañasgordas, Cali',hours:'Lun-Mié 08:00-14:45 · Jue-Dom 08:00-20:45',updated_at:now});
  c.generatedAt=now; fs.writeFileSync(file,JSON.stringify(c,null,2)+'\n');
}
console.log('updated joes-cali');
