export function parseNotificationIds(raw) {
  try {
    const values = JSON.parse(raw ?? '[]');
    return new Set(Array.isArray(values) ? values.filter(id => typeof id === 'string') : []);
  } catch { return new Set(); }
}

export function collectNotificationIds(events) {
  return [...new Set(events.flatMap(event => [event.id, ...(event.memberIds ?? [])]))];
}

export function isNotificationDismissed(event, dismissed) {
  return dismissed.has(event.id) || (event.memberIds ?? []).some(id => dismissed.has(id));
}

export function updateNotificationIds(current, ids, add) {
  const next = new Set(current);
  ids.forEach(id => { if (add) next.add(id); else next.delete(id); });
  return next;
}
