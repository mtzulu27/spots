import { readFileSync, writeFileSync } from 'node:fs';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH = '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';
const NOW = '2026-04-14T01:46:00.000Z';
const HOURS_LABEL = 'Mar-Dom 4:00 PM-11:30 PM';

const WEEKLY_ROWS = [
  { day_of_week: 1, is_closed: true, open_time: null, close_time: null, split_open_time: null, split_close_time: null, sort_order: 10 },
  { day_of_week: 2, is_closed: false, open_time: '16:00:00', close_time: '23:30:00', split_open_time: null, split_close_time: null, sort_order: 20 },
  { day_of_week: 3, is_closed: false, open_time: '16:00:00', close_time: '23:30:00', split_open_time: null, split_close_time: null, sort_order: 30 },
  { day_of_week: 4, is_closed: false, open_time: '16:00:00', close_time: '23:30:00', split_open_time: null, split_close_time: null, sort_order: 40 },
  { day_of_week: 5, is_closed: false, open_time: '16:00:00', close_time: '23:30:00', split_open_time: null, split_close_time: null, sort_order: 50 },
  { day_of_week: 6, is_closed: false, open_time: '16:00:00', close_time: '23:30:00', split_open_time: null, split_close_time: null, sort_order: 60 },
  { day_of_week: 0, is_closed: false, open_time: '16:00:00', close_time: '23:30:00', split_open_time: null, split_close_time: null, sort_order: 70 },
];

function upsertRows(rows, branchId, weeklyRows) {
  const rest = Array.isArray(rows) ? rows.filter((row) => row.branch_id !== branchId) : [];
  return [...rest, ...weeklyRows];
}

for (const catalogPath of CATALOG_PATHS) {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const spot = catalog.spots.find((entry) => entry.slug === 'lumina');
  const branch = catalog.branches.find((entry) => entry.slug === 'lumina-cali');

  if (!spot || !branch) {
    throw new Error(`No se encontró lumina en ${catalogPath}`);
  }

  const nextId =
    Math.max(
      0,
      ...(Array.isArray(catalog.branchHours) ? catalog.branchHours : []).map((row) => Number(row.id) || 0),
      ...(Array.isArray(catalog.hours) ? catalog.hours : []).map((row) => Number(row.id) || 0),
    ) + 1;

  const rows = WEEKLY_ROWS.map((row, index) => ({
    id: nextId + index,
    branch_id: branch.id,
    ...row,
  }));

  branch.hours = HOURS_LABEL;
  branch.updated_at = NOW;
  spot.updated_at = NOW;

  catalog.branchHours = upsertRows(catalog.branchHours, branch.id, rows);
  catalog.hours = upsertRows(catalog.hours, branch.id, rows);

  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
}

const tracker = JSON.parse(readFileSync(TRACKER_PATH, 'utf8'));
const entry = tracker.entries?.find((item) => item.slug === 'lumina');

if (entry) {
  entry.lastReviewedAt = NOW;
  entry.notes = Array.isArray(entry.notes) ? entry.notes : [];
  entry.notes.push('Se confirmó horario directo por Instagram: martes a domingo de 4:00 PM a 11:30 PM.');
  entry.missingFields = (entry.missingFields || []).filter((field) => field !== 'hours');
}

tracker.updatedAt = NOW;
writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2) + '\n');

console.log(JSON.stringify({ slug: 'lumina', hours: HOURS_LABEL, updatedAt: NOW }, null, 2));
