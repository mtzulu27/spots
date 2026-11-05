import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const root='docs/catalog-review/discovery/video-intake-20261103';
const report=JSON.parse(await fs.readFile(`${root}/reconciliation.json`,'utf8'));
const skill='/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts';
const results=[];
const skip=new Set([30,37,36,63,64]);
for(const r of report.records.filter(r=>r.status==='needs_research'&&!skip.has(r.number))){
  if(r.number===45)continue;
  const dir=`${root}/candidate-${r.number}`;
  await fs.mkdir(dir,{recursive:true});
  const stages={profile:{status:'pending_official_username',reason:'No official Instagram username identified in video. Do not guess a handle.'},bio:{status:'pending_profile_links'},highlights:{status:'pending_official_username'}};
  await fs.writeFile(`${dir}/stages.json`,JSON.stringify(stages,null,2)+'\n');
  const city=r.location.includes('Cali')?'Cali':r.number<=8?'Cali':null;
  if(!city){results.push({...r,status:'pending_city_or_identity',directory:dir});continue;}
  const name=r.name.replace(/\s*\(.*/,'');
  const query=`${name}, ${r.location.replace(/;.*$/,'')}, ${city}`;
  const attempts=[];let evidence;
  for(let attempt=1;attempt<=4;attempt++){
    const started=performance.now();
    try {const {stdout}=await exec('node',[`${skill}/extract-google-places.mjs`,'--query',query,'--output',`${dir}/google-places.json`],{maxBuffer:2e6});const summary=JSON.parse(stdout);attempts.push({attempt,...summary,elapsedMs:performance.now()-started});evidence=JSON.parse(await fs.readFile(`${dir}/google-places.json`,'utf8'));break;}
    catch(e){attempts.push({attempt,error:e.stderr||e.message,elapsedMs:performance.now()-started});}
  }
  await fs.writeFile(`${dir}/places-attempts.json`,JSON.stringify(attempts,null,2)+'\n');
  const result={number:r.number,name:r.name,query,directory:dir,status:evidence?'needs_identity_review':'places_failed_exhausted',candidates:evidence?.candidates,selected:evidence?.selected};
  results.push(result);
  await fs.writeFile(`${root}/places-progress.json`,JSON.stringify({results,complete:false},null,2)+'\n');
  console.log(JSON.stringify({number:r.number,name:r.name,candidates:evidence?.candidates.map(p=>({id:p.placeId,name:p.name,address:p.address})),selected:evidence?.selected?{name:evidence.selected.name,address:evidence.selected.address,website:evidence.selected.website}:null}));
}
await fs.writeFile(`${root}/places-progress.json`,JSON.stringify({results,complete:true},null,2)+'\n');
