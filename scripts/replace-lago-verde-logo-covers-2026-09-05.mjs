import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicRoot = path.join(root, 'apps/mobile/public');
const catalogPath = path.join(publicRoot, 'spots-catalog.json');
const reportPath = path.join(root, 'docs/catalog-review/lago-verde-cover-corrections-2026-09-05.json');
const photos = [
  { slug: 'pork-house', file: '/tmp/pork-cover-candidate.jpg', source: 'https://www.instagram.com/theporkhouseandco/p/DcrIfvttBsr/', description: 'Costillas y coctel de The Pork House & Co.; foto sin textos superpuestos.' },
  { slug: 'alma-romero', file: '/tmp/alma-cover-candidate.jpg', source: 'https://www.instagram.com/almaromerocali/p/DbcDgcDnB-F/', description: 'Segunda foto del carrusel: coctel servido, sin textos superpuestos.' },
  { slug: 'bocks-best-of-chicken', file: '/tmp/bocks-fries.jpg', source: 'https://web.didiglobal.com/co/food/cali/bocks-lago-verde/5764614806074819914/', description: 'Foto de Bocks Fries del menu del local; sin publicidad superpuesta. Marca impresa en el empaque real.' },
  { slug: 'next-reality', file: '/tmp/next-clean-candidate.jpg', source: 'https://www.instagram.com/reel/DQE8X1Sj8Cc/', description: 'Fotografia de jugadores en la sede Lago Verde, sin texto ni controles de video. Copia publica indexada por Google Images, 335x597; reemplazar por original de mayor resolucion cuando este disponible.', assetSource: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXdMCGvOZ2dU74O1_Z2O8leBUd_BPPwb0CYHrYvEZjDA&s=10' },
];
const pending = [
  { slug: 'delio', reason: 'Directorio solo contiene el logo; no se encontro una foto verificable del establecimiento.' },
  { slug: 'colore-me', reason: 'Perfil oficial restringido para visitantes sin sesion; resultados externos no verifican una foto del establecimiento.' },
  { slug: 'playground', reason: 'Candidatos revisados contienen promociones, textos o marcas de agua; no se usan fotos de la antigua sede para representar Lago Verde.' },
];
const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const previousReport = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
const report = { reviewedAt: new Date().toISOString(), scope: 'Local catalog only', policy: 'No logos, advertisements, text overlays, stock photos or unverified venue photos as covers.', replaced: [], pending: [] };

for (const photo of photos) {
  const spot = data.spots.find((entry) => entry.slug === photo.slug);
  assert(spot, `Missing spot: ${photo.slug}`);
  const url = `/place-media/${photo.slug}/cover-experience-2026-09-05.jpg`;
  const destination = path.join(publicRoot, url);
  const original = previousReport?.replaced.find((entry) => entry.slug === photo.slug)?.previousCover ?? spot.cover_image_url;
  if (fs.existsSync(photo.file)) fs.copyFileSync(photo.file, destination);
  assert(fs.existsSync(destination), `Missing reviewed photo: ${photo.slug}`);
  assert(fs.statSync(destination).size > 10000, `Invalid photo: ${photo.slug}`);
  if (spot.cover_image_url !== url) spot.updated_at = report.reviewedAt;
  spot.cover_image_url = url;
  spot.gallery_urls = (spot.gallery_urls ?? []).filter((entry) => entry !== spot.logo_url && !entry.includes('logo-directory'));
  report.replaced.push({ slug: photo.slug, previousCover: original, cover: url, source: photo.source, ...(photo.assetSource ? { assetSource: photo.assetSource } : {}), visualReview: photo.description });
}

for (const item of pending) {
  const spot = data.spots.find((entry) => entry.slug === item.slug);
  assert(spot, `Missing spot: ${item.slug}`);
  if (spot.cover_image_url === spot.logo_url || spot.cover_image_url?.includes('logo-directory')) {
    spot.cover_image_url = '';
    spot.updated_at = report.reviewedAt;
  }
  spot.gallery_urls = (spot.gallery_urls ?? []).filter((entry) => entry !== spot.logo_url && !entry.includes('logo-directory'));
  report.pending.push({ ...item, cover: spot.cover_image_url });
}

for (const { slug } of [...photos, ...pending]) {
  const spot = data.spots.find((entry) => entry.slug === slug);
  assert(!spot.cover_image_url || spot.cover_image_url !== spot.logo_url);
  assert(!spot.cover_image_url?.includes('logo-directory'));
  assert(fs.existsSync(path.join(publicRoot, spot.logo_url)), `Logo lost: ${slug}`);
}
fs.writeFileSync(catalogPath, `${JSON.stringify(data, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
