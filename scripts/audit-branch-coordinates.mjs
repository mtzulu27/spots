import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const catalogUrl = new URL('../apps/mobile/public/spots-catalog.json', import.meta.url);
const catalog = JSON.parse(readFileSync(catalogUrl, 'utf8'));
const sourcesUrl = new URL('../apps/mobile/public/coordinate-sources.json', import.meta.url);
const sources = existsSync(sourcesUrl) ? JSON.parse(readFileSync(sourcesUrl, 'utf8')).records : [];
const hasSource = (b) => sources.some((s) => s.slug === b.slug && s.latitude === b.latitude && s.longitude === b.longitude);
const valid = (b) => typeof b.latitude === 'number' && Number.isFinite(b.latitude)
  && Math.abs(b.latitude) <= 90 && typeof b.longitude === 'number'
  && Number.isFinite(b.longitude) && Math.abs(b.longitude) <= 180;
const groups = new Map();
for (const branch of catalog.branches.filter(valid)) {
  const key = `${branch.latitude},${branch.longitude}`;
  groups.set(key, [...(groups.get(key) ?? []), branch.id]);
}
const duplicateGroups = [...groups].filter(([, ids]) => ids.length > 1)
  .map(([coordinates, branchIds]) => ({ coordinates, branchIds }));
const duplicateIds = new Set(duplicateGroups.flatMap((g) => g.branchIds));
const places = catalog.spots.map((place) => ({
  id: place.id,
  slug: place.slug,
  name: place.name,
  branches: catalog.branches.filter((b) => b.spot_id === place.id).map((b) => ({
    id: b.id, slug: b.slug, address: b.address, mall: b.mall,
    latitude: b.latitude, longitude: b.longitude,
    issue: !valid(b) ? 'missing_or_invalid' : duplicateIds.has(b.id) ? 'shared_coordinates' : 'none_detected',
    verification: hasSource(b) ? 'source_matched_not_surveyed' : 'pending_external_verification',
  })),
})).sort((a, b) => a.name.localeCompare(b.name, 'es'));
const report = {
  auditedAt: new Date().toISOString(),
  source: 'apps/mobile/public/spots-catalog.json',
  externalVerificationPerformed: catalog.branches.some(hasSource),
  summary: {
    places: places.length, branches: catalog.branches.length,
    missingOrInvalid: catalog.branches.filter((b) => !valid(b)).length,
    duplicateGroups: duplicateGroups.length, branchesWithSharedCoordinates: duplicateIds.size,
    sourceMatched: catalog.branches.filter(hasSource).length,
    pendingVerification: catalog.branches.filter((b) => !hasSource(b)).length,
  },
  duplicateGroups, places,
  orphanBranches: catalog.branches.filter((b) => !catalog.spots.some((p) => p.id === b.spot_id)),
};
writeFileSync(new URL('../docs/catalog-review/coordinate-audit.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
