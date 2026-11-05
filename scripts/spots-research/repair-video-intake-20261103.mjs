import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const root='docs/catalog-review/discovery/video-intake-20261103';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const maybe=async p=>read(p).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
const save=(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const [mode,username,key,encoded]=process.argv.slice(2);
if(mode==='retry-bio'){
  const limit=Number(encoded),directory=`${root}/${username}`;
  if(!Number.isSafeInteger(limit)||limit<1||limit>4)throw Error('Invalid remaining attempt count');
  await fs.mkdir(directory,{recursive:true});
  const file=`${directory}/repair-attempts.json`,record=await maybe(file)??{username,startedAt:new Date().toISOString(),tasks:{}};
  const task=`bio:${key}`;record.tasks[task]??=[];
  for(let attempt=1;attempt<=limit;attempt++){
    const start=performance.now();let r;
    try{const {stdout}=await exec('node',['/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/extract-bio-links.mjs',key],{maxBuffer:12e6});const result=JSON.parse(stdout),body=result.path?await read(result.path):null;r={result,path:result.path,status:body?.status??body?.pages?.[0]?.status,errors:body?.error??body?.pages?.filter(p=>p.error).map(p=>p.error)};}
    catch(e){r={status:'failed',error:e.stderr||e.message};}
    record.tasks[task].push({attempt,checkedAt:new Date().toISOString(),elapsedMs:performance.now()-start,...r});record.updatedAt=new Date().toISOString();await save(file,record);
    console.log(JSON.stringify({username,source:key,attempt,...r}));
    if(r.status==='public_menu_records_received'||r.status==='http_content_extracted')break;
  }
  process.exit(0);
}
if(mode==='log'||mode==='log-json'){
  if(!/^[a-z0-9_.]+$/.test(username))throw Error('Invalid profile');
  const directory=`${root}/${username}`;await fs.mkdir(directory,{recursive:true});
  const file=`${directory}/repair-attempts.json`,record=await maybe(file)??{username,startedAt:new Date().toISOString(),tasks:{}};
  const value=JSON.parse(mode==='log-json'?encoded:Buffer.from(encoded,'base64').toString('utf8'));
  (record.tasks[key]??=[]).push(value);record.updatedAt=new Date().toISOString();
  await save(file,record);console.log(JSON.stringify({username,key,attempts:record.tasks[key].length}));process.exit(0);
}
if(mode!=='audit')throw Error('Expected audit or log');
const known={
  absentacali:'docs/catalog-review/benchmarks/absentacali-profile-http-2026-11-03T06-46-12-567Z.json',
  sinfrenoscali:'docs/catalog-review/benchmarks/sinfrenoscali-profile-http-2026-11-03T06-48-13-628Z.json',
};
for(const [user,source] of Object.entries(known)){
  if(!await maybe(`${root}/${user}/profile.json`))await save(`${root}/${user}/profile.json`,await read(source));
}
const summary=await read(`${root}/integration-summary.json`);
const profiles=[];
for(const name of await fs.readdir(root)){
  const directory=`${root}/${name}`;
  if(!(await fs.stat(directory)).isDirectory()||name.startsWith('candidate-'))continue;
  const profile=await maybe(`${directory}/profile.json`);
  const acquisition=await maybe(`${directory}/acquisition.json`)??await maybe(`${directory}/continuation-acquisition.json`);
  const repair=await maybe(`${directory}/repair-attempts.json`);
  const sources=new Set((acquisition?.bioAttempts??[]).map(a=>a.path??a.result?.path).filter(Boolean));
  for(const [task,attempts] of Object.entries(repair?.tasks??{})){
    if(task.startsWith('bio:'))for(const attempt of attempts){
      const source=attempt.path??attempt.result?.path;
      if(source)sources.add(source);
    }
  }
  const menuRepair=await maybe(`${directory}/menu-repair-review.json`);
  if(name==='absentacali')sources.add('docs/catalog-review/benchmarks/absenta-menupp-links-2026-11-03T06-46-41-997Z.json');
  if(name==='sinfrenoscali'){
    for(const f of await fs.readdir('docs/catalog-review/benchmarks'))if(f.startsWith('wa.link-website-')&&f.includes('2026-11-03T06-48'))sources.add(`docs/catalog-review/benchmarks/${f}`);
  }
  const bios=[];
  for(const source of sources){
    const data=await read(source);
    const ownPages=(data.pages??[]).filter(p=>p.depth===0||!['linktr.ee','api.whatsapp.com','www.whatsapp.com'].includes((()=>{try{return new URL(p.finalUrl??p.source).hostname}catch{return ''}})()));
    bios.push({source,sourceUrl:data.source??data.pages?.[0]?.source,status:data.status,menus:(data.menus??[]).map(m=>({source:m.source,name:m.metadata?.name,products:m.products?.length})),pages:ownPages.map(p=>({url:p.finalUrl??p.source,status:p.status,error:p.error,pdfStatus:p.pdf?.status,pdfPages:p.pdf?.pages?.length,canvaStatus:p.canva?.status}))});
  }
  const highlights=await maybe(`${directory}/highlights.json`);
  const places=[];
  for(const f of await fs.readdir(directory))if(/^google-places.*\.json$/.test(f)&&!f.endsWith('.timing.json')){
    const g=await read(`${directory}/${f}`);places.push({file:f,query:g.query,selected:g.selected?{id:g.selected.placeId,name:g.selected.name,address:g.selected.address}:null,candidateCount:g.candidateCount});
  }
  const logo=await maybe(`${directory}/logo.json`);
  profiles.push({username:name,integratedId:summary.created.find(r=>r.username===name)?.id??null,profile:{status:profile?.status,hasName:!!profile?.result?.displayName,hasBio:profile?.result?.biography!=null,attempts:(acquisition?.profileAttempts??[]).length,reusedExhausted:(acquisition?.profileAttempts??[]).some(a=>a.attemptsExhausted),links:profile?.result?.links??[]},bio:bios,menuRepair,highlights:{status:highlights?.status,actualRepairAttempts:repair?.tasks?.highlights?.length??0},logo:{status:logo?.status,preparationError:acquisition?.logoPreparation?.error},places});
}
const report={checkedAt:new Date().toISOString(),profiles,counts:summary.reviewCounts,allRequirementsComplete:false};
await save(`${root}/skill-audit.json`,report);
console.log(JSON.stringify(report,null,2));
