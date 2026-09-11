import fs from 'node:fs';

const files = ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json'];
const reportPath = 'docs/catalog-review/benchmarks/www.qrcarta.com-website-2026-09-11T01-34-48-227Z.json';
const instagram = 'https://www.instagram.com/gentecomun_cali/';
const menuUrl = 'https://www.qrcarta.com/restaurant/cali-valle-del-cauca/gente-com%C3%BAn/9094/';
const mapsUrl = 'https://maps.google.com/?cid=14568181167188152491';
const menuData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const graph = menuData.pages[0].structuredData[0]['@graph'];
const menu = graph.find((entry) => entry['@type'] === 'Menu');

function priceFromName(name) {
  const match = String(name).match(/\/\s*([\d.]+)\s*$/);
  if (!match) return null;
  const value = Number(match[1].replace(/\./g, ''));
  return Number.isFinite(value) ? value : null;
}

const menuItems = [];
for (const section of menu.hasMenuSection ?? []) {
  for (const item of section.hasMenuItem ?? []) {
    const rawName = String(item.name ?? '').trim();
    const price = priceFromName(rawName);
    const name = rawName.replace(/\s*\/\s*[\d.]+\s*$/, '').trim();
    if (!name || price == null) continue;
    const key = `${section.name}:${name}`;
    if (menuItems.some((entry) => entry._key === key)) continue;
    menuItems.push({
      _key: key,
      name,
      category: String(section.name).trim(),
      presentation: /vino|aguardiente|aperol|dubonnet|ba[ií]leys|aperitivo|botella|media/i.test(section.name) ? 'Botella' : 'Individual',
      price,
      currency: 'COP',
      calculationIncluded: true,
      description: item.description?.trim() || undefined,
      source_url: menuUrl
    });
  }
}
for (const item of menuItems) delete item._key;

const scenarios = [
  {
    concept: 'Parche tranqui',
    note: 'Un coctel y una entrada para compartir entre dos.',
    lines: [
      { name: 'BLUEBERRY FRESH', category: 'COCKTAILS', presentation: 'Individual', quantity: 1, groupSize: 1 },
      { name: 'CARPACCIO DE CHAMPIÑON Y SETAS', category: 'ENTRADA', presentation: 'Individual', quantity: 1, groupSize: 2 }
    ]
  },
  {
    concept: 'Parche completo',
    note: 'Un plato fuerte y un coctel por persona, más una entrada para compartir.',
    lines: [
      { name: 'BLUEBERRY FRESH', category: 'COCKTAILS', presentation: 'Individual', quantity: 1, groupSize: 1 },
      { name: 'LOMO DE LA CASA', category: 'DE LA TIERRA', presentation: 'Individual', quantity: 1, groupSize: 1 },
      { name: 'CARPACCIO DE CHAMPIÑON Y SETAS', category: 'ENTRADA', presentation: 'Individual', quantity: 1, groupSize: 2 }
    ]
  },
  {
    concept: 'Con toda',
    note: 'Botella de vino para compartir, plato fuerte, entrada y postre.',
    lines: [
      { name: 'MR. WILDMAN CABERNET SAUVIGNON', category: 'VINOS TINTOS', presentation: 'Botella', quantity: 1, groupSize: 2 },
      { name: 'LOMO SOLSTICIO', category: 'DE LA TIERRA', presentation: 'Individual', quantity: 1, groupSize: 1 },
      { name: 'TOSTADA DE CAMARON', category: 'ENTRADA', presentation: 'Individual', quantity: 1, groupSize: 2 },
      { name: 'Crumble de Manzana', category: 'POSTRES', presentation: 'Individual', quantity: 1, groupSize: 2 }
    ]
  }
];

const branchData = {
  id: 4760,
  address: 'Calle 3 #4-52, Barrio San Antonio, Cali',
  neighborhood: 'San Antonio',
  hours: 'Lun-Sáb 12:00-23:00 · Dom: por confirmar',
  holiday_mode: 'unknown',
  holiday_open_time: null,
  holiday_close_time: null,
  holiday_split_open_time: null,
  holiday_split_close_time: null,
  phone: '6023489799',
  latitude: 3.4485064,
  longitude: -76.5389114,
  google_place_id: 'ChIJcQPRdACnMI4RqxDJBZaTLMo',
  menu_url: menuUrl,
  instagram,
  is_active: true,
  menu_items: menuItems,
  budget_scenarios: scenarios,
  min_budget: 52000,
  typical_budget: 114000,
  max_budget: 123000,
  budget_basis: 'Parche tranqui: un coctel y una entrada para compartir, calculado por persona para una mesa de dos.',
  menu_calculation_note: 'El restaurante puede actualizar los precios.',
  missing_fields: ['sunday_hours', 'holiday_hours']
};

for (const file of files) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const spot = catalog.spots.find((item) => item.id === 3517);
  const branch = catalog.branches.find((item) => item.id === 4760);
  if (!spot || !branch) throw new Error(`Gente Común records missing in ${file}`);
  Object.assign(spot, {
    name: 'Gente Común',
    short_description: 'Caé a San Antonio por una carta de autor, vinos y cocteles para comer rico y armar un parche bacano.',
    description: 'Un espacio de cocina de autor y diseño en San Antonio, con platos para compartir, vinos y cocteles para quedarse conversando.',
    is_active: true,
    catalog_status: 'reviewed',
    instagram,
    source_urls: [instagram, menuUrl, mapsUrl],
    updated_at: new Date().toISOString()
  });
  Object.assign(branch, { ...branchData, updated_at: new Date().toISOString() });
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Updated ${file} with ${menuItems.length} menu items`);
}
