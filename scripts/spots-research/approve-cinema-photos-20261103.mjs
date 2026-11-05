import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const photos = [];
for (const name of [
  '761375693_17894219022591859_7002547677095198378_n.jpg',
  '764216348_17894219013591859_5773670617045092519_n.jpg',
]) {
  const file = `/Users/mateo/Downloads/${name}`;
  photos.push({ file, source: 'https://www.instagram.com/cinemaprimitivo/p/DbhFoGQjdF_/',
    sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
    visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true,
    reason: 'Fotografia real de la sala y mesas del cine sensorial en Cali; pantalla fisica, sin fotograma de pelicula usado como falsa foto del lugar ni texto superpuesto.' });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/cinema-selection.json', JSON.stringify({ places: [{
  id: 4013, slug: 'cinema-primitivo', profile: 'https://www.instagram.com/cinemaprimitivo/', photos,
}] }, null, 2) + '\n');
