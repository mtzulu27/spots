import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = '/Users/mateo/Documents/Playground';
const catalogPaths = [
  `${root}/apps/mobile/public/spots-catalog.json`,
  `${root}/apps/mobile/dist/spots-catalog.json`,
];
const auditPath = `${root}/docs/spots-target-completeness-2026-10-07.json`;
const mediaRoot = `${root}/apps/mobile/public/place-media`;
const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
const targetSlugs = new Set(audit.places.map((place) => place.slug));

function isImage(file) {
  return /\.(jpe?g|png|webp)$/i.test(file);
}

function publicUrl(folder, file) {
  return `/place-media/${folder}/${encodeURIComponent(file)}`;
}

function chooseCover(files) {
  return files.find((file) => /^(cover|google|instagram-[1-9]|instagram-recovered)/i.test(file));
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

let changed = 0;
for (const catalogPath of catalogPaths) {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  for (const spot of catalog.spots) {
    if (!targetSlugs.has(spot.slug)) continue;
    const folder = path.join(mediaRoot, spot.slug);
    if (!existsSync(folder)) continue;
    const files = readdirSync(folder).filter(isImage).sort();
    const logo = files.find((file) => /logo/i.test(file));
    const cover = chooseCover(files);
    const gallery = files.filter((file) => file !== logo && file !== cover).slice(0, 12);
    let didChange = false;
    if (logo && !spot.logo_url) {
      spot.logo_url = publicUrl(spot.slug, logo);
      didChange = true;
    }
    if (cover && !spot.cover_image_url) {
      spot.cover_image_url = publicUrl(spot.slug, cover);
      didChange = true;
    }
    if (gallery.length && (!Array.isArray(spot.gallery_urls) || spot.gallery_urls.length === 0)) {
      spot.gallery_urls = [spot.cover_image_url, ...gallery.map((file) => publicUrl(spot.slug, file))].filter(Boolean);
      didChange = true;
    }
    if (didChange) {
      spot.updated_at = new Date().toISOString();
      changed += 1;
    }
  }
  writeJson(catalogPath, catalog);
}

console.log(JSON.stringify({ changedSpots: changed / catalogPaths.length }));
