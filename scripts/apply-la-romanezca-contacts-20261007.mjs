import fs from 'node:fs';
const root='/Users/mateo/Documents/Playground';
const now=new Date().toISOString();
const files=[`${root}/apps/mobile/public/spots-catalog.json`,`${root}/apps/mobile/dist/spots-catalog.json`];
for(const file of files){
  const c=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const b of c.branches||[]){
    if(b.slug==='la-romanezca-pance'){
      b.phone='+57 302 592 2982';
      b.whatsapp='+57 302 592 2982';
      b.hours='Lun 09:00-21:00 · Mar 09:00-22:00 · Mié-Jue 08:00-22:00 · Vie-Sáb 08:00-22:00 · Dom 08:00-21:00';
      b.source_url='https://restaurantguru.com/amp/La-Romanezca-Cafe-Restaurante-PANCE-Colombia';
      b.updated_at=now;
    }
    if(b.slug==='la-romanezca-lago-verde'){
      b.phone='+57 302 592 2982';
      b.whatsapp='+57 302 592 2982';
      b.source_url='https://www.rappi.com.co/restaurantes/900487838-la-romanezca';
      b.updated_at=now;
    }
    if(b.slug.includes('la-romanezca') && b.slug.includes('alfaguara')){
      b.phone='+57 311 436 2019';
      b.whatsapp='+57 311 436 2019';
      b.source_url='https://es.restaurantguru.com/La-Romana-Panaderia-Y-Cafe-Jamundi';
      b.updated_at=now;
    }
  }
  c.generatedAt=now; fs.writeFileSync(file,JSON.stringify(c,null,2)+'\n');
}
console.log('updated La Romanezca contacts by branch');
