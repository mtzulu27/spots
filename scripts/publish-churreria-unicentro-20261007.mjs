import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const now = new Date().toISOString();
for (const path of [new URL('apps/mobile/public/spots-catalog.json', root), new URL('apps/mobile/dist/spots-catalog.json', root)]) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'la-churreria-antigua');
  const branch = catalog.branches.find((entry) => entry.slug === 'la-churreria-antigua-unicentro');
  if (!spot || !branch) throw new Error(`La Churrería Unicentro not found in ${path.pathname}`);
  spot.is_active = true;
  spot.catalog_status = 'reviewed_with_pending';
  spot.updated_at = now;
  branch.is_active = true;
  branch.updated_at = now;
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}
console.log(JSON.stringify({ slug: 'la-churreria-antigua', publishedBranch: 'la-churreria-antigua-unicentro', updatedAt: now }, null, 2));
