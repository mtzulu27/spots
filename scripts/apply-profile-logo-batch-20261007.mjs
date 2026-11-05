import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogFiles = ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json'];
const items = [
  ['mimos', 'heladosmimos', '95b3a006-c6e2-443a-b48d-37692c016b08/97d9271b82c8c2ae.jpg'],
  ['lumina', 'iluminarestaurant', '702cfd9d-0b97-4be1-98d0-52165a359282/7623b22c8fdfda1e.jpg'],
  ['santa-fusion', 'santa.fusion', 'c5b1c7cf-c0aa-4ba4-add4-435295ad4b10/af23a9feb83c2b69.jpg'],
  ['el-gran-langostino', 'elgranlangostino', 'aada25a4-6f21-41d3-a72f-962749455899/b253bda9897dcf58.jpg'],
  ['hamburgo', 'hamburgo_pcb', '1377f4a5-5548-48fc-86db-6e2466d6771a/e879c6e39c621371.jpg'],
  ['don-samuel', 'donsamuelbakery', '506a0343-0610-4467-b865-24874ef8fe44/2a46a9bfbc35f02f.jpg'],
  ['simons', 'simonsfastfood', '52224860-b6ad-409f-8c6b-2a6714088f75/d35accb94db4abde.jpg'],
  ['joes', 'joesretrodiner', 'd18cad7f-7597-4f23-af73-05460bc15a50/c9ce137539a93db1.jpg'],
  ['chelita-go-mex', 'chelita.gomex', '7963be2f-8a36-4d7c-a622-bd09184c8be9/3d76e7d7747c4097.jpg'],
  ['la-churreria-antigua', 'lachurreriaantiguaco', '3d858bd7-46f8-4fd7-88e3-d59f38f4868d/88a95f802729c770.jpg'],
];
const tempRoot = '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/browser-use/assets';
const now = new Date().toISOString();
const sources = new Map(items.map(([slug, user, rel]) => [slug, { user, source: path.join(tempRoot, rel) }]));
for (const file of catalogFiles) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  for (const [slug, user, rel] of items) {
    const spot = catalog.spots.find((entry) => entry.slug === slug);
    if (!spot) throw new Error(`Missing spot ${slug}`);
    const source = sources.get(slug).source;
    if (!fs.existsSync(source)) throw new Error(`Missing downloaded logo ${source}`);
    const folder = path.join(root, 'apps/mobile/public/place-media', slug);
    fs.mkdirSync(folder, { recursive: true });
    const target = path.join(folder, 'instagram-logo.jpg');
    fs.copyFileSync(source, target);
    spot.logo_url = `/place-media/${slug}/instagram-logo.jpg`;
    spot.instagram = `https://www.instagram.com/${user}/`;
    spot.updated_at = now;
    for (const branch of catalog.branches.filter((entry) => entry.spot_id === spot.id)) branch.instagram = spot.instagram;
  }
  fs.writeFileSync(path.join(root, file), JSON.stringify(catalog, null, 2) + '\n');
}
console.log(`Applied ${items.length} reviewed Instagram logos.`);
