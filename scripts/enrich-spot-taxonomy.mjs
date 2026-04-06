import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan credenciales de Supabase en el entorno.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const categoryDefaults = {
  'Restaurantes': {
    tags: ['restaurantes', 'comida', 'comer'],
    moods: ['comer rico'],
  },
  'Vida nocturna': {
    tags: ['vida nocturna', 'bar', 'tomar algo'],
    moods: ['con amigos'],
  },
  'Cine': {
    tags: ['cine', 'peliculas'],
    moods: ['plan tranqui'],
  },
  'Arte y cultura': {
    tags: ['arte', 'cultura'],
    moods: ['algo especial'],
  },
  'Deporte y bienestar': {
    tags: ['deporte', 'bienestar'],
    moods: ['mover el cuerpo'],
  },
  'Familiar': {
    tags: ['familiar', 'familia'],
    moods: ['plan familiar'],
  },
  'Pet friendly': {
    tags: ['pet friendly', 'mascotas'],
    moods: ['plan tranqui'],
  },
  'Naturaleza y aire libre': {
    tags: ['naturaleza', 'aire libre'],
    moods: ['al aire libre'],
  },
  'Eventos': {
    tags: ['eventos'],
    moods: ['algo especial'],
  },
};

const keywordRules = [
  { pattern: /\bzoologic(?:o|os)\b|\bzool[oó]gic(?:o|os)\b|\banimales\b|\banimalitos\b|\bfauna\b/i, tags: ['animales', 'zoologico', 'fauna'], moods: ['plan familiar', 'caminar'] },
  { pattern: /\becoparque\b|\bbiodiversidad\b|\bmirador(?:es)?\b|\bsenderismo\b|\bhiking\b|\btrekking\b|\bnaturaleza\b|\bparque\b/i, tags: ['naturaleza', 'aire libre', 'caminar'], moods: ['al aire libre', 'caminar'] },
  { pattern: /\bplantas\b|\bjardin(?:es)?\b|\bjard[ií]n(?:es)?\b|\bbotanico\b|\bbot[aá]nico\b/i, tags: ['plantas', 'jardin', 'naturaleza'], moods: ['al aire libre'] },
  { pattern: /\bpintar\b|\bpintura\b|\bceramica\b|\bcer[aá]mica\b|\bpottery\b|\bmanualidades\b|\btaller creativo\b/i, tags: ['pintar', 'pintura', 'ceramica', 'manualidades'], moods: ['algo especial', 'plan tranqui'] },
  { pattern: /\bbar\b|\bpub\b|\bcoctel(?:es)?\b|\bcocktail(?:s)?\b|\bcerveza(?:s)?\b|\bpola(?:s)?\b|\bvino\b|\btragos?\b/i, tags: ['bar', 'cocteles', 'cerveza', 'vino'], moods: ['tomar algo', 'con amigos'] },
  { pattern: /\brooftop\b|\bterraza\b/i, tags: ['rooftop', 'terraza'], moods: ['tomar algo', 'algo especial'] },
  { pattern: /\bpizza\b|\bpizzeria\b/i, tags: ['pizza', 'pizzeria', 'italiano'], moods: ['comer rico'] },
  { pattern: /\bpasta\b|\bspaghetti\b|\bfettuccine\b|\bravioli\b|\blasagna\b|\blasaña\b/i, tags: ['pasta'], moods: ['comer rico'] },
  { pattern: /\bitalian[ao]\b|\btrattoria\b/i, tags: ['italiano'], moods: ['comer rico'] },
  { pattern: /\bsushi\b|\bramen\b|\bjapones\b|\bjapon[eé]s\b/i, tags: ['sushi', 'japones'], moods: ['comer rico'] },
  { pattern: /\bhamburguesa(?:s)?\b|\bburger\b/i, tags: ['hamburguesas', 'burger'], moods: ['comer rico', 'casual'] },
  { pattern: /\btacos?\b|\bmexican[ao]\b/i, tags: ['tacos', 'mexicano'], moods: ['antojo', 'con amigos'] },
  { pattern: /\bparrilla\b|\bcarnes?\b|\bsteak\b/i, tags: ['parrilla', 'carnes'], moods: ['comer rico'] },
  { pattern: /\bcafe\b|\bcaf[eé]\b|\bcafeteria\b|\bcafeter[ií]a\b/i, tags: ['cafe', 'cafeteria'], moods: ['plan tranqui'] },
  { pattern: /\bbrunch\b|\bdesayuno\b/i, tags: ['brunch', 'desayuno'], moods: ['plan tranqui'] },
  { pattern: /\bpanaderia\b|\bpanader[ií]a\b|\bbakery\b|\bpan\b/i, tags: ['panaderia', 'bakery'], moods: ['antojo'] },
  { pattern: /\bpostres?\b|\bhelad(?:o|os)\b|\bwaffle(?:s)?\b|\bdulce\b/i, tags: ['postres', 'dulce'], moods: ['antojo'] },
  { pattern: /\bteatro\b|\bmuseo(?:s)?\b|\bgaler[ií]a(?:s)?\b|\bexposici[oó]n(?:es)?\b/i, tags: ['teatro', 'museo', 'galeria', 'arte'], moods: ['algo especial'] },
  { pattern: /\bcine\b|\bpel[ií]cula(?:s)?\b|\bpelis\b/i, tags: ['cine', 'peliculas'], moods: ['plan tranqui'] },
  { pattern: /\bconcierto(?:s)?\b|\bshow(?:s)?\b|\bevento(?:s)?\b/i, tags: ['eventos', 'concierto'], moods: ['algo especial', 'con amigos'] },
  { pattern: /\bmascotas?\b|\bperros?\b|\bgatos?\b|\bpet friendly\b/i, tags: ['pet friendly', 'mascotas', 'perros'], moods: ['plan tranqui'] },
  { pattern: /\bniñ(?:o|os|a|as)\b|\bfamiliar\b|\bfamilia\b|\binflables?\b/i, tags: ['familiar', 'familia', 'ninos'], moods: ['plan familiar'] },
  { pattern: /\bdeporte\b|\bbolos?\b|\bairsoft\b|\bwellness\b|\bbienestar\b/i, tags: ['deporte', 'bienestar'], moods: ['mover el cuerpo'] },
];

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function dedupe(values) {
  const seen = new Set();
  const output = [];

  for (const raw of values) {
    const value = String(raw ?? '').trim();
    if (!value) continue;
    const key = normalize(value);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }

  return output;
}

function buildEnrichedTaxonomy(spot) {
  const sourceText = [
    spot.slug,
    spot.name,
    spot.short_description,
    ...(spot.tags ?? []),
    ...(spot.moods ?? []),
  ].join(' ');

  const nextTags = [...(spot.tags ?? [])];
  const nextMoods = [...(spot.moods ?? [])];

  const categoryConfig = categoryDefaults[spot.category] ?? null;
  if (categoryConfig) {
    nextTags.push(...categoryConfig.tags);
    nextMoods.push(...categoryConfig.moods);
  }

  keywordRules.forEach((rule) => {
    if (!rule.pattern.test(sourceText)) {
      return;
    }

    nextTags.push(...rule.tags);
    nextMoods.push(...rule.moods);
  });

  if (normalize(spot.slug) === 'cafe-pintado') {
    nextTags.push('pintar', 'pintura', 'ceramica', 'manualidades', 'arte');
    nextMoods.push('algo especial', 'plan tranqui');
  }

  return {
    tags: dedupe(nextTags),
    moods: dedupe(nextMoods),
  };
}

const { data: spots, error: fetchError } = await supabase
  .from('spots')
  .select('id,slug,name,short_description,category,tags,moods')
  .order('id', { ascending: true });

if (fetchError) {
  throw fetchError;
}

let updatedCount = 0;

for (const spot of spots ?? []) {
  const next = buildEnrichedTaxonomy(spot);
  const currentTags = dedupe(spot.tags ?? []);
  const currentMoods = dedupe(spot.moods ?? []);

  if (
    JSON.stringify(currentTags) === JSON.stringify(next.tags) &&
    JSON.stringify(currentMoods) === JSON.stringify(next.moods)
  ) {
    continue;
  }

  const { error: updateError } = await supabase
    .from('spots')
    .update({
      tags: next.tags,
      moods: next.moods,
    })
    .eq('id', spot.id);

  if (updateError) {
    throw updateError;
  }

  updatedCount += 1;
  console.log(`${spot.slug} | tags=${next.tags.join(', ')} | moods=${next.moods.join(', ')}`);
}

console.log(`Actualizados ${updatedCount} spots`);
