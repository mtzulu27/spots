import fs from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
const startedAt=new Date().toISOString(),start=performance.now();
const slug=process.argv[2]||'casabanana';
if(!/^[a-z0-9_-]+$/.test(slug))throw new Error('Invalid restaurant slug');
const root=`https://firestore.googleapis.com/v1/projects/menupp-next/databases/(default)/documents/restaurants/${slug}`;
const calls=[];
const pick=(data,keys)=>Object.fromEntries(keys.filter(k=>data[k]!==undefined).map(k=>[k,data[k]]));
function value(x){
  if(x.mapValue)return Object.fromEntries(Object.entries(x.mapValue.fields||{}).map(([k,v])=>[k,value(v)]));
  if(x.arrayValue)return(x.arrayValue.values||[]).map(value);
  return x.stringValue??x.booleanValue??x.integerValue??x.doubleValue??x.geoPointValue??null;
}
function doc(d){return {id:d.name?.split('/').at(-1),...Object.fromEntries(Object.entries(d.fields||{}).filter(([k])=>!/(administrator|password|token|secret|integration|customer|survey)/i.test(k)).map(([k,v])=>[k,value(v)]))};}
async function get(path){
  const t=performance.now(),url=root+path;
  const r=await fetch(url,{signal:AbortSignal.timeout(15000)});
  const data=await r.json();calls.push({path,status:r.status,ms:performance.now()-t});
  if(!r.ok)throw new Error(`HTTP ${r.status}: ${path}`);
  if(path.includes('?')){
    const rows=(data.documents||[]).map(doc);
    if(data.nextPageToken)rows.push(...await get(path.replace(/&pageToken=[^&]*/, '')+'&pageToken='+encodeURIComponent(data.nextPageToken)));
    return rows;
  }
  return doc(data);
}
const report={source:`https://menupp.co/${slug}`,startedAt,method:'Public Firestore REST; paths observed in Menupp public JavaScript',calls,status:'partial'};
try{
  const brand=await get('');
  report.brand=pick(brand,['name','socialLinks']);
  report.locations=(await get('/locations?pageSize=100')).map(x=>pick(x,['id','name','address','phone','wa_phone','location','openSchedule']));
  report.links=(await get('/externalLinks?pageSize=100')).map(x=>pick(x,['id','name','link','active','type','order']));
  report.menus=[];
  for(const link of report.links.filter(x=>x.active&&x.type==='menusButton')){
    const url=new URL(link.link);
    const match=url.pathname.match(new RegExp('^/'+slug+'/venue/([^/]+)/menu/([^/]+)$'));
    if(url.hostname!=='menupp.co'||!match)throw new Error('Unrecognized menu link');
    const base=`/locations/${match[1]}/menus/${match[2]}`;
    const menu={source:link.link,locationId:match[1],metadata:pick(await get(base),['id','name','active','hide','currency'])};
    report.menus.push(menu);
    for(const collection of ['categories','products','modifiers','variants']){
      menu[collection]=(await get(base+'/'+collection+'?pageSize=100')).map(x=>pick(x,['id','name','product_name','description','price','prices','value','values','options','items','min','max','required','quantity','order','disabled','disable','noStock','hierarchy','product_category','modifiers','variants','type','products','productID','modifierID','variantID','hasPriceRanges','details']));
    }
  }
  report.notes=['Stored schedules are source configuration, not independently verified business hours.','Check source social handles against the requested profile.','Survey and inactive links were not followed. Images were not downloaded. Menu records retain disabled flags; no averages calculated.'];
  report.status='public_menu_records_received';
}catch(e){report.error=e.message;}
report.extractionMs=performance.now()-start;
report.finishedAt=new Date().toISOString();
const folder='docs/catalog-review/benchmarks';await fs.mkdir(folder,{recursive:true});
const path=`${folder}/${slug}-menupp-links-${startedAt.replace(/[:.]/g,'-')}.json`;
const save=performance.now();await fs.writeFile(path,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
report.saveMs=performance.now()-save;
report.totalMs=performance.now()-start;
await fs.writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,error:report.error,path,calls:report.calls.length,extractionMs:report.extractionMs,saveMs:report.saveMs,totalMs:report.totalMs,menus:report.menus?.map(m=>({locationId:m.locationId,categories:m.categories?.length,products:m.products?.length,named:m.products?.filter(p=>p.product_name||p.name).length,priceEntries:m.products?.reduce((s,p)=>s+(p.price?.length||0),0)}))},null,2));
