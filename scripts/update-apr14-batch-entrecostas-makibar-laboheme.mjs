import fs from 'node:fs';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

const NOW = new Date().toISOString();

const MAKIBAR_SPOT_ID = 3678;
const MAKIBAR_BRANCH_ID = 5198;
const ENTRECOSTAS_LAGO_VERDE_BRANCH_ID = 5199;

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  fs.writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

function upsertHours(rows, branchId, nextId, specs) {
  const kept = (Array.isArray(rows) ? rows : []).filter((row) => row.branch_id !== branchId);
  const created = specs.map((spec, index) => ({
    id: nextId + index,
    branch_id: branchId,
    day_of_week: spec.day,
    is_closed: spec.closed ?? false,
    open_time: spec.closed ? null : spec.open,
    close_time: spec.closed ? null : spec.close,
    split_open_time: spec.closed ? null : spec.splitOpen ?? null,
    split_close_time: spec.closed ? null : spec.splitClose ?? null,
    sort_order: spec.sortOrder,
  }));
  return [...kept, ...created];
}

for (const catalogPath of CATALOG_PATHS) {
  const catalog = readJson(catalogPath);

  const maxHoursId =
    Math.max(
      0,
      ...(Array.isArray(catalog.branchHours) ? catalog.branchHours : []).map((row) => Number(row.id) || 0),
      ...(Array.isArray(catalog.hours) ? catalog.hours : []).map((row) => Number(row.id) || 0),
    ) + 1;

  const laBoheme = catalog.spots.find((spot) => spot.slug === 'la-boheme');
  if (laBoheme) {
    laBoheme.short_description =
      'Restaurante bar en San Antonio con cocina latina moderna, cocteles y un ambiente más de cena larga o tardeo especial que de salida rápida.';
    laBoheme.updated_at = NOW;
  }

  const laBohemeBranch = catalog.branches.find((branch) => branch.slug === 'la-boheme-san-antonio');
  if (laBohemeBranch) {
    laBohemeBranch.address = 'Calle 1 #6-09, San Antonio, Cali';
    laBohemeBranch.instagram = 'https://instagram.com/labohemecali';
    laBohemeBranch.whatsapp =
      'https://api.whatsapp.com/send/?phone=573113696667&text&type=phone_number&app_absent=0';
    laBohemeBranch.hours =
      'Lun-Jue 12:00 PM-11:00 PM · Vie-Sáb 12:00 PM-12:00 AM · Dom 12:00 PM-11:00 PM';
    laBohemeBranch.updated_at = NOW;
  }

  const entreCostas = catalog.spots.find((spot) => spot.slug === 'entre-costas');
  if (!entreCostas) {
    throw new Error(`No se encontró el spot entre-costas en ${catalogPath}`);
  }

  entreCostas.updated_at = NOW;

  const entreCostasCiudadJardin = catalog.branches.find(
    (branch) => branch.slug === 'entre-costas-ciudad-jardin',
  );
  if (!entreCostasCiudadJardin) {
    throw new Error(`No se encontró la sede entre-costas-ciudad-jardin en ${catalogPath}`);
  }

  entreCostasCiudadJardin.instagram =
    'https://www.instagram.com/entrecostasrestaurante/';
  entreCostasCiudadJardin.updated_at = NOW;
  entreCostasCiudadJardin.hours =
    'Mar-Jue 12:00 PM-3:00 PM y 7:00 PM-10:00 PM · Vie 12:00 PM-3:00 PM y 7:00 PM-11:00 PM · Sáb 12:00 PM-4:00 PM y 7:00 PM-11:00 PM · Dom 12:00 PM-5:00 PM · Lun Cerrado';

  const existingLagoVerde = catalog.branches.find(
    (branch) => branch.slug === 'entre-costas-lago-verde-cali',
  );

  const lagoVerdeBranch = {
    id: ENTRECOSTAS_LAGO_VERDE_BRANCH_ID,
    spot_id: entreCostas.id,
    slug: 'entre-costas-lago-verde-cali',
    address: 'Lago Verde, Pance, Cali',
    neighborhood: 'Pance',
    mall: 'Lago Verde',
    max_people: 6,
    phone: '3217562800',
    whatsapp: '3217562800',
    menu_url: 'https://www.entrecostas.com/',
    hours:
      'Mar-Jue 12:00 PM-10:00 PM · Vie-Sáb 12:00 PM-11:00 PM · Dom 12:00 PM-7:00 PM · Lun Cerrado',
    holiday_mode: 'inherit',
    holiday_open_time: null,
    holiday_close_time: null,
    holiday_split_open_time: null,
    holiday_split_close_time: null,
    min_budget: 48000,
    max_budget: 160000,
    instagram: 'https://www.instagram.com/entrecostasrestaurante/',
    latitude: null,
    longitude: null,
    is_active: true,
    sort_order: 20,
    created_at: existingLagoVerde?.created_at ?? NOW,
    updated_at: NOW,
  };

  if (existingLagoVerde) {
    Object.assign(existingLagoVerde, lagoVerdeBranch, { id: existingLagoVerde.id });
  } else {
    catalog.branches.push(lagoVerdeBranch);
  }

  let nextHoursId = maxHoursId;
  if (laBohemeBranch) {
    const laBohemeSpecs = [
      { day: 1, open: '12:00:00', close: '23:00:00', sortOrder: 10 },
      { day: 2, open: '12:00:00', close: '23:00:00', sortOrder: 20 },
      { day: 3, open: '12:00:00', close: '23:00:00', sortOrder: 30 },
      { day: 4, open: '12:00:00', close: '23:00:00', sortOrder: 40 },
      { day: 5, open: '12:00:00', close: '00:00:00', sortOrder: 50 },
      { day: 6, open: '12:00:00', close: '00:00:00', sortOrder: 60 },
      { day: 0, open: '12:00:00', close: '23:00:00', sortOrder: 70 },
    ];
    catalog.branchHours = upsertHours(
      catalog.branchHours,
      laBohemeBranch.id,
      nextHoursId,
      laBohemeSpecs,
    );
    catalog.hours = upsertHours(catalog.hours, laBohemeBranch.id, nextHoursId, laBohemeSpecs);
    nextHoursId += laBohemeSpecs.length;
  }

  const palmasSpecs = [
    { day: 1, closed: true, sortOrder: 10 },
    { day: 2, open: '12:00:00', close: '15:00:00', splitOpen: '19:00:00', splitClose: '22:00:00', sortOrder: 20 },
    { day: 3, open: '12:00:00', close: '15:00:00', splitOpen: '19:00:00', splitClose: '22:00:00', sortOrder: 30 },
    { day: 4, open: '12:00:00', close: '15:00:00', splitOpen: '19:00:00', splitClose: '22:00:00', sortOrder: 40 },
    { day: 5, open: '12:00:00', close: '15:00:00', splitOpen: '19:00:00', splitClose: '23:00:00', sortOrder: 50 },
    { day: 6, open: '12:00:00', close: '16:00:00', splitOpen: '19:00:00', splitClose: '23:00:00', sortOrder: 60 },
    { day: 0, open: '12:00:00', close: '17:00:00', sortOrder: 70 },
  ];
  catalog.branchHours = upsertHours(
    catalog.branchHours,
    entreCostasCiudadJardin.id,
    nextHoursId,
    palmasSpecs,
  );
  catalog.hours = upsertHours(catalog.hours, entreCostasCiudadJardin.id, nextHoursId, palmasSpecs);
  nextHoursId += palmasSpecs.length;

  const lagoVerdeSpecs = [
    { day: 1, closed: true, sortOrder: 10 },
    { day: 2, open: '12:00:00', close: '22:00:00', sortOrder: 20 },
    { day: 3, open: '12:00:00', close: '22:00:00', sortOrder: 30 },
    { day: 4, open: '12:00:00', close: '22:00:00', sortOrder: 40 },
    { day: 5, open: '12:00:00', close: '23:00:00', sortOrder: 50 },
    { day: 6, open: '12:00:00', close: '23:00:00', sortOrder: 60 },
    { day: 0, open: '12:00:00', close: '19:00:00', sortOrder: 70 },
  ];
  catalog.branchHours = upsertHours(
    catalog.branchHours,
    ENTRECOSTAS_LAGO_VERDE_BRANCH_ID,
    nextHoursId,
    lagoVerdeSpecs,
  );
  catalog.hours = upsertHours(
    catalog.hours,
    ENTRECOSTAS_LAGO_VERDE_BRANCH_ID,
    nextHoursId,
    lagoVerdeSpecs,
  );

  let makibarSpot = catalog.spots.find((spot) => spot.slug === 'makibar');
  if (!makibarSpot) {
    makibarSpot = {
      id: MAKIBAR_SPOT_ID,
      type: 'place',
      slug: 'makibar',
      name: 'Maki Bar',
      short_description:
        'Restaurante asiático de sushi, pokes y cócteles dentro del Intercontinental de Cali, con una vibra más de salida rica y elegante que de plan rápido.',
      cover_image_url: '',
      gallery_urls: [],
      category: 'Restaurantes y cafés',
      city: 'Cali',
      likes: '0',
      tags: [
        'sushi',
        'asiatico',
        'japones',
        'pokes',
        'cocteles',
        'intercontinental',
        'cena',
        'pareja',
        'con amigos',
      ],
      moods: ['algo especial', 'pareja', 'con amigos', 'cena', 'tomar algo'],
      is_active: true,
      is_featured: false,
      editorial_badge: 'Recién añadido',
      created_at: NOW,
      updated_at: NOW,
    };
    catalog.spots.push(makibarSpot);
  } else {
    makibarSpot.name = 'Maki Bar';
    makibarSpot.short_description =
      'Restaurante asiático de sushi, pokes y cócteles dentro del Intercontinental de Cali, con una vibra más de salida rica y elegante que de plan rápido.';
    makibarSpot.category = 'Restaurantes y cafés';
    makibarSpot.city = 'Cali';
    makibarSpot.is_active = true;
    makibarSpot.updated_at = NOW;
  }

  const makibarBranch = catalog.branches.find((branch) => branch.slug === 'makibar-intercontinental-cali');
  const makibarPayload = {
    id: MAKIBAR_BRANCH_ID,
    spot_id: makibarSpot.id,
    slug: 'makibar-intercontinental-cali',
    address: 'Av. Colombia No. 2-72, Hotel Intercontinental, Cali',
    neighborhood: '',
    mall: 'Hotel Intercontinental',
    max_people: 6,
    phone: '3186265449',
    whatsapp: 'https://api.whatsapp.com/send/?phone=573186265449&text&type=phone_number&app_absent=0',
    menu_url: 'https://www.hotelesestelar.com/es/destinos/colombia/cali/hotel-intercontinental-cali/restaurantes/bar-maki/',
    hours: 'Lun-Dom 12:00 PM-10:00 PM',
    holiday_mode: 'inherit',
    holiday_open_time: null,
    holiday_close_time: null,
    holiday_split_open_time: null,
    holiday_split_close_time: null,
    min_budget: 0,
    max_budget: 0,
    instagram: 'https://www.instagram.com/makibar.col/',
    latitude: null,
    longitude: null,
    is_active: true,
    sort_order: 10,
    created_at: makibarBranch?.created_at ?? NOW,
    updated_at: NOW,
  };

  if (makibarBranch) {
    Object.assign(makibarBranch, makibarPayload, { id: makibarBranch.id });
  } else {
    catalog.branches.push(makibarPayload);
  }

  const makibarBranchId = makibarBranch?.id ?? MAKIBAR_BRANCH_ID;
  const makibarSpecs = [
    { day: 1, open: '12:00:00', close: '22:00:00', sortOrder: 10 },
    { day: 2, open: '12:00:00', close: '22:00:00', sortOrder: 20 },
    { day: 3, open: '12:00:00', close: '22:00:00', sortOrder: 30 },
    { day: 4, open: '12:00:00', close: '22:00:00', sortOrder: 40 },
    { day: 5, open: '12:00:00', close: '22:00:00', sortOrder: 50 },
    { day: 6, open: '12:00:00', close: '22:00:00', sortOrder: 60 },
    { day: 0, open: '12:00:00', close: '22:00:00', sortOrder: 70 },
  ];
  catalog.branchHours = upsertHours(catalog.branchHours, makibarBranchId, nextHoursId, makibarSpecs);
  catalog.hours = upsertHours(catalog.hours, makibarBranchId, nextHoursId, makibarSpecs);

  writeJson(catalogPath, catalog);
}

const tracker = readJson(TRACKER_PATH);
tracker.updatedAt = NOW;

function upsertEntry(entry) {
  const index = tracker.entries.findIndex((item) => item.slug === entry.slug);
  if (index >= 0) {
    tracker.entries[index] = { ...tracker.entries[index], ...entry };
  } else {
    tracker.entries.push(entry);
  }
}

upsertEntry({
  slug: 'entre-costas',
  name: 'Entre Costas',
  instagram: 'https://www.instagram.com/entrecostasrestaurante/',
  status: 'incomplete',
  internalTag: 'followup-lago-verde-added-from-ig',
  missingFields: ['coordinates', 'photos'],
  notes: [
    'Se confirmó desde la bio de Instagram que la marca opera en Palmas Mall · Ciudad Jardín y en Lago Verde · Pance.',
    'Se cargaron horarios por sede desde el highlight "Horarios": Palmas Mall y Lago Verde.',
    'La sede Lago Verde quedó agregada con dirección base de centro comercial, pero sigue pendiente de coordenadas exactas.',
  ],
  lastReviewedAt: NOW,
});

upsertEntry({
  slug: 'makibar',
  name: 'Maki Bar',
  instagram: 'https://www.instagram.com/makibar.col/',
  status: 'incomplete',
  internalTag: 'followup-google-hours-contact-menu',
  missingFields: ['min_budget', 'max_budget', 'coordinates', 'photos'],
  notes: [
    'Se creó la ficha a partir del Instagram oficial de Maki Bar.',
    'El highlight "📍Sedes" confirmó presencia en Cali dentro del Intercontinental de Cali, Av. Colombia No. 2-72.',
    'Se cargaron teléfono, WhatsApp, menú y horario corrido 12 PM-10 PM desde la ficha de Google del lugar.',
  ],
  lastReviewedAt: NOW,
});

upsertEntry({
  slug: 'la-boheme',
  name: 'La Bohème',
  instagram: 'https://www.instagram.com/labohemecali/',
  status: 'incomplete',
  internalTag: 'followup-bio-refresh-no-photos',
  missingFields: ['coordinates', 'photos', 'max_budget'],
  notes: [
    'Se refrescó la ficha con la bio actual de Instagram: restaurante-bar de cocina latina moderna en San Antonio.',
    'La dirección quedó normalizada como Calle 1 #6-09, San Antonio, Cali.',
    'Se agregó el enlace directo de WhatsApp compartido por el lugar.',
    'Se mantuvo el menú existente, pero queda pendiente completar medios y presupuesto máximo con mejor fuente.',
  ],
  lastReviewedAt: NOW,
});

writeJson(TRACKER_PATH, tracker);

console.log(
  JSON.stringify(
    {
      updatedAt: NOW,
      spots: ['entre-costas', 'makibar', 'la-boheme'],
      created: ['makibar'],
      updated: ['entre-costas', 'la-boheme'],
    },
    null,
    2,
  ),
);
