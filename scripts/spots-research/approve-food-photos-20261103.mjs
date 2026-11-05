import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const places = [];
for (const [id, slug, account, reviewed] of [
  [4023, 'piropo', 'piropo.rest', [
    ['797671729_17893327692611731_8834910925299070176_n.jpg', 'p', 'Ddh1jyEmnqI'],
    ['877253985_1468104425254280_1737449524688893215_n.jpg', 'reel', 'DfGTPq8OwjU'],
    ['868203900_2588240158357556_6280581222217319937_n.jpg', 'reel', 'De9r6fruK0M'],
  ]],
  [4020, 'cielito-lindo', 'cielitolindo_co', [
    ['872250044_18340185652277679_2153790248374404077_n.jpg', 'p', 'DfKbpM2m1vz'],
    ['844340834_18336926848277679_8987773016304057312_n.jpg', 'p', 'DeXC83Cte4c'],
    ['792820486_18331258057277679_8552708834971669593_n.jpg', 'reel', 'Dcy1MNRvFrc'],
  ]],
]) {
  const photos = [];
  for (const [name, kind, code] of reviewed) {
    const file = `/Users/mateo/Downloads/${name}`;
    photos.push({ file, source: `https://www.instagram.com/${account}/${kind}/${code}/`,
      sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex'),
      visuallyReviewed: true, noOverlaidText: true, nonAdvertising: true,
      reason: 'Fotografia real del producto servido en el restaurante, revisada en archivo original; sin texto superpuesto ni anuncios.' });
  }
  places.push({ id, slug, profile: `https://www.instagram.com/${account}/`, photos });
}
await fs.writeFile('docs/catalog-review/discovery/photos-20261103/food-selection.json', JSON.stringify({ places }, null, 2) + '\n');
