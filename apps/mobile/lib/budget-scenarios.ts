import type { MenuCatalogItem } from './mock-spots';

export const scenarioNames = ['Parche tranqui', 'Parche completo', 'Con toda'] as const;
export type BudgetScenario = {
  concept: string;
  note: string;
  lines: { name: string; category: string; presentation?: string | null; quantity: number; groupSize: number }[];
};

export function scenarioBudget(items: MenuCatalogItem[], people: number, scenario?: BudgetScenario) {
  const n = Number.isFinite(people) ? Math.max(1, Math.floor(people)) : 1;
  const lines = (scenario?.lines ?? []).map(line => {
    const matches = items.filter(item => item.name === line.name && item.category === line.category &&
      (line.presentation === undefined || item.presentation === line.presentation) && item.calculationIncluded !== false);
    const item = matches.length === 1 ? matches[0] : undefined;
    return { name: line.name, quantity: Math.ceil(n / line.groupSize) * line.quantity, price: item?.price };
  });
  const complete = lines.length > 0 && lines.every(line => Number.isFinite(line.price) && line.price! >= 0 && Number.isFinite(line.quantity) && line.quantity > 0);
  const total = complete ? lines.reduce((sum, line) => sum + line.quantity * line.price!, 0) : null;
  return { lines, total, perPerson: total === null ? null : total / n };
}
