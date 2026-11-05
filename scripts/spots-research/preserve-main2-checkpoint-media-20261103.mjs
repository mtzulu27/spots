import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const dir='docs/catalog-review/discovery/video-revalidation-20261103/pet-camp';
const mediaDir=`${dir}/reviewed-media`;
await fs.mkdir(mediaDir,{recursive:true});
const files=[
  {source:'/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/browser-use/assets/e5eb6d2b-af7e-4536-a6f8-fc16e2364b61/56185a68594f60b9.webp',post:'https://www.instagram.com/petcamp_park1/p/DcXUFReP8tt/',name:'breakfast-dogs.webp',visualReview:'accepted_gallery_candidate',note:'Real dogs, no graphic overlay; dark foreground. Reviewed screenshot and decoded local file.'},
  {source:'/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/browser-use/assets/4bdf4544-c582-4b5d-84ff-0a985f2ff9ca/e9767f44c000fe15.webp',post:'https://www.instagram.com/petcamp_park1/p/DToIQqSlaha/',name:'hotel-dogs.webp',visualReview:'screenshot_reviewed_local_decode_pending',note:'Real dogs by slide; published in hotel context, not proof of park branch. Do not assign to a branch blindly.'},
];
const report=[];
for(const item of files){
  const dest=`${mediaDir}/${item.name}`;
  const sourceExists=await fs.access(item.source).then(()=>true,()=>false);
  if(sourceExists)await fs.copyFile(item.source,dest);
  const bytes=await fs.readFile(dest);
  report.push({...item,source:undefined,file:path.resolve(dest),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,integrated:false,reviewedAt:new Date().toISOString()});
  if(sourceExists){
    await fs.unlink(item.source);
    const manifest=path.join(path.dirname(item.source),'manifest.json');
    await fs.unlink(manifest).catch(e=>{if(e.code!=='ENOENT')throw e;});
    await fs.rmdir(path.dirname(item.source));
  }
}
await fs.writeFile(`${dir}/media-checkpoint.json`,JSON.stringify({checkedAt:new Date().toISOString(),profile:'petcamp_park1',files:report,catalogChanged:false},null,2)+'\n');
console.log(JSON.stringify({preserved:report.length,catalogChanged:false,temporaryPhotoDirectoriesRemoved:true}));
