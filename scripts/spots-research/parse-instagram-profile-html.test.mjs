import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProfile} from './parse-instagram-profile-html.mjs';
const html=data=>`<script type="application/json">${JSON.stringify(data)}</script>`;
test('extracts only matching profile fields, including multiline biography',()=>{
  const r=parseProfile(html({users:[{username:'viewer',biography:'private',external_url:'https://wrong.example'},
    {username:'example',full_name:'Example',biography:'Line 1\nLine 2',bio_links:[{url:'https://menu.example'}],profile_pic_url:'https://img.example/a.jpg'}]}),'example');
  assert.equal(r.displayName,'Example');assert.equal(r.biography,'Line 1\nLine 2');
  assert.deepEqual(r.links,['https://menu.example/']);assert.equal(r.logoVerified,false);
  assert.ok(!JSON.stringify(r).includes('private'));
});
test('does not infer missing biography or links from unrelated metadata',()=>{
  const r=parseProfile('<meta property="og:title" content="Other (@other)"><meta property="og:image" content="https://wrong.example/a.jpg">','example');
  assert.equal(r.displayName,null);assert.equal(r.biography,null);assert.equal(r.profilePhotoUrl,null);
  assert.equal(r.coverage.links,'not_available');
});
test('handles encoded profile payload and preserves explicitly empty bio',()=>{
  const r=parseProfile(html({payload:JSON.stringify({username:'example',full_name:'Name',biography:'',bio_links:[]})}),'example');
  assert.equal(r.biography,'');assert.equal(r.coverage.links,'embedded_bio_links');
});
test('ignores malformed JSON and unsafe URL schemes',()=>{
  const r=parseProfile(html({username:'example',external_url:'javascript:alert(1)'})+'<script type="application/json">bad</script>','example');
  assert.deepEqual(r.links,[]);
});
