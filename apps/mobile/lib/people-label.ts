export function formatPeopleLabel(minPeople?: number | null, maxPeople?: number | null, withUnit = false): string {
  const min = minPeople ?? 1;
  if (!Number.isInteger(min) || min < 1 || !Number.isInteger(maxPeople) || !maxPeople || maxPeople < min) {
    return 'Por definir';
  }
  const range = min === maxPeople ? `${min}` : `${min}-${maxPeople}`;
  return withUnit ? `${range} ${maxPeople === 1 ? 'persona' : 'personas'}` : range;
}
