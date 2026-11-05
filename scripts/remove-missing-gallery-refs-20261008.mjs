import fs from 'node:fs';

const catalogs = [
  'apps/mobile/public/spots-catalog.json',
  'apps/mobile/dist/spots-catalog.json',
];

const removals = {
  'fit-bar': ['/place-media/fit-bar/gallery-4.jpg'],
  joes: ['/place-media/joes/gallery-6.jpg'],
  'madelo-lago-verde': [
    '/place-media/madelo-lago-verde/gallery-1.jpg',
    '/place-media/madelo-lago-verde/gallery-3.jpg',
    '/place-media/madelo-lago-verde/gallery-6.jpg',
  ],
};

for (const path of catalogs) {
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  let removed = 0;

  for (const spot of catalog.spots ?? []) {
    const urls = removals[spot.slug];
    if (!urls || !Array.isArray(spot.gallery_urls)) continue;
    const before = spot.gallery_urls.length;
    spot.gallery_urls = spot.gallery_urls.filter((url) => !urls.includes(url));
    removed += before - spot.gallery_urls.length;
  }

  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`${path}: removed ${removed} broken gallery references`);
}
