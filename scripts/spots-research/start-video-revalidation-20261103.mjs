import fs from 'node:fs/promises';
import {requiredFields} from '/Users/mateo/.codex/skills/spots-crear-actualizar-lugar/scripts/validate-place-completion.mjs';

const root='docs/catalog-review/discovery/video-revalidation-20261103';
const dir=`${root}/pet-camp`;
await fs.mkdir(dir,{recursive:true});
const input='/Users/mateo/.codex/attachments/d8ab0e88-545d-48c6-aa45-e0b407c6cfdd/Texto pegado.txt';
const checkedAt=new Date().toISOString();
const evidence={checkedAt,input,firstPlace:'Pet Camp',sourceRow:1,sourceVideo:'7680946976896077076',branch:'No identificada con certeza',scope:'Revalidar la lista adjunta desde cero, un lugar a la vez. Integracion local; sin Hostinger.',status:'in_progress'};
await fs.writeFile(`${dir}/request.json`,JSON.stringify(evidence,null,2)+'\n');
const file=`${dir}/completion.json`;
try {await fs.access(file);throw Error('Existing review: resume instead of overwriting');}
catch(e){if(e.code!=='ENOENT')throw e;}
const field=()=>({status:'blocked',evidence:['request.json'],reason:'Revision nueva pendiente; no se reutiliza una conclusion historica como verificacion actual.',checks:[{source:'catalog_local',outcome:'not_yet_reviewed',evidence:['request.json'],reason:'Matriz creada antes de adquirir fuentes.'}]});
const report={version:1,place:'pet-camp',status:'blocked',scope:'full',branchInventory:[{id:'pending:video-branch',evidence:['request.json']}],linkQueue:[],sources:['profile_http','official_links','instagram_session','google_places','web_search','media_review'].map(kind=>({kind,status:'blocked',evidence:['request.json'],note:'Pendiente de la nueva revision secuencial.'})),entities:[{kind:'place',id:'pending:pet-camp',fields:Object.fromEntries(requiredFields.place.map(f=>[f,field()]))},{kind:'branch',id:'pending:video-branch',fields:Object.fromEntries(requiredFields.branch.map(f=>[f,field()]))}],remainingActions:['Identificar perfil oficial y sede del video','Revisar perfil/logo, enlaces, Instagram, Places, integrar y comprobar app'],integration:{status:'pending',evidence:[]},verification:{status:'pending',evidence:[]}};
await fs.writeFile(file,JSON.stringify(report,null,2)+'\n');
await fs.writeFile(`${root}/progress.json`,JSON.stringify({checkedAt,input,currentPlace:'pet-camp',currentSourceRow:1,nextSourceRow:2,status:'in_progress',scope:'all_attached_rows',completed:[],published:false},null,2)+'\n');
console.log(JSON.stringify({directory:dir,status:report.status}));
