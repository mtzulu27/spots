import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const source = await readFile(new URL('./instagram-profile-highlights.js', import.meta.url), 'utf8');
function setup({ ok = true, username = 'example' } = {}) {
  const calls = [];
  const context = vm.createContext({ performance, URL, URLSearchParams, AbortSignal,
    location: {hostname:'www.instagram.com', pathname:'/example/', href:'https://www.instagram.com/example/'},
    document: {cookie:'csrftoken=test-secret', querySelectorAll:() => ['Horarios', 'Productos', 'Sede norte'].map((title,index) =>
      ({href:`https://www.instagram.com/stories/highlights/${index+1}/`,innerText:title}))},
    fetch: async (url, options) => {
      calls.push({url, options});
      const id = JSON.parse(options.body.get('variables')).initial_reel_id;
      return {ok, status:ok ? 200 : 429, text:async()=> JSON.stringify({data:{xdt_viewer:{secret:'viewer'},
        xdt_api__v1__feed__reels_media__connection:{page_info:{has_next_page:false},edges:[{node:{id,
          title:'Horarios', user:{username}, items:[{id:'story',taken_at:1738857069,media_type:1,
            organic_tracking_token:'tracking',image_versions2:{candidates:[
              {url:'https://img.fbcdn.net/a.jpg',width:100,height:100},
              {url:'https://unrelated.example/a.jpg',width:200,height:200}]}}]}}]}}})};
    } });
  vm.runInContext(source, context);
  return {calls, run:()=>context.extractProfileHighlights(JSON.stringify({username:'example',docId:'123'}))};
}
test('selects relevant folders and returns only allowlisted data', async()=>{
  const {calls,run}=setup(); const result=await run();
  assert.equal(calls.length,2); assert.equal(result.folders.length,2);
  assert.equal(result.folders[0].items[0].images.length,1);
  assert.equal(result.status,'captured');
  for(const secret of ['test-secret','tracking','viewer']) assert.ok(!JSON.stringify(result).includes(secret));
});
test('stops without retrying on rate limit',async()=>{
  const {calls,run}=setup({ok:false}); const result=await run();
  assert.equal(calls.length,1); assert.equal(result.status,'partial');
  assert.equal(result.pending[0].reason,'http_429');
});
test('rejects a response from a different profile',async()=>{
  const {run}=setup({username:'someone-else'});const result=await run();
  assert.equal(result.folders.length,0);assert.equal(result.pending[0].reason,'profile_mismatch');
});
