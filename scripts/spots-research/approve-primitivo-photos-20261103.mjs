import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const directory = 'docs/catalog-review/discovery/photos-20261103';
const reviewed = [
  ['841012251_18114112112586388_5668554547882915556_n.jpg', 'DeMvTcDRylq', 'Interior real con cocina abierta, barra y mobiliario; sin texto superpuesto.'],
  ['849890993_18115365488586388_3940932498809050255_n.jpg', 'Dej2LSKtyrE', 'Preparacion real de pasteleria; sin grafica publicitaria.'],
  ['833790425_18113435327586388_5212026785312229969_n.jpg', 'Dd_5zZEx8nk', 'Cafe servido en vajilla del lugar; marca fisica, sin texto superpuesto.'],
  ['812029646_18111188774586388_4108605380249852424_n.jpg', 'DdO6C2SObFW', 'Plato servido por personal del lugar; fotografia real sin anuncios.'],
];
const photos = [];
for (const [name, code, reason] of reviewed) {
  const file = `/Users/mateo/Downloads/${name}`;
  const bytes = await fs.readFile(file);
  photos.push({ file, sha256: createHash('sha256').update(bytes).digest('hex'),
    source: `https://www.instagram.com/primitivosensorial/reel/${code}/`,
    visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true, reason });
}
await fs.mkdir(directory, { recursive: true });
await fs.writeFile(`${directory}/primitivo-selection.json`, JSON.stringify({ places: [{
  id: 4025, slug: 'primitivo-sensorial', profile: 'https://www.instagram.com/primitivosensorial/', photos,
}] }, null, 2) + '\n');
