import { createClient } from '@supabase/supabase-js';

async function main() {
  const [, , slug] = process.argv;

  if (!slug) {
    throw new Error('Uso: node scripts/delete-spot-by-slug.mjs <slug>');
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan credenciales de Supabase en el entorno.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: spot, error: fetchError } = await supabase
    .from('spots')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!spot) {
    console.log(JSON.stringify({ deleted: false, reason: 'not_found', slug }, null, 2));
    return;
  }

  const { error: deleteBranchesError } = await supabase
    .from('spot_branches')
    .delete()
    .eq('spot_id', spot.id);

  if (deleteBranchesError) {
    throw deleteBranchesError;
  }

  const { error: deleteSpotError } = await supabase
    .from('spots')
    .delete()
    .eq('id', spot.id);

  if (deleteSpotError) {
    throw deleteSpotError;
  }

  console.log(JSON.stringify({ deleted: true, slug }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
