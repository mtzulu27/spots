import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const root = '/Users/mateo/Documents/Playground';
const evidenceDir = `${root}/docs/catalog-review/benchmarks`;

const targets = [
  ['fusion-wok', 'fusionwok'],
  ['gente-comun', 'gentecomun_cali'],
  ['the-factory-audiobar', 'thefactoryaudiobar'],
  ['prote-and-co', 'proteandco.froyo'],
  ['parisina', 'parisina____________'],
  ['sabor-gourmet', 'saborgourmet16'],
  ['mo-sushi', 'mosushi.co'],
  ['madelo-lago-verde', 'madelo_'],
  ['maranello', 'maranellopasta'],
];

function env(key) {
  const text = readFileSync(`${root}/apps/mobile/.env.local`, 'utf8');
  return text.split(/\r?\n/).find((line) => line.startsWith(`${key}=`))?.slice(key.length + 1).trim() || '';
}

function profileReport(username) {
  const file = readdirSync(evidenceDir)
    .filter((name) => name.startsWith(`${username}-profile-http-`) && name.endsWith('.json'))
    .sort()
    .at(-1);
  return file ? JSON.parse(readFileSync(`${evidenceDir}/${file}`, 'utf8')) : null;
}

async function main() {
  const supabase = createClient(env('EXPO_PUBLIC_SUPABASE_URL'), env('EXPO_PUBLIC_SUPABASE_ANON_KEY'), { auth: { persistSession: false } });
  const updates = [];
  for (const [slug, username] of targets) {
    const report = profileReport(username);
    const sourceUrl = report?.result?.profilePhotoUrl || '';
    if (!sourceUrl) { updates.push({ slug, status: 'no_public_profile_photo' }); continue; }
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`${slug}: Instagram image returned ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const path = `${slug}/cover/instagram-profile-${Date.now()}.jpg`;
    const upload = await supabase.storage.from('spots-media').upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (upload.error) {
      const localDir = `${root}/apps/mobile/public/place-media/${slug}`;
      const localPath = `${localDir}/instagram-profile.jpg`;
      mkdirSync(localDir, { recursive: true });
      writeFileSync(localPath, bytes);
      updates.push({ slug, username, sourceUrl, publicUrl: `/place-media/${slug}/instagram-profile.jpg`, storageStatus: 'local_persistent_fallback', storageError: upload.error.message });
      continue;
    }
    const publicUrl = supabase.storage.from('spots-media').getPublicUrl(path).data.publicUrl;
    updates.push({ slug, username, sourceUrl, publicUrl, storageStatus: 'uploaded' });
  }

  writeFileSync(`${evidenceDir}/instagram-profile-source-sync-2026-10-07.json`, JSON.stringify({ generatedAt: new Date().toISOString(), source: 'public Instagram profilePhotoUrl; retained as logo evidence only', updates }, null, 2) + '\n');
  console.log(JSON.stringify(updates, null, 2));
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
