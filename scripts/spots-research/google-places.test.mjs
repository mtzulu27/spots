import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvidence, getPlaceDetails, searchPlaces } from './google-places.mjs';

const response = body => ({ ok: true, json: async () => body });

test('busqueda usa field mask economico y normaliza candidatos', async () => {
  let request;
  const places = await searchPlaces({
    query: 'Buleria Cali', apiKey: 'test', latitude: 3.45, longitude: -76.53,
    fetchImpl: async (url, options) => { request = { url, options }; return response({ places: [{ id: 'abc', displayName: { text: 'Bulería' }, formattedAddress: 'Cali', location: { latitude: 3.45, longitude: -76.53 } }] }); },
  });
  assert.equal(places[0].placeId, 'abc');
  assert.match(request.options.headers['X-Goog-FieldMask'], /places\.id/);
  assert.equal(JSON.parse(request.options.body).locationBias.circle.center.latitude, 3.45);
});

test('detalles conservan horarios, contacto y atribuciones fotograficas', async () => {
  const place = await getPlaceDetails({
    placeId: 'abc', apiKey: 'test',
    fetchImpl: async () => response({ id: 'abc', displayName: { text: 'Bulería' }, nationalPhoneNumber: '318 000 0000', regularOpeningHours: { weekdayDescriptions: ['lunes: 12:00–22:00'] }, photos: [{ name: 'places/abc/photos/1', authorAttributions: [{ displayName: 'Autor' }] }] }),
  });
  assert.equal(place.phone, '318 000 0000');
  assert.equal(place.regularHours.length, 1);
  assert.equal(place.photos[0].authorAttributions[0].displayName, 'Autor');
});

test('evidencia no autoelige cuando hay multiples candidatos', () => {
  const evidence = createEvidence({ query: 'Casa Cali', candidates: [{ placeId: '1' }, { placeId: '2' }], selected: null, checkedAt: '2026-09-05T00:00:00Z' });
  assert.equal(evidence.selectionStatus, 'needs_identity_review');
});
