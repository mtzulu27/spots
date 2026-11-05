import fs from 'node:fs/promises';
const file='docs/catalog-review/benchmarks/linktr.ee-website-2026-11-03T06-53-36-809Z.json';
const report=JSON.parse(await fs.readFile(file,'utf8'));
const entries=[];
for(const page of report.pages.filter(p=>p.pdf))for(const p of page.pdf.pages){
  const patches=page.pdf.pages.length===6;
  let text=p.text;
  if(patches&&p.page===1)text='Portada Parche Ceramigos con identidad visual Alma de la Tierra.';
  if((patches&&p.page===6)||(!patches&&p.page===12))text='Ubicacion: barrio Miraflores, Cra 24b #2-28 oeste, Cali, Colombia. Contacto comercial: Karla Tatiana Posada, 319 288 46 25. Se omiten datos bancarios y documento personal.';
  const product=(name,price,presentation)=>({name,price,presentation,category:'cover',currency:'COP'});
  let products=[];
  if(patches&&p.page===3)products=[product('Parche Manual',130000,'Por persona; 2 horas; grupo de 2 a 6')];
  if(patches&&p.page===4)products=[product('Parche Tornero',130000,'Por persona; 2 horas; grupo de 2 a 3')];
  const permanent={3:['Arcilla en mano',390000,'4 clases; todo incluido'],4:['Arcilla en mano',215000,'2 clases; todo incluido'],5:['Arcilla en mano',110000,'1 clase; todo incluido'],6:['Arcilla en mano',290000,'4 clases; materiales basicos; esmaltes y segunda quema no incluidos'],8:['Arcilla en movimiento',440000,'4 clases de torno; todo incluido'],9:['Arcilla en movimiento',250000,'2 clases de torno; todo incluido'],10:['Arcilla en movimiento',345000,'4 clases de torno; materiales basicos; esmaltes y segunda quema no incluidos']};
  if(!patches&&permanent[p.page])products=[product(...permanent[p.page])];
  entries.push({source:page.pdf.source,page:p.page,status:'reviewed',text,products});
}
await fs.writeFile('docs/catalog-review/discovery/video-intake-20261103/ceramica_almadelatierra/pdf-review.json',JSON.stringify({entries},null,2)+'\n');
console.log({pagesReviewed:entries.length,products:entries.reduce((n,e)=>n+e.products.length,0)});
