import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const places = [];
for (const [id, slug, account, reviewed] of [
  [80, 'palo-mulata', 'palomulata', [
    ['825320785_2553823425122158_4305455422237770513_n.jpg', 'Dd2UVT_x2Z3'],
    ['831641763_2548837695633646_8887306484900027193_n.jpg', 'Dd7txrNxJLL'],
    ['813698264_29376188785304987_3305440393484001420_n.jpg', 'DdaGbtJRucc'],
  ]],
  [3490, 'la-fugitiva', 'lafugitiva.co', [
    ['616517114_859478896850777_7925302585644402517_n.jpg', 'C3ynL0IMKjH'],
    ['837949099_18355923505217737_3451843530556068276_n.jpg', 'DeIcxZlMl3O'],
  ]],
]) {
  const photos = [];
  for (const [name, code] of reviewed) {
    const file = `/Users/mateo/Downloads/${name}`;
    photos.push({ file, source: `https://www.instagram.com/${account}/reel/${code}/`,
      sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
      visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true,
      reason: 'Fotografia real de gastronomia, experiencia o mobiliario del lugar, revisada completa; sin texto superpuesto ni afiches.' });
  }
  places.push({ id, slug, profile: `https://www.instagram.com/${account}/`, photos });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/palo-fugitiva-selection.json', JSON.stringify({ places }, null, 2) + '\n');
