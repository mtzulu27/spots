import { readFileSync, writeFileSync } from 'node:fs';

const CATALOG_PATHS = [
  '/Users/mateo/Documents/Playground/apps/mobile/public/spots-catalog.json',
  '/Users/mateo/Documents/Playground/apps/mobile/dist/spots-catalog.json',
];

const TRACKER_PATH = '/Users/mateo/Documents/Playground/docs/spots-ingestion-tracker.json';
const NOW = '2026-04-14T01:42:00.000Z';

const BRANCH_HOURS = {
  'fusion-wok-parque-del-perro-cali': {
    label: 'Dom-Jue/Fest 11:00 AM-10:00 PM · Vie-Sab 11:00 AM-11:00 PM',
  },
  'fusion-wok-puerto-125-cali': {
    label: 'Dom-Jue/Fest 11:00 AM-9:00 PM · Vie-Sab 11:00 AM-10:00 PM',
  },
  'fusion-wok-pacific-mall-cali': {
    label: 'Dom-Jue/Fest 11:00 AM-9:00 PM · Vie-Sab 11:00 AM-10:00 PM',
  },
  'fusion-wok-las-velas-cali': {
    label: 'Dom-Jue/Fest 11:00 AM-10:00 PM · Vie-Sab 11:00 AM-11:00 PM',
  },
  'fusion-wok-granada-cali': {
    label: 'Dom-Jue/Fest 11:00 AM-10:00 PM · Vie-Sab 11:00 AM-11:00 PM',
  },
};

function buildWeeklyRows(branchId, weekdayClose, weekendClose, startId) {
  return [
    { id: startId + 0, branch_id: branchId, day_of_week: 1, is_closed: false, open_time: '11:00:00', close_time: weekdayClose, split_open_time: null, split_close_time: null, sort_order: 10 },
    { id: startId + 1, branch_id: branchId, day_of_week: 2, is_closed: false, open_time: '11:00:00', close_time: weekdayClose, split_open_time: null, split_close_time: null, sort_order: 20 },
    { id: startId + 2, branch_id: branchId, day_of_week: 3, is_closed: false, open_time: '11:00:00', close_time: weekdayClose, split_open_time: null, split_close_time: null, sort_order: 30 },
    { id: startId + 3, branch_id: branchId, day_of_week: 4, is_closed: false, open_time: '11:00:00', close_time: weekdayClose, split_open_time: null, split_close_time: null, sort_order: 40 },
    { id: startId + 4, branch_id: branchId, day_of_week: 5, is_closed: false, open_time: '11:00:00', close_time: weekendClose, split_open_time: null, split_close_time: null, sort_order: 50 },
    { id: startId + 5, branch_id: branchId, day_of_week: 6, is_closed: false, open_time: '11:00:00', close_time: weekendClose, split_open_time: null, split_close_time: null, sort_order: 60 },
    { id: startId + 6, branch_id: branchId, day_of_week: 0, is_closed: false, open_time: '11:00:00', close_time: weekdayClose, split_open_time: null, split_close_time: null, sort_order: 70 },
  ];
}

function upsertRows(rows, branchId, weeklyRows) {
  const rest = Array.isArray(rows) ? rows.filter((row) => row.branch_id !== branchId) : [];
  return [...rest, ...weeklyRows];
}

for (const catalogPath of CATALOG_PATHS) {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  let nextId =
    Math.max(
      0,
      ...(Array.isArray(catalog.branchHours) ? catalog.branchHours : []).map((row) => Number(row.id) || 0),
      ...(Array.isArray(catalog.hours) ? catalog.hours : []).map((row) => Number(row.id) || 0),
    ) + 1;

  for (const branch of catalog.branches.filter((entry) => entry.slug in BRANCH_HOURS)) {
    const config = BRANCH_HOURS[branch.slug];
    const weekdayClose = config.label.includes('9:00 PM') ? '21:00:00' : '22:00:00';
    const weekendClose = config.label.includes('11:00 PM') ? '23:00:00' : '22:00:00';
    const weeklyRows = buildWeeklyRows(branch.id, weekdayClose, weekendClose, nextId);
    nextId += 7;

    branch.hours = config.label;
    branch.updated_at = NOW;

    catalog.branchHours = upsertRows(catalog.branchHours, branch.id, weeklyRows);
    catalog.hours = upsertRows(catalog.hours, branch.id, weeklyRows);
  }

  const spot = catalog.spots.find((entry) => entry.slug === 'fusion-wok');
  if (spot) {
    spot.updated_at = NOW;
  }

  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
}

const tracker = JSON.parse(readFileSync(TRACKER_PATH, 'utf8'));
const entry = tracker.entries?.find((item) => item.slug === 'fusion-wok');

if (entry) {
  entry.lastReviewedAt = NOW;
  entry.internalTag = 'followup-max-budget-brand-scope';
  entry.missingFields = ['max_budget'];
  entry.notes = Array.isArray(entry.notes) ? entry.notes : [];
  entry.notes.push(
    'Se cargaron horarios por sede desde capturas directas de Aldea Asiática para San Fernando, Puerto 125, Pacific Center, Las Velas y Granada.',
  );
}

tracker.updatedAt = NOW;
writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2) + '\n');

console.log(
  JSON.stringify(
    {
      slug: 'fusion-wok',
      updatedAt: NOW,
      branchesUpdated: Object.keys(BRANCH_HOURS),
    },
    null,
    2,
  ),
);
