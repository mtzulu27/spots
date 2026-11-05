type Point = { x: number; y: number };
export const MAP_MARKER_SPACING = 56;
export const MAP_CLUSTER_BREAK_ZOOM = 18;
const MAP_CLUSTER_ZOOM_LEVELS = [14, 16, MAP_CLUSTER_BREAK_ZOOM] as const;

export function getNextMapClusterZoom(zoom: number) {
  return MAP_CLUSTER_ZOOM_LEVELS.find(level => level > zoom) ?? Math.max(zoom, MAP_CLUSTER_BREAK_ZOOM);
}

export function groupMapMarkers(points: Point[], { spacing = MAP_MARKER_SPACING, zoom = 0 }: { spacing?: number; zoom?: number } = {}) {
  if (zoom >= MAP_CLUSTER_BREAK_ZOOM) return points.map((point, index) => ({ ...point, indices: [index] }));
  const groups: { x: number; y: number; indices: number[] }[] = [];
  points.forEach((point, index) => {
    // Bound every group's diameter. Single-link chains can otherwise turn an
    // entire city into one cluster that cannot zoom in when opened.
    const group = groups.filter(group => group.indices.every(member =>
      Math.hypot(points[member].x - point.x, points[member].y - point.y) < spacing,
    )).sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0];
    if (!group) { groups.push({ ...point, indices: [index] }); return; }
    const count = group.indices.length;
    group.x = (group.x * count + point.x) / (count + 1);
    group.y = (group.y * count + point.y) / (count + 1);
    group.indices.push(index);
  });
  return groups;
}

export type MarkerPresence<T> = { item: T; expiresAt?: number };
export function reconcileMapMarkers<T extends { key: string }>(previous: MarkerPresence<T>[], next: T[], now: number, exitMs: number): MarkerPresence<T>[] {
  const active = new Set(next.map(item => item.key));
  const removed = exitMs <= 0 ? [] : previous.filter(entry => !active.has(entry.item.key))
    .map(entry => ({ ...entry, expiresAt: entry.expiresAt ?? now + exitMs }))
    .filter(entry => entry.expiresAt > now);
  return [...next.map(item => ({ item })), ...removed];
}
