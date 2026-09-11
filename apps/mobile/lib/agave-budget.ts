import type { MenuCatalogItem } from './mock-spots';

export const agaveScenarios = ['Parche tranqui', 'Parche completo', 'Con toda'] as const;

export function agaveBudget(items: MenuCatalogItem[], people: number, scenario: number, branchId = 1931) {
  const n = Math.max(1, Math.floor(people));
  const pairs = Math.ceil(n / 2);
  const selections: [string, number][] = branchId === 5098
    ? scenario === 0
      ? [['Pasta Pesto', n], ['Sodas italianas', n]]
      : scenario === 1
        ? [['Rollitos de Chontaduro', pairs], ['Panna e panceta', pairs], ['Alma Iberica', Math.floor(n / 2)], ['Brisa de Viche', n]]
        : [['Burrata Sicilia', pairs], ['Filetto Caramellato', pairs], ['Pizza Verona', Math.floor(n / 2)], ['Brisa de Viche', n * 2], ['Pannacotta', n]]
    : scenario === 0
    ? [['Tacos', n], ['Soda lychee', n]]
    : scenario === 1
      ? [['Guacamole Chips', pairs], ['Tacos', pairs], ['Quesadillas poblanas', Math.floor(n / 2)], ['Margarita', n]]
      : [['Super Nachos', pairs], ['Tamarindo Ribs', pairs], ['Quesadillas poblanas', Math.floor(n / 2)], ['Margarita', n * 2], ['Brownie con helado', n]];
  const lines = selections.filter(([, quantity]) => quantity > 0).map(([name, quantity]) => {
    const item = items.find(item => item.name === name);
    return { name, quantity, price: item?.price };
  });
  const complete = lines.every(line => Number.isFinite(line.price) && line.price! >= 0);
  const total = complete ? lines.reduce((sum, line) => sum + line.quantity * line.price!, 0) : null;
  return { lines, total, perPerson: total === null ? null : total / n };
}
