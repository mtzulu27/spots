import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const whatsapp = 'https://api.whatsapp.com/send/?phone=573186265449&text&type=phone_number&app_absent=0';
const now = new Date().toISOString();
for (const path of [new URL('apps/mobile/public/spots-catalog.json', root), new URL('apps/mobile/dist/spots-catalog.json', root)]) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  const branch = catalog.branches.find((entry) => entry.slug === 'maki-bar-cali-el-penon');
  if (!branch) throw new Error(`Maki Bar Cali branch not found in ${path.pathname}`);
  branch.whatsapp = whatsapp;
  branch.updated_at = now;
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}
console.log(JSON.stringify({ slug: 'maki-bar-cali', whatsapp, updatedAt: now }, null, 2));
