import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {extractPlaces,getPlaceDetails}=await import(pathToFileURL(process.env.PLACES_SCRIPT || '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/extract-google-places.mjs'));
const ok=data=>({ok:true,json:async()=>data});
test('multiple candidates do not trigger details',async()=>{
  let count=0;
  const r=await extractPlaces({query:'Example Cali',apiKey:'test',fetchImpl:async()=>{count++;return ok({places:[{id:'a'},{id:'b'}]});}});
  assert.equal(count,1);assert.equal(r.selected,null);assert.equal(r.selectionStatus,'needs_identity_review');assert.equal(r.requestCount,1);
  assert.ok(r.timingMs.extraction>=0);
});
test('observed ID skips search and retains raw exceptional hours',async()=>{
  let count=0;
  const hours={periods:[{open:{day:1,hour:17},close:{day:2,hour:0}}],specialDays:[{date:{year:2026,month:9,day:7}}]};
  const r=await extractPlaces({query:'Example Cali',placeId:'abc',apiKey:'secret-test',fetchImpl:async(url,o)=>{
    count++;assert.ok(!url.includes('searchText'));assert.equal(o.headers['X-Goog-Api-Key'],'secret-test');assert.ok(o.signal);
    return ok({id:'abc',currentOpeningHours:hours});
  }});
  assert.equal(count,1);assert.equal(r.searchSkipped,true);assert.deepEqual(r.selected.currentHoursRaw,hours);
  assert.ok(!JSON.stringify(r).includes('secret-test'));
});
test('single candidate gets details, errors omit server body',async()=>{
  let count=0;
  const r=await extractPlaces({query:'Example',apiKey:'test',fetchImpl:async()=>++count===1?ok({places:[{id:'a'}]}):ok({id:'a'})});
  assert.equal(count,2);assert.equal(r.requestCount,2);assert.equal(r.selected.placeId,'a');
  await assert.rejects(getPlaceDetails({placeId:'a',apiKey:'test',fetchImpl:async()=>({ok:false,status:403,text:async()=>'secret'})}),/^Error: Google Places details 403$/);
});
