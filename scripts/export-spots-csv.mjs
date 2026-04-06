import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const [, , outPath] = process.argv

if (!outPath) {
  throw new Error('Uso: node scripts/export-spots-csv.mjs <output.csv>')
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
    supabase.from('spot_branches').select('spot_id,id').order('spot_id', { ascending: true }),
  ])

if (spotsError) {
  throw spotsError
}

if (branchesError) {
  throw branchesError
}

const branchCount = new Map()
for (const branch of branches ?? []) {
  branchCount.set(branch.spot_id, (branchCount.get(branch.spot_id) ?? 0) + 1)
}

const rows = [
  [
    'spot_id',
    'type',
    'slug',
    'name',
    'short_description',
    'category',
    'city',
    'likes',
    'is_active',
    'is_featured',
    'branch_count',
  ],
]

for (const spot of spots ?? []) {
  rows.push([
    spot.id,
    spot.type,
    spot.slug,
    spot.name,
    spot.short_description,
    spot.category,
    spot.city,
    spot.likes,
    spot.is_active,
    spot.is_featured,
    branchCount.get(spot.id) ?? 0,
  ])
}

fs.writeFileSync(outPath, rows.map((row) => row.map(escapeCsv).join(',')).join('\n'))
console.log(outPath)
console.log(`rows ${rows.length - 1}`)
