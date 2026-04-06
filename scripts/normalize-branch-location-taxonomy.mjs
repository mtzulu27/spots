import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan credenciales de Supabase en el entorno.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const canonicalMallMap = new Map([
  ['unicentro', 'Unicentro'],
  ['mallplaza', 'Mallplaza'],
  ['jardin plaza', 'Jardín Plaza'],
  ['jardín plaza', 'Jardín Plaza'],
  ['pacific center', 'Pacific Center'],
  ['pacific', 'Pacific Center'],
  ['pacific mall', 'Pacific Center'],
  ['puerto 125', 'Puerto 125'],
  ['lago verde', 'Lago Verde'],
  ['chipichape', 'Chipichape'],
  ['las velas', 'Las Velas'],
  ['parque del perro', 'Parque del Perro'],
  ['carulla pance', 'Carulla Pance'],
  ['carulla', 'Carulla Pance'],
  ['fusion plaza', 'Fusion Plaza'],
  ['la estacion', 'La Estación'],
  ['la estación', 'La Estación'],
  ['palmas', 'Palmas Mall'],
  ['palmas mall', 'Palmas Mall'],
  ['canaveral pance', 'Cañaveral Pance'],
  ['cañaveral pance', 'Cañaveral Pance'],
  ['canaveral', 'Cañaveral Pance'],
  ['cañaveral', 'Cañaveral Pance'],
  ['marbella plaza', 'Marbella Plaza'],
  ['alto pance', 'Alto Pance'],
  ['mall la maria', 'Mall La María'],
  ['la maria', 'Mall La María'],
  ['lyrata', 'Lyrata'],
  ['rio', 'Río'],
  ['campanella plaza', 'Campanella Plaza'],
  ['verde arena', 'Verde Arena'],
  ['la leyenda', 'La Leyenda'],
  ['el lago', 'El Lago'],
  ['giardino mall', 'Giardino Mall'],
  ['plazuela municipal granada', 'Plazuela Municipal Granada'],
  ['plazuela municipal ciudad jardin', 'Plazuela Municipal Ciudad Jardín'],
  ['plazuela municipal ciudad jardín', 'Plazuela Municipal Ciudad Jardín'],
  ['plaza armonia', 'Plaza Armonía'],
  ['plaza armonía', 'Plaza Armonía'],
  ['solaz plaza', 'Solaz Plaza'],
  ['casa del rio', 'Casa del Río'],
  ['casa del río', 'Casa del Río'],
  ['natura plaza', 'Natura Plaza'],
  ['solaz', 'Solaz Plaza'],
]);

function normalizeToken(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeMallLabel(value) {
  const cleaned = String(value ?? '')
    .replace(/\bCentro Comercial\b/gi, '')
    .replace(/\bParque Comercial\b/gi, '')
    .replace(/\bC\.?\s*C\.?\b/gi, '')
    .replace(/\bMall\b/gi, '')
    .replace(/\bCali\b/gi, '')
    .replace(/[()]/g, ' ')
    .replace(/^[.\-–,:;\s]+/, '')
    .replace(/[.\-–,:;\s]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const normalized = normalizeToken(cleaned);
  if (normalized) {
    return canonicalMallMap.get(normalized) ?? cleaned;
  }

  return '';
}

function getCanonicalMallForContext(mall, neighborhood) {
  const normalizedMall = normalizeToken(mall);
  const normalizedNeighborhood = normalizeToken(neighborhood);

  if (normalizedMall === 'unicentro') {
    return 'Unicentro';
  }

  if (normalizedMall === 'mallplaza') {
    return 'Mallplaza';
  }

  if (normalizedMall === 'plazuela municipal') {
    if (normalizedNeighborhood === 'granada') {
      return 'Plazuela Municipal Granada';
    }

    if (normalizedNeighborhood === 'ciudad jardin' || normalizedNeighborhood === 'ciudad jardín') {
      return 'Plazuela Municipal Ciudad Jardín';
    }
  }

  return mall;
}

function inferMallFromContext(address, slug) {
  const context = normalizeToken(`${address} ${slug}`);
  if (normalizeToken(slug) === 'nuevo-leon-sur') return 'Hotel Plaza Lili';

  if (context.includes('mall la maria')) return 'Mall La María';
  if (context.includes('carulla pance')) return 'Carulla Pance';
  if (context.includes('puerto 125')) return 'Puerto 125';
  if (context.includes('lago verde')) return 'Lago Verde';
  if (context.includes('palmas mall')) return 'Palmas Mall';
  if (context.includes('jardin plaza') || context.includes('jardín plaza')) return 'Jardín Plaza';
  if (context.includes('unicentro')) return 'Unicentro';
  if (context.includes('mallplaza')) return 'Mallplaza';
  if (context.includes('chipichape')) return 'Chipichape';
  if (context.includes('pacific center') || context.includes('pacific mall')) return 'Pacific Center';

  return '';
}

function normalizeNeighborhoodLabel(neighborhood, mall, address, slug) {
  const cleaned = String(neighborhood ?? '').trim();
  if (!cleaned) {
    return '';
  }

  const normalizedNeighborhood = normalizeToken(cleaned);
  const context = normalizeToken(`${mall} ${address} ${slug}`);

  if (context.includes('cl 9 #56-250') || context.includes('cl. 9 #56-250')) {
    return 'Pampa Linda';
  }

  if (
    normalizedNeighborhood.includes('normandia') ||
    normalizedNeighborhood.includes('normandía') ||
    context.includes('normandia sebastian de belalcazar') ||
    context.includes('normandía sebastián de belalcázar') ||
    context.includes('sebastian de belalcazar') ||
    context.includes('sebastián de belalcázar')
  ) {
    return 'El Peñón';
  }

  if (
    normalizedNeighborhood.includes('cristales') ||
    normalizedNeighborhood.includes('tejares') ||
    context.includes('los cristales') ||
    context.includes('tejares')
  ) {
    return 'Tejares-Cristales';
  }

  if (normalizeToken(slug) === 'nuevo-leon-sur') {
    return 'Valle del Lili';
  }

  if (normalizedNeighborhood === 'comuna 17') {
    if (
      context.includes('plaza lili') ||
      context.includes('hotel plaza lili') ||
      context.includes('valle del lili') ||
      context.includes('lili')
    ) {
      return 'Valle del Lili';
    }

    if (context.includes('la hacienda')) {
      return 'La Hacienda';
    }

    if (context.includes('limonar')) {
      return 'Limonar';
    }

    if (context.includes('caney')) {
      return 'El Caney';
    }
  }

  if (
    normalizedNeighborhood === 'chipichape' ||
    context.includes('chipichape') ||
    context.includes('pacific center') ||
    context.includes('pacific mall')
  ) {
    return 'Zona Chipichape';
  }

  if (normalizedNeighborhood === 'cuarto de legua') {
    return 'Guadalupe';
  }

  if (normalizeToken(mall) === 'unicentro') {
    return 'Ciudad Jardín';
  }

  if (normalizeToken(mall) === 'mallplaza') {
    return 'Guadalupe';
  }

  if (normalizedNeighborhood === 'centro comercial mallplaza') {
    return 'Guadalupe';
  }

  if (normalizedNeighborhood === 'la maria') {
    if (context.includes('mall la maria')) {
      return 'Pance';
    }
    return 'La María';
  }

  if (normalizedNeighborhood === 'juanambu' && normalizeToken(mall) === 'granada') {
    return 'Granada';
  }

  if (normalizedNeighborhood !== 'canasgordas') {
    if (normalizedNeighborhood === 'ciudad jardin') return 'Ciudad Jardín';
    if (normalizedNeighborhood === 'el penon') return 'El Peñón';
    if (normalizedNeighborhood === 'la hacienda') return 'La Hacienda';
    if (normalizedNeighborhood === 'la flora') return 'La Flora';
    return cleaned;
  }

  if (
    context.includes('pance') ||
    context.includes('puerto 125') ||
    context.includes('lago verde') ||
    context.includes('carulla pance') ||
    context.includes('mall la maria')
  ) {
    return 'Pance';
  }

  return 'Ciudad Jardín';
}

function valuesEqual(left, right) {
  return String(left ?? '') === String(right ?? '');
}

const { data: branches, error: branchesError } = await supabase
  .from('spot_branches')
  .select('id,slug,neighborhood,mall,address')
  .order('id', { ascending: true });

if (branchesError) {
  throw branchesError;
}

const updates = [];

for (const branch of branches ?? []) {
  const nextNeighborhood = normalizeNeighborhoodLabel(
    branch.neighborhood,
    branch.mall,
    branch.address,
    branch.slug,
  );

  const nextMallBase = normalizeMallLabel(branch.mall) || inferMallFromContext(branch.address, branch.slug);
  const nextMall = getCanonicalMallForContext(nextMallBase, nextNeighborhood);
  const finalMall = normalizeToken(nextMall) === normalizeToken(nextNeighborhood) ? '' : nextMall;

  if (
    !valuesEqual(branch.neighborhood, nextNeighborhood) ||
    !valuesEqual(branch.mall, finalMall)
  ) {
    updates.push({
      id: branch.id,
      slug: branch.slug,
      neighborhood: nextNeighborhood,
      mall: finalMall,
      beforeNeighborhood: branch.neighborhood,
      beforeMall: branch.mall,
    });
  }
}

if (!updates.length) {
  console.log('No hubo cambios por aplicar.');
  process.exit(0);
}

for (const update of updates) {
  const { error } = await supabase
    .from('spot_branches')
    .update({
      neighborhood: update.neighborhood,
      mall: update.mall,
    })
    .eq('id', update.id);

  if (error) {
    throw new Error(`No se pudo actualizar ${update.slug}: ${error.message}`);
  }
}

console.log(`Actualizadas ${updates.length} sedes`);
for (const update of updates) {
  console.log(
    [
      update.slug,
      `sector: "${update.beforeNeighborhood}" -> "${update.neighborhood}"`,
      `mall: "${update.beforeMall}" -> "${update.mall}"`,
    ].join(' | '),
  );
}
