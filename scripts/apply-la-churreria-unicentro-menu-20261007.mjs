import fs from 'node:fs'

const paths = [
  new URL('../apps/mobile/public/spots-catalog.json', import.meta.url),
  new URL('../apps/mobile/dist/spots-catalog.json', import.meta.url),
]
const verifiedAt = new Date().toISOString()
const sourceUrl = 'https://web.didiglobal.com/co/food/cali/la-churreria-antigua-cc-unicentro/5764607609823563359/'
const menuUrl = sourceUrl
const menuItems = [
  ['Mundo Sorpresa', 16000, 'mains', 'Combo churros'],
  ['Churros Españoles Chocolate', 13000, 'mains', 'Postres'],
  ['Churros Españoles Arequipe', 13000, 'mains', 'Postres'],
  ['Churros Rellenos Mixto', 14000, 'mains', 'Postres'],
  ['Churros Rellenos de Chocolate', 14000, 'mains', 'Postres'],
  ['Minichurros x30', 32000, 'mains', 'Postres'],
  ['Combo Español Pequeño', 39000, 'mains', 'Combo churros'],
  ['Combo Español Mediano', 58000, 'mains', 'Combo churros'],
].map(([name, price, category, menuSection]) => ({
  name, price, category, menuSection, sourceUrl, verifiedAt,
  unit: 'unidad', calculationIncluded: true,
}))

const budgetScenarios = [
  {
    concept: 'Parche tranqui en La Churrería Antigua',
    note: 'Consumo individual propuesto con precios publicados; no es consumo mínimo ni promedio de la carta.',
    lines: [{ name: 'Churros Españoles Chocolate', category: 'mains', quantity: 1, groupSize: 1 }],
  },
  {
    concept: 'Parche completo en La Churrería Antigua',
    note: 'Consumo compartido propuesto con precios publicados; el rendimiento indicado por la carta es de 2 a 3 personas.',
    lines: [{ name: 'Combo Español Pequeño', category: 'mains', quantity: 1, groupSize: 2 }],
  },
  {
    concept: 'Con toda en La Churrería Antigua',
    note: 'Consumo compartido propuesto con precios publicados; el rendimiento indicado por la carta es de 5 personas.',
    lines: [{ name: 'Combo Español Mediano', category: 'mains', quantity: 1, groupSize: 5 }],
  },
]

for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'))
  const spot = catalog.spots.find((item) => item.slug === 'la-churreria-antigua')
  const branch = catalog.branches.find((item) => item.slug === 'la-churreria-antigua-unicentro')
  if (!spot || !branch) throw new Error('La Churrería Antigua Unicentro not found')
  branch.menu_url = menuUrl
  branch.menu_items = menuItems
  branch.budget_scenarios = budgetScenarios
  branch.updated_at = verifiedAt
  spot.updated_at = verifiedAt
  fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n')
}
console.log('Updated La Churrería Antigua Unicentro menu and budgets')
