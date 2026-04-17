import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';

const MENU_URL = process.argv[2];

if (
  !MENU_URL ||
  !/^https?:\/\/((www\.)?(menupp\.co|app\.menupp\.co|canva\.com)|drive\.google\.com|docs\.google\.com|.*\.pdf(?:[?#].*)?)\//i.test(
    MENU_URL,
  )
) {
  console.error(
    'Uso: node scripts/scrape-menupp-prices.mjs <menu-url>\n' +
      'Ejemplos:\n' +
      '  node scripts/scrape-menupp-prices.mjs https://menupp.co/aldeaasiatica\n' +
      '  node scripts/scrape-menupp-prices.mjs https://app.menupp.co/menu/natal\n' +
      '  node scripts/scrape-menupp-prices.mjs https://menupp.co/saborgourmet\n' +
      '  node scripts/scrape-menupp-prices.mjs https://www.canva.com/design/...',
  );
  process.exit(1);
}

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUTPUT_DIR = join(tmpdir(), `menupp-scrape-${TIMESTAMP}`);
mkdirSync(OUTPUT_DIR, { recursive: true });

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const ACCEPT_LANGUAGE = 'es-CO,es;q=0.9,en;q=0.8';

const PRICE_RE = /\$\s?[\d.]+(?:,\d+)?|\b\d{1,3}(?:\.\d{3})+(?:,\d+)?\b/g;
const CURRENCY_RE = /(cop|pesos?|\$)/i;
const EXCLUDED_NAME_RE =
  /^(adici|extra|salsa|dip|topping|toping|acompa|porci[oó]n|agranda|combo agrandado|prote[ií]na extra|queso extra|modificador|observaci[oó]n)/i;
const MAIN_CATEGORY_RE =
  /(hamburg|sandwich|s[aá]ndwich|pizza|pasta|bowl|ensalada|plato|almuerzo|desayuno|brunch|waffle|crepe|taco|sushi|roll|poke|bao|ramen|postre|croissant|torta|brownie|parfait|helado|frozen yogurt|yogurt|frapp|caf[eé]|bebida|batido|smoothie|jugo|c[oó]ctel|vino|cerveza)/i;
const BEVERAGE_RE =
  /(caf[eé]|americano|latte|capuccino|cappuccino|espresso|bebida|jugo|smoothie|soda|gaseosa|limonada|té|te|tisana|frapp|milkshake|cerveza|vino|cocktail|coctel|mojito|spritz|sangr[ií]a)/i;
const TITLE_CONNECTOR_RE =
  /^(de|del|con|sin|y|e|a|al|la|las|el|los|para|en|por|x)$/i;
const ITEM_STATUS_RE = /^(agotado|nuevo|recomendado)$/i;
const GENERIC_ITEM_RE =
  /^(\+|x\d+|copa|botella|jarra|shot|completa|porci[oó]n|natural|zero|normal|verde|amarillo|maduro|huevo|ma[ií]z|brocoli|zanahoria|puerro|pepinillos|guacamole|arequipe|hersheys|ajonjol[ií]|almendras|chantilly|zumo|domo|michelada|mix lechugas|mix vegetales|repollo encurtido)$/i;
const MEALISH_RE =
  /(hamburg|sandwich|s[aá]ndwich|pizza|pasta|bowl|ensalada|plato|almuerzo|desayuno|brunch|taco|sushi|roll|poke|bao|ramen|pollo|carne|cerdo|salm[oó]n|ceviche|camar[oó]n|huevos|toast|tostada|croque|waffles? de pandebono|bagel|wrap|omelette|omelet|croissant|parfait|yogurt griego|frozen yogurt)/i;
const SWEET_OR_SNACK_RE =
  /(brownie|cookie|galleta|torta|cheesecake|pie|postre|helado|cupcake|rollo de canela|pandebon|canasta de pan|muffin|tarta|cremoso|tentaci[oó]n|copa hamburgo|croissant|pan de chocolate|mini pandebonitos)/i;

function normalizeText(value) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugFromUrl(url) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments.at(-1)?.slice(0, 40) || 'menupp';
  } catch {
    return 'menupp';
  }
}

function detectProvider(url) {
  const normalized = url.toLowerCase();
  if (normalized.includes('canva.com/design/')) return 'canva';
  if (
    normalized.includes('drive.google.com') ||
    normalized.includes('docs.google.com') ||
    /\.pdf(?:$|[?#])/i.test(normalized)
  ) {
    return 'pdf';
  }
  if (normalized.includes('app.menupp.co/')) return 'menupp-app';
  return 'menupp';
}

function parsePrice(value) {
  const digits = value.replace(/[^\d,.-]/g, '');
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
    segment
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

    if (picked.length >= 2 && token === firstToken) {
      break;
    }

    if (!isLikelyTitleToken(token)) {
      break;
    }

    picked.push(token);
    if (picked.length >= 8) break;
  }

  const name = normalizeText(picked.join(' '));
  return name || cleaned.slice(0, 80);
}

function cleanupExtractedName(name) {
  if (!name) return null;

  let cleaned = normalizeText(
    name
      .replace(/\b(Recomendado|Nuevo|Agotado)\b/gi, ' ')
      .replace(/\s+/g, ' '),
  );

  const prefixMatch = cleaned.match(/^([A-ZÁÉÍÓÚÑ&\s]{6,})\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ].*)$/);
  if (prefixMatch) {
    cleaned = normalizeText(prefixMatch[2]);
  }

  return cleaned;
}

function splitRecordIntoEntries(text) {
  const matches = [...text.matchAll(PRICE_RE)].filter((match) => Number.isFinite(parsePrice(match[0])));
  if (!matches.length) return [];

  const entries = [];
  let previousEnd = 0;

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const nextMatch = matches[index + 1];
    const fragmentStart = previousEnd;
    const fragmentEnd = match.index + match[0].length;
    const fragment = normalizeText(text.slice(fragmentStart, fragmentEnd));
    const trailingWindow = nextMatch
      ? normalizeText(text.slice(fragmentEnd, nextMatch.index))
      : '';

    entries.push({
      fragment,
      trailingWindow,
      rawPrice: match[0],
      price: parsePrice(match[0]),
    });

    previousEnd = fragmentEnd;
  }

  return entries;
}

function collectPriceEntriesFromUnknown(value, bucket, context = {}) {
  if (!value) return;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectPriceEntriesFromUnknown(item, bucket, context);
    }
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
    const segmentedEntries = splitRecordIntoEntries(text);

    const entriesToProcess =
      segmentedEntries.length > 1
        ? segmentedEntries
        : prices.map((price) => ({
            fragment: text,
            trailingWindow: '',
            rawPrice: price.raw,
            price: price.value,
          }));

    for (const entry of entriesToProcess) {
      if (entry.price < 1000 || entry.price > 500000) continue;

      const name = cleanupExtractedName(extractNameFromSegment(entry.fragment));
      if (!name || EXCLUDED_NAME_RE.test(name)) continue;
      if (GENERIC_ITEM_RE.test(name)) continue;

      const description = normalizeText(
        entry.fragment
          .replace(name, '')
          .replace(entry.rawPrice, '')
          .replace(/\b(Agotado|Nuevo|Recomendado)\b/gi, '')
          .trim(),
      )
        .slice(0, 220);

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
      !EXCLUDED_NAME_RE.test(item.name),
  );
  const cheapestVisiblePrice = validItems[0]?.price ?? null;
  const beverageCandidates = validItems.filter(
    (item) => BEVERAGE_RE.test(item.name) || BEVERAGE_RE.test(item.category ?? ''),
  );
  const substantialMealCandidates = validItems.filter((item) => {
    if (EXCLUDED_NAME_RE.test(item.name)) return false;
    if (GENERIC_ITEM_RE.test(item.name)) return false;
    if (BEVERAGE_RE.test(item.name) || BEVERAGE_RE.test(item.category ?? '')) return false;
    if (SWEET_OR_SNACK_RE.test(item.name) && item.price < 18000) return false;
    if (item.price < 15000) return false;
    return MEALISH_RE.test(item.name) || MAIN_CATEGORY_RE.test(item.category ?? '') || item.price >= 22000;
  });

  const fallbackMainCandidates = validItems.filter((item) => {
    if (EXCLUDED_NAME_RE.test(item.name)) return false;
    if (GENERIC_ITEM_RE.test(item.name)) return false;
    if (BEVERAGE_RE.test(item.name) || BEVERAGE_RE.test(item.category ?? '')) return false;
    if (item.price < 10000) return false;
    return true;
  });

  const pickedMain =
    substantialMealCandidates[0] ??
    fallbackMainCandidates[0] ??
    validItems.find((item) => item.price >= 12000) ??
    validItems[0];
  const pickedDrink =
    beverageCandidates[0] ??
    validItems.find((item) => item.price >= 5000 && item.price <= 18000 && item !== pickedMain) ??
    null;

  let computed = pickedMain?.price ?? 0;
  if (pickedDrink) computed += pickedDrink.price;

  if (!pickedDrink && pickedMain) {
    computed = Math.max(computed, pickedMain.price * 1.18);
  }

  const minBudget = computed ? roundToNearestThousand(computed) : null;

  return {
    minBudget,
    reasoning: pickedDrink
      ? 'Se usó el plato/plano fuerte más accesible detectado más una bebida accesible, redondeando hacia arriba.'
      : 'No apareció una bebida clara; se tomó el ítem principal más accesible y se aplicó un margen conservador para una visita realista.',
    cheapestVisiblePrice,
    pickedMain: pickedMain
      ? { name: pickedMain.name, category: pickedMain.category, price: pickedMain.price }
      : null,
    pickedDrink: pickedDrink
      ? { name: pickedDrink.name, category: pickedDrink.category, price: pickedDrink.price }
      : null,
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
      if (await button.isVisible({ timeout: 200 })) {
        await button.click({ timeout: 500 });
      }
    } catch {
      // seguimos
    }
  }
}

async function dismissCanvaOverlays(page) {
  const labels = ['Dismiss', 'Close', 'Cerrar', 'Entendido', 'Got it'];

  for (const label of labels) {
    const button = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
    try {
      if (await button.isVisible({ timeout: 250 })) {
        await button.click({ timeout: 500 });
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

async function autoScroll(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const root = document.scrollingElement || document.documentElement;
    let lastHeight = 0;

    for (let i = 0; i < 10; i += 1) {
      root.scrollTo({ top: root.scrollHeight, behavior: 'instant' });
      await sleep(350);
      if (root.scrollHeight === lastHeight) break;
      lastHeight = root.scrollHeight;
    }

    root.scrollTo({ top: 0, behavior: 'instant' });
    await sleep(100);

    const containers = Array.from(document.querySelectorAll('main, section, div'))
      .filter((node) => {
        const el = node;
        const styles = window.getComputedStyle(el);
        return (
          (styles.overflowY === 'auto' || styles.overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight + 120
        );
      })
      .slice(0, 6);

    for (const el of containers) {
      let prev = -1;
      for (let i = 0; i < 8; i += 1) {
        el.scrollTop = el.scrollHeight;
        await sleep(250);
        if (el.scrollTop === prev) break;
        prev = el.scrollTop;
      }
      el.scrollTop = 0;
      await sleep(50);
    }
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
      .filter((entry) => entry.visible && entry.text && entry.text.length <= 600 && /\$|\d{1,3}(?:\.\d{3})/.test(entry.text));

    const unique = new Map();
    for (const candidate of candidates) {
      const key = candidate.text.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!unique.has(key)) unique.set(key, candidate);
    }

    return Array.from(unique.values()).slice(0, 500);
  });
}

async function collectVisibleJsonSnippets(page) {
  return page.evaluate(() => {
    const snippets = [];
    const scriptTags = Array.from(document.querySelectorAll('script[type="application/ld+json"], script[type="application/json"]'));

    for (const script of scriptTags) {
      const text = (script.textContent || '').trim();
      if (!text || text.length > 300000) continue;
      snippets.push(text);
    }

    return snippets.slice(0, 40);
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
    if (PRICE_RE.test(textValue)) {
      records.push({ text: textValue, visible: true, source });
    }
    buffer = [];
  };

  for (const line of lines) {
    buffer.push(line);
    if (PRICE_RE.test(line) || buffer.length >= 4) {
      flush();
    }
  }

  flush();
  return records;
}

function ocrScreenshot(screenshotPath) {
  try {
    const output = execFileSync(
      'tesseract',
      [screenshotPath, 'stdout', '--psm', '6', '-l', 'eng'],
      {
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
      },
    );

    const normalized = normalizeText(output.replace(/\s+/g, ' '));
    if (!normalized) return { text: '', records: [] };

    return {
      text: output,
      records: chunkOcrTextIntoRecords(output, 'ocr-screenshot'),
    };
  } catch {
    return { text: '', records: [] };
  }
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
          rect.top < window.innerHeight * 0.65 &&
          rect.left >= 0 &&
          rect.left < window.innerWidth;

        return {
          text,
          visible,
        };
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
    return unique.slice(0, 15);
  });
}

async function snapshotCanvaPage(page, label, screenshots, rawRecords) {
  await page.waitForTimeout(500);
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  const screenshotPath = join(OUTPUT_DIR, `${String(screenshots.length + 1).padStart(2, '0')}-${safeLabel || 'canva'}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  screenshots.push(screenshotPath);
  rawRecords.push(...(await collectRawRecords(page)));
  const ocr = ocrScreenshot(screenshotPath);
  if (ocr.text) {
    writeFileSync(`${screenshotPath}.ocr.txt`, ocr.text);
  }
  rawRecords.push(...ocr.records);
}

async function detectCurrentViewerPage(page, fallbackIndex) {
  const explicitLabel =
    normalizeText(
      (await page
        .locator('[aria-label*="Page"], [aria-label*="page"], [data-page-number]')
        .first()
        .textContent()
        .catch(() => null)) || '',
    ) || '';

  if (explicitLabel) return explicitLabel;

  const inlinePager = await page
    .evaluate(() => {
      const text = document.body?.innerText || '';
      const match = text.match(/(^|\s)(\d{1,3})\s*\/\s*(\d{1,3})(\s|$)/);
      if (!match) return null;
      return `pagina-${match[2]}-de-${match[3]}`;
    })
    .catch(() => null);

  return inlinePager || `pagina-${fallbackIndex + 1}`;
}

async function scrapeCanva(page, screenshots, rawRecords) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3500);
  await dismissCanvaOverlays(page);

  try {
    await page.waitForFunction(
      () => !document.body?.innerText?.toLowerCase().includes('screen reader content is loading'),
      { timeout: 12000 },
    );
  } catch {
    // seguimos con la mejor versión disponible
  }

  const visitedPages = [];
  let stagnantTurns = 0;

  for (let index = 0; index < 30; index += 1) {
    const pageLabel = await detectCurrentViewerPage(page, index);

    if (!visitedPages.includes(pageLabel)) {
      visitedPages.push(pageLabel);
      await snapshotCanvaPage(page, pageLabel, screenshots, rawRecords);
    }

    let advanced = false;
    const nextCandidates = [
      page.getByRole('button', { name: /next|siguiente|p[aá]gina siguiente/i }).first(),
      page.locator('[aria-label*="Next page"], [aria-label*="next page"]').first(),
      page.locator('button[aria-label*="Next"], button[aria-label*="Siguiente"]').first(),
    ];

    for (const candidate of nextCandidates) {
      try {
        if (await candidate.isVisible({ timeout: 250 })) {
          await candidate.click({ timeout: 900 });
          advanced = true;
          break;
        }
      } catch {
        // seguimos
      }
    }

    if (!advanced) {
      try {
        await page.keyboard.press('ArrowRight');
        advanced = true;
      } catch {
        // seguimos
      }
    }

    await page.waitForTimeout(900);

    const nextLabel = await detectCurrentViewerPage(page, index + 1);

    if (!advanced || visitedPages.includes(nextLabel)) {
      stagnantTurns += 1;
    } else {
      stagnantTurns = 0;
    }

    if (stagnantTurns >= 2) break;
  }

  return visitedPages;
}

async function scrapePdfLike(page, screenshots, rawRecords) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  await snapshotState(page, 'pdf-inicio', screenshots, rawRecords);
  return ['pdf-inicio'];
}

async function snapshotState(page, label, screenshots, rawRecords) {
  await autoScroll(page);
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  const screenshotPath = join(OUTPUT_DIR, `${String(screenshots.length + 1).padStart(2, '0')}-${safeLabel || 'menu'}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  screenshots.push(screenshotPath);
  rawRecords.push(...(await collectRawRecords(page)));
  const ocr = ocrScreenshot(screenshotPath);
  if (ocr.text) {
    writeFileSync(`${screenshotPath}.ocr.txt`, ocr.text);
  }
  rawRecords.push(...ocr.records);
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
    // seguimos con fallback
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

async function main() {
  const provider = detectProvider(MENU_URL);
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    userAgent: BROWSER_USER_AGENT,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    extraHTTPHeaders: {
      'Accept-Language': ACCEPT_LANGUAGE,
    },
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

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      if (!/json|firestore|googleapis|cloudfunctions|run\.app/i.test(`${url} ${contentType}`)) return;

      if (/image|font|css/i.test(contentType)) return;

      const body = await response.text();
      if (!body || body.length < 2 || body.length > 2_000_000) return;

      if (/^[\[{]/.test(body.trim())) {
        networkRecords.push({ url, body });
      }
    } catch {
      // seguimos
    }
  });

  try {
    await page.goto(MENU_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);

    let visitedCategories = [];

    if (provider === 'canva') {
      visitedCategories = await scrapeCanva(page, screenshots, rawRecords);
    } else if (provider === 'pdf') {
      visitedCategories = await scrapePdfLike(page, screenshots, rawRecords);
    } else {
      await dismissOverlays(page);
      await snapshotState(page, 'inicio', screenshots, rawRecords);

      const categories = await discoverCategoryButtons(page);
      visitedCategories = [];

      for (const category of categories) {
        const clicked = await clickCategoryIfPossible(page, category);
        if (!clicked) continue;
        visitedCategories.push(category);
        await snapshotState(page, category, screenshots, rawRecords);
      }
    }

    if (provider === 'canva') {
      const htmlFallback = fetchHtmlWithBrowserUA(MENU_URL);
      if (htmlFallback) {
        writeFileSync(join(OUTPUT_DIR, `${slugFromUrl(MENU_URL)}-canva-source.html`), htmlFallback);
        rawRecords.push(...extractPriceLikeRecordsFromHtml(htmlFallback));
      }
    }

    const textItems = parseItemRecords(rawRecords);
    const networkItems = [];

    for (const record of networkRecords) {
      try {
        const parsed = JSON.parse(record.body);
        collectPriceEntriesFromUnknown(parsed, networkItems);
      } catch {
        // algunas respuestas no vienen en JSON puro
      }
    }

    const jsonItems = [];
    for (const snippet of await collectVisibleJsonSnippets(page)) {
      try {
        collectPriceEntriesFromUnknown(JSON.parse(snippet), jsonItems);
      } catch {
        // seguimos
      }
    }

    const items = dedupeItems([...networkItems, ...jsonItems, ...textItems]);
    const budget = inferBudget(items);
    const slug = basename(slugFromUrl(MENU_URL)) || 'menupp';

    const result = {
      provider,
      menuUrl: MENU_URL,
      scrapedAt: new Date().toISOString(),
      outputDir: OUTPUT_DIR,
      screenshots,
      visitedCategories,
      networkResponsesCaptured: networkRecords.length,
      extractedItems: items,
      suggestedBudget: budget,
    };

    writeFileSync(
      join(OUTPUT_DIR, `${slug}-debug-raw-records.json`),
      JSON.stringify(rawRecords, null, 2) + '\n',
    );
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

    const outputPath = join(OUTPUT_DIR, `${slug}-prices.json`);
    writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');

    console.log(JSON.stringify({ outputPath, ...result }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
