import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {validateCompletion} from '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/validate-place-completion.mjs';
import {scenarioBudget} from '../../apps/mobile/lib/budget-scenarios.ts';

const dir='docs/catalog-review/discovery/main-2-skill-review-20261103/absentacali';
const ownerDir=path.resolve('docs/catalog-review/spotsoficial-20261103/full-ingestion/absentacali');
const completion=JSON.parse(await fs.readFile(`${ownerDir}/completion.json`,'utf8'));
const validation=validateCompletion(completion,ownerDir);
const report={checkedAt:new Date().toISOString(),ownerCompletion:`${ownerDir}/completion.json`,validation,catalogChanged:false,published:false};
if(!validation.canAdvance){
  report.status='waiting_for_owner_closure';
  await fs.writeFile(`${dir}/shared-closure-check.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,validationStatus:validation.status,errors:validation.errors.length,pending:validation.pending.length}));
  process.exitCode=1;
}else{
  const catalog=JSON.parse(await fs.readFile('apps/mobile/public/spots-catalog.json','utf8'));
  const spot=catalog.spots.find(s=>s.id===4027);
  assert.ok(spot&&spot.instagram==='https://www.instagram.com/absentacali/');
  const branches=catalog.branches.filter(b=>b.spot_id===4027);
  assert.deepEqual(branches.map(b=>b.id).sort(),[5460,5461]);
  const media=[];
  for(const url of [...new Set([spot.logo_url,spot.cover_image_url,...spot.gallery_urls].filter(Boolean))]){
    assert.ok(url.startsWith('/place-media/'));
    const bytes=await fs.readFile(`apps/mobile/public${url}`);
    media.push({url,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  assert.ok(spot.cover_image_url&&new Set(spot.gallery_urls).size>=3);
  const budgets=branches.map(b=>{
    assert.equal(b.budget_scenarios.length,3);
    const values=b.budget_scenarios.map(s=>scenarioBudget(b.menu_items,2,s).perPerson);
    assert.ok(values[0]>0&&values[0]<values[1]&&values[1]<values[2]);
    assert.deepEqual([b.min_budget,b.typical_budget,b.max_budget],[values[0],values[0],values[2]]);
    return {branchId:b.id,perPersonForTwo:values};
  });
  Object.assign(report,{status:'structural_reuse_check_passed',media,budgets,visualQA:'Owner evidence must still be read and checked by main 2; this script does not provide visual acceptance.'});
  await fs.writeFile(`${dir}/shared-closure-check.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,media:media.length,budgets}));
}
