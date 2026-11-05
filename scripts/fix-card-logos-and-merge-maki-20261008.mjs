import fs from 'node:fs';

const paths = [
  'apps/mobile/public/spots-catalog.json',
  'apps/mobile/dist/spots-catalog.json',
];

const now = new Date().toISOString();
const sourcePath = paths[0];
const catalog = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const primary = catalog.spots.find((spot) => spot.id === 3631);
const duplicate = catalog.spots.find((spot) => spot.id === 3678);
if (!primary || !duplicate) throw new Error('No se encontraron las dos fichas de Maki Bar.');

primary.name = 'Maki Bar';
primary.slug = 'maki-bar';
primary.instagram = 'https://www.instagram.com/makibar.col/';
primary.logo_url = primary.logo_url || duplicate.logo_url;
primary.cover_image_url = primary.cover_image_url || duplicate.cover_image_url;
primary.gallery_urls = [
  ...(primary.gallery_urls || []),
  ...(duplicate.gallery_urls || []),
].filter((url, index, urls) => url && urls.indexOf(url) === index);
primary.short_description = duplicate.short_description || primary.short_description;
primary.updated_at = now;

const primaryBranch = catalog.branches.find((branch) => branch.id === 5117);
const duplicateBranches = catalog.branches.filter((branch) => branch.spot_id === duplicate.id);
if (primaryBranch && duplicateBranches.length) {
  const sourceBranch = duplicateBranches[0];
  for (const key of ['phone', 'whatsapp', 'website_url', 'menu_url']) {
    if (!primaryBranch[key] && sourceBranch[key]) primaryBranch[key] = sourceBranch[key];
  }
  if ((!primaryBranch.address || !primaryBranch.latitude || !primaryBranch.longitude) && sourceBranch.address) {
    primaryBranch.address = sourceBranch.address;
    primaryBranch.latitude ||= sourceBranch.latitude;
    primaryBranch.longitude ||= sourceBranch.longitude;
  }
}

duplicate.is_active = false;
duplicate.catalog_status = 'merged_duplicate';
duplicate.business_status = 'temporarily_closed';
duplicate.updated_at = now;
for (const branch of duplicateBranches) {
  branch.is_active = false;
  branch.business_status = 'temporarily_closed';
  branch.catalog_status = 'merged_duplicate';
}

for (const path of paths) {
  fs.writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`);
}
console.log(JSON.stringify({
  primary: { id: primary.id, slug: primary.slug, name: primary.name, logo_url: primary.logo_url },
  deactivatedDuplicate: { id: duplicate.id, slug: duplicate.slug, name: duplicate.name },
  files: paths,
}, null, 2));
