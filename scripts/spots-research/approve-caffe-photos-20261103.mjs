import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const photos = [];
for (const [name, code] of [
  ['861063709_4151512391657160_6929887883433044089_n.jpg', 'De7L0zhBOE0'],
  ['831424257_17929531362415438_8003862858652903256_n.jpg', 'DeFHRgTBzCF'],
]) {
  const file = `/Users/mateo/Downloads/${name}`;
  photos.push({ file, source: `https://www.instagram.com/caffedamoreco/reel/${code}/`,
    sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
    visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true,
    reason: 'Producto servido, revisado en descarga completa; sin texto superpuesto ni grafica publicitaria.' });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/caffe-selection.json', JSON.stringify({ places: [{
  id: 4024, slug: 'caffe-damore', profile: 'https://www.instagram.com/caffedamoreco/', photos,
}] }, null, 2) + '\n');
