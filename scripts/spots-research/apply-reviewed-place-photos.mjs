import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { integrateCatalog } from './integrate-catalog.mjs';

const selectionFile = path.resolve(process.argv[2]);
const catalogFile = path.resolve('apps/mobile/public/spots-catalog.json');
const publicRoot = path.dirname(catalogFile);
const selection = JSON.parse(await fs.readFile(selectionFile, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const handle = url => new URL(url).pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
const results = [];
for (const target of selection.places) {
  const raw = await fs.readFile(catalogFile, 'utf8');
  const catalog = JSON.parse(raw);
  const spot = catalog.spots.find(s => s.id === target.id && s.slug === target.slug);
  assert.ok(spot, 'Observed target ID/slug required');
  const profiles = [spot.instagram, ...catalog.branches.filter(b => b.spot_id === spot.id).map(b => b.instagram)].filter(Boolean);
  assert.ok(profiles.some(url => handle(url) === handle(target.profile)), 'Instagram identity mismatch');
  assert.ok(target.photos.length >= 2, 'A cover plus a gallery photograph are required');
  const urls = [];
  for (const photo of target.photos) {
    assert.equal(photo.visuallyReviewed, true, 'Review required');
    assert.equal(photo.noOverlaidText, true, 'Text-free photograph required');
    assert.equal(photo.nonAdvertising, true, 'Non-advertising photograph required');
    assert.ok(photo.reason, 'Decision reason required');
    const bytes = await fs.readFile(photo.file);
    assert.equal(hash(bytes), photo.sha256, 'Reviewed image changed');
    if (photo.catalogUrl) {
      assert.ok(photo.catalogUrl.startsWith(`/place-media/${target.slug}/`));
      assert.equal(path.resolve(publicRoot, `.${photo.catalogUrl}`), path.resolve(photo.file));
      urls.push(photo.catalogUrl);
    } else {
      assert.match(photo.source, /^https:\/\/www\.instagram\.com\/(?:[\w.]+\/)?(?:p|reel)\/[\w-]+\/?$/);
      const segments = new URL(photo.source).pathname.split('/').filter(Boolean);
      if (segments.length === 3 && segments[0].toLowerCase() !== handle(target.profile)) {
        assert.equal(photo.sharedPublication?.verified, true, 'Different publisher needs verified shared-publication evidence');
        assert.equal(photo.sharedPublication.venueProfile, target.profile);
        assert.ok(photo.sharedPublication.evidence, 'Coauthor and venue evidence required');
      }
      const extension = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP' ? 'webp' : 'jpg';
      const url = `/place-media/${spot.slug}/photo-reviewed-${photo.sha256.slice(0, 20)}.${extension}`;
      const output = path.join(publicRoot, url);
      await fs.mkdir(path.dirname(output), { recursive: true });
      try { assert.equal(hash(await fs.readFile(output)), photo.sha256, 'Existing content-addressed photo differs'); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await fs.writeFile(output, bytes, { flag: 'wx' });
      }
      assert.equal(hash(await fs.readFile(output)), photo.sha256);
      urls.push(url);
    }
  }
  assert.equal(new Set(urls).size, urls.length, 'Duplicate photos');
  const input = { schemaVersion: 1,
    data: { id: spot.id, slug: spot.slug, cover_image_url: urls[0], gallery_urls: urls },
    write: { mode: 'update', fields: ['cover_image_url', 'gallery_urls'] }, branches: [],
    fieldDecisions: { cover_image_url: { source: target.profile, reason: target.photos[0].reason, status: 'confirmed' },
      gallery_urls: { source: target.profile, reason: 'Each exact image visually reviewed; no overlaid text or ad layouts.', status: 'confirmed' } } };
  const inputFile = path.join(path.dirname(selectionFile), `${spot.slug}-integration.json`);
  await fs.writeFile(inputFile, JSON.stringify(input, null, 2) + '\n');
  const result = await integrateCatalog(inputFile, catalogFile, { expectedHash: hash(raw) });
  const final = JSON.parse(await fs.readFile(catalogFile, 'utf8'));
  assert.deepEqual(final.branches, catalog.branches);
  assert.deepEqual(final.branchHours, catalog.branchHours);
  assert.deepEqual(final.spots.filter(s => s.id !== spot.id), catalog.spots.filter(s => s.id !== spot.id));
  const current = final.spots.find(s => s.id === spot.id);
  for (const [key, value] of Object.entries(spot)) {
    if (!['cover_image_url', 'gallery_urls', 'updated_at'].includes(key)) assert.deepEqual(current[key], value, `Unrelated field changed: ${key}`);
  }
  results.push({ id: spot.id, slug: spot.slug, photos: urls.length, ...result });
}
const resultFile = selectionFile.replace(/\.json$/, '-results.json');
await fs.writeFile(resultFile, JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results.map(r => ({ slug: r.slug, status: r.status, photos: r.photos })), null, 2));
