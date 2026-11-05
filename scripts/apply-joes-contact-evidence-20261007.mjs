import fs from 'node:fs'

const paths = [
  new URL('../apps/mobile/public/spots-catalog.json', import.meta.url),
  new URL('../apps/mobile/dist/spots-catalog.json', import.meta.url),
]
const now = new Date().toISOString()
const phone = '+57 302 3676737'
const whatsapp = 'https://api.whatsapp.com/send/?phone=573023676737&text&type=phone_number&app_absent=0'
for (const path of paths) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'))
  const spot = catalog.spots.find((item) => item.slug === 'joes')
  const branch = catalog.branches.find((item) => item.slug === 'joes-cali')
  if (!spot || !branch) throw new Error('Joe\'s branch not found')
  branch.phone = phone
  branch.whatsapp = whatsapp
  branch.updated_at = now
  spot.updated_at = now
  fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n')
}
console.log('Updated Joe\'s phone and WhatsApp')
