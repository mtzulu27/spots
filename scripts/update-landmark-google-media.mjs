import fs from 'node:fs';

const files = ['apps/mobile/public/spots-catalog.json', 'apps/mobile/dist/spots-catalog.json'];
const media = {
  'ecoparque-de-la-biodiversidad': [
    'https://www.elespectador.com/resizer/v2/PZO2GT3ZSNBAHEHUA5B3JUM26U.webp?auth=66e592b03bfca9bd161c25c3436581daef57ea782ac5a65c2135e5c87134675f&height=739&quality=60&smart=true&width=1110',
  ],
  'cristo-rey': [
    'https://s3.amazonaws.com/rtvc-assets-canalinstitucional.tv/s3fs-public/inline-images/Cristo%20Rey%20Cali.jpg',
  ],
  'cerro-de-las-tres-cruces': [
    'https://www.elpais.com.co/resizer/v2/MQ25Y3XOFBHAPDS4YZDH4BPCBA.jpeg?auth=596dfe2d53adbd097af8cb80b705e42622b17d480e112e49888d681bb92df743&fitfill=false&quality=75&smart=true&width=1280',
    'https://viajandox.com.co/uploads/attractive_251.jpg',
  ],
};

for (const file of files) {
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [slug, urls] of Object.entries(media)) {
    const spot = catalog.spots.find((entry) => entry.slug === slug);
    if (!spot) throw new Error(`Missing landmark ${slug}`);
    spot.cover_image_url = urls[0];
    spot.gallery_urls = urls;
    spot.updated_at = new Date().toISOString();
  }
  fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
}
console.log('Updated landmark cover and gallery media from public web sources.');
