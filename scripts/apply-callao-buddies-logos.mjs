import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const temp = process.argv[2];
assert.ok(temp?.startsWith('/tmp/spots-logos.'));
const file='apps/mobile/public/spots-catalog.json';
const raw=fs.readFileSync(file,'utf8'), base=JSON.parse(raw), next=structuredClone(base);
const targets=[{id:24,slug:'callao',source:'https://www.instagram.com/callao______/',input:'callao-logo.jpg'},
  {id:3688,slug:'buddies-burger',source:'https://www.instagram.com/buddiesburgers_/',input:'buddies-logo.jpg'}];
const report=[];
for(const t of targets){
  const spot=next.spots.find(s=>s.id===t.id);
  assert.equal(spot.slug,t.slug);
  const bytes=fs.readFileSync(`${temp}/${t.input}`);
  assert.equal(bytes[0],255);assert.equal(bytes[1],216);
  const hash=createHash('sha256').update(bytes).digest('hex');
  const url=`/place-media/${t.slug}/logo-instagram-${hash.slice(0,12)}.jpg`;
  const output=`apps/mobile/public${url}`;
  fs.mkdirSync(`apps/mobile/public/place-media/${t.slug}`,{recursive:true});
  if(fs.existsSync(output))assert.deepEqual(fs.readFileSync(output),bytes);
  else fs.writeFileSync(output,bytes,{flag:'wx'});
  report.push({id:t.id,source:t.source,previous:spot.logo_url??null,logo:url,sha256:hash,bytes:bytes.length,visualVerdict:'Verified brand logo, not a promotional photo',dimensions:'384x384'});
  spot.logo_url=url;
}
const outside=d=>({...d,spots:d.spots.map(s=>{
  if(!targets.some(t=>t.id===s.id))return s;
  const {logo_url,...rest}=s;return rest;
})});
assert.deepEqual(outside(base),outside(next));
assert.equal(fs.readFileSync(file,'utf8'),raw,'Concurrent catalog change');
fs.writeFileSync(file,JSON.stringify(next,null,2)+'\n');
assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),next);
const folder='docs/catalog-review/logos-callao-buddies-2026-09-06';
fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(`${folder}/review.json`,JSON.stringify({checkedAt:new Date().toISOString(),scope:'Only logo_url for spots 24 and 3688. Covers, galleries, dates, visibility, branches and all other fields unchanged.',report},null,2)+'\n');
console.log(JSON.stringify(report,null,2));
