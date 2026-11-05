import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const directory = 'docs/catalog-review/discovery/photos-20261103';
const catalog = JSON.parse(await fs.readFile('apps/mobile/public/spots-catalog.json', 'utf8'));
const refreshed = [];
for (const file of (await fs.readdir(directory)).filter(f => f.endsWith('-selection.json'))) {
  for (const selection of JSON.parse(await fs.readFile(path.join(directory, file), 'utf8')).places) {
    const spot = catalog.spots.find(s => s.id === selection.id);
    assert.ok(spot.cover_image_url && spot.gallery_urls.length >= 2);
    for (const url of spot.gallery_urls) await fs.access(path.resolve('apps/mobile/public', `.${url}`));
    refreshed.push({ id: spot.id, name: spot.name, slug: spot.slug, photos: spot.gallery_urls.length,
      cover: spot.cover_image_url, gallery: spot.gallery_urls, evidence: file });
  }
}
const retainedIds = [3513, 4004, 4003, 4007, 3663, 4002, 4010, 3519];
const retained = [];
for (const id of retainedIds) {
  const spot = catalog.spots.find(s => s.id === id);
  const images = [];
  for (const url of [...new Set([spot.cover_image_url, ...spot.gallery_urls])]) {
    const bytes = await fs.readFile(path.resolve('apps/mobile/public', `.${url}`));
    images.push({ url, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  retained.push({ id, name: spot.name, slug: spot.slug, images,
    review: 'Contact sheets reviewed: real food, people or interiors; no ad layout or overlaid text.' });
}
const pending = [
  { id: 4009, name: 'L Orso', reason: 'Six available official publications reviewed: promotional, collage or text overlays; requested real photos from user.' },
  { id: 108, name: 'BBC', reason: 'Reviewed official product image includes alcohol legal text overlay; requested choice between Google Maps branch photos and accepting official legal text.' },
];
assert.equal(refreshed.length + retained.length + pending.length, 28);
await fs.writeFile(path.join(directory, 'completion-report.json'), JSON.stringify({
  generatedAt: new Date().toISOString(), scope: 28, ready: refreshed.length + retained.length,
  refreshed, retained, pending, publication: { status: 'not_published', reason: 'User requires every venue to have reviewed cover and gallery before Hostinger deployment.' },
}, null, 2) + '\n');
console.log(JSON.stringify({ ready: refreshed.length + retained.length, refreshed: refreshed.length, retained: retained.length, pending: pending.map(p => p.name), published: false }));
