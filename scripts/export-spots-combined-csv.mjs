import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const [, , outPath] = process.argv

if (!outPath) {
  throw new Error('Uso: node scripts/export-spots-combined-csv.mjs <output.csv>')
}

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
}

const supabase = createClient(url, key)

function escapeCsv(value) {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const [{ data: spots, error: spotsError }, { data: branches, error: branchesError }] =
  await Promise.all([
    supabase
      .from('spots')
      .select(
        'id,type,slug,name,short_description,category,city,likes,is_active,is_featured',
      )
      .order('id', { ascending: true }),
    supabase
      .from('spot_branches')
      .select(
        'id,spot_id,slug,neighborhood,mall,hours,address,min_budget,max_people,menu_url,whatsapp,phone,instagram,latitude,longitude,is_active,sort_order',
      )
      .order('spot_id', { ascending: true })
      .order('sort_order', { ascending: true }),
  ])

if (spotsError) throw spotsError
if (branchesError) throw branchesError

const branchesBySpot = new Map()
for (const branch of branches ?? []) {
  const current = branchesBySpot.get(branch.spot_id)
  if (current) {
    current.push(branch)
  } else {
    branchesBySpot.set(branch.spot_id, [branch])
  }
}

const rows = [[
  'row_type',
  'spot_id',
  'branch_id',
  'spot_slug',
  'branch_slug',
  'name',
  'short_description',
  'category',
  'city',
  'likes',
  'spot_is_active',
  'is_featured',
  'neighborhood',
  'mall',
  'hours',
  'address',
  'min_budget',
  'max_people',
  'menu_url',
  'whatsapp',
  'phone',
  'instagram',
  'latitude',
  'longitude',
  'branch_is_active',
  'sort_order',
]]

for (const spot of spots ?? []) {
  rows.push([
    'place',
    spot.id,
    '',
    spot.slug,
    '',
    spot.name,
    spot.short_description,
    spot.category,
    spot.city,
    spot.likes,
    spot.is_active,
    spot.is_featured,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ])

  for (const branch of branchesBySpot.get(spot.id) ?? []) {
    rows.push([
      'branch',
      spot.id,
      branch.id,
      spot.slug,
      branch.slug,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      branch.neighborhood,
      branch.mall,
      branch.hours,
      branch.address,
      branch.min_budget,
      branch.max_people,
      branch.menu_url,
      branch.whatsapp,
      branch.phone,
      branch.instagram,
      branch.latitude,
      branch.longitude,
      branch.is_active,
      branch.sort_order,
    ])
  }
}

fs.writeFileSync(outPath, rows.map((row) => row.map(escapeCsv).join(',')).join('\n'))
console.log(outPath)
console.log(`rows ${rows.length - 1}`)
