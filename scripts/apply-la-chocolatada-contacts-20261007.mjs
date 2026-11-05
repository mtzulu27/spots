import fs from 'node:fs';
const root = '/Users/mateo/Documents/Playground';
const paths = [`${root}/apps/mobile/public/spots-catalog.json`, `${root}/apps/mobile/dist/spots-catalog.json`];
const now = new Date().toISOString();
const updates = {
  'la-chocolatada-ciudad-jardin': { phone: '+57 301 3132063', hours: 'Lun-Dom 00:00:00-23:59:00', source_url: 'https://www.rappi.com.co/restaurantes/900428603-la-chocolatada' },
  'la-chocolatada-el-ingenio': { phone: '+57 301 3132243', hours: 'Lun-Dom 00:00:00-23:59:00', source_url: 'https://yandex.com/maps/org/la_chocolatada_panaderia/135088412817/' },
};
for (const file of paths) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const branch of catalog.branches || []) if (updates[branch.slug]) Object.assign(branch, updates[branch.slug], { updated_at: now });
  catalog.generatedAt = now;
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}
const trackerPath = `${root}/docs/spots-ingestion-tracker.json`;
const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
const entry = tracker.entries?.find((item) => item.slug === 'la-chocolatada');
if (entry) entry.notes = [...new Set([...(entry.notes || []), 'Se añadieron teléfonos y horario 24h por sede desde fichas públicas de La Chocolatada.'])];
tracker.updatedAt = now;
fs.writeFileSync(trackerPath, `${JSON.stringify(tracker, null, 2)}\n`);
console.log(JSON.stringify({ updated: Object.keys(updates) }));
