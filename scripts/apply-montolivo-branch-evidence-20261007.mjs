import fs from 'node:fs';

const root = '/Users/mateo/Documents/Playground';
const paths = [`${root}/apps/mobile/public/spots-catalog.json`, `${root}/apps/mobile/dist/spots-catalog.json`];
const now = new Date().toISOString();
const updates = {
  'montolivo-unico-outlet-cali': {
    phone: '+57 316 194 3710',
    hours: 'Lun-Dom 11:45:00-21:00:00',
    source_url: 'https://www.tripadvisor.com.mx/Restaurant_Review-g297475-d25461950-Reviews-Montolivo_Pasta_Express_C_C_Unico-Cali_Valle_del_Cauca_Department.html',
  },
  'montolivo-mallplaza-cali': {
    phone: '+57 601 5877775',
    whatsapp: '+57 312 4755344',
    hours: 'Lun-Dom 11:00:00-22:00:00',
    source_url: 'https://www.mallplaza.com/co/cali/tiendas/montolivo/index.html',
  },
};

for (const file of paths) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const branch of catalog.branches || []) {
    const patch = updates[branch.slug];
    if (!patch) continue;
    Object.assign(branch, patch, { updated_at: now });
  }
  catalog.generatedAt = now;
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}

const trackerPath = `${root}/docs/spots-ingestion-tracker.json`;
const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
const entry = tracker.entries?.find((item) => item.slug === 'montolivo');
if (entry) {
  entry.lastReviewedAt = now;
  entry.notes = [...new Set([...(entry.notes || []), 'Se completaron horarios y contactos de Único y Mallplaza con fuentes públicas de cada sede.'])];
}
tracker.updatedAt = now;
fs.writeFileSync(trackerPath, `${JSON.stringify(tracker, null, 2)}\n`);
console.log(JSON.stringify({ updated: Object.keys(updates) }));
