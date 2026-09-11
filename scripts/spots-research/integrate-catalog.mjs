import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID, createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const hash = value => createHash('sha256').update(value).digest('hex');
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const spotKeys = new Set('type name short_description category city cover_image_url logo_url gallery_urls subcategories tags moods likes is_active is_featured business_status catalog_status missing_fields editorial_badge instagram address source_urls reviewed_at schedule'.split(' '));
const branchKeys = new Set('neighborhood mall city address hours holiday_mode holiday_open_time holiday_close_time holiday_split_open_time holiday_split_close_time min_budget max_budget min_people max_people typical_budget budget_basis menu_calculation_note menu_url menu_items menu_items_verified_at whatsapp phone instagram latitude longitude is_active sort_order google_maps_url google_place_id website_url business_status catalog_status missing_fields supplemental_info'.split(' '));
branchKeys.add('budget_scenarios');
const time = v => typeof v === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(v);
const id = v => Number.isSafeInteger(v) && v > 0;
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const instagramHandle = value => {
  try {const u=new URL(value);return ['instagram.com','www.instagram.com'].includes(u.hostname)?u.pathname.replace(/^\/+|\/+$/g,'').toLowerCase():null;}catch{return null;}
};

function validateRow(row, branch) {
  assert.ok(typeof row.slug === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(row.slug), 'Invalid slug');
  assert.equal(typeof row.is_active, 'boolean', 'is_active must be explicit');
  for(const key of ['name','short_description','category','city','neighborhood','mall','address','hours','phone','budget_basis','menu_calculation_note','catalog_status','google_place_id']) {
    if(row[key]!=null)assert.equal(typeof row[key],'string',`${key}: expected string`);
  }
  for(const key of ['cover_image_url','logo_url']) if(row[key]!=null) {
    assert.equal(typeof row[key],'string',`${key}: expected URL/path`);
    if(row[key] && !/^\/(?!\/)/.test(row[key]))assert.ok(['https:','http:'].includes(new URL(row[key]).protocol),`Invalid ${key}`);
  }
  if (!branch) for (const key of ['name','category','city']) assert.ok(typeof row[key] === 'string' && row[key].trim(), `Missing ${key}`);
  for (const key of ['gallery_urls','subcategories','tags','moods','missing_fields','source_urls']) {
    if (row[key] != null) assert.ok(Array.isArray(row[key]) && row[key].every(v=>typeof v==='string'), `${key}: expected string array`);
  }
  if (row.business_status != null) {
    assert.ok(['operational','temporarily_closed','permanently_closed','unknown'].includes(row.business_status), 'Invalid business status');
    if (row.business_status === 'permanently_closed') assert.equal(row.is_active,false,'Permanent closure must be hidden');
    if (row.business_status === 'temporarily_closed') assert.equal(row.is_active,true,'Temporary closure must remain visible');
  }
  for (const key of ['min_budget','max_budget','typical_budget','min_people','max_people','sort_order']) {
    if (row[key] != null) assert.ok(Number.isFinite(row[key]) && row[key]>=0, `${key}: invalid number`);
  }
  if (row.min_people && row.max_people) assert.ok(row.min_people<=row.max_people,'Invalid people range');
  if (row.min_budget && row.max_budget) assert.ok(row.min_budget<=row.max_budget,'Invalid budget range');
  for (const [key, limit] of [['latitude',90],['longitude',180]]) if (row[key]!=null) assert.ok(Number.isFinite(row[key]) && Math.abs(row[key])<=limit, `Invalid ${key}`);
  assert.equal(row.latitude == null,row.longitude == null,'Coordinates must be paired');
  for (const key of ['instagram','menu_url','website_url','google_maps_url','whatsapp']) {
    // Legacy catalog contacts can be phone numbers instead of wa.me URLs.
    if (key === 'whatsapp' && /^\+?\d{10,15}$/.test(row[key] ?? '')) continue;
    if (row[key]) { const u=new URL(row[key]); assert.ok(['https:','http:'].includes(u.protocol) && !u.username && !u.password,`Invalid ${key}`); }
  }
  if (row.holiday_mode != null) assert.ok(['inherit','same_as_sunday','closed','custom'].includes(row.holiday_mode),'Invalid holiday mode');
  for (const key of ['holiday_open_time','holiday_close_time','holiday_split_open_time','holiday_split_close_time']) if (row[key]!=null) assert.ok(time(row[key]),`Invalid ${key}`);
  if (row.holiday_mode==='custom') {
    assert.ok(time(row.holiday_open_time) && time(row.holiday_close_time),'Custom holiday needs hours');
    assert.equal(row.holiday_split_open_time == null,row.holiday_split_close_time == null,'Holiday split must be paired');
  }
  if (row.menu_items != null) {
    assert.ok(Array.isArray(row.menu_items),'menu_items must be an array');
    for (const item of row.menu_items) {
      assert.ok(object(item) && typeof item.name==='string' && item.name.trim(),'Menu item needs name');
      assert.ok(Number.isFinite(item.price) && item.price>=0,'App menu requires numeric prices; keep unpriced inventory in evidence');
      assert.ok(['mains','drinks','starters','desserts','cover','extras'].includes(item.category),'Invalid menu category');
    }
  }
  if (row.budget_scenarios != null) {
    assert.ok(Array.isArray(row.budget_scenarios) && [0,3].includes(row.budget_scenarios.length), 'Expected zero or three budget scenarios');
    for (const scenario of row.budget_scenarios) {
      assert.ok(typeof scenario.concept === 'string' && typeof scenario.note === 'string' && Array.isArray(scenario.lines) && scenario.lines.length, 'Invalid scenario');
      for (const line of scenario.lines) {
        assert.ok(Number.isSafeInteger(line.quantity) && line.quantity > 0 && Number.isSafeInteger(line.groupSize) && line.groupSize > 0, 'Invalid scenario quantities');
        const matches = (row.menu_items ?? []).filter(item => item.name === line.name && item.category === line.category && (line.presentation === undefined || item.presentation === line.presentation));
        assert.equal(matches.length, 1, `Ambiguous or missing scenario item: ${line.name}`);
        assert.notEqual(matches[0].calculationIncluded, false, `Excluded scenario item: ${line.name}`);
      }
    }
  }
}

function unique(rows,key,label) {
  const values=rows.map(r=>r[key]);
  assert.equal(new Set(values).size,values.length,`Duplicate ${label}`);
}

export function planCatalog(base, input, now = new Date().toISOString()) {
  assert.equal(input.schemaVersion,1,'Expected consolidated schemaVersion:1');
  assert.ok(Array.isArray(input.branches),'Expected branches array');
  for(const key of ['spots','branches','branchHours']) assert.ok(Array.isArray(base[key]),`Catalog missing ${key}`);
  if (base.hours !== undefined) assert.ok(Array.isArray(base.hours),'Invalid hours alias');
  const next=structuredClone(base), changes=[];
  let nextHourId=Math.max(0,...next.branchHours.map(h=>h.id),...(next.hours||[]).map(h=>h.id))+1;
  function apply(entity,rows,keys,branch,parentId) {
    assert.ok(object(entity.data) && object(entity.write),'Missing data/write contract');
    const d=entity.data,w=entity.write;
    assert.ok(['update','create'].includes(w.mode),'Explicit create/update mode required');
    assert.ok(Array.isArray(w.fields) && new Set(w.fields).size===w.fields.length,'Unique write.fields required');
    for(const key of w.fields) assert.ok(keys.has(key) && Object.hasOwn(d,key),`Unknown or absent write field: ${key}`);
    let row;
    if(w.mode==='update') {
      assert.ok(id(d.id),'Update needs stable numeric ID');
      const matches=rows.filter(r=>r.id===d.id);
      assert.equal(matches.length,1,'Target ID not found or duplicated');
      row=matches[0]; assert.equal(row.slug,d.slug,'Target slug mismatch');
      if(branch) assert.equal(row.spot_id,parentId,'Branch belongs to another place');
    } else {
      assert.ok(d.id==null,'Create IDs are assigned by the integrator');
      assert.ok(!rows.some(r=>r.slug===d.slug),'Slug already exists; use update');
      row={id:Math.max(0,...rows.map(r=>r.id))+1,slug:d.slug,created_at:now};
      if(branch) row.spot_id=parentId;
      rows.push(row);
    }
    if(branch && d.spot_id!=null) assert.equal(d.spot_id,parentId,'Input parent mismatch');
    const previous=JSON.stringify(row);
    for(const key of w.fields) row[key]=structuredClone(d[key]);
    validateRow(row,branch);
    const changed=w.mode==='create'||JSON.stringify(row)!==previous;
    if(changed) row.updated_at=now;
    changes.push({entity:branch?'branch':'spot',id:row.id,slug:row.slug,mode:w.mode,changed,fields:w.fields});
    return row;
  }
  const spot=apply(input,next.spots,spotKeys,false);
  if(input.write.mode==='create') {
    const handles=new Set([spot.instagram,...input.branches.map(b=>b.data?.instagram)].map(instagramHandle).filter(Boolean));
    assert.ok(!base.spots.some(s=>handles.has(instagramHandle(s.instagram))) && !base.branches.some(b=>handles.has(instagramHandle(b.instagram))), 'Instagram already belongs to a catalog place; resolve its stable ID');
  }
  const seen=new Set();
  for(const entity of input.branches) {
    assert.ok(!seen.has(entity.data?.slug),'Branch repeated in input'); seen.add(entity.data?.slug);
    const branch=apply(entity,next.branches,branchKeys,true,spot.id);
    if(entity.write.mode==='create' && branch.google_place_id) assert.ok(!next.branches.some(b=>b.id!==branch.id && b.google_place_id===branch.google_place_id),'Google Place ID already assigned');
    if(Object.hasOwn(entity,'weeklyHours')) assert.equal(entity.write.hours,'replace','weeklyHours requires explicit replacement');
    if(entity.write.hours!==undefined) {
      assert.equal(entity.write.hours,'replace','Unsupported hours operation');
      assert.ok(Array.isArray(entity.weeklyHours),'Replacement needs weeklyHours (empty clears)');
      unique(entity.weeklyHours,'day_of_week','weekday');
      const rows=entity.weeklyHours.map(h=>{
        assert.ok(Number.isInteger(h.day_of_week)&&h.day_of_week>=0&&h.day_of_week<=6,'Invalid weekday');
        assert.equal(typeof h.is_closed,'boolean','Day needs explicit closed status');
        const values={};
        for(const k of ['open_time','close_time','split_open_time','split_close_time']) {
          const v=h[k]??null;
          assert.ok(v===null || time(v),`Invalid ${k}`);
          values[k]=v && v.length===5 ? `${v}:00` : v;
        }
        if(h.is_closed) assert.ok(Object.values(values).every(v=>v===null),'Closed day cannot contain hours');
        else assert.ok(values.open_time&&values.close_time,'Open day requires a complete interval');
        assert.equal(values.split_open_time===null,values.split_close_time===null,'Split interval must be paired');
        const old=next.branchHours.find(r=>r.branch_id===branch.id&&r.day_of_week===h.day_of_week);
        const aliasCollision=old && (next.hours||[]).some(r=>r.id===old.id&&r.branch_id!==branch.id);
        return {id:old&&!aliasCollision?old.id:nextHourId++,branch_id:branch.id,day_of_week:h.day_of_week,is_closed:h.is_closed,...values,sort_order:(h.day_of_week||7)*10};
      });
      for(const key of ['branchHours','hours']) {
        if(!Array.isArray(next[key]))continue;
        const old=next[key].filter(h=>h.branch_id===branch.id);
        if(!same(old,rows)) {
          next[key]=next[key].filter(h=>h.branch_id!==branch.id).concat(rows);
          changes.push({entity:key,id:branch.id,changed:true,count:rows.length});
        }
      }
    }
  }
  for(const key of ['spots','branches']) {unique(next[key],'id',`${key} ID`);unique(next[key],'slug',`${key} slug`);}
  // Existing unrelated inconsistencies are not rewritten; new targets must resolve.
  for(const b of next.branches.filter(b=>b.spot_id===spot.id)) assert.ok(next.spots.some(s=>s.id===b.spot_id),'Orphan branch');
  const changed=changes.some(c=>c.changed);
  if(changed)next.generatedAt=now;
  return {next,changed,changes};
}

export async function integrateCatalog(inputFile,catalogFile,{dryRun=false,expectedHash,beforeCommit}={}) {
  const start=performance.now(), absolute=path.resolve(catalogFile), lock=absolute+'.integrate.lock';
  let handle,temp;
  try {
    if(!dryRun) {handle=await fs.open(lock,'wx',0o600);await handle.writeFile(JSON.stringify({pid:process.pid,createdAt:new Date().toISOString()}));}
    const raw=await fs.readFile(absolute,'utf8'),input=JSON.parse(await fs.readFile(inputFile,'utf8'));
    const readMs=performance.now()-start;
    assert.ok(!expectedHash || hash(raw)===expectedHash,'Catalog changed since dry run');
    const plan=planCatalog(JSON.parse(raw),input), validationMs=performance.now()-start-readMs;
    const writeStart=performance.now();
    if(!dryRun && plan.changed) {
      temp=path.join(path.dirname(absolute),`.spots-catalog-${randomUUID()}.tmp`);
      const file=await fs.open(temp,'wx',(await fs.stat(absolute)).mode & 0o777);
      try {await file.writeFile(JSON.stringify(plan.next,null,2)+'\n');await file.sync();}finally{await file.close();}
      if(beforeCommit)await beforeCommit();
      assert.equal(await fs.readFile(absolute,'utf8'),raw,'Concurrent catalog change; no overwrite');
      await fs.rename(temp,absolute);temp=null;
    }
    const writeMs=performance.now()-writeStart, verifyStart=performance.now();
    if(!dryRun)assert.deepEqual(JSON.parse(await fs.readFile(absolute,'utf8')),plan.next,'Persistence verification failed');
    return {status:dryRun?'dry_run':plan.changed?'written':'unchanged',catalog: absolute,catalogSha256:hash(raw),changes:plan.changes,
      timingMs:{read:readMs,validation:validationMs,write:writeMs,verification:performance.now()-verifyStart,total:performance.now()-start}};
  } finally {
    if(temp)await fs.rm(temp,{force:true});
    if(handle){await handle.close();await fs.rm(lock,{force:true});}
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args=process.argv.slice(2),allowed=new Set(['--catalog','--report','--expected-sha256','--dry-run']);
    const input=args.shift(),options={};
    assert.ok(input&&!input.startsWith('--'),'Usage: integrate-catalog.mjs CONSOLIDATED.json [--dry-run] [--catalog PATH] [--report PATH] [--expected-sha256 HASH]');
    while(args.length){const key=args.shift();assert.ok(allowed.has(key),`Unknown option ${key}`);options[key]=key==='--dry-run'?true:args.shift();assert.ok(options[key],`Missing ${key} value`);}
    const catalog=options['--catalog']||'apps/mobile/public/spots-catalog.json';
    if(options['--report'])assert.ok(![input,catalog,catalog+'.integrate.lock'].some(p=>path.resolve(p)===path.resolve(options['--report'])),'Report cannot replace input/catalog/lock');
    const result=await integrateCatalog(input,catalog,{dryRun:!!options['--dry-run'],expectedHash:options['--expected-sha256']});
    if(options['--report']){await fs.mkdir(path.dirname(path.resolve(options['--report'])),{recursive:true});await fs.writeFile(options['--report'],JSON.stringify(result,null,2)+'\n');}
    console.log(JSON.stringify(result,null,2));
  }catch(e){console.error(e.message);process.exitCode=1;}
}
