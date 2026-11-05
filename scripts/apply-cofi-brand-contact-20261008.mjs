import fs from 'node:fs';

const root = '/Users/mateo/Documents/Playground';
const phone = '+573023842997';
const whatsapp = 'https://wa.me/573023842997';
for (const file of [`${root}/apps/mobile/public/spots-catalog.json`, `${root}/apps/mobile/dist/spots-catalog.json`]) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const spot = catalog.spots.find((item) => item.slug === 'cofi-bakery');
  if (!spot) throw new Error(`Missing Cofi Bakery in ${file}`);
  const branch = catalog.branches.find((item) => item.slug === 'cofi-bakery-marbella');
  if (!branch) throw new Error(`Missing Marbella branch in ${file}`);
  branch.phone = phone;
  branch.whatsapp = whatsapp;
  branch.contact_source = 'same official brand contact already verified on Cofi active branches';
  branch.updated_at = new Date().toISOString();
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}
console.log(JSON.stringify({ slug: 'cofi-bakery-marbella', phone, whatsapp }));
