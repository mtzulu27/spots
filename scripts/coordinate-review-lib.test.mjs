import test from 'node:test';
import assert from 'node:assert/strict';
import { isCandidate, validCoordinates, distanceMeters } from './coordinate-review-lib.mjs';

test('rejects generic names, roads, neighbourhoods and bike racks', () => {
  for (const tags of [{ name: 'Restaurante' }, { name: 'Parque' },
    { name: 'Cristo Rey', highway: 'path' }, { name: 'Domingo', place: 'neighbourhood' },
    { name: 'Museo La Tertulia', amenity: 'bicycle_parking' }]) {
    assert.equal(isCandidate(tags.name === 'Restaurante' ? 'Sonoma Restaurante Peruano' : tags.name, { tags }), false);
  }
});
test('matches accent variants without treating a candidate as an approval', () => {
  assert.equal(isCandidate('Santa Fusión', { tags: { name: 'Santa fusion', shop: 'bakery' } }), true);
  assert.equal(isCandidate('EVA Colombia', { tags: { name: 'Evacol', shop: 'shoes' } }), false);
});
test('rejects missing, nonfinite and out of range coordinates', () => {
  for (const latitude of [null, undefined, '3.4', NaN, Infinity, 91]) {
    assert.equal(validCoordinates({ latitude, longitude: -76.5 }), false);
  }
  assert.equal(validCoordinates({ latitude: 3.4, longitude: -76.5 }), true);
});
test('distance uses metres and handles missing points', () => {
  assert.equal(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }), 0);
  assert.ok(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0.001, longitude: 0 }) > 110);
  assert.equal(distanceMeters({}, {}), null);
});
