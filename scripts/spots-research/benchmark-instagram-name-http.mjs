import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { parseProfile } from './parse-instagram-profile-html.mjs';

const username = process.argv[2];
const profileMode = process.argv.includes('--profile');
if (!/^[\w.]{1,30}$/.test(username || '')) throw new Error('Provide an Instagram username');
const url = `https://www.instagram.com/${username}/`;
const startedAt = new Date().toISOString();
const start = performance.now();
const report = {task:'extract_instagram_display_name', method:'node_fetch_public_profile_no_session',
  source:url, startedAt, requestCount:1, retries:0, result:null, status:'pending', timingMs:{},
  notes:['No browser, cookies or credentials. No response HTML retained. No catalog changes.',
    'Timing measures script execution; implementation and final explanation excluded.']};
if(profileMode)report.task='extract_instagram_name_bio_links_photo';
const decode = s => s.replace(/&quot;/g,'"').replace(/&#(?:39|x27);/gi,"'")
  .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => {
    const code = n[0].toLowerCase()==='x' ? parseInt(n.slice(1),16) : Number(n);
    return code<=0x10ffff ? String.fromCodePoint(code) : '';
  });
try {
  const response = await fetch(url, {redirect:'manual', signal:AbortSignal.timeout(15000),
    headers:{Accept:'text/html','User-Agent':'SpotsResearchBenchmark/1.0'}});
  report.timingMs.toHeaders = performance.now()-start;
  report.httpStatus = response.status;
  if (response.status>=300 && response.status<400) {
    report.status='redirect_not_followed';
    const location=response.headers.get('location');
    report.redirectPath=location ? new URL(location,url).pathname : null;
    await response.body?.cancel();
  } else if (!response.ok) {
    report.status='http_error';
    await response.body?.cancel();
  } else {
    const reader=response.body.getReader();
    const chunks=[];let size=0;
    while(true){
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>5_000_000){await reader.cancel();throw new Error('body_size_limit');}
      chunks.push(value);
    }
    report.bytesReceived=size;
    report.timingMs.downloadComplete=performance.now()-start;
    const parseStart=performance.now();
    const html=Buffer.concat(chunks).toString('utf8');
    const titles=[...html.matchAll(/<meta\b[^>]*>/gi)].flatMap(([tag])=>{
      const attrs=Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(m=>[m[1].toLowerCase(),decode(m[3])]));
      return attrs.property==='og:title' ? [attrs.content || ''] : [];
    });
    titles.push(decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''));
    const escaped=username.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const pattern=new RegExp(`^(.+?)\\s*\\(@${escaped}\\)(?:\\s|$)`,'i');
    for(const title of titles){
      const match=title.trim().match(pattern);
      if(match){report.result={username,displayName:match[1].trim()};break;}
    }
    if(profileMode)report.result=parseProfile(html,username);
    report.timingMs.parse=performance.now()-parseStart;
    report.status=profileMode ? (Object.values(report.result.coverage).includes('not_available')?'partial':'extracted')
      : report.result ? 'extracted' : 'name_not_available_in_public_html';
  }
} catch(error) {
  report.status='request_failed';
  report.error={name:error.name,message:error.message,code:error.cause?.code ?? null};
}
report.finishedAt=new Date().toISOString();
report.timingMs.total=performance.now()-start;
const folder='docs/catalog-review/benchmarks';
await fs.mkdir(folder,{recursive:true});
const output=`${folder}/${username}-${profileMode?'profile':'name'}-http-${startedAt.replace(/[:.]/g,'-')}.json`;
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,record:output},null,2));
