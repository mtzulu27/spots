const zone = 'America/Bogota';
const dayMs = 86400000;

function calendarDay(value) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(value);
  const get = type => Number(parts.find(part => part.type === type)?.value);
  return Date.UTC(get('year'), get('month') - 1, get('day'));
}

export function notificationGroup(occurredAt, now = new Date()) {
  const date = new Date(occurredAt);
  if (!Number.isFinite(date.getTime())) return null;
  const days = Math.max(0, Math.round((calendarDay(now) - calendarDay(date)) / dayMs));
  return days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : days < 7 ? 'Esta semana' : 'Anteriores';
}

export function notificationTime(occurredAt, now = new Date()) {
  const date = new Date(occurredAt);
  if (!Number.isFinite(date.getTime())) return '';
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)} d`;
  return new Intl.DateTimeFormat('es-CO', { timeZone: zone, day: 'numeric', month: 'short' }).format(date);
}
