import fs from 'node:fs';

const root = process.cwd();
const catalog = JSON.parse(fs.readFileSync(`${root}/apps/mobile/public/spots-catalog.json`, 'utf8'));
const tracker = JSON.parse(fs.readFileSync(`${root}/docs/spots-ingestion-tracker.json`, 'utf8'));
const targetNames = [
  'Sorsi | Buchetta del Vino','Baltasar y Sietelunas','Girl Frozen Yogurt','Cofi Bakery',"Mimo's",'Fresh & Good','Ilumina','Santa Fusión','El Gran Langostino','Memorial Cervecería','Montolivo','Parisina','Diletto','Natal Coffee','Namaste','Sabor Gourmet','Pradera de Minca','Prote&Co','Hamburgo','Don Samuel Bakery',"Simon's",'Vinyl Bar',"Joe's",'Chelita Go Mex','La Churrería Antigua','Mi Sol Radiante','Brunch Duquesa','Vé de Bistro','King Papa','Mo Sushi','Tribal Llanero','Madelo','Maki Bar Cali','Domingo','New Anchor Caffè','La Puerta Bakery','Kumo Sushi Bar','Selvah Rooftop','Maranello','Paintball Cali Norte','Busca Por Dentro','Yonkers','La Libélula Hotel','Papi','Intrepid 83 Club','Donde León','Tierradentro Café & Co.','La Chocolatada','Patti Gelateria','La Querencia','Odiseo Bistro','ZUR','Cabo Leones','Winkle Waffle','Patolandia','Terraza San Camilo','La Buena Vida','Caruzo Rooftop','La Azotea','Guadalupe Café','Montallegro Gelateria Italiana','Zuly Arepas','Ramiros Hamburguesas','Pizza Della Madonna','Nuevo Leon','Ostinato Pasta para Tutti','Sattvica Cafe Bistro','Sonoma Restaurante Peruano','Mantra Rooftop','La Romanezca','La Bohème','Sonido Central','Bengala & Bandolero','El Colibri','Kora Vibes','Miyamoto','Huna Huna Social Club','Pampa Malbec','Penélope Martini','Tom Glen','Lengua de Mariposa','Once Once Restaurante Bar','Hacienda del Bosque','Saipan Airsoft','Zorro Azul','Dosé Sky Lounge',"Storia d’Amore","Karen's Pizza",'Mister Wings','Space Jump','Greens Bolos Club','La Fugitiva','La Topa Tolondra','Platillos Voladores','T4','Rainbow Bakery','Nami Reposteria','Artesapan Gourmet','Milagro de Junio','Le Croissant','La Gaucha Angus','Renata Tacos','Vinciatti','Ultimate Padel','Local Burger','Kyomu Sushi','La Corte de la Carne','Turk House','UKI','Chacalacas','Mushu','Wetsunday','La Botella Malecon','Palo Mulata','Klub Berry Acai','Vital Bistro','La Propia Burger','Mr. Tenders','El Chuzo de Nando','Jugos Parque del Perro','Sushi Green','Nikkei 232','El Toro Enamorao','Valle Catalina','Purist Cafe','Hoi An Cocina Vietnamita','La Pergola Clandestina','Jardin Botanico de Cali','Zoologico de Cali','Museo Caliwood','Museo La Tertulia','Lakasia','Luci Bakery','Mantra Coffee Club','Loco Por Ti','Izumi','La Corteza','Maki Bar','Múgari','Pork House','Delio','Gagalto Playground','Next Reality','Tortelli',
];
const normalize = (value) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const findSpot = (name) => {
  const exact = catalog.spots.find((spot) => normalize(spot.name) === normalize(name));
  if (exact) return exact;
  return catalog.spots.find((spot) => normalize(spot.name).includes(normalize(name)) || normalize(name).includes(normalize(spot.name)));
};
const nonFoodNames = [
  /jardin botanico/i, /zoologico/i, /museo/i, /cristo rey/i,
  /cerro de las tres cruces/i, /ecoparque/i, /paintball/i,
  /padel/i, /space jump/i, /bolos/i, /airsoft/i, /reality/i,
  /playground/i,
];
const requiresFoodData = (spot) => {
  if (!spot) return false;
  if (nonFoodNames.some((pattern) => pattern.test(spot.name))) return false;
  return !['Arte y cultura', 'Naturaleza y aire libre', 'Al aire libre'].includes(spot.category);
};
const report = targetNames.map((requestedName) => {
  const spot = findSpot(requestedName);
  // Only public branches are part of the published completeness contract.
  const branches = spot
    ? catalog.branches.filter((branch) => branch.spot_id === spot.id && branch.is_active !== false)
    : [];
  const discontinued = spot?.business_status === 'permanently_closed' || spot?.is_active === false && tracker.entries.find((entry) => entry.slug === spot.slug)?.internalTag === 'discontinued-user-confirmed';
  const allBranchesHave = (field) => branches.length > 0 && branches.every((branch) => branch[field] !== undefined && branch[field] !== null && branch[field] !== '');
  const hasMenu = branches.some((branch) => Array.isArray(branch.menu_items) && branch.menu_items.length > 0);
  const hasBudget = branches.some((branch) => Array.isArray(branch.budget_scenarios) && branch.budget_scenarios.length === 3);
  const missing = [];
  if (discontinued) return { requestedName, slug: spot?.slug || null, branches: branches.length, status: 'discontinued', missing };
  if (!spot) missing.push('spot');
  else {
    if (!spot.logo_url) missing.push('logo');
    if (!spot.cover_image_url) missing.push('cover');
    if (!Array.isArray(spot.gallery_urls) || spot.gallery_urls.length === 0) missing.push('gallery');
    if (requiresFoodData(spot)) {
      if (!hasMenu) missing.push('menu_items');
      if (!hasBudget) missing.push('budget_scenarios');
    }
    if (!allBranchesHave('hours')) missing.push('hours_by_branch');
    if (!allBranchesHave('phone')) missing.push('phone_by_branch');
    if (!allBranchesHave('whatsapp')) missing.push('whatsapp_by_branch');
    if (!allBranchesHave('latitude') || !allBranchesHave('longitude')) missing.push('coordinates_by_branch');
  }
  return { requestedName, slug: spot?.slug || null, branches: branches.length, status: missing.length ? 'incomplete' : 'complete', missing };
});

const now = new Date().toISOString();
for (const item of report) {
  if (!item.slug) continue;
  const existing = tracker.entries.find((entry) => entry.slug === item.slug);
  if (existing) {
    existing.missingFields = item.missing;
    existing.status = item.status === 'complete' ? 'complete' : item.status === 'discontinued' ? 'draft' : 'incomplete';
    existing.lastReviewedAt = now;
    if (item.status !== 'discontinued') existing.notes = [`Auditoría automática del catálogo: ${item.missing.length ? `pendiente ${item.missing.join(', ')}` : 'ficha completa'}.`];
  }
}
tracker.updatedAt = now;
fs.writeFileSync(`${root}/docs/spots-ingestion-tracker.json`, JSON.stringify(tracker, null, 2) + '\n');
fs.writeFileSync(`${root}/docs/spots-target-completeness-2026-10-07.json`, JSON.stringify({ generatedAt: now, total: report.length, complete: report.filter((x) => x.status === 'complete').length, incomplete: report.filter((x) => x.status === 'incomplete').length, places: report }, null, 2) + '\n');
console.log(JSON.stringify({ total: report.length, complete: report.filter((x) => x.status === 'complete').length, incomplete: report.filter((x) => x.status === 'incomplete').length, discontinued: report.filter((x) => x.status === 'discontinued').length }, null, 2));
