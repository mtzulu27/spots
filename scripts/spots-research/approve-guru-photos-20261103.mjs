import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const photos = [];
for (const [name, kind, code, reason] of [
  ['789348236_17913681651448836_7698228097132430370_n.jpg', 'reel', 'DcmZwDPxRfR', 'Cocteles y decoracion del lugar sin texto superpuesto.'],
  ['869770524_17922645834448836_5162592915251764644_n.jpg', 'p', 'DfA_xuEkU7y', 'Experiencia de cocteleria fotografiada sin grafica publicitaria.'],
  ['783573551_17912989770448836_8918322367792213620_n.jpg', 'p', 'DcZjqJYEZ2C', 'Detalle de bebida y ambiente con mobiliario real; sin anuncios.'],
]) {
  const file = `/Users/mateo/Downloads/${name}`;
  photos.push({ file, source: `https://www.instagram.com/guruclubroom/${kind}/${code}/`,
    sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
    visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true, reason });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/guru-selection.json', JSON.stringify({ places: [{
  id: 4021, slug: 'guru-clubroom', profile: 'https://www.instagram.com/guruclubroom/', photos,
}] }, null, 2) + '\n');
