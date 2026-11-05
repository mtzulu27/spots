import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const directory = path.resolve(process.argv[2] || 'docs/catalog-review/photo-audit-20261010');
const publicPath = process.argv[3] || '/tmp/spots-photo-audit-public-20261010.json';
const hash = value => createHash('sha256').update(value).digest('hex');
await fs.mkdir(directory, { recursive: true });
const localRaw = await fs.readFile('apps/mobile/public/spots-catalog.json', 'utf8');
const local = JSON.parse(localRaw);
const published = JSON.parse(await fs.readFile(publicPath, 'utf8'));
const active = s => s.type === 'place' && s.is_active !== false && s.business_status !== 'permanently_closed';
const publishedIds = new Set(published.spots.filter(active).map(s => s.id));
const places = local.spots.filter(s => active(s) || publishedIds.has(s.id));
const assets = new Map();
const placeRows = [];
for (const s of places) {
  const versions = [{ catalog: 'local', spot: s }, ...published.spots.filter(p => p.id === s.id).map(spot => ({ catalog: 'published', spot }))];
  const handles = [...new Set([s.instagram, ...local.branches.filter(b => b.spot_id === s.id).map(b => b.instagram)].filter(Boolean))];
  const refs = [];
  for (const { catalog, spot } of versions) {
    for (const [role, urls] of [['cover', [spot.cover_image_url]], ['gallery', spot.gallery_urls || []]]) {
      for (const [index, url] of urls.entries()) {
        if (!url) continue;
        const id = hash(url).slice(0, 16);
        if (!assets.has(id)) assets.set(id, { id, url, references: [], status: 'unreviewed' });
        assets.get(id).references.push({ spotId: s.id, slug: s.slug, name: s.name, role, index, catalog });
        refs.push(id);
      }
    }
  }
  placeRows.push({ id: s.id, slug: s.slug, name: s.name, published: publishedIds.has(s.id), instagram: handles,
    missingCover: !s.cover_image_url, missingGallery: !s.gallery_urls?.length, assets: [...new Set(refs)], status: 'pending' });
}
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), catalogSha256: hash(localRaw),
  scope: 'All locally active places plus published active places; both catalogs media included. No activation changes.',
  policy: 'Real venue/product/experience photography; no overlaid text, advertisements, menus, logos-as-photos, stock substitutes or unclear venue identity.',
  places: placeRows, assets: [...assets.values()] };
for (const asset of report.assets) {
  try {
    let bytes;
    if (asset.url.startsWith('/')) {
      const file = path.join(root, 'apps/mobile/public', asset.url);
      try { bytes = await fs.readFile(file); asset.file = file; }
      catch { asset.status = 'missing_local_file'; }
    } else {
      const cached = path.join(directory, 'images', asset.id);
      try { bytes = await fs.readFile(cached); asset.file = cached; }
      catch {
        const response = await fetch(asset.url, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!/^image\//.test(response.headers.get('content-type') || '')) throw new Error('not_an_image');
        const reader = response.body.getReader();
        const chunks = []; let length = 0;
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          length += value.length; if (length > 20_000_000) { await reader.cancel(); throw new Error('image_size_limit'); }
          chunks.push(value);
        }
        bytes = Buffer.concat(chunks);
        await fs.mkdir(path.dirname(cached), { recursive: true });
        await fs.writeFile(cached, bytes); asset.file = cached;
      }
    }
    if (bytes) { asset.sha256 = hash(bytes); asset.bytes = bytes.length; }
  } catch (error) { asset.status = 'download_failed'; asset.error = error.message; }
  if (/images\.unsplash\.com/.test(asset.url)) asset.sourceIssue = 'stock_photo_not_verified_venue';
  await fs.writeFile(path.join(directory, 'inventory.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ directory, places: report.places.length, assets: report.assets.length,
  readableFiles: report.assets.filter(a => a.file).length, failed: report.assets.filter(a => !a.file).length,
  missingCover: placeRows.filter(p => p.missingCover).length, missingGallery: placeRows.filter(p => p.missingGallery).length }, null, 2));
