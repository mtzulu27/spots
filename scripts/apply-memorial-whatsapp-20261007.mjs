import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const paths = [
  new URL('apps/mobile/public/spots-catalog.json', root),
  new URL('apps/mobile/dist/spots-catalog.json', root),
];
const reviewedAt = new Date().toISOString();
const phone = '573005684126';
const whatsapp = `https://api.whatsapp.com/send/?phone=${phone}&text&type=phone_number&app_absent=0`;

for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'memorial');
  if (!spot) throw new Error(`Memorial Cervecería not found in ${path.pathname}`);
  const branch = catalog.branches.find((entry) => entry.spot_id === spot.id);
  if (!branch) throw new Error(`Memorial branch not found in ${path.pathname}`);
  branch.whatsapp = whatsapp;
  branch.updated_at = reviewedAt;
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(JSON.stringify({ slug: 'memorial', whatsapp, reviewedAt }, null, 2));
