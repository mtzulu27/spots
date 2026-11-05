import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const photos = [];
for (const [name, kind, code] of [
  ['502501776_1227042562383678_3552360747676003276_n.jpg', 'reel', 'Cshg9OcAvG0'],
  ['623343229_18101937637663913_3573368351463331216_n.jpg', 'p', 'CtPRgzxAC1Q'],
]) {
  const file = `/Users/mateo/Downloads/${name}`;
  photos.push({ file, source: `https://www.instagram.com/lanapacali/${kind}/${code}/`,
    sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
    visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true,
    reason: 'Foto historica real del producto, sin texto superpuesto. No implica reapertura; se conserva cerrado temporalmente.' });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/napa-selection.json', JSON.stringify({ places: [{
  id: 4026, slug: 'la-napa', profile: 'https://www.instagram.com/lanapacali/', photos,
}] }, null, 2) + '\n');
