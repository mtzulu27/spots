import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function readEnvValue(content, key) {
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));

  return line ? line.slice(key.length + 1).trim() : '';
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const envContent = readFileSync(
    '/Users/mateo/Documents/Playground/apps/mobile/.env.local',
    'utf8',
  );

  const supabaseUrl = readEnvValue(envContent, 'EXPO_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = readEnvValue(envContent, 'EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan credenciales de Supabase en apps/mobile/.env.local');
  }

  const imagePath =
    '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/TemporaryItems/NSIRD_screencaptureui_oTGnvw/Captura de pantalla 2026-04-03 a la(s) 8.07.31 p.m..png';
  const imageBuffer = readFileSync(imagePath);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const spotSlug = 'donde-leon-cocina-dulce';
  const assetPath = `${slugify(spotSlug)}/cover/donde-leon-user-cover-${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage
    .from('spots-media')
    .upload(assetPath, imageBuffer, {
      contentType: 'image/png',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`No se pudo subir la foto: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from('spots-media').getPublicUrl(assetPath);
  const coverUrl = publicUrlData.publicUrl;

  const { data: updatedSpot, error: spotError } = await supabase
    .from('spots')
    .update({
      cover_image_url: coverUrl,
      gallery_urls: [coverUrl],
    })
    .eq('slug', spotSlug)
    .select('id, slug, cover_image_url, gallery_urls')
    .single();

  if (spotError || !updatedSpot) {
    throw new Error(`No se pudo actualizar la foto de ${spotSlug}: ${spotError?.message ?? 'sin detalle'}`);
  }

  console.log(JSON.stringify(updatedSpot, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
