import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const profile = 'https://www.instagram.com/heladosyulika/';
const photos = [];
for (const [name, source] of [
  ['867638600_4460719474063129_1736491950297900091_n.jpg', 'https://www.instagram.com/bynatinatss/reel/De73b54N5a3/'],
  ['857459552_18635528074034719_1865994433766411083_n.jpg', 'https://www.instagram.com/heladosyulika/reel/Deulmz1Bz5w/'],
]) {
  const file = `/Users/mateo/Downloads/${name}`;
  photos.push({ file, source,
    sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
    visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true,
    reason: 'Foto real del producto disfrutado en el local y de la barra de toppings. Solo rotulos fisicos, sin texto superpuesto ni afiches.',
    ...(source.includes('/bynatinatss/') ? { sharedPublication: { verified: true, venueProfile: profile,
      evidence: 'Grilla oficial y cabecera del reel confirman bynatinatss y heladosyulika como coautores; texto identifica helado Yulika en Cali.' } } : {}),
  });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/yulika-selection.json', JSON.stringify({ places: [{
  id: 4017, slug: 'yulika-frozen-yogurt', profile, photos,
}] }, null, 2) + '\n');
