import fs from 'node:fs';

const root = '/Users/mateo/Documents/Playground';
const files = [
  `${root}/apps/mobile/public/spots-catalog.json`,
  `${root}/apps/mobile/dist/spots-catalog.json`,
];
const now = new Date().toISOString();

function evidenceMenu(rows, sourceUrl, conceptName) {
  const menu = rows.map(([name, price, category]) => ({
    name, price, category, menuSection: category, sourceUrl,
    verifiedAt: now, calculationIncluded: true,
  }));
  const sorted = [...rows].sort((a, b) => a[1] - b[1]);
  const budget = [
    ['Parche tranqui', sorted[0]],
    ['Parche completo', sorted[Math.min(2, sorted.length - 1)]],
    ['Con toda', sorted.at(-1)],
  ].map(([label, row]) => ({
    concept: `${label} en ${conceptName}`,
    note: 'Referencia calculada con precios publicados; no es consumo mínimo ni promedio.',
    lines: [{ name: row[0], category: row[2], quantity: 1, groupSize: 1 }],
  }));
  return { menu_items: menu, budget_scenarios: budget };
}

const memorialUrl = 'https://www.rappi.com.co/restaurantes/900263456-cerveceria-memorial';
const memorial = evidenceMenu([
  ['Disruptivo Sandwich', 25885, 'sándwiches'],
  ['Leal Sandwich', 26600, 'sándwiches'],
  ['Determinado Sandwich', 26025, 'sándwiches'],
  ['Temerario Sandwich', 28600, 'sándwiches'],
  ['Dobeerman Cerveza Artesanal Invitada', 14000, 'cervezas'],
], memorialUrl, 'Memorial Cervecería');

const romanezcaUrl = 'https://www.rappi.com.co/restaurantes/900487838-la-romanezca';
const romanezca = evidenceMenu([
  ['Jamón y queso', 39000, 'pizza'],
  ['Pizza Hawaiana', 49000, 'pizza'],
  ['Pizza Pepperoni', 49000, 'pizza'],
  ['Pizza Maíz y Tocineta', 49000, 'pizza'],
  ['Torta de Naranja', 11500, 'postres'],
], romanezcaUrl, 'La Romanezca');

for (const file of files) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const branch of catalog.branches || []) {
    if (branch.slug === 'memorial-cali') {
      Object.assign(branch, {
        ...memorial,
        menu_url: memorialUrl,
        phone: '+57 300 568 4126',
        address: 'Cra. 122 #16a-18, Cali, Valle del Cauca, Colombia',
        hours: 'Lun-Jue 15:15-22:45 · Vie-Sáb 15:15-23:44 · Dom 15:15-22:45',
        budget_basis: `Precios públicos consultados en ${memorialUrl}.`,
        updated_at: now,
      });
    }
    if (branch.slug === 'mugari-lago-verde') {
      Object.assign(branch, {
        phone: '+57 318 596 4142',
        address: 'Parque Comercial Lago Verde, Cl. 16A #122-70, Local CP3, Pance, Cali',
        hours: 'Mar-Jue 18:30-21:30 · Vie-Sáb 12:30-15:00 y 18:30-22:00 · Dom 12:30-18:00 · Lun cerrado',
        updated_at: now,
      });
    }
    if (branch.slug === 'la-romanezca-lago-verde') {
      Object.assign(branch, {
        ...romanezca,
        menu_url: romanezcaUrl,
        address: 'Calle 16A #122-70, Local A8, Parque Comercial Lago Verde, Pance, Cali',
        hours: 'Lun-Dom 12:30-21:30',
        budget_basis: `Precios públicos consultados en ${romanezcaUrl}.`,
        updated_at: now,
      });
    }
    if (branch.slug === 'la-romanezca-pance') {
      branch.hours = 'Lun 09:00-21:00 · Mar-Jue 08:00-21:00 · Vie-Sáb 08:00-22:00 · Dom 08:00-21:00';
      branch.updated_at = now;
    }
  }
  catalog.generatedAt = now;
  fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
}

const trackerPath = `${root}/docs/spots-ingestion-tracker.json`;
const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
for (const slug of ['memorial', 'mugari', 'la-romanezca']) {
  const entry = tracker.entries?.find((item) => item.slug === slug);
  if (entry) entry.notes = [...new Set([...(entry.notes || []), 'Datos públicos de carta/contacto/horarios integrados por sede.'])];
}
tracker.updatedAt = now;
fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2) + '\n');
console.log('updated memorial, mugari and la-romanezca evidence');
