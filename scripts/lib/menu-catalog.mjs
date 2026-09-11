const CATEGORY_PATTERNS = {
  cover: /\b(cover|derecho de ingreso|consumo minimo|admission|admisión)\b/i,
  tickets: /\b(boleta|ticket|entrada general|entrada vip|entrada adulto|entrada niño|pasaporte)\b/i,
  desserts: /\b(postres?|dulces?|pasteler(?:ia|ía)?|tortas?|cheesecake|brownie|helados?|gelato|flan|tiramis|cookie|galletas?|mousse|panna cotta)\b/i,
  drinks: /\b(bebida|coctel|cóctel|mocktail|cerveza|vino|copa|botella|cafe|café|espresso|latte|capuccino|cappuccino|jugo|limonada|soda|gaseosa|agua|té|te|smoothie|malteada|licor|whisky|ron|vodka|gin|ginebra|sangria|sangría)\b/i,
  starters: /\b(entrada|entradas|para compartir|aperitivo|appetizer|tapa|picada|tabla|ceviche|empanada|bruschetta|carpaccio|nachos)\b/i,
  mains: /\b(fuerte|plato fuerte|hamburg|pizza|pasta|arroz|risotto|carne|pollo|cerdo|pescado|salm[oó]n|camar[oó]n|sandwich|sándwich|bowl|ensalada|sushi|roll|ramen|taco|desayuno|brunch|almuerzo|cena|parrilla|costilla|lomo)\b/i,
};

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function classifyMenuItem(item) {
  const section = clean(item.category ?? item.section ?? item.group ?? item.menuSection);
  const name = clean(item.name);
  const context = `${section} ${name}`;

  // "Entradas" gastronómicas solo son tickets cuando el producto nombra explícitamente
  // el tipo de acceso. Esto evita confundir aperitivos con admisiones.
  if (CATEGORY_PATTERNS.cover.test(context)) return 'cover';
  if (CATEGORY_PATTERNS.tickets.test(name) || /\b(boletas?|tickets?|admisiones?)\b/i.test(section)) return 'tickets';
  if (CATEGORY_PATTERNS.desserts.test(context)) return 'desserts';
  if (CATEGORY_PATTERNS.drinks.test(context)) return 'drinks';
  if (CATEGORY_PATTERNS.starters.test(context)) return 'starters';
  if (CATEGORY_PATTERNS.mains.test(context)) return 'mains';
  return 'extras';
}

export function normalizeExtractedItems(items, { sourceUrl = '', verifiedAt = new Date().toISOString() } = {}) {
  const seen = new Set();
  const normalized = [];

  for (const item of Array.isArray(items) ? items : []) {
    const name = clean(item?.name);
    const price = Number(item?.price);
    const category = classifyMenuItem(item ?? {});
    if (!name || !category || !Number.isFinite(price) || price < 1000 || price > 500000) continue;
    const key = `${category}:${name.toLocaleLowerCase('es-CO')}:${Math.round(price)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      name,
      price: Math.round(price),
      category,
      menuSection: clean(item.category ?? item.section ?? item.group) || null,
      sourceUrl: sourceUrl || null,
      verifiedAt,
    });
  }

  return normalized.sort((left, right) => left.category.localeCompare(right.category) || left.price - right.price);
}

export function summarizeMenuItems(items) {
  return Object.fromEntries(['mains', 'starters', 'desserts', 'drinks', 'cover', 'tickets', 'extras'].flatMap((category) => {
    const prices = items.filter((item) => item.category === category).map((item) => item.price).sort((a, b) => a - b);
    if (!prices.length) return [];
    const trim = prices.length >= 10 ? Math.floor(prices.length * 0.1) : 0;
    const sample = trim ? prices.slice(trim, -trim) : prices;
    return [[category, {
      minimum: prices[0],
      maximum: prices.at(-1),
      average: Math.round(sample.reduce((sum, price) => sum + price, 0) / sample.length),
      sampleSize: prices.length,
    }]];
  }));
}
