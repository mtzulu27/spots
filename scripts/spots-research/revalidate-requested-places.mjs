import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const exec = promisify(execFile);
const root = 'docs/catalog-review/discovery/revalidation-20261103';
const skill = '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/';
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const save = async (p, x) => fs.writeFile(p, JSON.stringify(x, null, 2) + '\n');
const prior = await read('docs/catalog-review/discovery/profiles-20261102/progress.json');
const catalog = await read('apps/mobile/public/spots-catalog.json');
const handle = value => { try { return new URL(value).pathname.split('/').filter(Boolean)[0]?.toLowerCase(); } catch { return null; } };
await fs.mkdir(root, {recursive:true});
const queue = prior.startedScope.map(item => {
  const spot = catalog.spots.find(s => handle(s.instagram) === item.username || catalog.branches.some(b => b.spot_id === s.id && handle(b.instagram) === item.username) || (item.username === 'primitivorooftop' && s.id === 4025));
  if (!spot) throw Error(`Missing identity: ${item.username}`);
  return {...item, spotId:spot.id, slug:spot.slug, branches:catalog.branches.filter(b => b.spot_id === spot.id).map(b => ({id:b.id,slug:b.slug,address:b.address,neighborhood:b.neighborhood,mall:b.mall,placeId:b.google_place_id}))};
});
await save(`${root}/scope.json`, queue);
const mode = process.argv[2] ?? 'profiles';
for (const item of queue) {
  const dir = `${root}/${item.username}`;
  await fs.mkdir(dir, {recursive:true});
  if (mode === 'profiles') {
    const attempts = [];
    let profile;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const {stdout} = await exec('node', [skill+'extract-profile.mjs', item.username], {maxBuffer:12e6,timeout:90000});
        profile = JSON.parse(stdout);
        attempts.push({attempt, status:profile.status, record:profile.record, coverage:profile.result?.coverage});
        await save(`${dir}/profile.json`,profile);
        if (profile.result?.biography != null) break;
      } catch (e) { attempts.push({attempt,error:e.message}); }
    }
    await save(`${dir}/profile-attempts.json`, {attempts, exhaustion:attempts.length===4, reviewedCoverage:profile?.result?.coverage});
    console.log(JSON.stringify({username:item.username,stage:'profile',attempts:attempts.length,coverage:profile?.result?.coverage}));
  } else if (mode === 'bio') {
    const p = await read(`${dir}/profile.json`);
    const links = [...new Set(p.result?.links ?? [])];
    const sources = [];
    for (const url of links) {
      if (/instagram|tiktok|whatsapp|wa\.me|rappi/i.test(new URL(url).hostname)) { sources.push({url,status:'social_or_delivery_not_menu'}); continue; }
      for (let attempt=1;attempt<=4;attempt++) {
        try {
          const {stdout} = await exec('node',[skill+'extract-bio-links.mjs',url],{maxBuffer:12e6,timeout:180000});
          const result=JSON.parse(stdout); sources.push({url,attempt,...result});
          const evidence=await read(result.path);
          if (!evidence.error && (evidence.pages?.length || evidence.locations?.length)) break;
        } catch(e) { sources.push({url,attempt,error:e.message}); }
      }
    }
    await save(`${dir}/bio-links.json`,{checkedAt:new Date().toISOString(),links,sources,status:links.length?'requires_content_review':'profile_did_not_expose_links',note:'Missing public bio is not evidence of absence; existing official menu evidence remains separate.'});
    console.log(JSON.stringify({username:item.username,stage:'bio',links:links.length,sources:sources.length}));
  } else if (mode === 'places') {
    // Run only after the highlights disposition has been saved for every identity.
    await read(`${dir}/highlights-disposition.json`);
    for (const b of item.branches) {
      const output=`${dir}/places-${b.slug}.json`;
      const query=[item.name,b.mall||b.neighborhood,b.address,'Cali Colombia'].filter(Boolean).join(', ');
      let existing; try {existing=await read(output);}catch{}
      if(existing?.provider==='google_places_new'){console.log(JSON.stringify({username:item.username,branch:b.slug,status:'evidence_already_saved'}));continue;}
      const attempts=[];
      for(let attempt=1;attempt<=4;attempt++) {
        try {
          const args=[skill+'extract-google-places.mjs','--query',query,'--output',output];
          if(b.placeId)args.push('--place-id',b.placeId);
          const {stdout}=await exec('node',args,{maxBuffer:2e6,timeout:45000});
          const result=JSON.parse(stdout);attempts.push({attempt,...result});
          const data=await read(output);
          if(data.selected || data.candidates?.length)break;
        }catch(e){attempts.push({attempt,error:e.message});}
      }
      await save(`${output}.attempts.json`,{query,attempts});
      console.log(JSON.stringify({username:item.username,branch:b.slug,stage:'places',attempts:attempts.length,...attempts.at(-1)}));
    }
  } else throw Error(`Unknown phase ${mode}`);
}
