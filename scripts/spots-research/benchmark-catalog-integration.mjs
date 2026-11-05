import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {integrateCatalog} from './integrate-catalog.mjs';

const source='apps/mobile/public/spots-catalog.json';
const raw=await fs.readFile(source,'utf8'),base=JSON.parse(raw);
const spot=base.spots.find(s=>s.id===3);
assert.ok(spot,'Benchmark fixture place missing');
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'spots-catalog-benchmark-'));
const runs=[];
try {
  const input={schemaVersion:1,data:{...spot,short_description:spot.short_description+' [isolated benchmark]'},write:{mode:'update',fields:['short_description']},branches:base.branches.filter(b=>b.spot_id===spot.id).map(b=>({data:b,write:{mode:'update',fields:['menu_items'],hours:'replace'},weeklyHours:base.branchHours.filter(h=>h.branch_id===b.id)}))};
  const inputFile=path.join(dir,'consolidated.json'),catalogFile=path.join(dir,'catalog.json');
  await fs.writeFile(inputFile,JSON.stringify(input));
  for(let i=0;i<5;i++){
    await fs.writeFile(catalogFile,raw);
    const result=await integrateCatalog(inputFile,catalogFile);
    assert.equal(result.status,'written');
    runs.push(result.timingMs);
  }
  assert.equal(await fs.readFile(source,'utf8'),raw,'Original catalog was changed externally during benchmark');
}finally{await fs.rm(dir,{recursive:true,force:true});}
const totals=runs.map(r=>r.total).sort((a,b)=>a-b);
const report={measuredAt:new Date().toISOString(),scope:'Five isolated copies; no app catalog mutations. Excludes Node startup, fixture preparation, source extraction and semantic review.',
  catalogBytes:Buffer.byteLength(raw),catalogSha256:createHash('sha256').update(raw).digest('hex'),spots:base.spots.length,branches:base.branches.length,
  targetSpotId:spot.id,runs,medianMs:totals[2],minMs:totals[0],maxMs:totals.at(-1),temporaryFilesCleaned:true};
const output='docs/catalog-review/benchmarks/catalog-integration-timing.json';
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,report:output},null,2));
