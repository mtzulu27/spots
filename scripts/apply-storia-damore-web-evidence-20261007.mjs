import fs from 'node:fs';
const root='/Users/mateo/Documents/Playground';const now=new Date().toISOString();
const menuUrl='https://www.rappi.com.co/cali/restaurantes/delivery/33117-storia-d-amore';
const rows=[['Pomodoro',34900,'pasta'],['Alfredo Pollo',44900,'pasta'],['Alfredo Camaron',54900,'pasta'],['Fetuccine Parmiggiano',62400,'pasta'],['Di Mare',69900,'pasta'],['Raviolis Salmon',74900,'pasta']];
const menu=rows.map(([name,price,category])=>({name,price,category,menuSection:category,sourceUrl:menuUrl,verifiedAt:now,calculationIncluded:true}));
const sorted=[...rows].sort((a,b)=>a[1]-b[1]);const budget=[['Parche tranqui',sorted[0]],['Parche completo',sorted[2]],['Con toda',sorted.at(-1)]].map(([label,row])=>({concept:`${label} en Storia d’Amore`,note:'Referencia calculada con precios publicados; no es consumo mínimo ni promedio.',lines:[{name:row[0],category:row[2],quantity:1,groupSize:1}]}));
const specs={
 'storia-damore-granada':{address:'Avenida 9N #14N-46, Granada, Cali',hours:'Lun-Mié 12:00-21:00 · Jue 12:00-22:00 · Vie-Sáb 12:00-23:00 · Dom 12:00-21:00'},
 'storia-damore-unicentro':{address:'Cra. 100 #5-169, local 512, Unicentro, Cali',hours:'Mar-Dom 12:00-20:00 · Lun cerrado'},
 'storia-damore-chipichape':{address:'Avenida 6A Calle 43 N-37, C.C. Chipichape, Cali',hours:'Lun-Sáb 12:00-20:00 · Dom 12:00-19:00'},
};
for(const file of [`${root}/apps/mobile/public/spots-catalog.json`,`${root}/apps/mobile/dist/spots-catalog.json`]){const c=JSON.parse(fs.readFileSync(file,'utf8'));for(const b of c.branches||[]){const spec=specs[b.slug];if(!spec)continue;Object.assign(b,{menu_url:menuUrl,menu_items:menu,budget_scenarios:budget,budget_basis:`Precios regulares publicados en Rappi; sede contrastada con el directorio oficial.`,address:spec.address,hours:spec.hours,updated_at:now});}c.generatedAt=now;fs.writeFileSync(file,JSON.stringify(c,null,2)+'\n');}
console.log('updated storia-damore branches');
