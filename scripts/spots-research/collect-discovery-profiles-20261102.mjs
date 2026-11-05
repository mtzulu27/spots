import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec = promisify(execFile);
const skill = '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/';
const root = 'docs/catalog-review/discovery/profiles-20261102';
const catalog = JSON.parse(await fs.readFile('apps/mobile/public/spots-catalog.json', 'utf8'));
const lines = (await fs.readFile('docs/catalog-review/discovery/instagram-candidatos.csv', 'utf8')).trim().split('\n').slice(1);
const handle = value => {try{return new URL(value).pathname.split('/').filter(Boolean)[0]?.toLowerCase();}catch{return null;}};
const queue = lines.map(line => {
  const [number, name, instagram] = line.split(',');
  if (!instagram) return null;
  const username = handle(instagram);
  const matches = catalog.spots.filter(s => handle(s.instagram) === username || catalog.branches.some(b => b.spot_id === s.id && handle(b.instagram) === username));
  return {number:Number(number), name, username, instagram, matches:matches.map(s=>({id:s.id,slug:s.slug,name:s.name}))};
}).filter(Boolean).sort((a,b)=>Number(Boolean(a.matches.length))-Number(Boolean(b.matches.length)) || a.number-b.number);
await fs.mkdir(root, {recursive:true});
const records = [];
const write = (file, data) => fs.writeFile(file, JSON.stringify(data,null,2)+'\n');
for (const item of queue) {
  const dir = `${root}/${item.username}`;
  await fs.mkdir(dir,{recursive:true});
  const record = {...item, startedAt:new Date().toISOString(), profileAttempts:[], bioAttempts:[], omittedLinks:[]};
  const started = performance.now();
  let profile;
  for (let attempt=1;attempt<=4;attempt++) {
    let result;
    if (item.username === 'bigbilly.co' && attempt === 1) {
      result = JSON.parse(await fs.readFile('docs/catalog-review/benchmarks/bigbilly.co-profile-http-2026-11-03T04-33-36-100Z.json','utf8'));
      result.record = 'docs/catalog-review/benchmarks/bigbilly.co-profile-http-2026-11-03T04-33-36-100Z.json';
    } else {
      const {stdout} = await exec('node',[skill+'extract-profile.mjs',item.username],{maxBuffer:12*1024*1024});
      result = JSON.parse(stdout);
    }
    record.profileAttempts.push({attempt,status:result.status,record:result.record,timingMs:result.timingMs});
    profile = result;
    await write(`${dir}/profile.json`,profile);
    if (profile.result?.displayName && profile.result?.biography != null) break;
  }
  record.profileCoverage = profile.result?.coverage ?? null;
  const links = [...new Set(profile.result?.links ?? [])];
  const seen = new Set();
  for (let i=0;i<links.length;i++) {
    const link = links[i];
    if (seen.has(link)) continue;
    seen.add(link);
    if (/rappi\.|didi-food|didiglobal|wa\.me|whatsapp\.|instagram\.|tiktok\./i.test(new URL(link).hostname)) {
      record.omittedLinks.push({url:link,reason:'delivery_or_social_not_regular_in_person_menu'});
      continue;
    }
    let latest;
    for (let attempt=1;attempt<=4;attempt++) {
      try {
        const {stdout} = await exec('node',[skill+'extract-bio-links.mjs',link],{maxBuffer:12*1024*1024});
        const summary = JSON.parse(stdout);
        const report = JSON.parse(await fs.readFile(summary.path,'utf8'));
        latest = {url:link,attempt,...summary};
        record.bioAttempts.push(latest);
        const errors = report.error || report.pending?.some(p=>/error|failed|timeout|blocked/i.test(JSON.stringify(p)));
        const menupp = report.source?.includes('menupp.co') && report.locations;
        const good = !errors && (menupp ? report.locations.length && report.menus?.length : report.pages?.some(p=>p.text || p.pdf || p.canva || p.fudo));
        if (good) {
          for (const page of report.pages ?? []) for (const l of page.links ?? []) {
            const u = typeof l === 'string' ? l : l.url ?? l.href;
            if (u && /^https:\/\/(?:app\.)?menupp\.co\//.test(u) && !links.includes(u)) links.push(u);
          }
          break;
        }
      } catch (error) { latest={url:link,attempt,error:error.message};record.bioAttempts.push(latest); }
    }
  }
  await write(`${dir}/bio-links.json`,{links,attempts:record.bioAttempts,omitted:record.omittedLinks,status:record.bioAttempts.length?'requires_agent_review':'no_usable_link_in_profile'});
  await write(`${dir}/highlights.json`,{status:'blocked_tool_unavailable',reason:'Required Chrome DevTools MCP is not exposed in this session; no browser fallback permitted.',inventory:profile.result?.highlights ?? null,attempts:0,retryDisposition:'No retry can create a missing tool; capability blocker explicitly verified.'});
  await write(`${dir}/google-places.json`,{status:'blocked_missing_api_key',query:`${item.name}, Cali Colombia`,attempts:0,retryDisposition:'GOOGLE_PLACES_API_KEY absent from authorized environment; no secret-file search or alternative source substitution.'});
  record.elapsedMs=performance.now()-started;
  record.status='collected_needs_agent_review';
  await write(`${dir}/acquisition.json`,record);
  records.push(record);
  await write(`${root}/progress.json`,{startedScope:queue,records,complete:records.length===queue.length});
  console.log(JSON.stringify({username:item.username,existing:item.matches,profile:profile.status,links:record.bioAttempts.length,elapsedMs:record.elapsedMs}));
}
