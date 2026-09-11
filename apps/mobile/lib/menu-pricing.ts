import type { MenuCatalogItem, MenuItemCategory } from './mock-spots';

export type PriceSummary = { minimum: number; maximum: number; average: number; sampleSize: number };

export function selectedMenuTotal(items: MenuCatalogItem[], quantities: Record<number, number>, people: number, tip = false) {
  const subtotal = items.reduce((sum, item, index) => sum + (quantities[index] ?? 0) * item.price, 0);
  const total = Math.round(subtotal * (tip ? 1.1 : 1));
  return { subtotal, total, perPerson: total / Math.max(1, people) };
}

export function summarizePrices(items: MenuCatalogItem[], category: MenuItemCategory): PriceSummary | null {
  const prices = items
    .filter(item => item.category === category && item.calculationIncluded !== false && Number.isFinite(item.price) && item.price >= 0)
    .map(item => item.price);
  if (!prices.length) return null;
  return {
    minimum: Math.min(...prices),
    maximum: Math.max(...prices),
    average: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    sampleSize: prices.length,
  };
}

export function estimateMenuTotal(
  categories: readonly MenuItemCategory[],
  counts: Partial<Record<MenuItemCategory, number>>,
  summaries: Partial<Record<MenuItemCategory, PriceSummary | null>>,
): number | null {
  if (categories.some(key => (counts[key] ?? 0) > 0 && !summaries[key])) return null;
  return categories.reduce((total, key) => total + (counts[key] ?? 0) * (summaries[key]?.average ?? 0), 0);
}
