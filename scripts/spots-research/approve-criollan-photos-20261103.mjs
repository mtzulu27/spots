import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const photos = [];
for (const [name, code, reason] of [
  ['762310697_18135877789719496_2753366355042793791_n.jpg', 'Dbg4n9nxSPu', 'Plato real de entradas, composicion horizontal apropiada para portada; sin texto.'],
  ['876485637_18145788310719496_7866469315906547465_n.jpg', 'DfICkh4ESp5', 'Bebidas fotografiadas en el local; sin anuncios ni texto superpuesto.'],
]) {
  const file = `/Users/mateo/Downloads/${name}`;
  photos.push({ file, source: `https://www.instagram.com/criollan_lovers/p/${code}/`,
    sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
    visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true, reason });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/criollan-selection.json', JSON.stringify({ places: [{
  id: 4019, slug: 'criollan-lovers', profile: 'https://www.instagram.com/criollan_lovers/', photos,
}] }, null, 2) + '\n');
