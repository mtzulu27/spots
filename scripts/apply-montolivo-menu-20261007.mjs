import fs from 'node:fs'

const paths = [
  new URL('../apps/mobile/public/spots-catalog.json', import.meta.url),
  new URL('../apps/mobile/dist/spots-catalog.json', import.meta.url),
]
const verifiedAt = new Date().toISOString()
const menuUrl = 'https://montolivorestaurante.com/carta-menu/'
const sourceUrl = 'https://web.didiglobal.com/co/food/cali/montolivo-jardin-plaza/5764607617473972493/'

const menuItems = [
  ['Bolognesa', 27000, 'mains', 'Pastas'],
  ['Carbonara', 27000, 'mains', 'Pastas'],
  ['Pasta al Huerto', 29000, 'mains', 'Platos vegetarianos'],
  ['Lasagna de Pollo', 30000, 'mains', 'Lasagnas'],
  ['Lasagna Mixta', 31000, 'mains', 'Lasagnas'],
  ['Mar y Tierra', 35500, 'mains', 'Pastas'],
  ['Di Mare', 35000, 'mains', 'Pastas'],
  ['Torta de Zanahoria', 7500, 'desserts', 'Postres'],
  ['Torta de Chocolate', 7500, 'desserts', 'Postres'],
  ['Jugo de Maracuyá', 8500, 'drinks', 'Bebidas'],
  ['Coca-Cola Original', 6500, 'drinks', 'Bebidas'],
].map(([name, price, category, menuSection]) => ({
  name, price, category, menuSection, sourceUrl, menuUrl,
  verifiedAt, unit: 'unidad', calculationIncluded: true,
}))

const scenarios = [
  {
    concept: 'Parche tranqui en Montolivo',
    note: 'Consumo individual propuesto con precios publicados; no es consumo mínimo ni promedio de la carta.',
    lines: [
      { name: 'Bolognesa', category: 'mains', quantity: 1, groupSize: 1 },
      { name: 'Coca-Cola Original', category: 'drinks', quantity: 1, groupSize: 1 },
    ],
  },
  {
    concept: 'Parche completo en Montolivo',
    note: 'Consumo individual propuesto con precios publicados; no es consumo mínimo ni promedio de la carta.',
    lines: [
      { name: 'Lasagna Mixta', category: 'mains', quantity: 1, groupSize: 1 },
      { name: 'Jugo de Maracuyá', category: 'drinks', quantity: 1, groupSize: 1 },
    ],
  },
  {
    concept: 'Con toda en Montolivo',
    note: 'Consumo individual propuesto con precios publicados; no es consumo mínimo ni promedio de la carta.',
    lines: [
      { name: 'Di Mare', category: 'mains', quantity: 1, groupSize: 1 },
      { name: 'Torta de Chocolate', category: 'desserts', quantity: 1, groupSize: 1 },
      { name: 'Jugo de Maracuyá', category: 'drinks', quantity: 1, groupSize: 1 },
    ],
  },
]

for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'))
  const spot = catalog.spots.find((item) => item.slug === 'montolivo')
  if (!spot) throw new Error('Montolivo spot not found')
  spot.updated_at = verifiedAt
  for (const branch of catalog.branches.filter((item) => item.spot_id === spot.id)) {
    branch.menu_url = menuUrl
    branch.menu_items = menuItems
    branch.budget_scenarios = scenarios
    branch.updated_at = verifiedAt
  }
  fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n')
}

console.log('Updated Montolivo menu and budgets for 4 Cali branches')
