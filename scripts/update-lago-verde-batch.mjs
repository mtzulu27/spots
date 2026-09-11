import fs from 'node:fs';

const path = '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const now = new Date().toISOString();
let nextSpot = Math.max(...data.spots.map((x) => x.id)) + 1;
let nextBranch = Math.max(...data.branches.map((x) => x.id)) + 1;
let nextHour = Math.max(0, ...data.branchHours.map((x) => x.id), ...data.hours.map((x) => x.id)) + 1;

const bySlug = new Map(data.spots.map((x) => [x.slug, x]));
const branches = new Map(data.branches.map((x) => [x.slug, x]));
const common = { neighborhood: 'Pance', mall: 'Parque Comercial Lago Verde', address: 'Calle 16A #122-70, Parque Comercial Lago Verde, Pance, Cali', latitude: 3.3427218, longitude: -76.5352484, is_active: true, created_at: now, updated_at: now };

function addBranch(spotSlug, slug, extra = {}) {
  if (branches.has(slug)) return branches.get(slug);
  const spot = bySlug.get(spotSlug);
  if (!spot) throw new Error(`Missing spot ${spotSlug}`);
  const branch = { id: nextBranch++, spot_id: spot.id, slug, ...common, hours: '', holiday_mode: 'inherit', holiday_open_time: null, holiday_close_time: null, holiday_split_open_time: null, holiday_split_close_time: null, min_budget: 0, max_budget: 0, max_people: 6, menu_url: '', whatsapp: '', phone: '', instagram: '', sort_order: 20, ...extra };
  data.branches.push(branch); branches.set(slug, branch); return branch;
}

function addHours(branch, specs) {
  for (const s of specs) {
    const row = { id: nextHour++, branch_id: branch.id, day_of_week: s.day, is_closed: !!s.closed, open_time: s.closed ? null : s.open, close_time: s.closed ? null : s.close, split_open_time: s.splitOpen ?? null, split_close_time: s.splitClose ?? null, sort_order: s.order };
    data.branchHours.push(row);
    data.hours.push({ ...row, id: nextHour++ });
  }
}

addBranch('bbc', 'bbc-lago-verde', { instagram: 'https://www.instagram.com/bbccerveceria/', max_budget: 90000 });
addBranch('crepes-y-waffles', 'crepes-y-waffles-lago-verde', { max_budget: 70000 });
addBranch('la-romanezca', 'la-romanezca-lago-verde', { address: 'Calle 16A #122-70, local A8, Parque Comercial Lago Verde, Pance, Cali', max_budget: 90000 });
addBranch('el-gran-langostino', 'el-gran-langostino-lago-verde', { max_budget: 120000 });
addBranch('mimos', 'mimos-lago-verde', { max_people: 4, max_budget: 30000 });

let mugari = bySlug.get('mugari');
if (!mugari) {
  mugari = { id: nextSpot++, type: 'place', slug: 'mugari', name: 'Múgari', short_description: 'Sabores del Pacífico, Perú y Tailandia se encuentran en una mesa hecha para comer sin afán. Caé por ceviches, mariscos, carnes y cocteles bien armados; es un parche elegante para una cena especial, una celebración o una salida que amerite probar algo distinto.', cover_image_url: '/place-media/mugari/instagram-1.jpg', gallery_urls: ['/place-media/mugari/instagram-1.jpg','/place-media/mugari/instagram-2.jpg','/place-media/mugari/instagram-3.jpg','/place-media/mugari/instagram-4.jpg'], category: 'Comida', subcategories: ['Alta cocina','Cocina peruana','Cocina thai','Cocina del Pacífico'], city: 'Cali', likes: '0', tags: ['mariscos','ceviche','cocina fusión','cocteles','cena'], moods: ['cita','celebración','elegante','con amigos'], is_active: true, is_featured: false, created_at: now, updated_at: now };
  data.spots.push(mugari); bySlug.set('mugari', mugari);
}
const mb = addBranch('mugari', 'mugari-lago-verde', { address: 'Calle 16A #122-70, local CP3, Parque Comercial Lago Verde, Pance, Cali', hours: 'Mar-Jue 18:30-21:30 · Vie-Sáb 12:30-15:00 y 18:30-22:00 · Dom 12:30-18:00 · Lun cerrado', min_budget: 60000, max_budget: 140000, max_people: 8, phone: '3185964142', whatsapp: '3185964142', instagram: 'https://www.instagram.com/restaurante_mugari/' });
if (!data.branchHours.some((x) => x.branch_id === mb.id)) addHours(mb, [
  {day:1,closed:true,order:10},{day:2,open:'18:30:00',close:'21:30:00',order:20},{day:3,open:'18:30:00',close:'21:30:00',order:30},{day:4,open:'18:30:00',close:'21:30:00',order:40},{day:5,open:'12:30:00',close:'15:00:00',splitOpen:'18:30:00',splitClose:'22:00:00',order:50},{day:6,open:'12:30:00',close:'15:00:00',splitOpen:'18:30:00',splitClose:'22:00:00',order:60},{day:0,open:'12:30:00',close:'18:00:00',order:70}
]);

data.generatedAt = now;
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log('Lago Verde batch applied');
