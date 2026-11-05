import fs from 'node:fs/promises';
import { integrateCatalog } from './spots-research/integrate-catalog.mjs';

const sourceUrls = [
  'https://www.instagram.com/dos.santoscantina/',
  'https://menupp.co/dossantos',
  'https://maps.google.com/?cid=7748531705656303156',
  'https://maps.google.com/?cid=10882661316982430059',
];
const caliHours = [
  { day_of_week: 0, is_closed: false, open_time: '12:00', close_time: '23:59' },
  { day_of_week: 1, is_closed: false, open_time: '16:00', close_time: '23:59' },
  { day_of_week: 2, is_closed: false, open_time: '16:00', close_time: '23:59' },
  { day_of_week: 3, is_closed: false, open_time: '12:00', close_time: '23:59' },
  { day_of_week: 4, is_closed: false, open_time: '12:00', close_time: '03:00' },
  { day_of_week: 5, is_closed: false, open_time: '12:00', close_time: '03:00' },
  { day_of_week: 6, is_closed: false, open_time: '12:00', close_time: '03:00' },
];
const medellinHours = [
  { day_of_week: 0, is_closed: false, open_time: '12:00', close_time: '23:59' },
  { day_of_week: 1, is_closed: false, open_time: '16:00', close_time: '23:59' },
  { day_of_week: 2, is_closed: false, open_time: '04:00', close_time: '23:59' },
  { day_of_week: 3, is_closed: false, open_time: '12:00', close_time: '23:59' },
  { day_of_week: 4, is_closed: false, open_time: '12:00', close_time: '03:00' },
  { day_of_week: 5, is_closed: false, open_time: '12:00', close_time: '03:00' },
  { day_of_week: 6, is_closed: false, open_time: '12:00', close_time: '03:00' },
];
const menuItems = [
  { name: 'Tacos de Chicharrón', category: 'mains', price: 34000, presentation: 'Individual' },
  { name: 'Chilaquiles Rojos', category: 'mains', price: 32000, presentation: 'Individual' },
  { name: 'Queso Fundido Ranchero', category: 'starters', price: 57000, presentation: 'Para compartir' },
  { name: 'Carajillo', category: 'drinks', price: 42000, presentation: 'Individual' },
  { name: 'Manhattan', category: 'drinks', price: 51000, presentation: 'Individual' },
  { name: 'Guacamole de La Casa', category: 'starters', price: 46000, presentation: 'Para compartir' },
  { name: 'Tostada con Huevo', category: 'mains', price: 15000, presentation: 'Individual' },
];
const scenarios = [
  { concept: 'Parche tranqui', note: 'Un plato y una bebida por persona.', lines: [{ name: 'Chilaquiles Rojos', category: 'mains', presentation: 'Individual', quantity: 1, groupSize: 1 }, { name: 'Carajillo', category: 'drinks', presentation: 'Individual', quantity: 1, groupSize: 1 }] },
  { concept: 'Parche completo', note: 'Entrada para compartir, plato y bebida por persona.', lines: [{ name: 'Guacamole de La Casa', category: 'starters', presentation: 'Para compartir', quantity: 1, groupSize: 2 }, { name: 'Tacos de Chicharrón', category: 'mains', presentation: 'Individual', quantity: 1, groupSize: 1 }, { name: 'Carajillo', category: 'drinks', presentation: 'Individual', quantity: 1, groupSize: 1 }] },
  { concept: 'Con toda', note: 'Entrada para compartir, plato y coctel por persona.', lines: [{ name: 'Queso Fundido Ranchero', category: 'starters', presentation: 'Para compartir', quantity: 1, groupSize: 2 }, { name: 'Tacos de Chicharrón', category: 'mains', presentation: 'Individual', quantity: 1, groupSize: 1 }, { name: 'Manhattan', category: 'drinks', presentation: 'Individual', quantity: 1, groupSize: 1 }] },
];
const common = {
  city: 'Cali', hours: '', menu_url: 'https://menupp.co/dossantos', menu_items: menuItems,
  menu_items_verified_at: new Date().toISOString(), budget_scenarios: scenarios,
  min_budget: 49500, typical_budget: 49500, max_budget: 130000,
  budget_basis: 'Parche tranqui: un plato fuerte y una bebida por persona.',
  menu_calculation_note: 'Precios normales de Menupp; no incluye propina ni botellas.',
  whatsapp: 'https://wa.me/573023889570', phone: '3023889570', instagram: 'https://www.instagram.com/dos.santoscantina/',
  menu_url: 'https://menupp.co/dossantos', is_active: true, holiday_mode: 'inherit', holiday_open_time: null, holiday_close_time: null,
  holiday_split_open_time: null, holiday_split_close_time: null, sort_order: 10, catalog_status: 'reviewed', missing_fields: ['holiday_hours'],
};
const branches = [
  { data: { id: 32, slug: 'dos-santos-cantina-marbella-plaza', neighborhood: 'Pance', mall: 'Marbella Plaza', address: 'Cl. 16A #122-31, Barrio Pance, Cali', latitude: 3.3414406, longitude: -76.5352135, google_maps_url: 'https://maps.google.com/?cid=7748531705656303156', google_place_id: 'ChIJhQqZMAChMI4RNN5-ZohQiGs', website_url: 'https://menupp.co/dossantos', business_status: 'operational', ...common }, write: { mode: 'update', fields: ['neighborhood','mall','city','address','hours','holiday_mode','holiday_open_time','holiday_close_time','holiday_split_open_time','holiday_split_close_time','min_budget','max_budget','typical_budget','budget_basis','menu_calculation_note','menu_url','menu_items','menu_items_verified_at','budget_scenarios','whatsapp','phone','instagram','latitude','longitude','google_maps_url','google_place_id','website_url','business_status','catalog_status','missing_fields','is_active','sort_order'], hours: 'replace' }, weeklyHours: caliHours },
  { data: { slug: 'dos-santos-cantina-el-poblado', neighborhood: 'El Poblado', mall: '', city: 'Medellín', address: 'Cra 33 #7-165, El Poblado, Medellín', latitude: 6.2073357, longitude: -75.564795, google_maps_url: 'https://maps.google.com/?cid=10882661316982430059', google_place_id: 'ChIJ1YsThxGDRo4Ra1mfGc_6Bpc', website_url: 'https://menupp.co/dossantos', business_status: 'operational', ...common, city: 'Medellín', menu_items: menuItems, missing_fields: ['holiday_hours'] }, write: { mode: 'create', fields: ['neighborhood','mall','city','address','hours','holiday_mode','holiday_open_time','holiday_close_time','holiday_split_open_time','holiday_split_close_time','min_budget','max_budget','typical_budget','budget_basis','menu_calculation_note','menu_url','menu_items','menu_items_verified_at','budget_scenarios','whatsapp','phone','instagram','latitude','longitude','google_maps_url','google_place_id','website_url','business_status','catalog_status','missing_fields','is_active','sort_order'], hours: 'replace' }, weeklyHours: medellinHours },
];
const input = { schemaVersion: 1, data: { id: 26, type: 'place', slug: 'dos-santos-cantina', name: 'Dos Santos Cantina', short_description: 'Una cantina mexicana para comer rico, brindar y armar un parche con shows en vivo y ambiente de noche. Caé con la gente, pedí algo para compartir y quedate a cantar.', cover_image_url: '', logo_url: '', gallery_urls: [], category: 'Vida nocturna', subcategories: ['Comida', 'Tomar algo', 'Cantina', 'Mexicana', 'Música en vivo'], city: 'Cali', likes: '0', tags: ['cantina','mexicana','cocteles','tacos','shows en vivo','pance','parche'], moods: ['con amigos','noche','tomar algo','comer rico','música en vivo'], is_active: true, is_featured: false, business_status: 'operational', catalog_status: 'reviewed', missing_fields: ['cover_image_url','gallery_urls','holiday_hours'], source_urls: sourceUrls, instagram: 'https://www.instagram.com/dos.santoscantina/' }, write: { mode: 'update', fields: ['type','name','short_description','cover_image_url','logo_url','gallery_urls','category','subcategories','city','likes','tags','moods','is_active','is_featured','business_status','catalog_status','missing_fields','source_urls','instagram'] }, branches };
await fs.writeFile('docs/catalog-review/benchmarks/dos-santos-cantina/consolidated.json', JSON.stringify(input, null, 2));
console.log(JSON.stringify(await integrateCatalog('docs/catalog-review/benchmarks/dos-santos-cantina/consolidated.json', 'apps/mobile/public/spots-catalog.json'), null, 2));
