import { readFileSync, writeFileSync } from 'node:fs';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH =
  '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function saveJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

function upsertBranchHours(rows, branchId, weeklyHours, nextIdRef) {
  const remaining = rows.filter((row) => row.branch_id !== branchId);
  const created = weeklyHours.map((row) => ({
    id: nextIdRef.value++,
    branch_id: branchId,
    day_of_week: row.day_of_week,
    is_closed: false,
    open_time: row.open_time,
    close_time: row.close_time,
    split_open_time: null,
    split_close_time: null,
    sort_order: row.sort_order,
  }));

  return [...remaining, ...created];
}

function removeBranchHours(rows, branchIds) {
  return rows.filter((row) => !branchIds.includes(row.branch_id));
}

function replaceBranches(catalog, spotId, newBranches) {
  catalog.branches = catalog.branches.filter((branch) => branch.spot_id !== spotId);
  catalog.branches.push(...newBranches);
}

function upsertTrackerEntry(tracker, entry) {
  const existingIndex = tracker.entries.findIndex((item) => item.slug === entry.slug);
  if (existingIndex >= 0) {
    tracker.entries[existingIndex] = entry;
  } else {
    tracker.entries.push(entry);
  }
}

function makeWeekdayRows({ monday, tuesday, wednesday, thursday, friday, saturday, sunday }) {
  return [
    { day_of_week: 1, ...monday, sort_order: 10 },
    { day_of_week: 2, ...tuesday, sort_order: 20 },
    { day_of_week: 3, ...wednesday, sort_order: 30 },
    { day_of_week: 4, ...thursday, sort_order: 40 },
    { day_of_week: 5, ...friday, sort_order: 50 },
    { day_of_week: 6, ...saturday, sort_order: 60 },
    { day_of_week: 0, ...sunday, sort_order: 70 },
  ];
}

function updateCatalog(catalogPath) {
  const catalog = loadJson(catalogPath);
  const now = new Date().toISOString();

  const nextBranchHourId = {
    value: Math.max(0, ...catalog.branchHours.map((row) => Number(row.id) || 0)) + 1,
  };
  const nextHoursId = {
    value: Math.max(0, ...catalog.hours.map((row) => Number(row.id) || 0)) + 1,
  };

  const spotsBySlug = Object.fromEntries(catalog.spots.map((spot) => [spot.slug, spot]));
  const branchesBySlug = Object.fromEntries(catalog.branches.map((branch) => [branch.slug, branch]));

  const baltazar = spotsBySlug['baltazar-y-siete-lunas'];
  const baltazarBranch = branchesBySlug['baltazar-y-siete-lunas-cali'];
  baltazar.name = 'Baltasar y Sietelunas';
  baltazar.short_description =
    'Una pizzería napolitana contemporánea en Lago Verde para comer rico, compartir y tener un plan relajado entre semana o fin de semana. Funciona muy bien para cita casual, pizza entre amigos y una salida con buen producto.';
  baltazar.tags = ['pizza napolitana', 'pizza', 'italiano', 'lago verde', 'pance', 'cena casual'];
  baltazar.moods = ['comer rico', 'pareja', 'con amigos', 'plan tranqui'];
  baltazar.updated_at = now;

  baltazarBranch.address = 'Calle 16A #122-70 LC E3, C.C. Lago Verde, Pance, Cali';
  baltazarBranch.neighborhood = 'Pance';
  baltazarBranch.mall = 'C.C. Lago Verde';
  baltazarBranch.max_people = 4;
  baltazarBranch.instagram = 'https://www.instagram.com/baltasarysietelunas/';
  baltazarBranch.hours = 'Lun-Vie 17:00-22:00 · Sáb-Dom 15:00-22:00';
  baltazarBranch.updated_at = now;
  const baltazarRows = makeWeekdayRows({
    monday: { open_time: '17:00:00', close_time: '22:00:00' },
    tuesday: { open_time: '17:00:00', close_time: '22:00:00' },
    wednesday: { open_time: '17:00:00', close_time: '22:00:00' },
    thursday: { open_time: '17:00:00', close_time: '22:00:00' },
    friday: { open_time: '17:00:00', close_time: '22:00:00' },
    saturday: { open_time: '15:00:00', close_time: '22:00:00' },
    sunday: { open_time: '15:00:00', close_time: '22:00:00' },
  });
  catalog.branchHours = upsertBranchHours(catalog.branchHours, baltazarBranch.id, baltazarRows, nextBranchHourId);
  catalog.hours = upsertBranchHours(catalog.hours, baltazarBranch.id, baltazarRows, nextHoursId);

  const depita = spotsBySlug['de-pita-madre'];
  const depitaBranch = branchesBySlug['de-pita-madre-cali'];
  depita.short_description =
    'Una propuesta casual de fusión griega y mexicana en Lago Verde para resolver antojo rápido, compartir y comer sabroso sin complicarse demasiado. Va bien para parche corto, comida informal y plan relajado con amigos.';
  depita.tags = ['pitas', 'griega', 'mexicana', 'fusión', 'lago verde', 'fast casual'];
  depita.moods = ['casual', 'antojo', 'con amigos', 'comer rico'];
  depita.updated_at = now;

  depitaBranch.address = 'Lago Verde, Pance, Cali';
  depitaBranch.neighborhood = 'Pance';
  depitaBranch.mall = 'Lago Verde';
  depitaBranch.max_people = 4;
  depitaBranch.hours = 'Lun-Dom 12:00-23:00';
  depitaBranch.min_budget = 35000;
  depitaBranch.max_budget = 60000;
  depitaBranch.instagram = 'https://www.instagram.com/depitamadrefood/';
  depitaBranch.updated_at = now;

  const lumina = spotsBySlug['lumina'];
  const luminaBranch = branchesBySlug['lumina-cali'];
  lumina.short_description =
    'Un restaurante en Lago Verde con una propuesta visual y de coctelería más especial, pensado para una salida bonita, conversación larga y un parche más íntimo que ruidoso. Se siente más de cita, celebración suave o plan lindo con amigos.';
  lumina.tags = ['cocteles', 'restaurante', 'lago verde', 'pance', 'algo especial'];
  lumina.moods = ['algo especial', 'pareja', 'tomar algo', 'plan tranqui'];
  lumina.updated_at = now;

  luminaBranch.address = 'Lago Verde, Pance, Cali';
  luminaBranch.neighborhood = 'Pance';
  luminaBranch.mall = 'Lago Verde';
  luminaBranch.max_people = 4;
  luminaBranch.instagram = 'https://www.instagram.com/iluminarestaurant/';
  luminaBranch.updated_at = now;

  const santaFusion = spotsBySlug['santa-fusion'];
  const santaFusionBranch = branchesBySlug['santa-fusion-cali'];
  santaFusion.short_description =
    'Un restaurante en Lago Verde que cubre brunch, almuerzos, tardeo y cena en un mismo lugar. Funciona bien para comida casual, parche con amigos y un plan tranquilo en Pance con opciones a distintas horas del día.';
  santaFusion.tags = ['brunch', 'almuerzos', 'tardeo', 'cena', 'lago verde', 'pance'];
  santaFusion.moods = ['comer rico', 'casual', 'con amigos', 'plan tranqui'];
  santaFusion.updated_at = now;

  santaFusionBranch.address = 'Parque Comercial Lago Verde, Pance, Cali';
  santaFusionBranch.neighborhood = 'Pance';
  santaFusionBranch.mall = 'Parque Comercial Lago Verde';
  santaFusionBranch.max_people = 6;
  santaFusionBranch.menu_url = 'https://heyzine.com/flip-book/bcf20e361a.html';
  santaFusionBranch.instagram = 'https://www.instagram.com/santa.fusion/';
  santaFusionBranch.hours =
    'Lun Cerrado · Mar-Mié 14:00-19:00 · Jue 14:00-21:00 · Vie 14:00-22:00 · Sáb 13:00-22:00 · Dom 10:00-18:00';
  santaFusionBranch.min_budget = 35000;
  santaFusionBranch.max_budget = 49000;
  santaFusionBranch.updated_at = now;
  const santaFusionRows = [
    { day_of_week: 1, open_time: null, close_time: null, sort_order: 10, is_closed: true },
    { day_of_week: 2, open_time: '14:00:00', close_time: '19:00:00', sort_order: 20 },
    { day_of_week: 3, open_time: '14:00:00', close_time: '19:00:00', sort_order: 30 },
    { day_of_week: 4, open_time: '14:00:00', close_time: '21:00:00', sort_order: 40 },
    { day_of_week: 5, open_time: '14:00:00', close_time: '22:00:00', sort_order: 50 },
    { day_of_week: 6, open_time: '13:00:00', close_time: '22:00:00', sort_order: 60 },
    { day_of_week: 0, open_time: '10:00:00', close_time: '18:00:00', sort_order: 70 },
  ];
  function upsertHoursWithClosed(rows, branchId, weeklyHours, nextIdRef) {
    const remaining = rows.filter((row) => row.branch_id !== branchId);
    const created = weeklyHours.map((row) => ({
      id: nextIdRef.value++,
      branch_id: branchId,
      day_of_week: row.day_of_week,
      is_closed: row.is_closed ?? false,
      open_time: row.open_time,
      close_time: row.close_time,
      split_open_time: null,
      split_close_time: null,
      sort_order: row.sort_order,
    }));
    return [...remaining, ...created];
  }
  catalog.branchHours = upsertHoursWithClosed(catalog.branchHours, santaFusionBranch.id, santaFusionRows, nextBranchHourId);
  catalog.hours = upsertHoursWithClosed(catalog.hours, santaFusionBranch.id, santaFusionRows, nextHoursId);

  const gran = spotsBySlug['el-gran-langostino'];
  const granBranch = branchesBySlug['el-gran-langostino-cali'];
  gran.short_description =
    'Una referencia clásica para comprar y comer mariscos en Cali, más de almuerzo potente y antojo de pescado o camarón que de parche largo. Entra al catálogo con la sede de Alameda para tener una ficha real y útil.';
  gran.tags = ['mariscos', 'pescados', 'comida de mar', 'alameda', 'almuerzo'];
  gran.moods = ['comer rico', 'familiar', 'almuerzo'];
  gran.updated_at = now;

  granBranch.address = 'Calle 9B #24-06, Barrio Alameda, Cali';
  granBranch.neighborhood = 'Alameda';
  granBranch.mall = 'Alameda Esquina';
  granBranch.max_people = 4;
  granBranch.hours =
    'Lun-Jue 07:30-16:00 · Vie-Sáb 07:30-17:00 · Dom 07:30-13:00';
  granBranch.updated_at = now;
  const granRows = makeWeekdayRows({
    monday: { open_time: '07:30:00', close_time: '16:00:00' },
    tuesday: { open_time: '07:30:00', close_time: '16:00:00' },
    wednesday: { open_time: '07:30:00', close_time: '16:00:00' },
    thursday: { open_time: '07:30:00', close_time: '16:00:00' },
    friday: { open_time: '07:30:00', close_time: '17:00:00' },
    saturday: { open_time: '07:30:00', close_time: '17:00:00' },
    sunday: { open_time: '07:30:00', close_time: '13:00:00' },
  });
  catalog.branchHours = upsertBranchHours(catalog.branchHours, granBranch.id, granRows, nextBranchHourId);
  catalog.hours = upsertBranchHours(catalog.hours, granBranch.id, granRows, nextHoursId);

  const granPanceBranch = branchesBySlug['el-gran-langostino-pance-cali'];
  const granSirenaBranch = branchesBySlug['el-gran-langostino-sirena-cali'];
  const granDeliciasBranch = branchesBySlug['el-gran-langostino-delicias-cali'];

  if (granPanceBranch) {
    granPanceBranch.address = 'La María, local 4, diagonal iglesia La María, Ciudad Jardín, Cali';
    granPanceBranch.neighborhood = 'Ciudad Jardín';
    granPanceBranch.mall = 'La María';
    granPanceBranch.updated_at = now;
  }

  if (granSirenaBranch) {
    granSirenaBranch.mall = 'La Sirena';
    granSirenaBranch.updated_at = now;
  }

  if (granDeliciasBranch) {
    granDeliciasBranch.mall = 'Delicias';
    granDeliciasBranch.updated_at = now;
  }

  const mimos = spotsBySlug['mimos'];
  mimos.short_description =
    'Una marca clásica de helado y antojo dulce con varias sedes confirmadas en Cali. Funciona como parada corta de postre, plan familiar y antojo rápido en centros comerciales y puntos de alto flujo.';
  mimos.tags = ['helado', 'postres', 'dulce', 'familiar', 'malteadas'];
  mimos.moods = ['dulce', 'familiar', 'antojo', 'plan corto'];
  mimos.updated_at = now;

  const oldMimosBranchIds = catalog.branches
    .filter((branch) => branch.spot_id === mimos.id)
    .map((branch) => branch.id);
  catalog.branchHours = removeBranchHours(catalog.branchHours, oldMimosBranchIds);
  catalog.hours = removeBranchHours(catalog.hours, oldMimosBranchIds);

  const mimosBranches = [
    {
      id: 5157,
      spot_id: mimos.id,
      slug: 'mimos-centenario-cali',
      address: 'Avenida 4 #7N-46 Local 146, Centro Comercial Centenario, Cali',
      neighborhood: 'Centenario',
      mall: 'Centro Comercial Centenario',
      max_people: 3,
      phone: '',
      whatsapp: '',
      menu_url: '',
      latitude: null,
      longitude: null,
      created_at: '2026-04-08T09:15:00.000000+00:00',
      updated_at: now,
      hours: '',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      min_budget: 0,
      max_budget: 0,
      instagram: 'https://www.instagram.com/heladosmimos/',
      is_active: true,
      sort_order: 10,
    },
    {
      id: 5165,
      spot_id: mimos.id,
      slug: 'mimos-alkosto-norte-cali',
      address: 'Carrera 1 #62 Norte, Alkosto Norte, Cali',
      neighborhood: 'Calima',
      mall: 'Alkosto Norte',
      max_people: 3,
      phone: '',
      whatsapp: '',
      menu_url: '',
      latitude: null,
      longitude: null,
      created_at: now,
      updated_at: now,
      hours: '',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      min_budget: 0,
      max_budget: 0,
      instagram: 'https://www.instagram.com/heladosmimos/',
      is_active: true,
      sort_order: 20,
    },
    {
      id: 5166,
      spot_id: mimos.id,
      slug: 'mimos-chipichape-cali',
      address: 'Calle 38 #5N-35 Local 312, Centro Comercial Chipichape, Cali',
      neighborhood: 'Chipichape',
      mall: 'Centro Comercial Chipichape',
      max_people: 3,
      phone: '',
      whatsapp: '',
      menu_url: '',
      latitude: null,
      longitude: null,
      created_at: now,
      updated_at: now,
      hours: '',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      min_budget: 0,
      max_budget: 0,
      instagram: 'https://www.instagram.com/heladosmimos/',
      is_active: true,
      sort_order: 30,
    },
    {
      id: 5167,
      spot_id: mimos.id,
      slug: 'mimos-ciudad-jardin-cali',
      address: 'Calle 18 Av. Cascajal #106-105 Local 104, Centro Comercial Ciudad Jardín, Cali',
      neighborhood: 'Ciudad Jardín',
      mall: 'Centro Comercial Ciudad Jardín',
      max_people: 3,
      phone: '',
      whatsapp: '',
      menu_url: '',
      latitude: null,
      longitude: null,
      created_at: now,
      updated_at: now,
      hours: '',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      min_budget: 0,
      max_budget: 0,
      instagram: 'https://www.instagram.com/heladosmimos/',
      is_active: true,
      sort_order: 40,
    },
    {
      id: 5168,
      spot_id: mimos.id,
      slug: 'mimos-exito-la-flora-cali',
      address: 'Avenida 3F Norte #52N-26 Local 133A, Éxito La Flora, Cali',
      neighborhood: 'La Flora',
      mall: 'Éxito La Flora',
      max_people: 3,
      phone: '',
      whatsapp: '',
      menu_url: '',
      latitude: null,
      longitude: null,
      created_at: now,
      updated_at: now,
      hours: '',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      min_budget: 0,
      max_budget: 0,
      instagram: 'https://www.instagram.com/heladosmimos/',
      is_active: true,
      sort_order: 50,
    },
    {
      id: 5169,
      spot_id: mimos.id,
      slug: 'mimos-exito-san-fernando-cali',
      address: 'Calle 5 #38D-27 Local 109A, Éxito San Fernando, Cali',
      neighborhood: 'San Fernando',
      mall: 'Éxito San Fernando',
      max_people: 3,
      phone: '',
      whatsapp: '',
      menu_url: '',
      latitude: null,
      longitude: null,
      created_at: now,
      updated_at: now,
      hours: '',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      min_budget: 0,
      max_budget: 0,
      instagram: 'https://www.instagram.com/heladosmimos/',
      is_active: true,
      sort_order: 60,
    },
    {
      id: 5170,
      spot_id: mimos.id,
      slug: 'mimos-exito-simon-bolivar-cali',
      address: 'Carrera 70 #28D-20 Local 0111, Éxito Simón Bolívar, Cali',
      neighborhood: 'Simón Bolívar',
      mall: 'Éxito Simón Bolívar',
      max_people: 3,
      phone: '',
      whatsapp: '',
      menu_url: '',
      latitude: null,
      longitude: null,
      created_at: now,
      updated_at: now,
      hours: '',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      min_budget: 0,
      max_budget: 0,
      instagram: 'https://www.instagram.com/heladosmimos/',
      is_active: true,
      sort_order: 70,
    },
    {
      id: 5171,
      spot_id: mimos.id,
      slug: 'mimos-jardin-plaza-cali',
      address: 'Carrera 98 #16-200 Local K-15, Centro Comercial Jardín Plaza, Cali',
      neighborhood: 'Valle del Lili',
      mall: 'Centro Comercial Jardín Plaza',
      max_people: 3,
      phone: '',
      whatsapp: '',
      menu_url: '',
      latitude: null,
      longitude: null,
      created_at: now,
      updated_at: now,
      hours: '',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      min_budget: 0,
      max_budget: 0,
      instagram: 'https://www.instagram.com/heladosmimos/',
      is_active: true,
      sort_order: 80,
    },
    {
      id: 5172,
      spot_id: mimos.id,
      slug: 'mimos-jumbo-chipichape-cali',
      address: 'Calle 40 #6A Norte-45 Local P104, Jumbo Chipichape, Cali',
      neighborhood: 'Chipichape',
      mall: 'Jumbo Chipichape',
      max_people: 3,
      phone: '',
      whatsapp: '',
      menu_url: '',
      latitude: null,
      longitude: null,
      created_at: now,
      updated_at: now,
      hours: '',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      min_budget: 0,
      max_budget: 0,
      instagram: 'https://www.instagram.com/heladosmimos/',
      is_active: true,
      sort_order: 90,
    },
    {
      id: 5173,
      spot_id: mimos.id,
      slug: 'mimos-limonar-cali',
      address: 'Calle 5 Autopista Sur #68-70 Local 2-80B, Centro Comercial Premier Limonar, Cali',
      neighborhood: 'Limonar',
      mall: 'Centro Comercial Premier Limonar',
      max_people: 3,
      phone: '',
      whatsapp: '',
      menu_url: '',
      latitude: null,
      longitude: null,
      created_at: now,
      updated_at: now,
      hours: '',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      min_budget: 0,
      max_budget: 0,
      instagram: 'https://www.instagram.com/heladosmimos/',
      is_active: true,
      sort_order: 100,
    },
    {
      id: 5174,
      spot_id: mimos.id,
      slug: 'mimos-unico-cali',
      address: 'Calle 52 #3-29 Local B-21, Centro Comercial Único Outlet, Cali',
      neighborhood: 'Salomia',
      mall: 'Centro Comercial Único Outlet',
      max_people: 3,
      phone: '',
      whatsapp: '',
      menu_url: '',
      latitude: null,
      longitude: null,
      created_at: now,
      updated_at: now,
      hours: '',
      holiday_mode: 'inherit',
      holiday_open_time: null,
      holiday_close_time: null,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      min_budget: 0,
      max_budget: 0,
      instagram: 'https://www.instagram.com/heladosmimos/',
      is_active: true,
      sort_order: 110,
    },
  ];
  replaceBranches(catalog, mimos.id, mimosBranches);

  saveJson(catalogPath, catalog);
}

function updateTracker() {
  const tracker = loadJson(TRACKER_PATH);
  const now = new Date().toISOString();
  tracker.updatedAt = now;

  upsertTrackerEntry(tracker, {
    slug: 'baltazar-y-siete-lunas',
    name: 'Baltasar y Sietelunas',
    instagram: 'https://www.instagram.com/baltasarysietelunas/',
    status: 'incomplete',
    internalTag: 'followup-photos-contact-pricing',
    missingFields: ['photos', 'menu_url', 'min_budget', 'max_budget', 'phone', 'whatsapp'],
    notes: [
      'Dirección y horarios cargados desde bio + highlight de Horario.',
      'Se descargaron fotos del grid, pero aún no se subieron al catálogo.',
      'La mejor evidencia de horario fue la última story útil del highlight.'
    ],
    lastReviewedAt: now,
  });

  upsertTrackerEntry(tracker, {
    slug: 'de-pita-madre',
    name: 'De Pita Madre',
    instagram: 'https://www.instagram.com/depitamadrefood/',
    status: 'incomplete',
    internalTag: 'followup-hours-contact-photos',
    missingFields: ['hours', 'photos', 'phone', 'whatsapp'],
    notes: [
      'Bio confirma Lago Verde en Pance.',
      'El highlight MENÚ dejó precios entre 7.000 COP y 60.000 COP.',
      'No salieron fotos útiles del grid en la corrida del scraper.'
    ],
    lastReviewedAt: now,
  });

  upsertTrackerEntry(tracker, {
    slug: 'mimos',
    name: 'Mimo\'s',
    instagram: 'https://www.instagram.com/heladosmimos/',
    status: 'incomplete',
    internalTag: 'followup-hours-pricing-photos',
    missingFields: ['hours_by_branch', 'min_budget', 'max_budget', 'photos'],
    notes: [
      'Se reemplazó la ficha ficticia de Lago Verde por sedes reales encontradas para Cali.',
      'La evidencia de sedes viene de una lista pública reciente de puntos Mimos en Cali.',
      'El perfil de Instagram es nacional y no trae horarios ni links útiles por sede.'
    ],
    lastReviewedAt: now,
  });

  upsertTrackerEntry(tracker, {
    slug: 'lumina',
    name: 'Lumina',
    instagram: 'https://www.instagram.com/iluminarestaurant/',
    status: 'incomplete',
    internalTag: 'followup-address-hours-pricing-photos',
    missingFields: ['full_address', 'hours', 'min_budget', 'max_budget', 'photos', 'phone', 'whatsapp'],
    notes: [
      'Se asumió que Lumina en la app corresponde a Ilumina Restaurant por coincidencia de nombre y Lago Verde/Pance.',
      'La bio visible confirma Lago Verde, pero quedó truncada y no dio dirección completa.',
      'Las fotos descargadas del grid no quedaron con calidad editorial suficiente para subirlas todavía.'
    ],
    lastReviewedAt: now,
  });

  upsertTrackerEntry(tracker, {
    slug: 'santa-fusion',
    name: 'Santa Fusión',
    instagram: 'https://www.instagram.com/santa.fusion/',
    status: 'incomplete',
    internalTag: 'followup-photos-contact-pricing',
    missingFields: ['photos', 'min_budget', 'max_budget', 'phone', 'whatsapp'],
    notes: [
      'Se cargaron horarios vigentes desde el highlight HORARIOS.',
      'Se cargó el link de menú de Heyzine visible en bio.',
      'La dirección quedó a nivel de Parque Comercial Lago Verde, Pance.'
    ],
    lastReviewedAt: now,
  });

  upsertTrackerEntry(tracker, {
    slug: 'el-gran-langostino',
    name: 'El Gran Langostino',
    instagram: '',
    status: 'incomplete',
    internalTag: 'followup-instagram-contact-pricing-photos',
    missingFields: ['instagram', 'min_budget', 'max_budget', 'phone', 'whatsapp', 'photos'],
    notes: [
      'Se actualizó la sede de Cali con la ubicación pública de Alameda Esquina.',
      'Los horarios se cargaron desde una fuente pública de sucursales del negocio.',
      'No hay evidencia suficiente todavía para asociarlo a Lago Verde.'
    ],
    lastReviewedAt: now,
  });

  saveJson(TRACKER_PATH, tracker);
}

for (const path of CATALOG_PATHS) {
  updateCatalog(path);
}
updateTracker();

console.log('Batch update completo para Baltazar, De Pita Madre, Mimos, Lumina, Santa Fusión y El Gran Langostino.');
