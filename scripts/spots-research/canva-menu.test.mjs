import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractCanva} from '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/canva-menu.mjs';

function html(document) {
  const data = JSON.stringify({page:{Bj:{A:{D:{A:document}}}}});
  const literal = data.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  return `window['bootstrap'] = JSON.parse('${literal}')`;
}
test('extracts literal text and nested groups without executing page code',()=>{
  const first={A:2,B:3,a:{C:{A:["Chef's ","café"]}}};
  const group={c:[{a:{C:{A:['12 mil']}}}]};
  const result=extractCanva(html({D:'Carta',A:[{E:[first,group]}]}));
  assert.equal(result.pages[0].blocks[0].text,"Chef's café");
  assert.equal(result.pages[0].blocks[1].path,'E.1.c.0');
  assert.equal(result.pages[0].blocks[0].geometry.B,3);
});
test('rejects unavailable content and unknown schema',()=>{
  assert.throws(()=>extractCanva('<title>Unsupported client</title>'));
  assert.throws(()=>extractCanva(html({D:'Unknown'})));
});
test('does not run arbitrary scripts',()=>{
  globalThis.canvaProbeExecuted=false;
  assert.throws(()=>extractCanva("globalThis.canvaProbeExecuted=true"));
  assert.equal(globalThis.canvaProbeExecuted,false);
});
