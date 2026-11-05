import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
const skillRoot = process.env.SPOTS_EXTRACTION_SKILL || '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar';
const source = await fs.readFile(path.join(skillRoot,'scripts/extract-highlights.js'),'utf8');
const imageUrl = 'https://scontent.cdninstagram.com/test.jpg?signature=temporary';
const pic = id => ({id,media_type:1,taken_at:1000,image_versions2:{candidates:[{url:imageUrl,width:1200,height:2000}]}});
const anchors = ['Cosas','Check in','📍','Horarios','🍽️','🏠'].map((title,i)=>({href:`https://www.instagram.com/stories/highlights/${i+1}/`,innerText:title}));
let calls = 0, requests = [], downloads = 0;
const context = vm.createContext({console,performance,URL,URLSearchParams,AbortSignal,Date,crypto,
  location:{hostname:'www.instagram.com',pathname:'/test/',href:'https://www.instagram.com/test/'},
  document:{cookie:'',querySelectorAll:()=>anchors},
  fetch:async(url,options)=>{
    calls++;
    const variables=JSON.parse(options.body.get('variables')); requests.push(variables.reel_ids);
    return {ok:true,text:async()=>JSON.stringify({data:{xdt_api__v1__feed__reels_media__connection:{
      edges:variables.reel_ids.map(id=>({node:{id,title:id,user:{username:'test'},items:[pic(id+'_photo'),
        {id:id+'_video',media_type:2,video_versions:[{url:'secret_video'}],image_versions2:{candidates:[{url:imageUrl}]}}]}})),
      page_info:{has_next_page:false}}}})};
  }});
vm.runInContext(source.split('// NODE_CLI_ONLY')[0],context);
assert.equal(context.highlightTopic('Check in'),'locations');
assert.equal(context.highlightTopic('📍'),'locations');
assert.equal(context.highlightTopic('🍽️'),'menu');
assert.equal(context.highlightTopic('🕘'),'hours');
assert.equal(context.highlightTopic('Clientes'),null);
const result=await context.extractProfileHighlights(JSON.stringify({username:'test',docId:'123',videoPreviews:false}));
assert.equal(result.selected.length,5);assert.equal(calls,2);
assert.equal(requests[0][0],'highlight:4');
assert.equal(result.folders.length,5);
assert.ok(!JSON.stringify(result).includes('secret_video'));
assert.ok(result.folders.every(f=>f.items[1].status==='omitido_video_por_instruccion' && !f.items[1].images));
const previewResult=await context.extractProfileHighlights(JSON.stringify({username:'test',docId:'123'}));
assert.ok(previewResult.folders.every(f=>f.items[1].readScope==='video_preview_only' && f.items[1].images.length===1));
assert.ok(!JSON.stringify(previewResult).includes('secret_video'));
const item=result.folders[0].items[0];
const cache={username:'test',entries:[{...item,status:'transcribed',text:'Lunes 9 a 18'}]};
let next=await context.extractProfileHighlights(JSON.stringify({username:'test',docId:'123',cache}));
assert.equal(next.folders[0].items[0].status,'cached_transcription');
next=await context.extractProfileHighlights(JSON.stringify({username:'test',docId:'123',cache,fresh:true}));
assert.equal(next.folders[0].items[0].status,'needs_transcription');
cache.entries[0].mediaKey='different';
next=await context.extractProfileHighlights(JSON.stringify({username:'test',docId:'123',cache}));
assert.equal(next.folders[0].items[0].status,'needs_transcription');
context.fetch=async()=>({ok:false,status:429});
next=await context.extractProfileHighlights(JSON.stringify({username:'test',docId:'123'}));
assert.equal(next.calls.length,1);assert.equal(next.pending.length,5);
context.fetch=async()=>({ok:true,text:async()=>JSON.stringify({data:{xdt_api__v1__feed__reels_media__connection:{edges:[],page_info:{has_next_page:true}}}})});
next=await context.extractProfileHighlights(JSON.stringify({username:'test',docId:'123'}));
assert.equal(next.status,'partial');assert.equal(next.folders.length,0);
// Test temporary downloads, transcription validation, incremental cache and cleanup.
const cliContext=vm.createContext({console:{log:()=>{}},performance,URL,crypto,Date,process,Buffer,AbortSignal,
  fetch:async()=>{downloads++;return new Response(new Uint8Array([255,216,255]),{headers:{'content-type':'image/jpeg'}});}});
vm.runInContext(source.split("if (typeof process !==")[0],cliContext,{importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER});
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'spots-highlights-tests-'));
try {
  const data=path.join(dir,'highlights.json'), manifestFile=path.join(dir,'manifest.json'), input=path.join(dir,'input.json');
  await fs.writeFile(data,JSON.stringify(result));
  await cliContext.highlightsCli(['prepare',data,manifestFile]);
  const manifest=JSON.parse(await fs.readFile(manifestFile));
  assert.equal(downloads,5);assert.equal(manifest.skipped.length,5);assert.equal(manifest.batches.length,1);
  await fs.writeFile(input,JSON.stringify({username:'test',entries:[]}));
  await assert.rejects(cliContext.highlightsCli(['commit',manifestFile,input]),/every downloaded image/);
  await fs.writeFile(input,JSON.stringify({username:'test',entries:manifest.items.map(i=>({id:i.id,text:'Example hours',status:'transcribed'}))}));
  await cliContext.highlightsCli(['commit',manifestFile,input]);
  await assert.rejects(fs.stat(manifest.tempDir),{code:'ENOENT'});
  await cliContext.highlightsCli(['prepare',data,manifestFile]);
  const second=JSON.parse(await fs.readFile(manifestFile));
  assert.equal(second.reused.length,5);assert.equal(downloads,5);
  await cliContext.highlightsCli(['cleanup',manifestFile]);
  await assert.rejects(fs.stat(second.tempDir),{code:'ENOENT'});
  await fs.writeFile(data,JSON.stringify(previewResult));
  await cliContext.highlightsCli(['prepare',data,manifestFile]);
  const previews=JSON.parse(await fs.readFile(manifestFile));
  assert.equal(previews.reused.length,5);assert.equal(downloads,10);
  assert.ok(previews.items.every(i=>i.readScope==='video_preview_only'));
  await fs.writeFile(input,JSON.stringify({username:'test',entries:previews.items.map(i=>({id:i.id,text:'Visible information card',status:'transcribed'}))}));
  await cliContext.highlightsCli(['commit',manifestFile,input]);
  const stored=JSON.parse(await fs.readFile(path.join(dir,'transcriptions.json')));
  assert.equal(stored.entries.filter(e=>e.readScope==='video_preview_only').length,5);
  await assert.rejects(fs.stat(previews.tempDir),{code:'ENOENT'});
  const payloadFile=path.join(dir,'payload.json');
  await fs.writeFile(payloadFile,JSON.stringify({result:previewResult,timings:{evaluateToolMs:12}}));
  await cliContext.highlightsCli(['ingest',payloadFile,dir,'--fresh']);
  const integrated=JSON.parse(await fs.readFile(manifestFile));
  assert.equal(integrated.items.length,10);assert.equal(integrated.reused.length,0);
  assert.equal(JSON.parse(await fs.readFile(path.join(dir,'acquisition-timing.json'))).evaluateToolMs,12);
  await fs.writeFile(input,JSON.stringify({username:'test',entries:integrated.items.map(i=>({id:i.id,text:'Visible text',status:'transcribed'}))}));
  await cliContext.highlightsCli(['finish',input,manifestFile]);
  await assert.rejects(fs.stat(integrated.tempDir),{code:'ENOENT'});
} finally {
  try {const m=JSON.parse(await fs.readFile(path.join(dir,'manifest.json')));await fs.rm(m.tempDir,{recursive:true,force:true});} catch {}
  await fs.rm(dir,{recursive:true,force:true});
}
console.log('PASS: selection, emoji, batches, priority, no videos, cache, fresh, errors, partial coverage, download, commit, cleanup');
const profileSource=(await fs.readFile(path.join(skillRoot,'scripts/extract-profile.mjs'),'utf8')).split("import fs from")[0].replace('export function parseProfile','function parseProfile');
const profileContext=vm.createContext({URL});vm.runInContext(profileSource,profileContext);
const fixture={users:[{username:'test',id:'10',full_name:'Test',biography:'Bio'}],nodes:[
  {id:'highlight:111',title:'📍',user:{id:'10',username:'test'}},
  {id:'highlight:222',title:'Horarios',user:{id:'99',username:'another'}}]};
const parsed=profileContext.parseProfile(`<script type="application/json">${JSON.stringify(fixture)}</script>`,'test');
assert.equal(parsed.highlights.inventory.length,1);assert.equal(parsed.highlights.inventory[0].id,'111');
const absent=profileContext.parseProfile('<html></html>','test');assert.equal(absent.highlights.status,'inventory_not_available_in_public_html');
console.log('PASS: public inventory owner matching and honest absence');
// The host coordinator must chain acquisition/preparation and close only its own tab.
const options={username:'test',directory:dir,fresh:true};
const bundle={scriptPath:'/safe/script.js',browserFunction:'async()=>({})'};
const seenTools=[];
const mockTools={
  mcp__chrome_devtools__list_pages:async()=>({content:[{type:'text',text:'5: Instagram (https://www.instagram.com/other/)'}]}),
  mcp__chrome_devtools__new_page:async()=>{seenTools.push('open');return {content:[{type:'text',text:'7: Instagram (https://www.instagram.com/test/) [selected]'}]};},
  mcp__chrome_devtools__evaluate_script:async()=>{seenTools.push('evaluate');return {content:[{type:'text',text:'```json\n'+JSON.stringify(result)+'\n```'}]};},
  mcp__chrome_devtools__close_page:async({pageId})=>{assert.equal(pageId,7);seenTools.push('close');},
  exec_command:async({cmd})=>{assert.ok(cmd.includes(' ingest - '));assert.ok(cmd.endsWith(' --fresh'));seenTools.push('prepare');return {exit_code:0,output:'{"ready":5}'};}
};
const host=vm.createContext({Date,JSON});
vm.runInContext(source.slice(source.indexOf('async function runHighlightsWorkflow'),source.indexOf('async function highlightsCli')),host);
assert.equal((await host.runHighlightsWorkflow(mockTools,bundle,options)).ready,5);
assert.deepEqual(seenTools,['open','evaluate','close','prepare']);
seenTools.length=0;
mockTools.mcp__chrome_devtools__evaluate_script=async()=>{throw Error('failed');};
await assert.rejects(host.runHighlightsWorkflow(mockTools,bundle,options),/failed/);
assert.deepEqual(seenTools,['open','close']);
seenTools.length=0;
mockTools.mcp__chrome_devtools__list_pages=async()=>({content:[{type:'text',text:'5: Instagram (https://www.instagram.com/test/)'}]});
await assert.rejects(host.runHighlightsWorkflow(mockTools,bundle,options),/failed/);
assert.deepEqual(seenTools,[]);
console.log('PASS: integrated ingest/finish, fresh download, own-tab cleanup on error, reuse preserves existing tab');
