import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';

const INPUT_URL = process.argv[2];
const MAX_TOTAL_MS = Number(process.argv[3] || 90_000);

if (!INPUT_URL || !/^https?:\/\//i.test(INPUT_URL)) {
  console.error(
    'Uso: node scripts/scrape-menu-budget.mjs <url> [max-ms]\n' +
      'Ejemplos:\n' +
      '  node scripts/scrape-menu-budget.mjs https://menupp.co/aldeaasiatica\n' +
      '  node scripts/scrape-menu-budget.mjs https://alma-restaurante.com/menu\n' +
      '  node scripts/scrape-menu-budget.mjs https://montolivorestaurante.com/carta-menu/\n',
  );
  process.exit(1);
}

const STARTED_AT = Date.now();
const DEADLINE = STARTED_AT + Math.max(15_000, Math.min(MAX_TOTAL_MS, 120_000));
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUTPUT_DIR = join(tmpdir(), `menu-budget-${TIMESTAMP}`);
mkdirSync(OUTPUT_DIR, { recursive: true });

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const ACCEPT_LANGUAGE = 'es-CO,es;q=0.9,en;q=0.8';

const PRICE_RE = /\$\s?[\d.]+(?:,\d+)?|\b\d{1,3}(?:\.\d{3})+(?:,\d+)?\b/g;
const EXCLUDED_NAME_RE =
  /^(adici|extra|salsa|dip|topping|toping|acompa|porci[oó]n|agranda|combo agrandado|prote[ií]na extra|queso extra|modificador|observaci[oó]n)/i;
const MAIN_CATEGORY_RE =
  /(hamburg|sandwich|s[aá]ndwich|pizza|pasta|bowl|ensalada|plato|almuerzo|desayuno|brunch|waffle|crepe|taco|sushi|roll|poke|bao|ramen|postre|croissant|torta|brownie|parfait|helado|frozen yogurt|yogurt|frapp|caf[eé]|bebida|batido|smoothie|jugo|c[oó]ctel|vino|cerveza)/i;
const BEVERAGE_RE =
  /\b(caf[eé]|americano|latte|capuccino|cappuccino|espresso|bebida|jugo|smoothie|soda|gaseosa|limonada|té|te|tisana|frapp|milkshake|cerveza|vino|cocktail|coctel|mojito|spritz|sangr[ií]a|agua|manantial|coca(?:-cola)?|cola|sprite|quatro|bretaña)\b/i;
const TITLE_CONNECTOR_RE =
  /^(de|del|con|sin|y|e|a|al|la|las|el|los|para|en|por|x)$/i;
const ITEM_STATUS_RE = /^(agotado|nuevo|recomendado)$/i;
const GENERIC_ITEM_RE =
  /^(\+|x\d+|copa|botella|jarra|shot|completa|porci[oó]n|natural|zero|normal|verde|amarillo|maduro|huevo|ma[ií]z|brocoli|zanahoria|puerro|pepinillos|guacamole|arequipe|hersheys|ajonjol[ií]|almendras|chantilly|zumo|domo|michelada|mix lechugas|mix vegetales|repollo encurtido)$/i;
const MEALISH_RE =
  /(hamburg|sandwich|s[aá]ndwich|pizza|pasta|bowl|ensalada|plato|almuerzo|desayuno|brunch|taco|sushi|roll|poke|bao|ramen|pollo|carne|cerdo|salm[oó]n|ceviche|camar[oó]n|huevos|toast|tostada|croque|waffles? de pandebono|bagel|wrap|omelette|omelet|croissant|parfait|yogurt griego|frozen yogurt)/i;
const SWEET_OR_SNACK_RE =
  /(brownie|cookie|galleta|torta|cheesecake|pie|postre|helado|cupcake|rollo de canela|pandebon|canasta de pan|muffin|tarta|cremoso|tentaci[oó]n|copa hamburgo|croissant|pan de chocolate|mini pandebonitos)/i;
const MENU_HINT_RE =
  /(men[uú]|carta|menu|food|drinks?|bebidas?|comida|restaurant|restaurante|ordenar|pedido|order)/i;
const SKIP_LINK_RE =
  /(whatsapp|wa\.me|instagram|facebook|tiktok|tripadvisor|rappi|ubereats|ifood|maps\.google|goo\.gl\/maps|waze)/i;
const WEAK_MENU_NAME_RE =
  /^(delicioso|nuevo|recomendado|especial|chef|promoci[oó]n|combo|entrada|plato|opci[oó]n|men[uú]|carta)$/i;

function timeRemaining() {
  return DEADLINE - Date.now();
}

function ensureTime(label) {
  if (timeRemaining() <= 0) {
    throw new Error(`Tiempo agotado antes de completar: ${label}`);
  }
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugFromUrl(url) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments.at(-1)?.slice(0, 40) || parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'menu';
  }
}

function detectProvider(url) {
  const normalized = url.toLowerCase();
  if (/instagram\.com\/(?:p|reel)\//i.test(normalized)) return 'instagram-post';
  if (normalized.includes('canva.com/design/')) return 'canva';
  if (
    normalized.includes('drive.google.com') ||
    normalized.includes('docs.google.com') ||
    /\.pdf(?:$|[?#])/i.test(normalized)
  ) {
    return 'pdf';
  }
  if (normalized.includes('menupp.co') || normalized.includes('app.menupp.co')) return 'menupp';
  return 'website';
}

function parsePrice(value) {
  const digits = String(value || '').replace(/[^\d,.-]/g, '');
  if (!digits) return null;
  if (digits.includes(',') && digits.includes('.')) {
    return Number(digits.replace(/\./g, '').replace(',', '.'));
  }
  if (digits.includes('.') && !digits.includes(',')) {
    const parts = digits.split('.');
    if (parts.length === 2 && parts[1].length === 2) {
      const maybeThousands = Number(`${parts[0]}${parts[1]}0`);
      if (Number.isFinite(maybeThousands) && maybeThousands >= 5000) {
        return maybeThousands;
      }
    }
  }
  if (digits.includes(',') && !digits.includes('.')) {
    return Number(digits.replace(',', '.'));
  }
  return Number(digits.replace(/\./g, ''));
}

function roundToNearestThousand(value) {
  return Math.ceil(value / 1000) * 1000;
}

function pickCategory(lines) {
  const candidate = lines[0] ?? '';
  if (candidate.length <= 40 && !PRICE_RE.test(candidate)) {
    return candidate;
  }
  return null;
}

function isLikelyTitleToken(token) {
  if (!token) return false;
  if (TITLE_CONNECTOR_RE.test(token)) return true;
  if (/^[xX]$/.test(token)) return true;
  if (/^\d+(?:ml|gr|g|oz)?$/i.test(token)) return true;
  if (/^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ'&/-]*$/.test(token)) return true;
  return false;
}

function extractNameFromSegment(segment) {
  const cleaned = normalizeText(
    String(segment || '')
      .replace(PRICE_RE, ' ')
      .replace(/\b(COP|cop|pesos?)\b/g, ' ')
      .replace(/\s+/g, ' '),
  );
  if (!cleaned) return null;

  const tokens = cleaned.split(' ').filter(Boolean);
  const picked = [];
  const firstToken = tokens[0] ?? '';

  for (const token of tokens) {
    if (ITEM_STATUS_RE.test(token)) break;
    if (picked.length >= 2 && token === firstToken) break;
    if (!isLikelyTitleToken(token)) break;
    picked.push(token);
    if (picked.length >= 8) break;
  }

  return normalizeText(picked.join(' ')) || cleaned.slice(0, 80);
}

function cleanupExtractedName(name) {
  if (!name) return null;
  let cleaned = normalizeText(
    String(name)
      .replace(/\b(Recomendado|Nuevo|Agotado)\b/gi, ' ')
      .replace(/\s+/g, ' '),
  );
  const prefixMatch = cleaned.match(/^([A-ZÁÉÍÓÚÑ&\s]{6,})\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ].*)$/);
  if (prefixMatch) cleaned = normalizeText(prefixMatch[2]);
  return cleaned;
}

function splitRecordIntoEntries(text) {
  const matches = [...String(text || '').matchAll(PRICE_RE)].filter((match) => Number.isFinite(parsePrice(match[0])));
  if (!matches.length) return [];

  const entries = [];
  let previousEnd = 0;
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const fragment = normalizeText(String(text).slice(previousEnd, match.index + match[0].length));
    entries.push({
      fragment,
      rawPrice: match[0],
      price: parsePrice(match[0]),
    });
    previousEnd = match.index + match[0].length;
  }
  return entries;
}

function collectPriceEntriesFromUnknown(value, bucket, context = {}) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) collectPriceEntriesFromUnknown(item, bucket, context);
    return;
  }
  if (typeof value !== 'object') return;

  const maybeName =
    value.name ??
    value.product_name ??
    value.productName ??
    value.title ??
    value.label ??
    value.item_name ??
    value.description ??
    null;

  const maybeCategory =
    value.category ??
    value.product_category ??
    value.group ??
    value.section ??
    context.category ??
    null;

  const maybePrice =
    value.price ??
    value.sale_price ??
    value.base_price ??
    value.amount ??
    value.value ??
    value.unit_price ??
    null;

  const parsedPrice =
    typeof maybePrice === 'number'
      ? maybePrice
      : typeof maybePrice === 'string'
        ? parsePrice(maybePrice)
        : null;

  if (maybeName && Number.isFinite(parsedPrice) && parsedPrice >= 1000 && parsedPrice <= 500000) {
    bucket.push({
      category: maybeCategory ? normalizeText(String(maybeCategory)) : null,
      name: normalizeText(String(maybeName)),
      description: '',
      price: parsedPrice,
      rawPrice: String(maybePrice),
      sourceText: JSON.stringify(value).slice(0, 600),
    });
  }

  for (const [key, nested] of Object.entries(value)) {
    const nextContext =
      key === 'category' || key === 'group' || key === 'section'
        ? { ...context, category: typeof nested === 'string' ? nested : context.category }
        : context;
    collectPriceEntriesFromUnknown(nested, bucket, nextContext);
  }
}

function parseItemRecords(rawRecords) {
  const items = [];
  const seen = new Set();

  for (const record of rawRecords) {
    if (record?.parsedName && Number.isFinite(record?.parsedPrice)) {
      const directName = cleanupExtractedName(record.parsedName);
      if (
        directName &&
        !EXCLUDED_NAME_RE.test(directName) &&
        !GENERIC_ITEM_RE.test(directName) &&
        !isWeakMenuName(directName)
      ) {
        const directKey = `${directName.toLowerCase()}::${record.parsedPrice}`;
        if (!seen.has(directKey)) {
          seen.add(directKey);
          items.push({
            category: null,
            name: directName,
            description: normalizeText(record.parsedDescription || '').slice(0, 220),
            price: record.parsedPrice,
            rawPrice: record.rawPrice ?? String(record.parsedPrice),
            sourceText: normalizeText(record.text || ''),
          });
          continue;
        }
      }
    }

    const text = normalizeText(record.text);
    if (!text) continue;

    const rawLines = text
      .split('\n')
      .map((line) => normalizeText(line))
      .filter(Boolean);
    if (!rawLines.length) continue;

    const prices = [...text.matchAll(PRICE_RE)]
      .map((match) => match[0])
      .map((raw) => ({ raw, value: parsePrice(raw) }))
      .filter((price) => Number.isFinite(price.value) && price.value > 0);
    if (!prices.length) continue;

    const category = pickCategory(rawLines);
    const entriesToProcess =
      splitRecordIntoEntries(text).length > 1
        ? splitRecordIntoEntries(text)
        : prices.map((price) => ({ fragment: text, rawPrice: price.raw, price: price.value }));

    for (const entry of entriesToProcess) {
      if (entry.price < 1000 || entry.price > 500000) continue;
      const name = cleanupExtractedName(extractNameFromSegment(entry.fragment));
      if (!name || EXCLUDED_NAME_RE.test(name) || GENERIC_ITEM_RE.test(name)) continue;

      const description = normalizeText(
        entry.fragment
          .replace(name, '')
          .replace(entry.rawPrice, '')
          .replace(/\b(Agotado|Nuevo|Recomendado)\b/gi, '')
          .trim(),
      ).slice(0, 220);

      const key = `${name.toLowerCase()}::${entry.price}`;
      if (seen.has(key)) continue;
      seen.add(key);

      items.push({
        category,
        name,
        description,
        price: entry.price,
        rawPrice: entry.rawPrice,
        sourceText: entry.fragment,
      });
    }
  }

  return items.sort((a, b) => a.price - b.price);
}

function dedupeItems(items) {
  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    if (!item?.name || !Number.isFinite(item?.price)) continue;
    const key = `${item.name.toLowerCase().replace(/\s+/g, ' ').trim()}::${item.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped.sort((a, b) => a.price - b.price);
}

function scoreItemNameQuality(name) {
  const normalized = normalizeText(name);
  if (!normalized) return -10;

  const words = normalized.split(' ').filter(Boolean);
  const weirdChars = (normalized.match(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s&'/.+-]/g) || []).length;
  const digits = (normalized.match(/\d/g) || []).length;
  const uppercaseWords = words.filter((word) => /^[A-ZÁÉÍÓÚÑ]{3,}$/.test(word)).length;

  let score = 0;
  if (normalized.length >= 3 && normalized.length <= 32) score += 3;
  else if (normalized.length <= 44) score += 1;
  else score -= 3;

  if (words.length >= 1 && words.length <= 4) score += 3;
  else if (words.length <= 6) score += 1;
  else score -= 3;

  if (weirdChars === 0) score += 2;
  else if (weirdChars >= 3) score -= 3;

  if (digits === 0) score += 1;
  else if (digits >= 3) score -= 2;

  if (uppercaseWords >= 1 && uppercaseWords === words.length) score += 1;
  if (/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(normalized)) score += 1;

  return score;
}

function cleanCanvaCandidateLine(line) {
  return normalizeText(
    line
      .replace(/[|]/g, ' ')
      .replace(/\b(?:nuevo|recomendado|especial)\b/gi, ' ')
      .replace(/\s+/g, ' '),
  );
}

function isWeakMenuName(name) {
  const normalized = normalizeText(name);
  if (!normalized) return true;
  if (WEAK_MENU_NAME_RE.test(normalized)) return true;
  if (normalized.length < 3) return true;
  if ((normalized.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/g) || []).length < 3) return true;
  return false;
}

function extractCanvaNameFromContext(lines) {
  const cleanedLines = lines
    .map((line) => cleanCanvaCandidateLine(line))
    .filter(Boolean)
    .filter((line) => !isCanvaMetadataText(line))
    .filter((line) => !PRICE_RE.test(line));

  const candidates = [];
  for (const line of cleanedLines) {
    if (/^[A-ZÁÉÍÓÚÑ0-9\s'&/-]{4,}$/.test(line)) {
      candidates.push(normalizeText(line));
    }

    const lineWithoutPrice = normalizeText(line.replace(PRICE_RE, ' '));
    if (lineWithoutPrice && lineWithoutPrice !== line) {
      const fromPriceLine = cleanupExtractedName(extractNameFromSegment(lineWithoutPrice));
      if (fromPriceLine) candidates.push(fromPriceLine);
    }

    const direct = cleanupExtractedName(extractNameFromSegment(line));
    if (direct) candidates.push(direct);

    const words = line.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      candidates.push(normalizeText(words.slice(0, 6).join(' ')));
    }
  }

  const ranked = candidates
    .map((candidate) => ({ candidate, score: scoreItemNameQuality(candidate) }))
    .filter((entry) => entry.score >= 1 && !isWeakMenuName(entry.candidate))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.candidate ?? null;
}

function extractCanvaDescriptionFromContext(lines, name) {
  const cleaned = lines
    .map((line) => cleanCanvaCandidateLine(line))
    .filter(Boolean)
    .filter((line) => !isCanvaMetadataText(line))
    .filter((line) => !PRICE_RE.test(line))
    .filter((line) => normalizeText(line).toLowerCase() !== normalizeText(name).toLowerCase());

  const description = normalizeText(cleaned.join(' ')).slice(0, 220);
  return description || '';
}

function inferBudget(items) {
  if (!items.length) {
    return {
      minBudget: null,
      reasoning: 'No se pudieron extraer precios confiables del menú renderizado.',
      cheapestVisiblePrice: null,
      pickedMain: null,
      pickedDrink: null,
    };
  }

  const validItems = items.filter(
    (item) =>
      item.price >= 1000 &&
      !GENERIC_ITEM_RE.test(item.name) &&
      !EXCLUDED_NAME_RE.test(item.name) &&
      scoreItemNameQuality(item.name) >= 0,
  );
  const cheapestVisiblePrice = validItems[0]?.price ?? null;
  const beverageCandidates = validItems.filter(
    (item) =>
      BEVERAGE_RE.test(item.name) ||
      BEVERAGE_RE.test(item.category ?? '') ||
      BEVERAGE_RE.test(item.description ?? '') ||
      BEVERAGE_RE.test(item.sourceText ?? ''),
  );
  const substantialMealCandidates = validItems.filter((item) => {
    if (BEVERAGE_RE.test(item.name) || BEVERAGE_RE.test(item.category ?? '')) return false;
    if (SWEET_OR_SNACK_RE.test(item.name) && item.price < 18000) return false;
    if (item.price < 15000) return false;
    return MEALISH_RE.test(item.name) || MAIN_CATEGORY_RE.test(item.category ?? '') || item.price >= 22000;
  });
  const fallbackMainCandidates = validItems.filter((item) => {
    if (BEVERAGE_RE.test(item.name) || BEVERAGE_RE.test(item.category ?? '')) return false;
    if (item.price < 10000) return false;
    return true;
  });

  const pickedMain =
    substantialMealCandidates[0] ??
    fallbackMainCandidates[0] ??
    validItems.find((item) => item.price >= 12000) ??
    items.find((item) => item.price >= 12000 && scoreItemNameQuality(item.name) >= -1) ??
    validItems[0] ??
    items[0];
  const pickedDrink =
    beverageCandidates.find((item) => scoreItemNameQuality(item.name) >= 2) ??
    validItems.find(
      (item) =>
        item.price >= 5000 &&
        item.price <= 18000 &&
        item !== pickedMain &&
        scoreItemNameQuality(item.name) >= 2,
    ) ??
    beverageCandidates[0] ??
    validItems.find((item) => item.price >= 5000 && item.price <= 18000 && item !== pickedMain) ??
    null;

  let computed = pickedMain?.price ?? 0;
  if (pickedDrink) computed += pickedDrink.price;
  if (!pickedDrink && pickedMain) computed = Math.max(computed, pickedMain.price * 1.18);

  return {
    minBudget: computed ? roundToNearestThousand(computed) : null,
    reasoning: pickedDrink
      ? 'Se usó el ítem principal más accesible detectado más una bebida accesible.'
      : 'No apareció una bebida clara; se aplicó un margen conservador al ítem principal más accesible.',
    cheapestVisiblePrice,
    pickedMain: pickedMain ? { name: pickedMain.name, category: pickedMain.category, price: pickedMain.price } : null,
    pickedDrink: pickedDrink ? { name: pickedDrink.name, category: pickedDrink.category, price: pickedDrink.price } : null,
  };
}

async function dismissOverlays(page) {
  const labels = [
    'Aceptar',
    'Aceptar todo',
    'Entendido',
    'Ok',
    'Cerrar',
    'Continuar',
    'Allow all',
    'Accept',
  ];
  for (const label of labels) {
    const button = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first();
    try {
      if (await button.isVisible({ timeout: 200 })) await button.click({ timeout: 600 });
    } catch {
      // seguimos
    }
  }
  try {
    await page.keyboard.press('Escape');
  } catch {
    // seguimos
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const root = document.scrollingElement || document.documentElement;
    for (let i = 0; i < 6; i += 1) {
      root.scrollTo({ top: root.scrollHeight, behavior: 'instant' });
      await sleep(250);
    }
    root.scrollTo({ top: 0, behavior: 'instant' });
    await sleep(50);
  });
}

async function collectRawRecords(page) {
  return page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('article, li, section, div, main'))
      .map((node) => {
        const el = node;
        const rect = el.getBoundingClientRect();
        const text = (el.innerText || '').trim();
        const visible =
          rect.width > 40 &&
          rect.height > 20 &&
          window.getComputedStyle(el).visibility !== 'hidden' &&
          window.getComputedStyle(el).display !== 'none';
        return { text, visible };
      })
      .filter((entry) => entry.visible && entry.text && entry.text.length <= 700 && /\$|\d{1,3}(?:\.\d{3})/.test(entry.text));

    const unique = new Map();
    for (const candidate of candidates) {
      const key = candidate.text.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!unique.has(key)) unique.set(key, candidate);
    }
    return Array.from(unique.values()).slice(0, 600);
  });
}

function isCanvaMetadataText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (/do-not-change|font-family|font-size|text-transform|letter-spacing|line-height|#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i.test(normalized)) {
    return true;
  }
  if (/\b(?:A\?|[A-Z])\s*:\s*[^,]+,\s*(?:[A-Z]|_)\s*:\s*[^,]+/i.test(normalized)) {
    return true;
  }
  if (/(?:^|[\s,])(?:A|B|C|D|N|_)\s*:\s*[^\s]/.test(normalized) && normalized.includes('do-not-change')) {
    return true;
  }
  if ((normalized.match(/\b[A-Z_?]\s*:/g) || []).length >= 4) {
    return true;
  }
  if ((normalized.match(/\d+\.\d{4,}/g) || []).length >= 3) {
    return true;
  }
  return false;
}

function isInstagramUiText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (
    /instagram|compartir|share|likes?|me gusta|comentarios?|comment|seguir|follow|ver traducci[oó]n|translation|reels?|explore|inicio|home|mensaje|message|enviar|send|guardar|save|audio original/i.test(
      normalized,
    )
  ) {
    return true;
  }
  if (/^\d+\s*\/\s*\d+$/.test(normalized)) return true;
  if (/^[<>]+$/.test(normalized)) return true;
  return false;
}

function filterInstagramPostRecords(records) {
  return records.filter((record) => {
    const text = normalizeText(record?.text);
    if (!text) return false;
    if (isInstagramUiText(text)) return false;
    if (!PRICE_RE.test(text)) return false;
    if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(text)) return false;
    return true;
  });
}

function filterCanvaRecords(records) {
  return records.filter((record) => {
    const text = normalizeText(record?.text);
    if (!text) return false;
    if (isCanvaMetadataText(text)) return false;
    if (!PRICE_RE.test(text)) return false;
    if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(text)) return false;
    return true;
  });
}

async function collectVisibleJsonSnippets(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('script[type="application/ld+json"], script[type="application/json"]'))
      .map((script) => (script.textContent || '').trim())
      .filter((text) => text && text.length <= 300000)
      .slice(0, 40);
  });
}

function fetchHtmlWithBrowserUA(url) {
  try {
    return execFileSync('curl', ['-L', '-A', BROWSER_USER_AGENT, url], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

function extractPriceLikeRecordsFromHtml(html) {
  if (!html) return [];
  const records = [];
  const seen = new Set();
  const normalizedHtml = html
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\r/g, ' ');
  const matches = [...normalizedHtml.matchAll(/\$\s?\d[\d.,]*/g)].slice(0, 200);

  for (const match of matches) {
    const start = Math.max(0, match.index - 220);
    const end = Math.min(normalizedHtml.length, match.index + match[0].length + 220);
    const fragment = normalizeText(
      normalizedHtml
        .slice(start, end)
        .replace(/<[^>]+>/g, ' ')
        .replace(/[{}[\]"\\]/g, ' ')
        .replace(/\s+/g, ' '),
    );
    if (!fragment || fragment.length < 8) continue;
    if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(fragment)) continue;
    const key = fragment.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    records.push({ text: fragment, visible: true, source: 'html-fallback' });
  }

  return records;
}

function chunkOcrTextIntoRecords(text, source) {
  if (!text) return [];
  const cleaned = text
    .replace(/\u00a0/g, ' ')
    .replace(/[|]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
  if (!cleaned) return [];

  const lines = cleaned
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean);

  const records = [];
  let buffer = [];
  const flush = () => {
    if (!buffer.length) return;
    const textValue = normalizeText(buffer.join(' '));
    if (PRICE_RE.test(textValue)) records.push({ text: textValue, visible: true, source });
    buffer = [];
  };

  for (const line of lines) {
    buffer.push(line);
    if (PRICE_RE.test(line) || buffer.length >= 4) flush();
  }
  flush();
  return records;
}

function chunkCanvaOcrTextIntoRecords(text, source) {
  if (!text) return [];

  const lines = text
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean)
    .filter((line) => !isCanvaMetadataText(line));

  const records = [];
  const seen = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!PRICE_RE.test(line)) continue;

    const prevTwo = lines[index - 2] ?? '';
    const prev = lines[index - 1] ?? '';
    const currentNoPrice = cleanCanvaCandidateLine(line.replace(PRICE_RE, ' '));
    const next = lines[index + 1] ?? '';
    const nextTwo = lines[index + 2] ?? '';
    const context = [prevTwo, prev, next, nextTwo].filter(Boolean);

    const rawPrice = [...line.matchAll(PRICE_RE)][0]?.[0] ?? null;
    const parsedPrice = rawPrice ? parsePrice(rawPrice) : null;
    if (!rawPrice || !Number.isFinite(parsedPrice)) continue;

    const name =
      extractCanvaNameFromContext([prev, prevTwo, currentNoPrice]) ??
      extractCanvaNameFromContext([prev, currentNoPrice, next]) ??
      extractCanvaNameFromContext([line]);
    if (!name || isWeakMenuName(name) || scoreItemNameQuality(name) < 1) continue;

    const description = extractCanvaDescriptionFromContext(context, name);
    const sourceText = normalizeText([name, description, rawPrice].filter(Boolean).join(' '));
    if (!sourceText || isCanvaMetadataText(sourceText)) continue;

    const key = `${name.toLowerCase()}::${parsedPrice}`;
    if (seen.has(key)) continue;
    seen.add(key);

    records.push({
      text: sourceText,
      visible: true,
      source,
      parsedName: name,
      parsedDescription: description,
      parsedPrice,
      rawPrice,
    });
  }

  return filterCanvaRecords(records);
}

function cleanInstagramCandidateLine(line) {
  return normalizeText(
    line
      .replace(/[|]/g, ' ')
      .replace(/[©@*_~]/g, ' ')
      .replace(/\s+/g, ' '),
  );
}

function extractInstagramNameFromContext(lines) {
  const cleanedLines = lines
    .map((line) => cleanInstagramCandidateLine(line))
    .filter(Boolean)
    .filter((line) => !isInstagramUiText(line))
    .filter((line) => !PRICE_RE.test(line));

  const candidates = [];
  for (const line of cleanedLines) {
    if (/^[A-ZÁÉÍÓÚÑ0-9\s'&/-]{4,}$/.test(line)) {
      candidates.push(normalizeText(line));
    }

    const direct = cleanupExtractedName(extractNameFromSegment(line));
    if (direct) candidates.push(direct);

    const words = line.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      candidates.push(normalizeText(words.slice(0, 7).join(' ')));
    }
  }

  const ranked = candidates
    .map((candidate) => ({ candidate, score: scoreItemNameQuality(candidate) }))
    .filter((entry) => entry.score >= 1 && !isWeakMenuName(entry.candidate))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.candidate ?? null;
}

function extractInstagramDescriptionFromContext(lines, name) {
  return normalizeText(
    lines
      .map((line) => cleanInstagramCandidateLine(line))
      .filter(Boolean)
      .filter((line) => !isInstagramUiText(line))
      .filter((line) => !PRICE_RE.test(line))
      .filter((line) => normalizeText(line).toLowerCase() !== normalizeText(name).toLowerCase())
      .join(' '),
  ).slice(0, 220);
}

function chunkInstagramOcrTextIntoRecords(text, source) {
  if (!text) return [];

  const lines = text
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean)
    .filter((line) => !isInstagramUiText(line));

  const records = [];
  const seen = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!PRICE_RE.test(line)) continue;

    const rawPrice = [...line.matchAll(PRICE_RE)][0]?.[0] ?? null;
    const parsedPrice = rawPrice ? parsePrice(rawPrice) : null;
    if (!rawPrice || !Number.isFinite(parsedPrice) || parsedPrice < 1000) continue;

    const prevThree = lines[index - 3] ?? '';
    const prevTwo = lines[index - 2] ?? '';
    const prev = lines[index - 1] ?? '';
    const currentNoPrice = cleanInstagramCandidateLine(line.replace(PRICE_RE, ' '));
    const next = lines[index + 1] ?? '';
    const nextTwo = lines[index + 2] ?? '';
    const context = [prevThree, prevTwo, prev, next, nextTwo].filter(Boolean);

    const name =
      extractInstagramNameFromContext([prev, prevTwo, prevThree, currentNoPrice]) ??
      extractInstagramNameFromContext([prev, currentNoPrice, next]) ??
      extractInstagramNameFromContext([currentNoPrice]);
    if (!name || isWeakMenuName(name) || scoreItemNameQuality(name) < 1) continue;

    const description = extractInstagramDescriptionFromContext(context, name);
    const sourceText = normalizeText([name, description, rawPrice].filter(Boolean).join(' '));
    const key = `${name.toLowerCase()}::${parsedPrice}`;
    if (seen.has(key)) continue;
    seen.add(key);

    records.push({
      text: sourceText,
      visible: true,
      source,
      parsedName: name,
      parsedDescription: description,
      parsedPrice,
      rawPrice,
    });
  }

  return filterInstagramPostRecords(records);
}

function ocrScreenshot(screenshotPath, provider = 'website') {
  try {
    const output = execFileSync('tesseract', [screenshotPath, 'stdout', '--psm', '6', '-l', 'eng'], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
    const records =
      provider === 'canva'
        ? chunkCanvaOcrTextIntoRecords(output, 'ocr-screenshot-canva')
        : provider === 'instagram-post'
          ? chunkInstagramOcrTextIntoRecords(output, 'ocr-screenshot-instagram-post')
        : chunkOcrTextIntoRecords(output, 'ocr-screenshot');
    return { text: output, records };
  } catch {
    return { text: '', records: [] };
  }
}

function getImageSizeWithSips(imagePath) {
  try {
    const output = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', imagePath], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    const width = Number(output.match(/pixelWidth:\s+(\d+)/)?.[1] ?? 0);
    const height = Number(output.match(/pixelHeight:\s+(\d+)/)?.[1] ?? 0);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }
    return { width, height };
  } catch {
    return null;
  }
}

function ocrInstagramPostRegions(screenshotPath) {
  const size = getImageSizeWithSips(screenshotPath);
  if (!size) {
    return { text: '', records: [] };
  }

  const regions = [
    {
      label: 'center',
      x: Math.round(size.width * 0.1),
      y: Math.round(size.height * 0.2),
      width: Math.round(size.width * 0.8),
      height: Math.round(size.height * 0.6),
    },
    {
      label: 'middle',
      x: Math.round(size.width * 0.07),
      y: Math.round(size.height * 0.28),
      width: Math.round(size.width * 0.86),
      height: Math.round(size.height * 0.42),
    },
    {
      label: 'bottom',
      x: Math.round(size.width * 0.07),
      y: Math.round(size.height * 0.46),
      width: Math.round(size.width * 0.86),
      height: Math.round(size.height * 0.34),
    },
  ];

  const records = [];
  let combinedText = '';

  for (const region of regions) {
    const regionPath = `${screenshotPath}.${region.label}.png`;
    try {
      execFileSync(
        'sips',
        [
          '--cropOffset',
          String(region.x),
          String(region.y),
          '-c',
          String(region.height),
          String(region.width),
          screenshotPath,
          '--out',
          regionPath,
        ],
        {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
        },
      );
    } catch {
      continue;
    }

    try {
      execFileSync('sips', ['-Z', '2200', regionPath], {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch {
      // seguimos igual con el recorte base
    }

    const ocr = ocrScreenshot(regionPath, 'instagram-post');
    if (ocr.text) {
      combinedText += `${combinedText ? '\n\n' : ''}--- ${region.label} ---\n${ocr.text}`;
    }
    if (ocr.records.length) {
      records.push(...ocr.records);
    }
  }

  return { text: combinedText, records: filterInstagramPostRecords(records) };
}

async function snapshotState(page, label, screenshots, rawRecords, options = {}) {
  const provider = options.provider ?? 'website';
  ensureTime(`snapshot ${label}`);
  await autoScroll(page);
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  const screenshotPath = join(OUTPUT_DIR, `${String(screenshots.length + 1).padStart(2, '0')}-${safeLabel || 'menu'}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  screenshots.push(screenshotPath);
  const pageRecords = await collectRawRecords(page);
  rawRecords.push(
    ...(provider === 'canva'
      ? filterCanvaRecords(pageRecords)
      : provider === 'instagram-post'
        ? filterInstagramPostRecords(pageRecords)
        : pageRecords),
  );
  const ocr = ocrScreenshot(screenshotPath, provider);
  if (ocr.text) writeFileSync(`${screenshotPath}.ocr.txt`, ocr.text);
  rawRecords.push(...ocr.records);
}

async function snapshotInstagramSlide(page, label, screenshots, rawRecords) {
  ensureTime(`snapshot ${label}`);
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  const screenshotPath = join(
    OUTPUT_DIR,
    `${String(screenshots.length + 1).padStart(2, '0')}-${safeLabel || 'instagram'}.png`,
  );

  let captured = false;
  const candidates = [
    page.locator('article img').first(),
    page.locator('article').first(),
    page.locator('main').first(),
  ];

  for (const locator of candidates) {
    try {
      if (await locator.isVisible({ timeout: 500 })) {
        await locator.screenshot({ path: screenshotPath });
        captured = true;
        break;
      }
    } catch {
      // seguimos
    }
  }

  if (!captured) {
    await page.screenshot({ path: screenshotPath, fullPage: false });
  }

  screenshots.push(screenshotPath);
  const pageRecords = await collectRawRecords(page);
  rawRecords.push(...filterInstagramPostRecords(pageRecords));
  const ocr = ocrScreenshot(screenshotPath, 'instagram-post');
  if (ocr.text) writeFileSync(`${screenshotPath}.ocr.txt`, ocr.text);
  rawRecords.push(...ocr.records);

  const regionalOcr = ocrInstagramPostRegions(screenshotPath);
  if (regionalOcr.text) writeFileSync(`${screenshotPath}.regions.ocr.txt`, regionalOcr.text);
  rawRecords.push(...regionalOcr.records);
}

async function pageLooksLikeMenu(page) {
  return page.evaluate(({ pricePatternSource }) => {
    const priceRe = new RegExp(pricePatternSource, 'g');
    const text = (document.body?.innerText || '').slice(0, 25000);
    const title = document.title || '';
    const haystack = `${title}\n${text}`;
    const priceHits = [...haystack.matchAll(priceRe)].length;
    const menuHint = /(menú|menu|carta|food|drinks?|bebidas?|entradas?|platos?|postres?)/i.test(haystack);
    return {
      menuHint,
      priceHits,
      score: (menuHint ? 2 : 0) + Math.min(priceHits, 5),
    };
  }, { pricePatternSource: String.raw`\$\s?[\d.]+|\b\d{1,3}(?:\.\d{3})+\b` });
}

async function discoverMenuTargets(page) {
  return page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('a, button, [role="button"]'))
      .map((node) => {
        const el = node;
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        const href =
          el instanceof HTMLAnchorElement
            ? el.href || ''
            : el.getAttribute('href') || el.getAttribute('data-href') || '';
        const aria = el.getAttribute('aria-label') || '';
        const rect = el.getBoundingClientRect();
        const visible =
          rect.width > 20 &&
          rect.height > 16 &&
          window.getComputedStyle(el).display !== 'none' &&
          window.getComputedStyle(el).visibility !== 'hidden';
        return {
          text,
          href,
          aria,
          visible,
          tag: el.tagName.toLowerCase(),
        };
      })
      .filter((entry) => entry.visible && (entry.text || entry.aria || entry.href));

    const unique = new Map();
    for (const entry of candidates) {
      const key = `${entry.text}|${entry.href}|${entry.aria}`.toLowerCase();
      if (!unique.has(key)) unique.set(key, entry);
    }
    return Array.from(unique.values()).slice(0, 400);
  });
}

function scoreMenuTarget(candidate, originUrl) {
  const text = normalizeText(`${candidate.text} ${candidate.aria}`);
  const href = candidate.href || '';
  const hrefLower = href.toLowerCase();
  let score = 0;

  if (MENU_HINT_RE.test(text)) score += 60;
  if (MENU_HINT_RE.test(hrefLower)) score += 70;
  if (/pdf/.test(hrefLower)) score += 55;
  if (/menupp|canva|docs\.google|drive\.google/.test(hrefLower)) score += 45;
  if (/reserv|contact|about|nosotros|ubicaci|sede/.test(text)) score -= 30;
  if (SKIP_LINK_RE.test(hrefLower)) score -= 80;
  if (href && originUrl) {
    try {
      const target = new URL(href, originUrl);
      const origin = new URL(originUrl);
      if (target.origin === origin.origin) score += 10;
    } catch {
      // seguimos
    }
  }
  if (!text && href) score -= 10;

  return score;
}

async function openMenuTarget(page, target, trace) {
  ensureTime('open menu target');
  const descriptor = normalizeText(target.text || target.aria || target.href || target.tag || 'candidate');
  trace.push(`candidate:${descriptor}`);

  if (target.href) {
    const destination = new URL(target.href, page.url()).toString();
    await page.goto(destination, {
      waitUntil: 'domcontentloaded',
      timeout: Math.max(8_000, Math.min(25_000, timeRemaining())),
    });
    await page.waitForTimeout(1200);
    return destination;
  }

  const clickCandidates = [
    page.getByRole('link', { name: new RegExp(target.text || target.aria || '.*', 'i') }).first(),
    page.getByRole('button', { name: new RegExp(target.text || target.aria || '.*', 'i') }).first(),
    page.locator('a, button, [role="button"]', { hasText: target.text || target.aria || '' }).first(),
  ];

  for (const locator of clickCandidates) {
    try {
      if (await locator.isVisible({ timeout: 300 })) {
        await locator.click({ timeout: 1000 });
        await page.waitForTimeout(1500);
        return page.url();
      }
    } catch {
      // seguimos
    }
  }

  return page.url();
}

async function discoverCategoryButtons(page) {
  return page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'))
      .map((node) => {
        const el = node;
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        const rect = el.getBoundingClientRect();
        const visible =
          rect.width > 20 &&
          rect.height > 20 &&
          rect.top >= 0 &&
          rect.top < window.innerHeight * 0.8;
        return { text, visible };
      })
      .filter((entry) => {
        if (!entry.visible) return false;
        if (!entry.text || entry.text.length < 2 || entry.text.length > 32) return false;
        if (/\$|\d{2,}/.test(entry.text)) return false;
        if (/acept|cerrar|continuar|whatsapp|instagram|ubicaci[oó]n|reserv|share|compart/i.test(entry.text)) return false;
        return true;
      });

    const unique = [];
    const seen = new Set();
    for (const entry of buttons) {
      const key = entry.text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(entry.text);
    }
    return unique.slice(0, 8);
  });
}

async function clickCategoryIfPossible(page, label) {
  const locator = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first();
  try {
    if (await locator.isVisible({ timeout: 300 })) {
      await locator.click({ timeout: 1000 });
      await page.waitForTimeout(500);
      return true;
    }
  } catch {
    // seguimos
  }

  const anyLocator = page.locator('button, [role="button"], a', { hasText: label }).first();
  try {
    if (await anyLocator.isVisible({ timeout: 300 })) {
      await anyLocator.click({ timeout: 1000 });
      await page.waitForTimeout(500);
      return true;
    }
  } catch {
    // seguimos
  }
  return false;
}

async function detectCurrentCanvaPageLabel(page, fallbackIndex) {
  const explicit = await page
    .evaluate(() => {
      const selectors = [
        '[aria-label*="Page"]',
        '[aria-label*="page"]',
        '[data-page-number]',
        '[data-testid*="page"]',
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        const text = (el?.textContent || el?.getAttribute?.('aria-label') || '').trim();
        if (text) return text;
      }
      const bodyText = document.body?.innerText || '';
      const pagerMatch = bodyText.match(/(^|\s)(\d{1,3})\s*\/\s*(\d{1,3})(\s|$)/);
      return pagerMatch ? `pagina-${pagerMatch[2]}-de-${pagerMatch[3]}` : null;
    })
    .catch(() => null);

  return normalizeText(explicit || `pagina-${fallbackIndex + 1}`);
}

async function advanceCanvaPage(page) {
  const candidates = [
    page.getByRole('button', { name: /next|siguiente|p[aá]gina siguiente/i }).first(),
    page.locator('[aria-label*="Next page"], [aria-label*="next page"]').first(),
    page.locator('button[aria-label*="Next"], button[aria-label*="Siguiente"]').first(),
    page.locator('[data-testid*="next"]').first(),
  ];

  for (const candidate of candidates) {
    try {
      if (await candidate.isVisible({ timeout: 250 })) {
        await candidate.click({ timeout: 900 });
        await page.waitForTimeout(900);
        return true;
      }
    } catch {
      // seguimos
    }
  }

  try {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(900);
    return true;
  } catch {
    return false;
  }
}

async function dismissInstagramPostOverlays(page) {
  await dismissOverlays(page);
  const closeCandidates = [
    page.getByRole('button', { name: /cerrar|close|not now|ahora no/i }).first(),
    page.locator('svg[aria-label*="Close"], svg[aria-label*="Cerrar"]').first(),
  ];

  for (const candidate of closeCandidates) {
    try {
      if (await candidate.isVisible({ timeout: 250 })) {
        await candidate.click({ timeout: 800 });
      }
    } catch {
      // seguimos
    }
  }

  try {
    await page.keyboard.press('Escape');
  } catch {
    // seguimos
  }
}

async function detectCurrentInstagramSlideLabel(page, fallbackIndex) {
  const explicit = await page
    .evaluate(() => {
      const bodyText = document.body?.innerText || '';
      const match = bodyText.match(/(^|\s)(\d{1,2})\s*\/\s*(\d{1,2})(\s|$)/);
      if (match) return `slide-${match[2]}-de-${match[3]}`;
      return null;
    })
    .catch(() => null);

  return normalizeText(explicit || `slide-${fallbackIndex + 1}`);
}

async function advanceInstagramCarousel(page) {
  const clickedViaDom = await page
    .evaluate(() => {
      const buttonCandidates = [
        ...document.querySelectorAll('button'),
        ...document.querySelectorAll('[role="button"]'),
      ];

      const nextBtn = buttonCandidates.find((button) => {
        const aria = (button.getAttribute('aria-label') ?? '').trim();
        const text = (button.textContent ?? '').trim();
        return /next|sig|siguiente|prox|próx|suiv|pros/i.test(`${aria} ${text}`);
      });

      if (nextBtn instanceof HTMLElement) {
        nextBtn.click();
        return true;
      }

      const article = document.querySelector('article');
      if (article instanceof HTMLElement) {
        const rect = article.getBoundingClientRect();
        const target = document.elementFromPoint(rect.right - 24, rect.top + rect.height / 2);
        if (target instanceof HTMLElement) {
          target.click();
          return true;
        }
      }

      const fallback = document.elementFromPoint(window.innerWidth * 0.87, window.innerHeight * 0.45);
      if (fallback instanceof HTMLElement) {
        fallback.click();
        return true;
      }

      return false;
    })
    .catch(() => false);

  if (clickedViaDom) {
    await page.waitForTimeout(1200);
    return true;
  }

  try {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(900);
    return true;
  } catch {
    return false;
  }
}

async function scrapeInstagramPost(page, screenshots, rawRecords, trace) {
  ensureTime('scrape instagram post');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  await dismissInstagramPostOverlays(page);

  const visitedLabels = new Set();
  let stagnantTurns = 0;

  for (let index = 0; index < 10; index += 1) {
    ensureTime(`instagram slide ${index + 1}`);
    const slideLabel = await detectCurrentInstagramSlideLabel(page, index);

    if (!visitedLabels.has(slideLabel)) {
      visitedLabels.add(slideLabel);
      trace.push(`instagram-slide:${slideLabel}`);
      await snapshotInstagramSlide(page, `instagram-${slideLabel}`, screenshots, rawRecords);
    }

    const advanced = await advanceInstagramCarousel(page);
    const nextLabel = await detectCurrentInstagramSlideLabel(page, index + 1);
    if (!advanced || visitedLabels.has(nextLabel)) {
      stagnantTurns += 1;
    } else {
      stagnantTurns = 0;
    }
    if (stagnantTurns >= 2) break;
  }

  trace.push('provider:instagram-post');
}

async function scrapeCanva(page, screenshots, rawRecords, trace) {
  ensureTime('scrape canva');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3500);
  await dismissOverlays(page);
  const visitedLabels = new Set();
  let stagnantTurns = 0;

  for (let index = 0; index < 6; index += 1) {
    ensureTime(`canva page ${index + 1}`);
    const pageLabel = await detectCurrentCanvaPageLabel(page, index);
    if (!visitedLabels.has(pageLabel)) {
      visitedLabels.add(pageLabel);
      trace.push(`canva-page:${pageLabel}`);
      await snapshotState(page, `canva-${pageLabel}`, screenshots, rawRecords, { provider: 'canva' });
    }

    const advanced = await advanceCanvaPage(page);
    const nextLabel = await detectCurrentCanvaPageLabel(page, index + 1);
    if (!advanced || visitedLabels.has(nextLabel)) {
      stagnantTurns += 1;
    } else {
      stagnantTurns = 0;
    }
    if (stagnantTurns >= 2) break;
  }

  trace.push('provider:canva');
}

async function scrapePdfLike(page, screenshots, rawRecords, trace) {
  ensureTime('scrape pdf');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1800);
  await snapshotState(page, 'pdf', screenshots, rawRecords);
  trace.push('provider:pdf');
}

async function scrapeWebsiteOrMenu(page, screenshots, rawRecords, trace) {
  ensureTime('scrape website');
  await dismissOverlays(page);
  await page.waitForTimeout(1200);

  const currentLooksLikeMenu = await pageLooksLikeMenu(page);
  trace.push(`landing-score:${currentLooksLikeMenu.score}`);

  if (currentLooksLikeMenu.score < 3) {
    const targets = (await discoverMenuTargets(page))
      .map((candidate) => ({ ...candidate, score: scoreMenuTarget(candidate, page.url()) }))
      .filter((candidate) => candidate.score >= 45)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    if (targets.length) {
      await openMenuTarget(page, targets[0], trace);
      await dismissOverlays(page);
      await page.waitForTimeout(1200);
    } else {
      trace.push('no-menu-target-found');
    }
  }

  await snapshotState(page, 'menu', screenshots, rawRecords);

  const categories = await discoverCategoryButtons(page);
  for (const category of categories.slice(0, 4)) {
    ensureTime(`category ${category}`);
    const clicked = await clickCategoryIfPossible(page, category);
    if (!clicked) continue;
    trace.push(`category:${category}`);
    await snapshotState(page, category, screenshots, rawRecords);
  }
}

async function main() {
  const inputProvider = detectProvider(INPUT_URL);
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    userAgent: BROWSER_USER_AGENT,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    extraHTTPHeaders: { 'Accept-Language': ACCEPT_LANGUAGE },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['es-CO', 'es', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
  });

  const screenshots = [];
  const rawRecords = [];
  const networkRecords = [];
  const trace = [];
  let failureReason = null;

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      if (!/json|firestore|googleapis|cloudfunctions|run\.app/i.test(`${url} ${contentType}`)) return;
      if (/image|font|css/i.test(contentType)) return;
      const body = await response.text();
      if (!body || body.length < 2 || body.length > 2_000_000) return;
      if (/^[\[{]/.test(body.trim())) networkRecords.push({ url, body });
    } catch {
      // seguimos
    }
  });

  try {
    ensureTime('initial navigation');
    await page.goto(INPUT_URL, {
      waitUntil: 'domcontentloaded',
      timeout: Math.max(10_000, Math.min(35_000, timeRemaining())),
    });

    if (inputProvider === 'instagram-post') {
      await scrapeInstagramPost(page, screenshots, rawRecords, trace);
    } else if (inputProvider === 'canva') {
      await scrapeCanva(page, screenshots, rawRecords, trace);
    } else if (inputProvider === 'pdf') {
      await scrapePdfLike(page, screenshots, rawRecords, trace);
    } else {
      await scrapeWebsiteOrMenu(page, screenshots, rawRecords, trace);
    }
  } catch (error) {
    failureReason = error instanceof Error ? error.message : String(error);
  }

  const visibleJsonItems = [];
  if (!['canva', 'instagram-post'].includes(inputProvider)) {
    for (const snippet of await collectVisibleJsonSnippets(page).catch(() => [])) {
      try {
        collectPriceEntriesFromUnknown(JSON.parse(snippet), visibleJsonItems);
      } catch {
        // seguimos
      }
    }
  }

  const networkItems = [];
  if (!['canva', 'instagram-post'].includes(inputProvider)) {
    for (const record of networkRecords) {
      try {
        collectPriceEntriesFromUnknown(JSON.parse(record.body), networkItems);
      } catch {
        // seguimos
      }
    }
  }

  if (['canva', 'website', 'instagram-post'].includes(inputProvider) || !rawRecords.length) {
    const htmlFallback = fetchHtmlWithBrowserUA(page.url() || INPUT_URL);
    if (htmlFallback) {
      writeFileSync(join(OUTPUT_DIR, `${slugFromUrl(INPUT_URL)}-source.html`), htmlFallback);
      const htmlRecords = extractPriceLikeRecordsFromHtml(htmlFallback);
      rawRecords.push(
        ...(inputProvider === 'canva'
          ? filterCanvaRecords(htmlRecords)
          : inputProvider === 'instagram-post'
            ? filterInstagramPostRecords(htmlRecords)
            : htmlRecords),
      );
    }
  }

  const textItems = parseItemRecords(rawRecords);
  const items = dedupeItems([...networkItems, ...visibleJsonItems, ...textItems]);
  const budget = inferBudget(items);
  const finalUrl = page.url() || INPUT_URL;
  const finalProvider = detectProvider(finalUrl);
  const menuSignal = await pageLooksLikeMenu(page).catch(() => ({ score: 0, priceHits: 0, menuHint: false }));
  const menuFound = items.length > 0 || menuSignal.score >= 3;
  const elapsedMs = Date.now() - STARTED_AT;
  const slug = basename(slugFromUrl(INPUT_URL)) || 'menu';

  const result = {
    inputUrl: INPUT_URL,
    finalUrl,
    initialProvider: inputProvider,
    provider: finalProvider,
    scrapedAt: new Date().toISOString(),
    elapsedMs,
    timeBudgetMs: MAX_TOTAL_MS,
    outputDir: OUTPUT_DIR,
    menuFound,
    reason: failureReason ?? (menuFound ? null : 'No se encontró una carta clara o no soltó precios útiles.'),
    trace,
    screenshots,
    networkResponsesCaptured: networkRecords.length,
    itemsCount: items.length,
    cheapestVisiblePrice: budget.cheapestVisiblePrice,
    suggestedBudget: budget,
    extractedItems: items,
  };

  writeFileSync(join(OUTPUT_DIR, `${slug}-debug-raw-records.json`), JSON.stringify(rawRecords, null, 2) + '\n');
  writeFileSync(
    join(OUTPUT_DIR, `${slug}-debug-network-records.json`),
    JSON.stringify(
      networkRecords.map((record) => ({
        url: record.url,
        preview: record.body.slice(0, 5000),
      })),
      null,
      2,
    ) + '\n',
  );

  const outputPath = join(OUTPUT_DIR, `${slug}-budget.json`);
  writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ outputPath, ...result }, null, 2));

  await context.close();
  await browser.close();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
