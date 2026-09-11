import fs from 'node:fs';

const files = [
  'apps/mobile/public/spots-catalog.json',
  'apps/mobile/dist/spots-catalog.json',
];

const googleHours = 'Dom 18:00-01:00 · Lun cerrado · Mar-Mie 18:00-01:00 · Jue 18:00-02:30 · Vie-Sab 18:00-03:00';
const menuUrl = 'https://www.tripadvisor.co/Restaurant_Review-g297475-d27161445-Reviews-Furtivo-Cali_Valle_del_Cauca_Department.html';

for (const file of files) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const spot = catalog.spots.find((item) => item.id === 3516);
  const branch = catalog.branches.find((item) => item.id === 4759);
  if (!spot || !branch) throw new Error(`Furtivo records not found in ${file}`);

  spot.name = 'Furtivo';
  spot.short_description = 'Caé a El Peñón por una noche de speakeasy, cocina nikkei y tragos para armar un parche distinto.';
  spot.is_active = true;
  spot.catalog_status = 'published';
  spot.instagram = 'https://www.instagram.com/furtivocali/';
  spot.source_urls = ['https://www.instagram.com/furtivocali/', menuUrl];
  spot.updated_at = new Date().toISOString();

  branch.neighborhood = 'El Peñón';
  branch.address = 'Cl. 1 Oe. #1-32, Normandia Sebastian de Belalcazar, Cali, Valle del Cauca';
  branch.hours = googleHours;
  branch.min_budget = 0;
  branch.max_budget = 0;
  branch.menu_url = menuUrl;
  branch.phone = '3173519642';
  branch.instagram = 'https://www.instagram.com/furtivocali/';
  branch.latitude = 3.4506873;
  branch.longitude = -76.5409653;
  branch.is_active = true;
  branch.updated_at = new Date().toISOString();
  branch.budget_scenarios = [];
  branch.budget_basis = 'Presupuesto por confirmar';
  branch.menu_calculation_note = 'No se encontró una carta pública verificable con precios normales para construir la calculadora.';
  branch.missing_fields = ['menu_vigente', 'budget_scenarios', 'logo_url', 'instagram', 'holiday_hours'];
  branch.menu_url = 'https://menupp.co/furtivocali/venue/rgumHjWp5c1ajpkszmOV/menu/8PuZ7iHs68DJktv3B3PP';
  branch.menu_items = [
    { name: 'Mojito', category: 'Cócteles clásicos', presentation: 'Individual', price: 30000, currency: 'COP', calculationIncluded: true },
    { name: 'Cuba Libre', category: 'Cócteles clásicos', presentation: 'Individual', price: 30000, currency: 'COP', calculationIncluded: true },
    { name: 'Gin Tonic', category: 'Cócteles clásicos', presentation: 'Individual', price: 46000, currency: 'COP', calculationIncluded: true },
    { name: 'Aperol Spritz', category: 'Cócteles clásicos', presentation: 'Individual', price: 52000, currency: 'COP', calculationIncluded: true },
    { name: 'Tropical Spicy Margarita', category: 'Cócteles clásicos', presentation: 'Individual', price: 37000, currency: 'COP', calculationIncluded: true },
    { name: 'Club Colombia Dorada', category: 'Cervezas', presentation: 'Individual', price: 14000, currency: 'COP', calculationIncluded: true },
    { name: 'Tacos de Lengua en Salsa', category: 'Entradas calientes', presentation: 'Para compartir', price: 48000, currency: 'COP', calculationIncluded: true },
    { name: 'Empanadas criollas', category: 'Entradas calientes', presentation: 'Individual', price: 35000, currency: 'COP', calculationIncluded: true },
    { name: 'Tacos de Costilla', category: 'Entradas calientes', presentation: 'Para compartir', price: 64000, currency: 'COP', calculationIncluded: true },
    { name: 'Yakitoris de Pollo', category: 'Parrilla', presentation: 'Para compartir', price: 35000, currency: 'COP', calculationIncluded: true },
    { name: 'Furtivo Burger', category: 'Parrilla', presentation: 'Individual', price: 45000, currency: 'COP', calculationIncluded: true },
    { name: 'Sangría Tinto', category: 'Sangría', presentation: 'Jarra', price: 145000, currency: 'COP', calculationIncluded: true },
    { name: 'Aguardiente Antioqueño Verde', category: 'Aguardientes y rones', presentation: 'Botella', price: 190000, currency: 'COP', calculationIncluded: true },
    { name: 'La Hechicera', category: 'Aguardientes y rones', presentation: 'Botella', price: 610000, currency: 'COP', calculationIncluded: true },
    { name: 'Postre de Maracuyá', category: 'Postres', presentation: 'Individual', price: 30000, currency: 'COP', calculationIncluded: true }
  ];
  branch.budget_scenarios = [
    { concept: 'Parche tranqui', note: 'Una bebida por persona y algo pequeño para comer cada una.', lines: [
      { name: 'Mojito', category: 'Cócteles clásicos', presentation: 'Individual', quantity: 1, groupSize: 1 },
      { name: 'Empanadas criollas', category: 'Entradas calientes', presentation: 'Individual', quantity: 1, groupSize: 1 }
    ]},
    { concept: 'Parche completo', note: 'Tres tragos por persona, comida para compartir y postre.', lines: [
      { name: 'Gin Tonic', category: 'Cócteles clásicos', presentation: 'Individual', quantity: 2, groupSize: 1 },
      { name: 'Aperol Spritz', category: 'Cócteles clásicos', presentation: 'Individual', quantity: 1, groupSize: 1 },
      { name: 'Tacos de Costilla', category: 'Entradas calientes', presentation: 'Para compartir', quantity: 1, groupSize: 2 },
      { name: 'Yakitoris de Pollo', category: 'Parrilla', presentation: 'Para compartir', quantity: 1, groupSize: 2 },
      { name: 'Postre de Maracuyá', category: 'Postres', presentation: 'Individual', quantity: 1, groupSize: 2 }
    ]},
    { concept: 'Con toda', note: 'Una botella de aguardiente para el parche, comida y postre.', lines: [
      { name: 'Aguardiente Antioqueño Verde', category: 'Aguardientes y rones', presentation: 'Botella', quantity: 1, groupSize: 2 },
      { name: 'Furtivo Burger', category: 'Parrilla', presentation: 'Individual', quantity: 1, groupSize: 1 },
      { name: 'Tacos de Costilla', category: 'Entradas calientes', presentation: 'Para compartir', quantity: 1, groupSize: 2 },
      { name: 'Postre de Maracuyá', category: 'Postres', presentation: 'Individual', quantity: 1, groupSize: 2 }
    ]}
  ];
  branch.min_budget = 65000;
  branch.typical_budget = 176250;
  branch.max_budget = 397000;
  branch.budget_basis = 'Parche tranqui: una bebida por persona y algo pequeño para comer cada una, calculado para dos personas.';
  branch.menu_calculation_note = 'Este presupuesto se calcula sin tener presente el valor del cover. El restaurante puede actualizar los precios.';
  branch.missing_fields = ['holiday_hours'];

  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Updated ${file}`);
}
