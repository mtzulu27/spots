import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'docs/catalog-review/lago-verde-coordinates-20261101');
const sourcePath = path.join(root, 'apps/mobile/public/spots-catalog.json');
const before = await fs.readFile(sourcePath, 'utf8');
const query = '[out:json][timeout:25];(nwr(around:650,3.3427734,-76.5352648)[name];nwr(around:650,3.3427734,-76.5352648)[shop];nwr(around:650,3.3427734,-76.5352648)[amenity];);out center tags;';
const endpoint = 'https://overpass-api.de/api/interpreter';
const response = await fetch(endpoint, {method:'POST',headers:{
  'Content-Type':'application/x-www-form-urlencoded',
  'User-Agent':'Spots-Catalog-Audit/1.0 (read-only local pilot)',
},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(45000)});
assert.ok(response.ok, `Overpass HTTP ${response.status}`);
const payload = await response.json();
assert.ok(Array.isArray(payload.elements), 'Unexpected Overpass response');
const elements = payload.elements.map(e => ({type:e.type,id:e.id,
  name:e.tags?.name ?? null, latitude:e.lat ?? e.center?.lat ?? null,
  longitude:e.lon ?? e.center?.lon ?? null,
  coordinateType:e.type === 'node' ? 'mapped_node' : 'bounding_box_center_not_entrance',
  tags:e.tags,sourceUrl:`https://www.openstreetmap.org/${e.type}/${e.id}`}));
const result = {checkedAt:new Date().toISOString(),endpoint,query,remark:payload.remark ?? null,
  osmTimestamp:payload.osm3s?.timestamp_osm_base, attribution:'OpenStreetMap contributors',elements};
await fs.writeFile(path.join(dir,'osm-nearby.json'),JSON.stringify(result,null,2)+'\n');
assert.equal(await fs.readFile(sourcePath,'utf8'),before,'Catalog changed during read-only audit');
console.log(JSON.stringify({count:elements.length,remark:result.remark,osmTimestamp:result.osmTimestamp,
  businesses:elements.filter(e=>e.tags?.shop||['restaurant','cafe','bar','pub','fast_food','food_court','ice_cream'].includes(e.tags?.amenity)),
  lagoVerde:elements.filter(e=>/lago\s*verde/i.test(e.name||'')),
  otherNames:elements.filter(e=>e.name).map(e=>e.name)},null,2));
