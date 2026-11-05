import fs from 'node:fs'

const paths = [
  new URL('../apps/mobile/public/spots-catalog.json', import.meta.url),
  new URL('../apps/mobile/dist/spots-catalog.json', import.meta.url),
]
const verifiedAt = new Date().toISOString()
const sourceDidi = 'https://web.didiglobal.com/co/food/cali/restaurante-hamburgo-jamundi/5764612750953939496/'
const sourceRappi = 'https://www.rappi.com.co/restaurantes/900435498-hamburgo-pcb'

const rows = {
  'hamburgo-palmas-mall-cali': [
    ['Hamburguesa Americana', 37000, sourceRappi],
    ['Hamburguesa Hamburgo', 38900, sourceRappi],
    ['Hamburguesa Francesa', 38900, sourceRappi],
    ['Hamburguesa Española', 40500, sourceRappi],
    ['Hamburguesa Inglesa', 36000, sourceRappi],
  ],
  'hamburgo-jamundi': [
    ['Hamburguesa Clásica', 32500, sourceDidi],
    ['Hamburguesa Cali', 33500, sourceDidi],
    ['Hamburguesa Mexicana', 33500, sourceDidi],
    ['Hamburguesa San Luis', 35000, sourceDidi],
    ['Hamburguesa Philadelphia', 35000, sourceDidi],
  ],
}

const makeItems = (branchSlug) => rows[branchSlug].map(([name, price, sourceUrl]) => ({
  name, price, category: 'mains', menuSection: 'Hamburguesas', sourceUrl,
  verifiedAt, unit: 'unidad', calculationIncluded: true,
}))

const makeBudgets = (items) => [
  {
    concept: 'Parche tranqui en Hamburgo',
    note: 'Consumo individual propuesto con precios publicados; no es consumo mínimo ni promedio de la carta.',
    lines: [{ name: items[0].name, category: 'mains', quantity: 1, groupSize: 1 }],
  },
  {
    concept: 'Parche completo en Hamburgo',
    note: 'Consumo individual propuesto con precios publicados; no es consumo mínimo ni promedio de la carta.',
    lines: [{ name: items[1].name, category: 'mains', quantity: 1, groupSize: 1 }],
  },
  {
    concept: 'Con toda en Hamburgo',
    note: 'Consumo individual propuesto con precios publicados; no es consumo mínimo ni promedio de la carta.',
    lines: [{ name: items[3].name, category: 'mains', quantity: 1, groupSize: 1 }],
  },
]

for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'))
  const spot = catalog.spots.find((item) => item.slug === 'hamburgo')
  if (!spot) throw new Error('Hamburgo spot not found')
  spot.updated_at = verifiedAt
  for (const branch of catalog.branches.filter((item) => item.spot_id === spot.id)) {
    const items = makeItems(branch.slug)
    branch.menu_items = items
    branch.budget_scenarios = makeBudgets(items)
    branch.updated_at = verifiedAt
  }
  fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n')
}
console.log('Updated Hamburgo menu and budgets for 2 branches')
