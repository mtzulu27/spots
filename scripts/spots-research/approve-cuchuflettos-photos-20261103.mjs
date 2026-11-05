import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const profile = 'https://www.instagram.com/casacuchuflettos/';
const photos = [];
for (const name of [
  '863324918_18077000081743133_7471779246421689824_n.webp',
  '866214155_18077000105743133_2814065145075514110_n.webp',
]) {
  const file = `/Users/mateo/Downloads/${name}`;
  photos.push({ file,
    source: 'https://www.instagram.com/laforjadelosdragones/p/De5L3fREbvS/',
    sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
    visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true,
    reason: 'Clientes jugando Catan en el restaurante. Fotos reales sin publicidad ni texto superpuesto.',
    sharedPublication: { verified: true, venueProfile: profile,
      evidence: 'Publicacion en la grilla oficial; cabecera muestra laforjadelosdragones y casacuchuflettos como coautores, 24 octubre 2026.' },
  });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/cuchuflettos-selection.json', JSON.stringify({ places: [{
  id: 4022, slug: 'casa-cuchuflettos', profile, photos,
}] }, null, 2) + '\n');
