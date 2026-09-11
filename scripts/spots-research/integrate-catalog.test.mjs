import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {planCatalog,integrateCatalog} from './integrate-catalog.mjs';

const spot={id:1,slug:'cafe',name:'Cafe',category:'Comida',city:'Cali',is_active:true,cover_image_url:'/cover.jpg',logo_url:'/logo.jpg',gallery_urls:['/gallery.jpg']};
const branch={id:1,slug:'cafe-norte',spot_id:1,is_active:true,latitude:3,longitude:-76,address:'Norte',menu_items:[{name:'Old',price:1000,category:'drinks'}]};
const hour={id:1,branch_id:1,day_of_week:1,is_closed:false,open_time:'08:00:00',close_time:'18:00:00',split_open_time:null,split_close_time:null,sort_order:10};
const base=()=>({generatedAt:'old',spots:[spot,{...spot,id:2,slug:'other'}],branches:[branch,{...branch,id:2,slug:'other',spot_id:2}],branchHours:[hour,{...hour,id:2,branch_id:2}],hours:[{...hour,id:7},{...hour,id:8,branch_id:2}]});
const input=()=>({schemaVersion:1,data:{id:1,slug:'cafe',name:'Cafe nuevo',cover_image_url:'/stale.jpg'},write:{mode:'update',fields:['name']},branches:[{data:{id:1,slug:'cafe-norte',menu_items:[{name:'Coffee',price:5000,category:'drinks'}]},write:{mode:'update',fields:['menu_items'],hours:'replace'},weeklyHours:[{day_of_week:5,is_closed:false,open_time:'17:00',close_time:'02:00',split_open_time:null,split_close_time:null}]}]});
test('Target-only replacement, images preserved, overnight hours and both hour collections',()=>{
  const b=base(),p=planCatalog(b,input(),'now');
  assert.equal(p.next.spots[0].name,'Cafe nuevo');
  for(const k of ['cover_image_url','logo_url','gallery_urls'])assert.deepEqual(p.next.spots[0][k],b.spots[0][k]);
  assert.deepEqual(p.next.spots[1],b.spots[1]);assert.deepEqual(p.next.branches[1],b.branches[1]);
  assert.equal(p.next.branches[0].menu_items.length,1);
  for(const k of ['hours','branchHours']){
    assert.deepEqual(p.next[k].filter(h=>h.branch_id===2),b[k].filter(h=>h.branch_id===2));
    assert.equal(p.next[k].filter(h=>h.branch_id===1).length,1);
    assert.equal(p.next[k].find(h=>h.branch_id===1).close_time,'02:00:00');
  }
  const again=planCatalog(p.next,input(),'later');assert.equal(again.changed,false);assert.deepEqual(again.next,p.next);
  assert.deepEqual(b,base());
});
test('Explicit clearing removes only target hours; omission preserves them',()=>{
  const i=input();i.branches[0].weeklyHours=[];
  assert.equal(planCatalog(base(),i).next.branchHours.filter(h=>h.branch_id===1).length,0);
  delete i.branches[0].weeklyHours;delete i.branches[0].write.hours;
  assert.deepEqual(planCatalog(base(),i).next.branchHours,base().branchHours);
});
test('New place and branch receive stable IDs without mutating siblings',()=>{
  const i={schemaVersion:1,data:{slug:'new',name:'New',city:'Cali',category:'Comida',is_active:true},write:{mode:'create',fields:['name','city','category','is_active']},branches:[{data:{slug:'new-sur',is_active:true},write:{mode:'create',fields:['is_active']}}]};
  const p=planCatalog(base(),i);assert.equal(p.next.spots.at(-1).id,3);assert.equal(p.next.branches.at(-1).spot_id,3);
  assert.throws(()=>planCatalog(p.next,i),/already exists/);
});
test('Reject identity, foreign branch, absent fields, malformed coordinates/menu/time and duplicate days',()=>{
  const invalid=[
    i=>{i.data.slug='wrong';},i=>{i.branches[0].data.id=2;i.branches[0].data.slug='other';},
    i=>{i.write.fields=['nonexistent'];},i=>{i.write.fields=['short_description'];},
    i=>{i.branches[0].data.latitude=200;i.branches[0].write.fields.push('latitude');},
    i=>{i.branches[0].data.menu_items[0].price='5000';},
    i=>{i.branches[0].weeklyHours[0].open_time='25:00';},
    i=>{i.branches[0].weeklyHours.push({...i.branches[0].weeklyHours[0]});},
    i=>{delete i.branches[0].write.hours;},
  ];
  for(const change of invalid){const i=input();change(i);assert.throws(()=>planCatalog(base(),i));}
});
test('Commercial status must use compatible visibility without changing siblings',()=>{
  for(const [status,active] of [['temporarily_closed',true],['permanently_closed',false]]){
    const i=input();Object.assign(i.branches[0].data,{business_status:status,is_active:active});i.branches[0].write.fields.push('business_status','is_active');
    const p=planCatalog(base(),i);assert.equal(p.next.branches[0].is_active,active);assert.equal(p.next.branches[1].is_active,true);
    i.branches[0].data.is_active=!active;assert.throws(()=>planCatalog(base(),i));
  }
});
test('Atomic integration, no-op, dry run, lock, conflict and cleanup',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'spots-integrator-test-'));
  const catalog=path.join(dir,'catalog.json'), source=path.join(dir,'consolidated.json');
  try{
    await fs.writeFile(catalog,JSON.stringify(base()));await fs.writeFile(source,JSON.stringify(input()));
    const original=await fs.readFile(catalog,'utf8');
    const preview=await integrateCatalog(source,catalog,{dryRun:true});assert.equal(preview.status,'dry_run');assert.equal(await fs.readFile(catalog,'utf8'),original);
    await fs.writeFile(catalog+'.integrate.lock','another writer');
    await assert.rejects(integrateCatalog(source,catalog),/EEXIST/);assert.equal(await fs.readFile(catalog+'.integrate.lock','utf8'),'another writer');await fs.unlink(catalog+'.integrate.lock');
    await assert.rejects(integrateCatalog(source,catalog,{beforeCommit:()=>fs.writeFile(catalog,'external change')}),/Concurrent/);
    assert.equal(await fs.readFile(catalog,'utf8'),'external change');
    assert.deepEqual((await fs.readdir(dir)).sort(),['catalog.json','consolidated.json']);
    await fs.writeFile(catalog,original);
    await assert.rejects(integrateCatalog(source,catalog,{expectedHash:'stale'}),/changed since/);
    const done=await integrateCatalog(source,catalog,{expectedHash:preview.catalogSha256});assert.equal(done.status,'written');
    assert.equal((await integrateCatalog(source,catalog)).status,'unchanged');
    assert.deepEqual((await fs.readdir(dir)).sort(),['catalog.json','consolidated.json']);
    const bad=input();bad.data.slug='wrong';await fs.writeFile(source,JSON.stringify(bad));
    const saved=await fs.readFile(catalog,'utf8');await assert.rejects(integrateCatalog(source,catalog));assert.equal(await fs.readFile(catalog,'utf8'),saved);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
