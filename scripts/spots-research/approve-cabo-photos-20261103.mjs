import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const photos = [];
for (const [file, extra] of [
  ['/Users/mateo/Downloads/858088234_17988798942117678_9100295409524747661_n.jpg', { source: 'https://www.instagram.com/caboleones/p/DepkJqWnSy1/' }],
  [path.resolve('apps/mobile/public/place-media/cabo-leones/instagram-recovered-20260904-1.jpg'), { catalogUrl: '/place-media/cabo-leones/instagram-recovered-20260904-1.jpg' }],
]) {
  photos.push({ file, ...extra,
    sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
    visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true,
    reason: 'Foto real de terraza, bebidas y vista del local, sin texto superpuesto. Se retira portada anterior con Mentalmente aqui.' });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/cabo-selection.json', JSON.stringify({ places: [{
  id: 3541, slug: 'cabo-leones', profile: 'https://www.instagram.com/caboleones/', photos,
}] }, null, 2) + '\n');
