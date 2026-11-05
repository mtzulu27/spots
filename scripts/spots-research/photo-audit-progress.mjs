import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const directory = path.resolve(process.argv[2] || 'docs/catalog-review/photo-audit-20261010');
const inventory = JSON.parse(await fs.readFile(path.join(directory, 'inventory.json'), 'utf8'));
const screenings = (await fs.readdir(directory)).filter(f => /^screening-\d+\.json$/.test(f));
const decisions = new Map();
for (const filename of screenings) {
  const report = JSON.parse(await fs.readFile(path.join(directory, filename), 'utf8'));
  for (const group of report.groups) for (const number of group.numbers) {
    const asset = inventory.assets[number - 1];
    assert.ok(asset, 'Unknown audit image number');
    assert.ok(!decisions.has(asset.id), 'Image screened twice; resolve reports explicitly');
    decisions.set(asset.id, { assetId: asset.id, sha256: asset.sha256 || null, number,
      decision: group.decision, reason: group.reason });
  }
}
// Individual original reviews supersede thumbnail screening, pinned to its hash.
const finalReviews = (await fs.readdir(directory)).filter(f => /^full-review-\d+\.json$/.test(f));
for (const filename of finalReviews) {
  const report = JSON.parse(await fs.readFile(path.join(directory, filename), 'utf8'));
  for (const review of report.entries) {
    const asset = inventory.assets[review.number - 1];
    assert.ok(asset && decisions.has(asset.id), 'Original review needs a screened image');
    assert.equal(review.sha256, asset.sha256, 'Original review hash differs from inventory');
    assert.ok(review.reason && ['approved', 'replace', 'identity_needs_review', 'source_requires_review'].includes(review.decision));
    decisions.set(asset.id, { assetId: asset.id, sha256: asset.sha256, number: review.number,
      decision: review.decision, reason: review.reason, originalReviewed: true });
  }
}
const counts = {};
for (const decision of decisions.values()) counts[decision.decision] = (counts[decision.decision] || 0) + 1;
const progress = { generatedAt: new Date().toISOString(), scopePlaces: inventory.places.length,
  scopeImages: inventory.assets.length, screenedReferences: decisions.size,
  visuallyScreened: [...decisions.values()].filter(d => d.decision !== 'unavailable_requires_replacement_or_recovery').length,
  decisions: [...decisions.values()], decisionCounts: counts,
  remainingUnscreened: inventory.assets.filter(a => !decisions.has(a.id)).map(a => a.id),
  nextSheet: decisions.size === inventory.assets.length ? null : Math.floor(decisions.size / 12) + 1 };
await fs.writeFile(path.join(directory, 'progress.json'), JSON.stringify(progress, null, 2) + '\n');
console.log(JSON.stringify({ places: progress.scopePlaces, images: progress.scopeImages,
  screenedReferences: progress.screenedReferences, visuallyScreened: progress.visuallyScreened,
  decisionCounts: counts, nextSheet: progress.nextSheet }, null, 2));
