import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const directory = path.resolve(process.argv[2] || 'docs/catalog-review/photo-audit-20261010');
const publicRoot = path.resolve('apps/mobile/public');
const read = async name => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'));
const inventory = await read('inventory.json');
const progress = await read('progress.json');
const catalog = JSON.parse(await fs.readFile(path.join(publicRoot, 'spots-catalog.json'), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const decisions = new Map(progress.decisions.map(d => [d.assetId, d]));
const assets = new Map(inventory.assets.map(a => [a.url, a]));
const approvals = new Map();
const newSources = new Map();
for (const asset of inventory.assets) {
  const decision = decisions.get(asset.id);
  if (decision?.decision === 'approved') approvals.set(asset.url, { sha256: asset.sha256, reason: decision.reason });
}
for (const filename of (await fs.readdir(directory)).filter(f => /^approved-batch-\d+\.json$/.test(f))) {
  const batch = await read(filename);
  for (const place of batch.places) for (const photo of place.photos) {
    assert.ok(photo.visuallyReviewed && photo.noOverlaidText && photo.nonAdvertising);
    const url = photo.catalogUrl || `/place-media/${place.slug}/photo-reviewed-${photo.sha256.slice(0, 20)}.jpg`;
    approvals.set(url, { sha256: photo.sha256, reason: photo.reason });
    if (photo.source) newSources.set(url, photo.source);
  }
}

async function inspect(url) {
  if (!url) return { url: null, status: 'missing' };
  const asset = assets.get(url);
  const approval = approvals.get(url);
  let sha256 = asset?.sha256 || null;
  if (url.startsWith('/')) {
    const filename = path.resolve(publicRoot, `.${url}`);
    assert.ok(filename.startsWith(`${publicRoot}${path.sep}`), 'Media path outside public root');
    try { sha256 = hash(await fs.readFile(filename)); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return { url, status: 'missing_file' };
    }
  }
  if (approval && sha256 === approval.sha256) return { url, sha256, status: 'approved_original',
    reason: approval.reason, source: newSources.get(url) || null };
  if (approval) return { url, sha256, status: 'changed_since_review' };
  const decision = asset && decisions.get(asset.id);
  return { url, sha256, status: decision?.decision || 'unreviewed', reason: decision?.reason || null };
}

const places = [];
for (const scope of inventory.places) {
  const spot = catalog.spots.find(s => s.id === scope.id && s.slug === scope.slug);
  assert.ok(spot, 'Audited place disappeared from current catalog');
  const cover = await inspect(spot.cover_image_url);
  const gallery = [];
  for (const url of spot.gallery_urls || []) gallery.push(await inspect(url));
  const profiles = [...new Set([spot.instagram, ...catalog.branches.filter(b => b.spot_id === spot.id).map(b => b.instagram)].filter(Boolean))];
  const uniqueGallery = new Set(gallery.map(p => p.url));
  const complete = cover.status === 'approved_original' && uniqueGallery.size >= 2 && gallery.every(p => p.status === 'approved_original');
  const missing = cover.status === 'missing' || gallery.length === 0;
  const requiresReplacement = [cover, ...gallery].some(p => ['replace', 'unavailable_requires_replacement_or_recovery', 'missing_file'].includes(p.status));
  places.push({ id: spot.id, slug: spot.slug, name: spot.name, profiles,
    status: complete ? 'photos_verified_locally' : missing ? 'missing_media' : requiresReplacement ? 'replacement_required' : 'original_review_required',
    cover, gallery, deployment: 'not_published_by_photo_audit' });
}
const counts = {};
for (const place of places) counts[place.status] = (counts[place.status] || 0) + 1;
const output = { generatedAt: new Date().toISOString(), scopePlaces: places.length, counts, places };
await fs.writeFile(path.join(directory, 'place-queue.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ scopePlaces: places.length, counts,
  missingCover: places.filter(p => p.cover.status === 'missing').length,
  emptyGalleries: places.filter(p => p.gallery.length === 0).length }, null, 2));
