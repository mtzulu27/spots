type Point = { x: number; y: number };

// Only fan virtually coincident points; nearby locations stay exactly in place.
export function separateMapMarkers(points: Point[]): Point[] {
  const groups: number[][] = [];
  points.forEach((point, index) => {
    const group = groups.find(indices => {
      const origin = points[indices[0]];
      return Math.hypot(point.x - origin.x, point.y - origin.y) <= 1;
    });
    if (group) group.push(index);
    else groups.push([index]);
  });
  const result = [...points];
  for (const indices of groups) {
    if (indices.length === 1) continue;
    const radius = indices.length === 2 ? 6 : 12;
    indices.forEach((index, order) => {
      const angle = order * Math.PI * 2 / indices.length;
      result[index] = {
        x: points[index].x + Math.cos(angle) * radius,
        y: points[index].y + Math.sin(angle) * radius,
      };
    });
  }
  return result;
}
