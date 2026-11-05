import fs from 'node:fs';

const files = ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json'];
const instagram = 'https://www.instagram.com/fusionwok/';
const website = 'https://www.aldeaasiatica.com/';
const menuUrl = 'https://menupp.co/aldeaasiatica';

const menuItems = [
  { name: 'Macerado Lulo - Lychees', category: 'Macerados', presentation: 'Individual', price: 23000, currency: 'COP', calculationIncluded: true },
  { name: 'Bao Buns Del Mar', category: 'Bao Buns', presentation: 'Individual', price: 25500, currency: 'COP', calculationIncluded: true },
  { name: 'Passion Mule', category: 'Cócteles', presentation: 'Individual', price: 37500, currency: 'COP', calculationIncluded: true },
  { name: 'Camarones Ying Yang', category: 'Entradas', presentation: 'Para compartir', price: 45000, currency: 'COP', calculationIncluded: true },
  { name: 'Phad Thai Clásico', category: 'Salteados', presentation: 'Individual', price: 55500, currency: 'COP', calculationIncluded: true },
  { name: 'Pacífico', category: 'Bowls', presentation: 'Individual', price: 66500, currency: 'COP', calculationIncluded: true },
  { name: 'Desgranado', category: 'Sushis especiales', presentation: '10 bocados', price: 49500, currency: 'COP', calculationIncluded: true },
  { name: 'Banana Arequipe', category: 'Postres', presentation: 'Individual', price: 21500, currency: 'COP', calculationIncluded: true },
  { name: 'Vino Santa Rita 120', category: 'Vinos y licores', presentation: 'Botella', price: 145000, currency: 'COP', calculationIncluded: true }
];

const scenarios = [
  { concept: 'Parche tranqui', note: 'Una bebida y algo pequeño para comer por persona.', lines: [
    { name: 'Macerado Lulo - Lychees', category: 'Macerados', presentation: 'Individual', quantity: 1, groupSize: 1 },
    { name: 'Bao Buns Del Mar', category: 'Bao Buns', presentation: 'Individual', quantity: 1, groupSize: 1 }
  ]},
  { concept: 'Parche completo', note: 'Un plato fuerte y una bebida por persona, más una entrada para compartir y postre.', lines: [
    { name: 'Passion Mule', category: 'Cócteles', presentation: 'Individual', quantity: 1, groupSize: 1 },
    { name: 'Pacífico', category: 'Bowls', presentation: 'Individual', quantity: 1, groupSize: 1 },
    { name: 'Camarones Ying Yang', category: 'Entradas', presentation: 'Para compartir', quantity: 1, groupSize: 2 },
    { name: 'Banana Arequipe', category: 'Postres', presentation: 'Individual', quantity: 1, groupSize: 2 }
  ]},
  { concept: 'Con toda', note: 'Botella de vino, plato fuerte, entrada y postre para el parche.', lines: [
    { name: 'Vino Santa Rita 120', category: 'Vinos y licores', presentation: 'Botella', quantity: 1, groupSize: 2 },
    { name: 'Pacífico', category: 'Bowls', presentation: 'Individual', quantity: 1, groupSize: 1 },
    { name: 'Camarones Ying Yang', category: 'Entradas', presentation: 'Para compartir', quantity: 1, groupSize: 2 },
    { name: 'Banana Arequipe', category: 'Postres', presentation: 'Individual', quantity: 1, groupSize: 2 }
  ]}
];

const branchData = {
  5188: { address: 'Calle 36N #6A-65, Local 502, Piso 5, C.C. Pacific Center, Cali', neighborhood: 'Santa Mónica', hours: 'Lun-Jue 11:00-21:00 · Vie 11:00-22:00 · Sáb 11:00-22:00 · Dom 11:00-21:00', holidayClose: '21:00', phone: '3126598939', lat: 3.4743876, lon: -76.527957, placeId: 'ChIJyYrcJgCnMI4R5Y_DZ_d1DDI', locationId: 'Mwtgy9Arj8QDBaPE0bzl' },
  5184: { address: 'Cra 125 con Calle 16A, Local 4-5, Pance, Cali', neighborhood: 'Pance', hours: 'Lun-Vie 11:00-21:00 · Sáb 11:00-22:00 · Dom 11:00-21:00', holidayClose: '21:00', phone: '3202528440', lat: 3.3381491, lon: -76.5350968, placeId: 'ChIJ_a9DGF-hMI4RftKlfftebH4', locationId: 'cJmrnBbRFjYpXqOrbmvh' },
  5185: { address: 'Av. 9A Norte #15A-30, Granada, Cali', neighborhood: 'Granada', hours: 'Lun-Jue 11:00-22:00 · Vie-Sáb 11:00-23:00 · Dom 11:00-22:00', holidayClose: '22:00', phone: '3126598939', lat: 3.4604679, lon: -76.5343099, placeId: 'ChIJ0UUcXdSnMI4RekGq5dBO7Gs', locationId: 'UMJfSm0wy5Uyo0DWE0Hn' },
  5187: { address: 'Calle 3A #34-09, Parque del Perro, Cali', neighborhood: 'San Fernando', hours: 'Lun-Mie 11:00-22:00 · Jue-Vie 11:00-23:00 · Sáb 11:00-23:00 · Dom 11:00-22:00', holidayClose: '22:00', phone: '3126598939', lat: 3.4351605, lon: -76.5451746, placeId: 'ChIJPxudY6enMI4RAEIcT4rYdD4', locationId: 'ggAlzCVwYL39FDA45FUP' },
  5186: { address: 'Carrera 105 #15B-45, Local 1-4, Las Velas, Cali', neighborhood: 'Ciudad Jardín', hours: 'Lun-Jue 10:50-23:00 · Vie-Sáb 10:50-23:00 · Dom 10:50-22:00', holidayClose: '22:00', phone: '6023322533', lat: 3.3642478, lon: -76.5332024, placeId: 'ChIJvawnkJ2hMI4R-0YGB643NII', locationId: 'uU5sJpCmlKCtAFBeI0Cx' }
};

for (const file of files) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const spot = catalog.spots.find((item) => item.id === 3660);
  if (!spot) throw new Error(`Fusion Wok spot missing in ${file}`);
  Object.assign(spot, {
    name: 'Fusion Wok',
    short_description: 'Caé por sushi, wok y sabores asiáticos para comer rico, compartir y armar el parche en varias sedes de Cali.',
    is_active: true,
    catalog_status: 'reviewed',
    instagram,
    source_urls: [instagram, menuUrl, website],
    updated_at: new Date().toISOString()
  });

  for (const [id, data] of Object.entries(branchData)) {
    const branch = catalog.branches.find((item) => item.id === Number(id));
    if (!branch) throw new Error(`Fusion Wok branch ${id} missing in ${file}`);
    Object.assign(branch, {
      ...data,
      holiday_mode: 'custom',
      holiday_open_time: '11:00',
      holiday_close_time: data.holidayClose,
      holiday_split_open_time: null,
      holiday_split_close_time: null,
      menu_url: menuUrl,
      menu_items: menuItems,
      budget_scenarios: scenarios,
      min_budget: 48500,
      typical_budget: 125000,
      max_budget: 185000,
      budget_basis: 'Parche tranqui: una bebida y algo pequeño para comer por persona, calculado para dos personas.',
      menu_calculation_note: 'El restaurante puede actualizar los precios.',
      phone: data.phone,
      instagram,
      is_active: true,
      updated_at: new Date().toISOString(),
      google_place_id: data.placeId,
      missing_fields: ['holiday_hours']
    });
  }
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Updated ${file}`);
}
