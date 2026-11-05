import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const root='docs/catalog-review/discovery/video-intake-20261103';
const skill='/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts';
const queue=[
  {number:36,username:'epocavideobar',query:'Epoca Video Bar, Granada Cali',website:'https://epocavideobar.com/',seed:'docs/catalog-review/benchmarks/epocavideobar-profile-http-2026-11-03T06-52-22-790Z.json'},
  {number:64,username:'ceramica_almadelatierra',query:'Taller Ceramica Alma de la Tierra, Cali'},
  {number:10,username:'cumbrepanycocina',query:'Cumbre Pan y Cocina, San Antonio Cali'},
  {number:22,username:'cailecultoalperreo',query:'Caile Culto al Perreo, Granada Cali'},
  {number:39,username:'sabormolidocali',query:'Sabor Molido Rooftop, Cali'},
  {number:5,username:'royipets',query:'Royi al Parque, Pance Cali',website:'https://royipets.com/'},
];
const run=async(args)=>{const start=performance.now();try{let {stdout}=await exec('node',args,{maxBuffer:12e6});return {ok:true,result:JSON.parse(stdout),elapsedMs:performance.now()-start};}catch(e){return {ok:false,error:e.stderr||e.message,elapsedMs:performance.now()-start};}};
const save=(file,data)=>fs.writeFile(file,JSON.stringify(data,null,2)+'\n');
const records=[];
for(const item of queue){
  const dir=`${root}/${item.username}`;await fs.mkdir(dir,{recursive:true});
  const record={...item,startedAt:new Date().toISOString(),profileAttempts:[],bioAttempts:[]};
  const start=performance.now();let profile;
  for(let attempt=1;attempt<=4;attempt++){
    const r=attempt===1&&item.seed?{ok:true,result:JSON.parse(await fs.readFile(item.seed,'utf8'))}:await run([`${skill}/extract-profile.mjs`,item.username]);
    record.profileAttempts.push({attempt,...r});profile=r.result;
    if(profile?.result?.displayName&&profile.result.biography!==null)break;
  }
  await save(`${dir}/profile.json`,profile??{status:'failed_exhausted'});
  const links=[...new Set([...(profile?.result?.links??[]),...(item.website?[item.website]:[])])];
  const processed=new Set();
  for(const link of links){
    if(processed.has(link))continue;processed.add(link);
    if(/instagram\.com|tiktok\.com|facebook\.com|reservations/i.test(link)){record.bioAttempts.push({url:link,status:'omitted_social_or_reservation'});continue;}
    for(let attempt=1;attempt<=4;attempt++){
      const arg=/^https:\/\/menupp\.co\/[^/]+\/?$/.test(link)?new URL(link).pathname.split('/')[1]:link;
      const r=await run([`${skill}/extract-bio-links.mjs`,arg]);
      record.bioAttempts.push({url:link,attempt,...r});
      if(r.ok&&r.result.path){const body=JSON.parse(await fs.readFile(r.result.path,'utf8'));if(body.menus?.length||body.pages?.some(p=>p.text||p.pdf||p.canva||p.fudo))break;}
    }
  }
  await save(`${dir}/bio-links.json`,{links,attempts:record.bioAttempts});
  record.logoPreparation=await run([`${skill}/profile-logo.mjs`,'prepare',`${dir}/profile.json`,`${dir}/logo.json`]);
  await save(`${dir}/highlights.json`,{status:'blocked_shared_browser_capability',attempts:0,capabilityVerifiedBy:'absentacali: four failed bundle attempts in this same run',reason:'Chrome DevTools reports profile already running. No user session or foreign browser process is stopped or reused.',coverage:'Not read; no claim that highlights are absent.'});
  record.placesAttempts=[];
  for(let attempt=1;attempt<=4;attempt++){
    const r=await run([`${skill}/extract-google-places.mjs`,'--query',item.query,'--output',`${dir}/google-places.json`]);record.placesAttempts.push({attempt,...r});if(r.ok)break;
  }
  record.elapsedMs=performance.now()-start;await save(`${dir}/acquisition.json`,record);records.push(record);
  await save(`${root}/profiles-progress.json`,{complete:false,records});
  console.log(JSON.stringify({number:item.number,username:item.username,profile:profile?.status,displayName:profile?.result?.displayName,bio:profile?.result?.biography,links,logo:record.logoPreparation.result,elapsedMs:record.elapsedMs}));
}
await save(`${root}/profiles-progress.json`,{complete:true,records});
