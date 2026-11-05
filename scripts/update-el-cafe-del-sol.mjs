import fs from 'node:fs/promises';
import {integrateCatalog} from './spots-research/integrate-catalog.mjs';

const sourceUrls = [
  'https://www.instagram.com/elcafedelsol/',
  'https://linktr.ee/Elcafedelsol',
  'https://www.elcafedelsol.com.co/',
  'https://www.tripadvisor.co/Restaurant_Review-g297475-d3400829-Reviews-El_Cafe_Del_Sol-Cali_Valle_del_Cauca_Department.html',
];
const pending = ['cover_image_url','gallery_urls','menu_items','budget_scenarios','google_places_identity','logo'];
const baseBranch = {
  neighborhood:'', mall:'', city:'Cali', address:'', hours:'', holiday_mode:'inherit',
  min_budget:0, max_budget:0, min_people:1, max_people:4, typical_budget:0,
  budget_basis:'Presupuesto por confirmar',
  menu_calculation_note:'No se encontraron precios verificables en las fuentes consultadas; no se inventan valores.',
  menu_url:'https://www.elcafedelsol.com.co/', menu_items:[], budget_scenarios:[],
  whatsapp:'', phone:'', instagram:'https://www.instagram.com/elcafedelsol/',
  latitude:null, longitude:null, google_maps_url:'', google_place_id:'', website_url:'https://www.elcafedelsol.com.co/',
  business_status:'unknown', catalog_status:'pending_review', missing_fields:pending, is_active:true, sort_order:10,
};
const branches = [
  {id:36, slug:'el-cafe-del-sol-lago-verde', data:{...baseBranch, id:36, slug:'el-cafe-del-sol-lago-verde', neighborhood:'Pance', mall:'Lago Verde', address:'Cl. 16A #122-70, Lago Verde, Pance, Cali', hours:'Lun-Jue 12:00-22:00 · Vie-Sab 12:00-23:00 · Dom 12:00-22:00'}, hours:'replace'},
  {id:37, slug:'el-cafe-del-sol-ciudad-jardin', data:{...baseBranch, id:37, slug:'el-cafe-del-sol-ciudad-jardin', neighborhood:'Ciudad Jardín', mall:'La Leyenda Mall', address:'Cra. 105 #15-09, Ciudad Jardín, Cali, Valle del Cauca, Colombia', hours:'Lun-Dom 12:00-22:00'}, hours:'replace'},
  {slug:'el-cafe-del-sol-juanambu', data:{...baseBranch, slug:'el-cafe-del-sol-juanambu', neighborhood:'Juanambú', mall:'', address:'Av. 9A #7N-111, Juanambú, Cali', hours:'', missing_fields:[...pending,'hours']}, hours:'replace'},
];
const input = {
  schemaVersion:1,
  data:{id:30, slug:'el-cafe-del-sol', type:'place', name:'El Café del Sol', short_description:'Una vuelta para comer rico y compartir sushi, cocina peruana y platos variados en distintos puntos de Cali.', category:'Comida', city:'Cali', cover_image_url:'', gallery_urls:[], subcategories:['Sushi','Peruana','Restaurante'], tags:['sushi','peruana','comida','restaurante','ciudad jardín','pance','juanambú'], moods:['comer rico','con amigos','casual','plan tranqui'], is_active:true, business_status:'unknown', catalog_status:'pending_review', missing_fields:pending, source_urls:sourceUrls, instagram:'https://www.instagram.com/elcafedelsol/', reviewed_at:new Date().toISOString()},
  write:{mode:'update',fields:['type','name','short_description','category','city','cover_image_url','gallery_urls','subcategories','tags','moods','is_active','business_status','catalog_status','missing_fields','source_urls','instagram','reviewed_at']},
  branches:branches.map(b=>({data:b.data,write:{mode:b.id?'update':'create',fields:Object.keys(b.data).filter(k=>k!=='id'&&k!=='slug'),hours:'replace'},weeklyHours:b.id===36?[0,1,2,3,4,5,6].map(day_of_week=>({day_of_week,is_closed:false,open_time:'12:00',close_time:day_of_week===5?'23:00':'22:00'})):b.id===37?[0,1,2,3,4,5,6].map(day_of_week=>({day_of_week,is_closed:false,open_time:'12:00',close_time:'22:00'})):[]})),
};
const file='/tmp/el-cafe-del-sol-consolidated.json';
await fs.writeFile(file,JSON.stringify(input,null,2)+'\n');
console.log(JSON.stringify(await integrateCatalog(file,'apps/mobile/public/spots-catalog.json'),null,2));
