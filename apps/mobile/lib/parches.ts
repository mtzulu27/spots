import type { Spot } from './mock-spots';
export type EventPeriod = 'today' | 'tomorrow' | 'weekend' | 'date' | 'upcoming';
export const cityTimeZone = 'America/Bogota';
export function cityDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: cityTimeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (name: string) => parts.find(p => p.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00-05:00`);
  date.setUTCDate(date.getUTCDate() + offset);
  return cityDate(date);
}
export function eventTimestamp(value?: string | null) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00-05:00` : /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}-05:00`;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
export function matchesEventPeriod(spot: Spot, period: EventPeriod, selected: string, now = new Date()) {
  const start = eventTimestamp(spot.startsAt);
  if (start === null) return period === 'upcoming';
  const end = eventTimestamp(spot.endsAt);
  const firstDay = cityDate(new Date(start));
  const lastDay = end !== null && end >= start ? cityDate(new Date(end)) : firstDay;
  const today = cityDate(now);
  if (lastDay < today || (end !== null && end >= start && end < now.getTime())) return false;
  if (period === 'upcoming') return true;
  let from = period === 'tomorrow' ? shiftDay(today, 1) : period === 'date' ? selected : today;
  let to = from;
  if (period === 'weekend') {
    const weekday = new Date(`${today}T12:00:00-05:00`).getUTCDay();
    from = shiftDay(today, weekday === 0 ? -2 : weekday === 6 ? -1 : (5 - weekday + 7) % 7);
    to = shiftDay(from, 2);
  }
  return Boolean(from) && firstDay <= to && lastDay >= from;
}
export function eventDateLabel(spot: Spot) {
  const start = eventTimestamp(spot.startsAt);
  if (start === null) return 'Fecha por confirmar';
  const day = new Intl.DateTimeFormat('es-CO', { timeZone: cityTimeZone, day: 'numeric', month: 'short' }).format(start);
  if (spot.startsAt?.length === 10) return day;
  return `${day} · ${new Intl.DateTimeFormat('es-CO', { timeZone: cityTimeZone, hour: 'numeric', minute: '2-digit' }).format(start)}`;
}
export function eventPriceLabel(spot: Spot) {
  if (spot.ticketPrice === 0) return 'Gratis';
  if (spot.ticketPrice != null && spot.ticketPrice > 0) return `$${spot.ticketPrice.toLocaleString('es-CO')} / entrada`;
  if (spot.minBudget > 0) return `Desde $${spot.minBudget.toLocaleString('es-CO')}`;
  return 'Precio por confirmar';
}
export const normalizeEventQuery = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
