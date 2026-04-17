import fs from 'node:fs';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const NOW = new Date().toISOString();

const PLACEHOLDER_UPDATES = [
  {
    slug: 'namaste',
    name: 'Namaste',
    shortDescription:
      'Gastrobar en Granada con una vibra más de música, cócteles, comida y parche largo que de salida rápida.',
    category: 'Restaurantes y cafés',
    tags: ['gastrobar', 'cocteles', 'granada', 'musica', 'food'],
    moods: ['con amigos', 'tomar algo', 'noche', 'algo especial'],
    branchSlug: 'namaste-cali',
    branchPatch: {
      address: 'Cl. 13 Nte. #8N-64, Granada, Cali',
      neighborhood: 'Granada',
      mall: '',
      instagram: 'https://www.instagram.com/namaste.cali.co/',
      menu_url:
        'https://www.canva.com/design/DAGud9MEdZE/rFXiqqaI_KEioqsl2qjICA/view?utm_content=DAGud9MEdZE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h1c49620734',
    },
    tracker: {
      instagram: 'https://www.instagram.com/namaste.cali.co/',
      status: 'incomplete',
      internalTag: 'placeholder-backfill-ig-order-preserved',
      missingFields: ['hours', 'min_budget', 'max_budget', 'phone', 'whatsapp', 'photos', 'coordinates'],
      notes: [
        'Se actualizó el placeholder desde el perfil oficial de Instagram.',
        'Se conservó el orden del feed manteniendo intactos created_at y updated_at del spot y su sede.',
        'La dirección se tomó del link directo de Maps del perfil: Cl. 13 Nte. #8N-64, Granada, Cali.',
        'Se dejó el menú directo del perfil en Canva para revisión manual posterior.',
      ],
    },
  },
  {
    slug: 'sabor-gourmet',
    name: 'Sabor Gourmet 16',
    shortDescription:
      'Spot casual de comida en Cali que queda cargado desde su Instagram oficial mientras cerramos mejor sede, horario y operación.',
    category: 'Restaurantes y cafés',
    tags: ['comida', 'casual', 'antojo', 'gourmet'],
    moods: ['casual', 'comer rico'],
    branchSlug: 'sabor-gourmet-cali',
    branchPatch: {
      instagram: 'https://www.instagram.com/saborgourmet16/',
    },
    tracker: {
      instagram: 'https://www.instagram.com/saborgourmet16/',
      status: 'incomplete',
      internalTag: 'placeholder-backfill-ig-order-preserved',
      missingFields: ['full_address', 'hours', 'menu_url', 'min_budget', 'max_budget', 'phone', 'whatsapp', 'photos', 'coordinates'],
      notes: [
        'Se vinculó el placeholder al Instagram oficial saborgourmet16.',
        'Se conservó el orden del feed sin tocar las marcas de tiempo del spot.',
        'Queda pendiente cerrar dirección, horarios y contacto antes de considerarlo completo.',
      ],
    },
  },
  {
    slug: 'cima-del-viento',
    name: 'Cima del Viento Dapa',
    shortDescription:
      'Mirador restaurante en Dapa para subir por la vista, comer algo y quedarse en un plan más de carretera y paisaje que urbano.',
    category: 'Naturaleza y aire libre',
    tags: ['mirador', 'dapa', 'naturaleza', 'aire libre', 'restaurante'],
    moods: ['naturaleza', 'algo especial', 'aire libre'],
    branchSlug: 'cima-del-viento-cali',
    branchPatch: {
      neighborhood: 'Dapa',
      instagram: 'https://www.instagram.com/cimadelvientodapa/',
      menu_url: 'https://www.instagram.com/cimadelvientodapa/',
    },
    tracker: {
      instagram: 'https://www.instagram.com/cimadelvientodapa/',
      status: 'incomplete',
      internalTag: 'placeholder-backfill-ig-order-preserved',
      missingFields: ['full_address', 'hours', 'min_budget', 'max_budget', 'phone', 'whatsapp', 'photos', 'coordinates'],
      notes: [
        'Se actualizó el placeholder para que apunte al perfil oficial de Cima del Viento Dapa.',
        'Se mantuvo separado del spot ya existente de Cima del Viento Glamping para no mezclar conceptos antes de la revisión manual.',
        'Se conservó el orden del feed manteniendo intactos created_at y updated_at.',
      ],
    },
  },
  {
    slug: 'combo-burgers',
    name: 'Combo',
    shortDescription:
      'Spot casual de hamburguesas y comida rápida en Cali, cargado desde su Instagram oficial mientras cerramos la ficha fina.',
    category: 'Restaurantes y cafés',
    tags: ['hamburguesas', 'fast food', 'antojo', 'casual'],
    moods: ['casual', 'antojo', 'con amigos'],
    branchSlug: 'combo-burgers-cali',
    branchPatch: {
      instagram: 'https://www.instagram.com/combo.col/',
    },
    tracker: {
      instagram: 'https://www.instagram.com/combo.col/',
      status: 'incomplete',
      internalTag: 'placeholder-backfill-ig-order-preserved',
      missingFields: ['full_address', 'hours', 'menu_url', 'min_budget', 'max_budget', 'phone', 'whatsapp', 'photos', 'coordinates'],
      notes: [
        'Se vinculó el placeholder al Instagram oficial combo.col.',
        'Se conservó el orden del feed sin tocar las marcas de tiempo del spot.',
      ],
    },
  },
  {
    slug: 'prote-and-co',
    name: 'Prote&Co',
    shortDescription:
      'Spot de froyo y antojo frío para resolver postre, toppings y algo dulce sin mucha vuelta.',
    category: 'Restaurantes y cafés',
    tags: ['froyo', 'yogurt helado', 'postres', 'dulce', 'antojo', 'toppings'],
    moods: ['dulce', 'antojo', 'plan tranqui', 'familiar'],
    branchSlug: 'prote-and-co-cali',
    branchPatch: {
      instagram: 'https://www.instagram.com/proteandco.froyo/',
    },
    tracker: {
      instagram: 'https://www.instagram.com/proteandco.froyo/',
      status: 'incomplete',
      internalTag: 'placeholder-backfill-ig-order-preserved',
      missingFields: ['full_address', 'hours', 'menu_url', 'min_budget', 'max_budget', 'phone', 'whatsapp', 'photos', 'coordinates'],
      notes: [
        'Se refrescó el placeholder desde el Instagram oficial de Prote&Co.',
        'Se mantuvo el orden del feed sin tocar created_at ni updated_at del spot.',
      ],
    },
  },
];

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  fs.writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

for (const catalogPath of CATALOG_PATHS) {
  const catalog = readJson(catalogPath);

  for (const update of PLACEHOLDER_UPDATES) {
    const spot = catalog.spots.find((entry) => entry.slug === update.slug);
    if (!spot) {
      throw new Error(`No se encontró el spot ${update.slug} en ${catalogPath}`);
    }

    Object.assign(spot, {
      name: update.name,
      short_description: update.shortDescription,
      category: update.category,
      tags: update.tags,
      moods: update.moods,
    });

    const branch = catalog.branches.find((entry) => entry.slug === update.branchSlug);
    if (!branch) {
      throw new Error(`No se encontró la sede ${update.branchSlug} en ${catalogPath}`);
    }

    Object.assign(branch, update.branchPatch);
  }

  writeJson(catalogPath, catalog);
}

const tracker = readJson(TRACKER_PATH);

for (const update of PLACEHOLDER_UPDATES) {
  const existing = tracker.entries.find((entry) => entry.slug === update.slug);
  if (existing) {
    existing.name = update.name;
    existing.instagram = update.tracker.instagram;
    existing.status = update.tracker.status;
    existing.internalTag = update.tracker.internalTag;
    existing.missingFields = update.tracker.missingFields;
    existing.notes = update.tracker.notes;
    existing.lastReviewedAt = NOW;
    continue;
  }

  tracker.entries.push({
    slug: update.slug,
    name: update.name,
    instagram: update.tracker.instagram,
    status: update.tracker.status,
    internalTag: update.tracker.internalTag,
    missingFields: update.tracker.missingFields,
    notes: update.tracker.notes,
    lastReviewedAt: NOW,
  });
}

tracker.updatedAt = NOW;
writeJson(TRACKER_PATH, tracker);

console.log(
  JSON.stringify(
    {
      updated: PLACEHOLDER_UPDATES.map((entry) => entry.slug),
      preservedFeedOrder: true,
      trackerUpdatedAt: NOW,
    },
    null,
    2,
  ),
);
