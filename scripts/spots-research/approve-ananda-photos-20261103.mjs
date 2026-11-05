import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const profile = 'https://www.instagram.com/anandatallerdulce/';
const photos = [];
for (const [name, code] of [
  ['848119546_18117370865283542_7929535632975785184_n.jpg', 'Decs1TxOouS'],
  ['831166748_18116103104283542_8981024045675660051_n.jpg', 'Dd_xAhyPNmL'],
]) {
  const file = `/Users/mateo/Downloads/${name}`;
  photos.push({ file, source: `https://www.instagram.com/sinarrepentimientoscol/reel/${code}/`,
    sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
    visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true,
    reason: 'Fotos reales de producto y sus creadores en produccion. No afiche ni texto superpuesto; etiqueta fisica del producto. No se usa imagen de sede de Bogota para representar Cali.',
    sharedPublication: { verified: true, venueProfile: profile,
      evidence: 'Ambos reels vistos directamente: cabecera muestra sinarrepentimientoscol y anandatallerdulce como coautores; producto disponible en puntos fisicos Ananda segun texto.' },
  });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/ananda-selection.json', JSON.stringify({ places: [{
  id: 4016, slug: 'ananda-taller-dulce', profile, photos,
}] }, null, 2) + '\n');
