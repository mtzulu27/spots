import fs from 'node:fs'

const catalogPath = new URL('../apps/mobile/public/spots-catalog.json', import.meta.url)
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
const verifiedAt = new Date().toISOString()
const officialMenuUrl = 'https://sucursales.granlangostino.com/wp-content/uploads/2025/06/Catalogo-2025-EGL.pdf'
const querestoUrl = 'https://queresto.com/granlangostinorest/'

const menuItems = [
  ['KILELE CREMOSO', 15600, 'mains'],
  ['REBURU DE PESCADO Y MANGO', 16500, 'mains'],
  ['ENSALADA NAIROBI', 20500, 'mains'],
  ['BALELE DE CAMARONES', 18500, 'mains'],
  ['BITUTE CALDOSO', 25000, 'mains'],
  ['TAZON DE MARISCOS', 22900, 'mains'],
  ['KANIKAMA ROLL', 17500, 'mains'],
  ['YASAI ROLL', 11600, 'mains'],
  ['COCA-COLA', 2500, 'drinks'],
  ['HATSU SODA UVA Y ROMERO', 3000, 'drinks'],
].map(([name, price, category]) => ({
  name,
  price,
  category,
  menuSection: category === 'drinks' ? 'Bebidas' : 'Platos',
  sourceUrl: querestoUrl,
  officialMenuUrl,
  verifiedAt,
  unit: 'unidad',
  calculationIncluded: true,
}))

const scenarios = [
  {
    concept: 'Parche tranqui en El Gran Langostino',
    note: 'Consumo individual propuesto con precios publicados; no es consumo mínimo ni promedio de la carta.',
    lines: [
      { name: 'YASAI ROLL', category: 'mains', quantity: 1, groupSize: 1 },
      { name: 'COCA-COLA', category: 'drinks', quantity: 1, groupSize: 1 },
    ],
  },
  {
    concept: 'Parche completo en El Gran Langostino',
    note: 'Consumo individual propuesto con precios publicados; no es consumo mínimo ni promedio de la carta.',
    lines: [
      { name: 'ENSALADA NAIROBI', category: 'mains', quantity: 1, groupSize: 1 },
      { name: 'BALELE DE CAMARONES', category: 'mains', quantity: 1, groupSize: 1 },
      { name: 'HATSU SODA UVA Y ROMERO', category: 'drinks', quantity: 1, groupSize: 1 },
    ],
  },
  {
    concept: 'Con toda en El Gran Langostino',
    note: 'Consumo individual propuesto con precios publicados; no es consumo mínimo ni promedio de la carta.',
    lines: [
      { name: 'TAZON DE MARISCOS', category: 'mains', quantity: 1, groupSize: 1 },
      { name: 'KANIKAMA ROLL', category: 'mains', quantity: 1, groupSize: 1 },
      { name: 'COCA-COLA', category: 'drinks', quantity: 1, groupSize: 1 },
    ],
  },
]

const spot = catalog.spots.find((item) => item.id === 3667)
if (!spot) throw new Error('El Gran Langostino spot not found')
spot.updated_at = verifiedAt

for (const branch of catalog.branches.filter((item) => item.spot_id === spot.id)) {
  branch.menu_url = officialMenuUrl
  branch.menu_items = menuItems
  branch.budget_scenarios = scenarios
  branch.updated_at = verifiedAt
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n')
const distPath = new URL('../apps/mobile/dist/spots-catalog.json', import.meta.url)
fs.writeFileSync(distPath, JSON.stringify(catalog, null, 2) + '\n')
console.log(`Updated ${catalog.branches.filter((item) => item.spot_id === spot.id).length} El Gran Langostino branches`)
