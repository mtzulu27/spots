import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const profile = 'https://www.instagram.com/floresylechugasbar/';
const photos = [];
for (const name of [
  '814400282_18619501858034005_2304818717154265658_n.jpg',
  '815138708_18619501933034005_6699007828043859622_n.jpg',
]) {
  const file = `/Users/mateo/Downloads/${name}`;
  photos.push({ file,
    source: 'https://www.instagram.com/nidiagongoramusic/p/Ddb8hyTCX9e/',
    sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
    visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true,
    reason: 'Fotografia real del concierto en el bar; sin afiche, precios ni texto superpuesto. Segunda imagen: composicion fotografica del mismo evento.',
    sharedPublication: { verified: true, venueProfile: profile,
      evidence: 'Visible en la grilla oficial. Cabecera del post muestra avatar de floresylechugasbar como coautor; texto agradece al lugar por el concierto en Cali, 18 septiembre 2026.' },
  });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/flores-selection.json', JSON.stringify({ places: [{
  id: 4014, slug: 'flores-y-lechugas', profile, photos,
}] }, null, 2) + '\n');
