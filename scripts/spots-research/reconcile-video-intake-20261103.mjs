import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root='docs/catalog-review/discovery/video-intake-20261103';
const source='output/spots-video-lugares-20261102/lista-lugares-actualizada.md';
const raw=await fs.readFile('apps/mobile/public/spots-catalog.json','utf8');
const catalog=JSON.parse(raw);
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const csvRows=text=>{const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){row.push(field);field='';}else if(ch==='\n'&&!quoted){row.push(field);rows.push(row);row=[];field='';}else if(ch!=='\r')field+=ch;}if(field||row.length){row.push(field);rows.push(row);}return rows;};
const main=[];
for(const name of (await fs.readdir('docs/catalog-review/discovery')).filter(n=>n.endsWith('.csv'))){
  const rows=csvRows(await fs.readFile(`docs/catalog-review/discovery/${name}`,'utf8'));
  const header=rows.shift(),column=header.indexOf('lugar');
  for(const row of rows)if(row[column])main.push({name:row[column],file:name,row});
}
const matches={11:3663,12:3625,13:14,16:3689,17:3495,18:3519,19:3512,20:3513,21:24,23:25,26:3497,28:4021,31:3516,33:3511,41:3554,42:3514,43:3545,46:3540,47:3533,60:3558};
const records=(await fs.readFile(source,'utf8')).split('\n').filter(l=>/^\| \d+ \|/.test(l)).map(line=>{
  const [,number,name,location,instagram,video]=line.split('|').map(s=>s.trim());
  const id=Number(number),spot=catalog.spots.find(s=>s.id===matches[id]);
  const mainMatches=main.filter(m=>normalize(m.name)===normalize(name.replace(/\s*\(.*/,'')) || (id===28&&normalize(m.name)==='guru'));
  return {number:id,name,location,instagram,video,mainMatches,catalogMatch:spot?{id:spot.id,slug:spot.slug,name:spot.name,branches:catalog.branches.filter(b=>b.spot_id===spot.id).map(b=>({id:b.id,slug:b.slug,address:b.address,neighborhood:b.neighborhood,mall:b.mall,instagram:b.instagram}))}:null,status:spot?'excluded_existing_place':id===38?'pending_ambiguous_identity':'needs_research',note:spot?'No crear otra marca; sede nueva solo con evidencia independiente.':id===64?'No confundir taller con ALMA restaurante.':id===53?'Uniforme no confirma operador del campo.':null};
});
await fs.mkdir(root,{recursive:true});
const report={reviewedAt:new Date().toISOString(),mainThreadId:'019db73f-0ff4-7d81-b2e8-5c7185932f14',source,catalogHash:createHash('sha256').update(raw).digest('hex'),stats:{sourceRecords:records.length,existing:records.filter(r=>r.catalogMatch).length,pendingIdentity:records.filter(r=>r.status==='pending_ambiguous_identity').length,research:records.filter(r=>r.status==='needs_research').length},records};
await fs.writeFile(`${root}/reconciliation.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({stats:report.stats,remaining:records.filter(r=>r.status!=='excluded_existing_place').map(r=>({number:r.number,name:r.name,status:r.status}))},null,2));
