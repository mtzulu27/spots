import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isDesktopExplore, fixedZoneForAction} from '../apps/mobile/lib/desktop-explore-policy.ts';
import {canPinMapZone} from '../apps/mobile/lib/map-zone-policy.ts';
import {getMapSelectionOffset} from '../apps/mobile/lib/map-result-frame.ts';

const neighborhood={south:3.34,north:3.35,west:-76.54,east:-76.53,zoom:16};
test('selection camera keeps the logo above the desktop card',()=>{
  for (const height of [468,635,828]) {
    const offset=getMapSelectionOffset(height,{top:24,bottom:328});
    const pinY=height/2-offset;
    const cardTop=height-80-224;
    assert.ok(pinY>=18, 'pin remains inside map');
    assert.ok(pinY+18+24<cardTop, 'logo clears the card with breathing room');
  }
});
test('mobile selection remains centered without explicit insets',()=>{
  assert.equal(getMapSelectionOffset(635),0);
  assert.equal(getMapSelectionOffset(0,{top:44,bottom:410}),0);
  assert.equal(getMapSelectionOffset(635,{top:44,bottom:44}),0);
});
test('desktop only mounts on wide web, never on native',()=>{
  assert.equal(isDesktopExplore('web',1024),true);
  assert.equal(isDesktopExplore('web',1023),false);
  assert.equal(isDesktopExplore('ios',1440),false);
  assert.equal(isDesktopExplore('android',1440),false);
});
test('pin eligibility reuses the mobile zoom and geographic scale policy',()=>{
  assert.equal(canPinMapZone(neighborhood),true);
  assert.equal(canPinMapZone({...neighborhood,zoom:14}),false);
  assert.equal(canPinMapZone({...neighborhood,east:-76.4}),false);
  assert.equal(canPinMapZone(null),false);
});
test('pin captures a copy of bounds, without zoom or mutable viewport references',()=>{
  const viewport={...neighborhood};
  const area=fixedZoneForAction(null,viewport,true);
  assert.deepEqual(area,{south:3.34,north:3.35,west:-76.54,east:-76.53});
  viewport.south=3.4;
  assert.equal(area.south,3.34);
});
test('later viewport changes cannot silently replace the fixed area',()=>{
  const area=fixedZoneForAction(null,neighborhood,true);
  const moved={...neighborhood,south:3.4,north:3.41};
  assert.equal(area.south,3.34);
  assert.equal(fixedZoneForAction(area,moved,true),null);
});
test('unpin remains possible after zooming out or losing a valid viewport',()=>{
  const area=fixedZoneForAction(null,neighborhood,true);
  assert.equal(fixedZoneForAction(area,null,false),null);
});
test('no zone is created before the viewport meets the pin requirements',()=>{
  assert.equal(fixedZoneForAction(null,neighborhood,false),null);
  assert.equal(fixedZoneForAction(null,null,true),null);
});
