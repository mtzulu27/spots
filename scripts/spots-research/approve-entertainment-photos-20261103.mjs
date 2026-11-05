import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const places = [];
for (const [id, slug, account, reviewed] of [
  [4018, 'the-pub-legend', 'thepublegend', [
    ['819581044_18068489606775438_802355284231171282_n.jpg', 'DeF30e4AcPe'],
    ['821405032_18068489516775438_3818063701960266875_n.jpg', 'Dd-I3XbgpWr'],
  ]],
  [3491, 'greens-bolos-club', 'greensbolosclub', [
    ['687020256_18592635487061166_5938041042117645595_n.jpg', 'DYC_rpJJrax'],
    ['851887722_18647677927061166_4453777584834729058_n.jpg', 'DenPhupJiCc'],
    ['687327762_18592635976061166_823200684909199961_n.jpg', 'DYGJQfYJ-7D'],
  ]],
]) {
  const photos = [];
  for (const [name, code] of reviewed) {
    const file = `/Users/mateo/Downloads/${name}`;
    photos.push({ file, source: `https://www.instagram.com/${account}/reel/${code}/`,
      sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
      visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true,
      reason: 'Experiencia real dentro del establecimiento, revisada en archivo original; sin texto superpuesto ni afiche publicitario.' });
  }
  places.push({ id, slug, profile: `https://www.instagram.com/${account}/`, photos });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/entertainment-selection.json', JSON.stringify({ places }, null, 2) + '\n');
