import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const photos = [];
for (const [name, kind, code] of [
  ['778963961_17920337139424432_4151250895533897296_n.jpg', 'p', 'DccRo9BOQAH'],
  ['759360403_17915990622424432_4871639666793526238_n.jpg', 'p', 'DbZYb1sDgPn'],
  ['830453962_17925463770424432_310272709760443010_n.jpg', 'reel', 'Dd2XFqXIo57'],
]) {
  const file = `/Users/mateo/Downloads/${name}`;
  photos.push({ file, source: `https://www.instagram.com/bigbilly.co/${kind}/${code}/`,
    sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
    visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true,
    reason: 'Foto real de comida o personal en el restaurante, sin texto superpuesto ni precios; rotulos fisicos y uniforme no son overlays.' });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/bigbilly-selection.json', JSON.stringify({ places: [{
  id: 4015, slug: 'big-billy', profile: 'https://www.instagram.com/bigbilly.co/', photos,
}] }, null, 2) + '\n');
