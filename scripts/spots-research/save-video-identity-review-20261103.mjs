import fs from 'node:fs/promises';

const root='docs/catalog-review/discovery/video-intake-20261103';
const checkedAt=new Date().toISOString();
const records=[{
  number:65,username:'espirareterra.taller',
  profile:'docs/catalog-review/benchmarks/espirareterra.taller-profile-http-2026-11-03T14-41-20-281Z.json',
  sources:[
    'docs/catalog-review/benchmarks/espirareterra.wixsite.com-website-2026-11-03T14-40-47-770Z.json',
    'docs/catalog-review/benchmarks/bio.site-website-2026-11-03T14-41-36-969Z.json',
    'docs/catalog-review/benchmarks/espirareterra.wixsite.com-website-2026-11-03T14-42-23-315Z.json',
  ],
  findings:{identity:'Official website and Instagram bio link to each other.',city:'Cali',websiteNeighborhood:'Cristales',whatsapp:'+573053841320',email:'espirareterra@gmail.com',experiences:[{name:'Ceramica desde cero',durationHours:3,minimumParticipants:2,price:null},{name:'Macrame deco',durationHours:3,minimumParticipants:2,price:null}],addressConflict:'Official website says Cristales; directories and the Google link in the official bio point to other areas. Current street address not confirmed.',regularPricesVerified:false},
  pending:['current_branch_address','highlights_tool_unavailable','google_places_after_highlights','logo_review_before_integration'],
},{
  number:57,username:'pueblitoextremo',
  profile:'docs/catalog-review/benchmarks/pueblitoextremo-profile-http-2026-11-03T14-42-07-898Z.json',
  sources:['docs/catalog-review/benchmarks/wa.link-website-2026-11-03T14-42-41-443Z.json'],
  findings:{candidateName:'Cali MotorSports Tracks',instagramBrand:'Pueblito Extremo',whatsapp:'+573117170634',identityEvidence:'Instagram wa.link resolves to the same phone listed for Cali MotorSports Tracks.',discoverySource:'https://co.todosnegocios.com/cali-motorsports-tracks-311-7170634',branchStatus:'Sameco track operation not confirmed by current official profile; profile advertises classes, motorcycle rental and routes.',regularPricesVerified:false},
  pending:['current_track_branch_identity','highlights_tool_unavailable','google_places_after_highlights','logo_review_before_integration'],
}];
for(const record of records){
  const dir=`${root}/${record.username}`;
  await fs.mkdir(dir,{recursive:true});
  const profile=JSON.parse(await fs.readFile(record.profile,'utf8'));
  await fs.writeFile(`${dir}/profile.json`,JSON.stringify(profile,null,2)+'\n');
  const bioAttempts=[];
  for(const source of record.sources){
    const evidence=JSON.parse(await fs.readFile(source,'utf8'));
    bioAttempts.push({path:source,status:evidence.status??evidence.pages?.[0]?.status,totalMs:evidence.totalMs});
  }
  await fs.writeFile(`${dir}/acquisition.json`,JSON.stringify({checkedAt,profileAttempts:[{path:record.profile,status:profile.status,totalMs:profile.timingMs?.total}],bioAttempts,highlights:{status:'tool_unavailable',attempted:false},googlePlaces:{status:'waiting_for_highlights_stage'},complete:false},null,2)+'\n');
  await fs.writeFile(`${dir}/identity-review.json`,JSON.stringify({...record,checkedAt,status:'pending_not_integrated'},null,2)+'\n');
}
console.log(JSON.stringify({saved:records.map(r=>r.username),catalogChanged:false}));
