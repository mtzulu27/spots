import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec = promisify(execFile);
const root = 'docs/catalog-review/discovery/video-intake-20261103';
const skill = '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts';
const queue = [
  {numbers:[14],username:'ines.cocinayvida',query:'INES Cocina y Vida, Avenida 6 Bis Norte 26N-49, Cali',bioSeeds:['docs/catalog-review/benchmarks/linktr.ee-website-2026-11-03T07-14-49-005Z.json']},
  {numbers:[9],username:'elpatiodelmuseo',query:'El Patio del Museo, Museo La Tertulia, Cali'},
  {numbers:[32],username:'icepubcali',query:'Ice Pub Gastro Bar, Ciudad Jardin, Cali'},
  {numbers:[27],username:'blackhausclub',query:'Black Haus, Calle 13 101-45, Cali',profileSeed:'docs/catalog-review/benchmarks/blackhausclub-profile-http-2026-11-03T07-16-11-517Z.json',profileAttemptsExhausted:true,bioSeeds:['docs/catalog-review/benchmarks/blackhaus-menupp-links-2026-11-03T07-15-10-581Z.json']},
  {numbers:[24],username:'quicklyshotsoficial',query:'Quickly Shots Granada, Cali'},
  {numbers:[62],username:'arawatacali',query:'Club de Escalada Deportiva Arawata, Cali'},
  {numbers:[44,45],username:'migo.col',query:'Migo Cholados y Raspados Bochalema, Cali',bioSeeds:['docs/catalog-review/benchmarks/linktr.ee-website-2026-11-03T13-57-31-061Z.json']},
  {numbers:[29],username:'macanudo.hifi',query:'Macanudo Hifi, Avenida 9 Norte 15AN-31, Cali',bioSeeds:['docs/catalog-review/benchmarks/macanudohifi.com-website-2026-11-03T14-05-33-192Z.json']},
  {numbers:[50],username:'mundanobaroficial',query:'Mundano Bar, Granada, Cali'},
];
const read = async p => JSON.parse(await fs.readFile(p,'utf8'));
const save = (p,v) => fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const run = async args => {
  const start = performance.now();
  try {const r=await exec('node',args,{maxBuffer:16e6});return {ok:true,result:JSON.parse(r.stdout),elapsedMs:performance.now()-start};}
  catch(e){return {ok:false,error:e.stderr||e.message,elapsedMs:performance.now()-start};}
};
const [mode,username] = process.argv.slice(2);
if(mode==='queue'){console.log(JSON.stringify(queue));process.exit(0);}
const item=queue.find(r=>r.username===username);
if(!item)throw Error('Unknown intake profile');
const dir=`${root}/${username}`;
await fs.mkdir(dir,{recursive:true});
if(mode==='pre'){
  try {await fs.access(`${dir}/continuation-acquisition.json`);throw Error('Already acquired; inspect existing report instead of repeating successful sources');}catch(e){if(e.code!=='ENOENT')throw e;}
  const record={...item,startedAt:new Date().toISOString(),profileAttempts:[],bioAttempts:[],unfollowed:[]};
  let profile;
  if(item.profileSeed){profile=await read(item.profileSeed);record.profileAttempts.push({status:'reused_existing_evidence',path:item.profileSeed,attemptsExhausted:!!item.profileAttemptsExhausted});}
  else for(let attempt=1;attempt<=4;attempt++){
    const r=await run([`${skill}/extract-profile.mjs`,username]);record.profileAttempts.push({attempt,...r});profile=r.result;
    if(profile?.result?.displayName&&profile.result.biography!==null)break;
  }
  await save(`${dir}/profile.json`,profile??{status:'failed_exhausted'});
  const seen=new Set();
  for(const seed of item.bioSeeds??[]){const r=await read(seed);seen.add(r.source??r.pages?.[0]?.source);record.bioAttempts.push({status:'reused_existing_evidence',path:seed});}
  for(const url of new Set(profile?.result?.links??[])){
    if(seen.has(url))continue;seen.add(url);
    if(/instagram\.com|facebook\.com|tiktok\.com|wa\.me|whatsapp\.com|reservations/.test(url)){record.unfollowed.push({url,reason:'social_contact_or_reservation_not_menu_source'});continue;}
    for(let attempt=1;attempt<=4;attempt++){
      const arg=/^https:\/\/menupp\.co\/[^/]+\/?$/.test(url)?new URL(url).pathname.split('/')[1]:url;
      const r=await run([`${skill}/extract-bio-links.mjs`,arg]);record.bioAttempts.push({url,attempt,...r});
      const body=r.result?.path?await read(r.result.path):null;
      if(body?.menus?.length||body?.brand||body?.pages?.some(p=>p.status==='http_content_extracted'||p.pdf||p.canva||p.fudo))break;
      if(/Unrecognized app.menupp.co/.test(r.error??'')){record.unfollowed.push({url,reason:'unsupported_restaurant_root_requires_observed_menu_id'});break;}
    }
  }
  record.logoPreparation=await run([`${skill}/profile-logo.mjs`,'prepare',`${dir}/profile.json`,`${dir}/logo.json`]);
  await save(`${dir}/continuation-acquisition.json`,record);
  console.log(JSON.stringify({username,status:profile?.status,name:profile?.result?.displayName,biography:profile?.result?.biography,links:profile?.result?.links,bio:record.bioAttempts.map(r=>({url:r.url,path:r.path??r.result?.path,status:r.status??r.ok})),logo:record.logoPreparation.result}));
}else if(mode==='highlights-blocked'){
  await save(`${dir}/highlights.json`,{status:'blocked_shared_browser_capability',checkedAt:new Date().toISOString(),attempts:username==='ines.cocinayvida'?1:0,capabilityProbe:'ines.cocinayvida: bundle failed in current continuation; same error as four earlier Absenta probes',reason:'Chrome DevTools reports profile already running. No foreign browser was stopped or reused.',coverage:'No highlights read; not evidence of absence.'});
  console.log(JSON.stringify({username,status:'blocked_shared_browser_capability'}));
}else if(mode==='post'){
  const acquisition=await read(`${dir}/continuation-acquisition.json`);
  await fs.access(`${dir}/highlights.json`);
  acquisition.placesAttempts=[];
  for(let attempt=1;attempt<=4;attempt++){
    const r=await run([`${skill}/extract-google-places.mjs`,'--query',item.query,'--output',`${dir}/google-places.json`]);
    acquisition.placesAttempts.push({attempt,...r});if(r.ok)break;
  }
  acquisition.finishedAt=new Date().toISOString();
  await save(`${dir}/continuation-acquisition.json`,acquisition);
  const p=await read(`${dir}/google-places.json`);
  const brief = p=>p?{id:p.placeId,name:p.name,address:p.address,status:p.businessStatus,hours:p.regularHours,website:p.website,phone:p.internationalPhone}:null;
  console.log(JSON.stringify({username,selected:brief(p.selected),candidates:p.candidates?.map(brief)}));
}else throw Error('Expected queue, pre or post');
