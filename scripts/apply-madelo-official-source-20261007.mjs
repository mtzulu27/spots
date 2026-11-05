import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const sourceUrl = 'https://www.madelo.com.co/ubicaciones';
const now = new Date().toISOString();
for (const path of [new URL('apps/mobile/public/spots-catalog.json', root), new URL('apps/mobile/dist/spots-catalog.json', root)]) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'madelo-lago-verde');
  const branch = catalog.branches.find((entry) => entry.slug === 'madelo-lago-verde');
  if (!spot || !branch) throw new Error(`Madelo not found in ${path.pathname}`);
  spot.source_urls = [...new Set([...(spot.source_urls || []), sourceUrl])];
  branch.website_url = sourceUrl;
  branch.source_url = sourceUrl;
  branch.updated_at = now;
  spot.updated_at = now;
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}
console.log(JSON.stringify({ slug: 'madelo-lago-verde', sourceUrl, updatedAt: now }, null, 2));
