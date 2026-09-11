import fs from 'node:fs/promises';
import {integrateCatalog} from './spots-research/integrate-catalog.mjs';

const now = new Date().toISOString();
const menuItems = [
  {name:'Risotto - Filete de pollo', category:'mains', price:37900, presentation:'Individual'},
  {name:'Risotto - Lomo salteado', category:'mains', price:39900, presentation:'Individual'},
  {name:'Risotto - Salmón crocante', category:'mains', price:44900, presentation:'Individual'},
  {name:'Lomo a la pizzaiola', category:'mains', price:48900, presentation:'Individual'},
  {name:'Pollo al pesto', category:'mains', price:38900, presentation:'Individual'},
  {name:'Lasagna Del Mar', category:'mains', price:42900, presentation:'Individual'},
  {name:'Champiñones con queso azul', category:'starters', price:29900, presentation:'Para compartir'},
  {name:'Tomates Capresse', category:'starters', price:21900, presentation:'Para compartir'},
  {name:'Focaccia', category:'starters', price:6900, presentation:'Para compartir'},
  {name:'Limonada natural', category:'drinks', price:9900, presentation:'Individual'},
  {name:'Limonada de vino', category:'drinks', price:16900, presentation:'Individual'},
  {name:'Malteada de chocolate', category:'drinks', price:15900, presentation:'Individual'},
  {name:'Cerveza Corona', category:'drinks', price:12900, presentation:'Individual'},
  {name:'Affogato', category:'desserts', price:14900, presentation:'Individual'},
  {name:'Brownie con helado', category:'desserts', price:14900, presentation:'Individual'},
  {name:'Flan de caramelo', category:'desserts', price:10900, presentation:'Individual'},
];

const scenarios = [
  {concept:'Parche tranqui', note:'Un plato fuerte y una bebida por persona.', groupSize:1, lines:[
    {name:'Risotto - Filete de pollo', category:'mains', presentation:'Individual', quantity:1, groupSize:1},
    {name:'Limonada natural', category:'drinks', presentation:'Individual', quantity:1, groupSize:1},
  ]},
  {concept:'Parche completo', note:'Entrada para compartir, plato fuerte y bebida por persona.', groupSize:2, lines:[
    {name:'Champiñones con queso azul', category:'starters', presentation:'Para compartir', quantity:1, groupSize:2},
    {name:'Risotto - Lomo salteado', category:'mains', presentation:'Individual', quantity:1, groupSize:1},
    {name:'Limonada de vino', category:'drinks', presentation:'Individual', quantity:1, groupSize:1},
  ]},
  {concept:'Con toda', note:'Entrada para compartir, plato fuerte premium y postre por persona.', groupSize:2, lines:[
    {name:'Champiñones con queso azul', category:'starters', presentation:'Para compartir', quantity:1, groupSize:2},
    {name:'Risotto - Salmón crocante', category:'mains', presentation:'Individual', quantity:1, groupSize:1},
    {name:'Brownie con helado', category:'desserts', presentation:'Individual', quantity:1, groupSize:1},
  ]},
];

const catalog = JSON.parse(await fs.readFile('apps/mobile/public/spots-catalog.json', 'utf8'));
const branches = catalog.branches.filter(branch => branch.spot_id === 37);
const input = {
  schemaVersion: 1,
  data: {
    id: 37,
    slug: 'cheers-pizzeria',
    catalog_status: 'pending_review',
    missing_fields: ['cover_image_url','gallery_urls','hours','branch_specific_menu_complete'],
  },
  write: {mode:'update', fields:['catalog_status','missing_fields']},
  branches: branches.map(branch => ({
    data: {
      id: branch.id,
      slug: branch.slug,
      menu_items: menuItems,
      menu_items_verified_at: now,
      budget_scenarios: scenarios,
      min_budget: 47800,
      max_budget: 110700,
      typical_budget: 73700,
      budget_basis: 'Carta oficial: risotto de pollo y limonada natural como visita sencilla; entrada, plato y bebida como visita normal.',
      menu_calculation_note: 'Precios verificados en la carta oficial de Cheers. El menú completo puede variar por sede; no incluye propina.',
      menu_url: branch.menu_url || 'https://cheerspizzeria.com/menu/',
      catalog_status: 'pending_review',
      missing_fields: ['hours','cover_image_url','gallery_urls','branch_specific_menu_complete'],
    },
    write: {mode:'update', fields:['menu_items','menu_items_verified_at','budget_scenarios','min_budget','max_budget','typical_budget','budget_basis','menu_calculation_note','menu_url','catalog_status','missing_fields']},
  })),
};

const inputPath = '/tmp/cheers-menu-consolidated.json';
await fs.writeFile(inputPath, JSON.stringify(input, null, 2) + '\n');
const result = await integrateCatalog(inputPath, 'apps/mobile/public/spots-catalog.json');
console.log(JSON.stringify(result, null, 2));
