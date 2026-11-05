import fs from 'node:fs/promises';
import {integrateCatalog} from './spots-research/integrate-catalog.mjs';

const input = {
  schemaVersion: 1,
  data: {
    id: 3499,
    slug: 'ecoparque-de-la-biodiversidad',
    type: 'place',
    name: 'Ecoparque de la Biodiversidad',
    short_description: 'Caé a Pance a caminar entre naturaleza y conocer este espacio de conservación con recorridos contemplativos y guiados.',
    category: 'Al aire libre',
    city: 'Cali',
    cover_image_url: '',
    gallery_urls: [],
    subcategories: ['Naturaleza', 'Senderismo', 'Parques'],
    tags: ['ecoparque', 'naturaleza', 'pance', 'senderismo', 'caminar', 'conservación'],
    moods: ['al aire libre', 'caminar', 'aprender', 'plan de día'],
    is_active: true,
    business_status: 'operational',
    catalog_status: 'pending_review',
    missing_fields: ['cover_image_url', 'gallery_urls', 'menu_items', 'budget_scenarios', 'holiday_hours'],
    source_urls: [
      'https://maps.google.com/?cid=13497213772214990872&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA',
      'https://ecopance.testweb2024.com/reservas#step-1',
      'https://www.cali.gov.co/boletines/publicaciones/187264/desde-este-domingo-el-ecoparque-de-la-biodiversidad-estara-abierto-al-publico/'
    ],
    reviewed_at: new Date().toISOString(),
  },
  write: {mode: 'update', fields: ['type','name','short_description','category','city','cover_image_url','gallery_urls','subcategories','tags','moods','is_active','business_status','catalog_status','missing_fields','source_urls','reviewed_at']},
  branches: [{
    data: {
      id: 4734,
      slug: 'ecoparque-de-la-biodiversidad-pance',
      neighborhood: 'Pance',
      mall: '',
      city: 'Cali',
      address: '8CWX+C8, Barrio Pance, Cali, Valle del Cauca',
      hours: 'Lun-Dom 08:00-17:00 · Recorridos guiados 09:00 / 12:00 / 15:00',
      holiday_mode: 'inherit',
      min_budget: 0,
      max_budget: 0,
      min_people: 1,
      max_people: 30,
      typical_budget: 0,
      budget_basis: 'Presupuesto por confirmar',
      menu_calculation_note: 'Google Places no publica precios verificables. El acceso y los recorridos pueden requerir inscripción previa.',
      menu_url: 'https://ecopance.testweb2024.com/reservas#step-1',
      menu_items: [],
      budget_scenarios: [],
      whatsapp: '',
      phone: '',
      instagram: '',
      latitude: 3.3460933,
      longitude: -76.5516622,
      google_maps_url: 'https://maps.google.com/?cid=13497213772214990872&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA',
      google_place_id: 'ChIJmVfSUBWjMI4RGHhiHmq8T7s',
      website_url: 'https://ecopance.testweb2024.com/reservas#step-1',
      business_status: 'operational',
      catalog_status: 'pending_review',
      missing_fields: ['cover_image_url', 'gallery_urls', 'menu_items', 'budget_scenarios', 'holiday_hours'],
      is_active: true,
      sort_order: 10,
    },
    write: {mode: 'update', fields: ['neighborhood','mall','city','address','hours','holiday_mode','min_budget','max_budget','min_people','max_people','typical_budget','budget_basis','menu_calculation_note','menu_url','menu_items','budget_scenarios','whatsapp','phone','instagram','latitude','longitude','google_maps_url','google_place_id','website_url','business_status','catalog_status','missing_fields','is_active','sort_order'], hours: 'replace'},
    weeklyHours: [0,1,2,3,4,5,6].map(day_of_week => ({day_of_week, is_closed: false, open_time: '08:00', close_time: '17:00'})),
  }],
};

const inputPath = '/tmp/ecoparque-biodiversidad-google.json';
await fs.writeFile(inputPath, JSON.stringify(input, null, 2) + '\n');
console.log(JSON.stringify(await integrateCatalog(inputPath, 'apps/mobile/public/spots-catalog.json'), null, 2));
