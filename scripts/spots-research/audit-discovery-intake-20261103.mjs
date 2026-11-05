import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root='docs/catalog-review/discovery/profiles-20261102';
const text=await fs.readFile('apps/mobile/public/spots-catalog.json','utf8'),catalog=JSON.parse(text);
const progress=JSON.parse(await fs.readFile(`${root}/progress.json`,'utf8'));
const records=[];
for(const record of progress.startedScope){
  const spot=record.username==='primitivorooftop'?catalog.spots.find(s=>s.slug==='primitivo-sensorial'):catalog.spots.find(s=>s.instagram===record.instagram||record.matches.some(m=>m.id===s.id));
  const branches=catalog.branches.filter(b=>b.spot_id===spot?.id);
  const dir=await fs.readdir(`${root}/${record.username}`);
  const branchReview=branches.map(b=>({id:b.id,slug:b.slug,isActive:b.is_active,businessStatus:b.business_status??'unknown',address:b.address||null,menuReviewedThisRun:b.menu_items_verified_at?.startsWith('2026-11-03')??false,menuItems:b.menu_items?.length??0,scenarios:b.budget_scenarios?.length??0,pending:[...(!b.address?['address']:[]),...(b.latitude==null||b.longitude==null?['coordinates']:[]),...(!(b.menu_items?.length)?['menu_prices']:[]),...(!catalog.branchHours.some(h=>h.branch_id===b.id)?['weekly_hours']:[]),'google_places_reconciliation','instagram_highlights']}));
  records.push({requestedUsername:record.username,canonicalInstagram:spot?.instagram,spotId:spot?.id,slug:spot?.slug,name:spot?.name,operation:record.matches.length?'update':'create',isActive:spot?.is_active,businessStatus:spot?.business_status??'unknown',logoPresent:Boolean(spot?.logo_url),coverPresent:Boolean(spot?.cover_image_url),status:'integrated_with_pending_verification',branches:branchReview,evidenceFiles:dir.filter(f=>/consolidated|integration|profile|logo|google|highlight/.test(f))});
}
const report={objective:'Crear/actualizar todos los perfiles y sus sedes de Cali y alrededores; no solo logos.',auditedAt:new Date().toISOString(),catalogSha256:createHash('sha256').update(text).digest('hex'),status:'in_progress',requirements:{all28IdentitiesIntegrated:records.length===28&&records.every(r=>r.spotId),allSedesVerified:false,allMenuSourcesReviewed:false,visualQA:false,hostingerPublished:false},stats:{profiles:records.length,newPlaces:records.filter(r=>r.operation==='create').length,existingPlaces:records.filter(r=>r.operation==='update').length,catalogBranches:records.reduce((n,r)=>n+r.branches.length,0),reviewedBranchMenus:records.reduce((n,r)=>n+r.branches.filter(b=>b.menuReviewedThisRun).length,0)},blockers:[{stage:'google_places',reason:'GOOGLE_PLACES_API_KEY no está disponible en el entorno de esta sesión; no se buscan secretos en archivos.'},{stage:'highlights',reason:'Chrome DevTools MCP no está disponible entre las herramientas de esta sesión, incluso tras aviso de activación del usuario.'}],nextWork:['Completar cartas HTML de Cabo Leones y Premier Wings.','Revisar fuentes dinámicas o incompletas de Flores y Lechugas, Casa Cuchuflettos, Ananda, Yülika, The Pub Legend y L’Orso.','Reconciliar todas las direcciones, coordenadas, horarios y estados por sede con destacadas y Places cuando estén disponibles.','Verificar las fichas servidas y el render final sin dejar servidores activos.'],records};
const benchmarkRoot='docs/catalog-review/benchmarks';
const menuSources=[
  {username:'casacuchuflettos',url:'https://cuchuflettos.com/menu/',reason:'HTML de la carta sin inventario de productos ni precios.'},
  {username:'lorsoristorantecali',url:'https://lorso.flowlab.in/menu',reason:'HTML con contacto y horarios, sin inventario de la carta.'},
  {username:'floresylechugasbar',url:'https://idmenu.club/floresylechugas/',reason:'Solo contenedor dinámico; 53 caracteres de texto, sin productos.'},
];
const sourceReviews=[];
for(const source of menuSources){
  const attempts=[];
  for(const name of (await fs.readdir(benchmarkRoot)).filter(n=>n.endsWith('.json')&&n.includes('2026-11-03'))){
    const result=JSON.parse(await fs.readFile(`${benchmarkRoot}/${name}`,'utf8'));
    for(const page of result.pages??[])if(page.finalUrl===source.url&&page.status!=='duplicate_final_url')attempts.push({report:name,status:page.status,textCharacters:page.text?.length??0});
  }
  const review={...source,attempts,status:attempts.length>=4?'exhausted_incomplete_http':'incomplete_http',attemptLimitExceeded:attempts.length>4,reviewedAt:new Date().toISOString(),reason:source.reason,pricesIntegratedFromTheseResponses:false};
  await fs.writeFile(`${root}/${source.username}/dynamic-menu-review.json`,JSON.stringify(review,null,2)+'\n');
  sourceReviews.push(review);
}
report.sourceReviews=sourceReviews;
report.runtimeReview=JSON.parse(await fs.readFile(`${root}/runtime-review-20261103.json`,'utf8'));
report.nextWork=['Ananda: cartas enlazadas inactivas; falta una carta presencial vigente antes de presupuestar.','Yülika: Granada tiene datos oficiales estructurados; falta tarifa por peso y dirección propia de Pance/Unicentro.','Reconciliar todas las direcciones, coordenadas, horarios y estados por sede con destacadas y Places cuando estén disponibles.','Completar revisión visual y responsive de las fichas sin dejar servidores activos.'];
await fs.writeFile(`${root}/completion-audit.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,stats:report.stats,requirements:report.requirements}));
