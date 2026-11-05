import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const tempRoot = '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/browser-use/assets';
const items = [
  ['mi-sol-radiante','misolradianteoficial','38e51a61-4de7-47ac-a7d9-52f078a16f84/a7ab17b4bf728773.jpg'],
  ['ve-de-bistro','vedebistro','257ccca7-13f7-4553-9144-95767897599d/4177a354b6dc060d.jpg'],
  ['king-papa','kingpapaco','09f60039-1308-4816-a206-a42371588cf7/648f29811515ebb8.jpg'],
  ['domingo','domingorestauranteco','0c52e29b-9e94-4b25-a390-83cf01d8fb1f/c78a9f897eb94d3c.jpg'],
  ['la-puerta-bakery','lapuertabakery','46ff3a60-a27b-42bc-b98c-95620438579d/3e5d9d033e70c8fa.jpg'],
  ['kumo-sushi-bar','kumosushibar.co','223ac9a2-e84b-496b-ae8f-2d597a809d4a/a76d477b090fd951.jpg'],
  ['selvah-rooftop','selvah_rooftop','e812cffb-205e-441c-96ae-e25795f5a6d0/2776d70eeb55e1d8.jpg'],
  ['paintball-cali-norte','paintballcalinorte','4080b010-9b63-44e6-8758-f388766fb2d8/be940a0fe8f76c52.jpg'],
  ['busca-por-dentro','buscapordentrosanantonio','c06f5a1d-2beb-460b-879f-b35f6341f2be/6a09c48402426dce.jpg'],
  ['yonkers-grill-and-drinks','yonkersgrill','3c1cbb55-763e-4924-92fb-ed053fc05020/9256cb4bf8323fb1.jpg'],
];
const now = new Date().toISOString();
for (const file of ['apps/mobile/public/spots-catalog.json','apps/mobile/dist/spots-catalog.json']) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
  for (const [slug,user,rel] of items) {
    const spot = catalog.spots.find((entry)=>entry.slug===slug); if (!spot) throw new Error(`Missing ${slug}`);
    const source=path.join(tempRoot,rel); if(!fs.existsSync(source)) throw new Error(`Missing ${source}`);
    const dir=path.join(root,'apps/mobile/public/place-media',slug); fs.mkdirSync(dir,{recursive:true});
    fs.copyFileSync(source,path.join(dir,'instagram-logo.jpg'));
    spot.logo_url=`/place-media/${slug}/instagram-logo.jpg`; spot.instagram=`https://www.instagram.com/${user}/`; spot.updated_at=now;
    for(const branch of catalog.branches.filter((entry)=>entry.spot_id===spot.id)) branch.instagram=spot.instagram;
  }
  fs.writeFileSync(path.join(root,file),JSON.stringify(catalog,null,2)+'\n');
}
console.log(`Applied ${items.length} additional Instagram logos.`);
