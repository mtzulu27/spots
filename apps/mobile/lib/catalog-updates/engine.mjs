// Compare public catalog facts, never ingestion timestamps or audit/editorial flags.
const pick = (row, keys) => Object.fromEntries(keys.map(key => [key, row[key] ?? null]));
const spotGroups = {
  información: ['name', 'short_description', 'category', 'subcategories', 'tags', 'moods'],
  fotos: ['cover_image_url', 'gallery_urls'],
};
const branchGroups = {
  horarios: ['hours', 'holiday_mode', 'holiday_open_time', 'holiday_close_time', 'holiday_split_open_time', 'holiday_split_close_time'],
  presupuesto: ['min_budget', 'max_budget'],
  menú: ['menu_url'],
  ubicación: ['address', 'neighborhood', 'mall', 'latitude', 'longitude'],
  contacto: ['instagram', 'whatsapp', 'phone'],
};
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function hash(text) {
  let a = 2166136261, b = 5381;
  for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ text.charCodeAt(i); }
  return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
}
export function projectCatalog(catalog) {
  if (!catalog || !Array.isArray(catalog.spots) || !Array.isArray(catalog.branches)) throw new Error('Invalid catalog');
  const records = {};
  for (const spot of catalog.spots.filter(row => row.type === 'place')) {
    const branches = catalog.branches.filter(row => row.spot_id === spot.id);
    for (const branch of branches.length ? branches : [null]) {
      const facts = Object.fromEntries(Object.entries(spotGroups).map(([label, keys]) => [label, pick(spot, keys)]));
      if (branch) {
        for (const [label, keys] of Object.entries(branchGroups)) facts[label] = pick(branch, keys);
        facts.horarios.weekly = (catalog.branchHours ?? []).filter(row => row.branch_id === branch.id)
          .map(row => pick(row, ['day_of_week', 'is_closed', 'open_time', 'close_time', 'split_open_time', 'split_close_time']))
          .sort((a, b) => Number(a.day_of_week) - Number(b.day_of_week));
      }
      const key = `${spot.id}:${branch?.id ?? 'place'}`;
      records[key] = { spotId: spot.id, branchId: branch?.id ?? null, active: spot.is_active !== false && branch?.is_active !== false, name: spot.name, slug: branch?.slug ?? spot.slug, facts };
    }
  }
  return records;
}
export function diffCatalog(previous, next, occurredAt) {
  if (!previous) return []; // First sighting establishes a baseline, not hundreds of new places.
  const events = [];
  const knownPlaces = new Set(Object.values(previous).filter(row => row.active).map(row => row.spotId));
  for (const [key, record] of Object.entries(next)) {
    if (!record.active) continue; // Draft/unpublished does not mean permanently closed.
    const before = previous[key];
    let type, fields, description;
    if (!before?.active) {
      type = knownPlaces.has(record.spotId) ? 'newBranch' : 'newPlace';
      fields = [];
      description = type === 'newBranch' ? 'Añadimos una sede a Spots.' : 'Ya puedes descubrir este lugar en Spots.';
      knownPlaces.add(record.spotId);
    } else {
      fields = Object.keys(record.facts).filter(field => !equal(before.facts[field], record.facts[field]));
      if (!fields.length) continue;
      type = 'updatedPlace';
      description = `Actualizamos ${fields.join(', ')} en la ficha.`;
    }
    const id = `catalog:${key}:${hash(JSON.stringify([before ?? null, record]))}`;
    events.push({ id, type, spotId: record.spotId, branchId: record.branchId, name: record.name, slug: record.slug, occurredAt, description, fields });
  }
  return events;
}
export function mergeEvents(...lists) {
  const events = new Map();
  for (const list of lists) for (const event of list) {
    const stored = events.get(event.id);
    if (!stored) events.set(event.id, event);
    else if (stored.firstOccurredAt || event.firstOccurredAt) {
      const latest = Date.parse(event.occurredAt) > Date.parse(stored.occurredAt) ? event : stored;
      events.set(event.id, { ...latest,
        firstOccurredAt: stored.firstOccurredAt ?? event.firstOccurredAt,
        fields: [...new Set([...stored.fields, ...event.fields])],
        memberIds: [...new Set([...(stored.memberIds ?? [stored.id]), ...(event.memberIds ?? [event.id])])],
      });
    }
  }
  return condenseUpdates([...events.values()]).slice(0, 300);
}

// A fixed 24-hour window from the first update avoids endlessly extending a burst.
export function condenseUpdates(events) {
  const groups = new Map();
  const result = [];
  const ordered = [...events].sort((a, b) => Date.parse(a.firstOccurredAt ?? a.occurredAt) - Date.parse(b.firstOccurredAt ?? b.occurredAt) || a.id.localeCompare(b.id));
  for (const event of ordered) {
    if (event.type !== 'updatedPlace') { result.push(event); continue; }
    const first = event.firstOccurredAt ?? event.occurredAt;
    const group = groups.get(event.spotId);
    if (group && Date.parse(event.occurredAt) - Date.parse(group.firstOccurredAt) < 86400000) {
      const fields = [...new Set([...group.fields, ...event.fields])];
      const memberIds = [...new Set([...group.memberIds, ...(event.memberIds ?? [event.id])])];
      if (Date.parse(event.occurredAt) >= Date.parse(group.occurredAt)) {
        Object.assign(group, { occurredAt: event.occurredAt, name: event.name, slug: event.slug, branchId: event.branchId });
      }
      Object.assign(group, { fields, memberIds, description: `Actualizamos ${fields.join(', ')} en la ficha.` });
    } else {
      const next = { ...event, firstOccurredAt: first, memberIds: event.memberIds ?? [event.id] };
      groups.set(event.spotId, next);
      result.push(next);
    }
  }
  return result.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}
