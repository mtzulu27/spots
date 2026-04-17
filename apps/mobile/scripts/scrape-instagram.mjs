/**
 * scrape-instagram.mjs
 * Extrae toda la info relevante de un perfil público de Instagram:
 * bio, links, linktrees, menú, precios, contacto, horarios, sedes.
 *
 * Uso:
 *   node scripts/scrape-instagram.mjs https://www.instagram.com/<usuario>/
 *
 * Output final: bloque estructurado listo para pasarle a Claude junto
 * con los screenshots de los highlights relevantes.
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

// ─── Configuración ────────────────────────────────────────────────────────────

const PROFILE_URL = process.argv[2];
if (!PROFILE_URL || !PROFILE_URL.includes('instagram.com')) {
  console.error('Uso: node scripts/scrape-instagram.mjs https://www.instagram.com/<usuario>/');
  process.exit(1);
}

const HIGHLIGHT_WAIT_MS   = 3500;
const STORY_ADVANCE_MS    = 2500;
const MAX_STORIES         = 30;
const PAGE_LOAD_MS        = 3000;

// Highlights que capturamos (horarios y ubicación/sedes)
const HIGHLIGHT_KEYWORDS = [
  // Horarios
  'horario', 'hora', 'schedule', 'abierto', 'when', 'horaire', 'horaires', 'heures', 'orari', 'orario', 'horário', 'horarios',
  // Ubicación / sedes
  'ubicaci', 'direcci', 'sede', 'local', 'donde', 'address', 'where', 'lugar', 'cómo llegar', 'como llegar',
  'adresse', 'emplacement', 'lieu', 'localisation', 'ubicazione', 'indirizzo', 'filiale', 'sedi', 'localizacao', 'localização', 'endereco', 'endereço', 'unidades',
  // Menú / precios
  'menú', 'menu', 'carta', 'precio', 'price', 'food', 'comida', 'bebida', 'drinks',
  'carte', 'prix', 'boissons', 'repas', 'carne', 'bevande', 'prezzi', 'cardapio', 'cardápio', 'preco', 'preço', 'bebidas',
];

// Dominios de agregadores de links
const LINK_AGGREGATORS = [
  'linktr.ee', 'linktree.com',
  'bio.link',
  'beacons.ai',
  'tap.bio',
  'lnk.bio',
  'campsite.bio',
  'solo.to',
  'hoo.be',
  'carrd.co',
  'about.me',
  'taplink.cc',
  'milkshake.app',
  'koji.to',
  'bento.me',
  'later.com',
  'instabio.cc',
  'snipfeed.co',
  'sproutsocial.com',
  'allmylinks.com',
];

// Dominios que se ignoran directamente (no tienen info de negocio útil)
const SOCIAL_DOMAINS = [
  'threads.net', 'threads.com',
  'facebook.com', 'fb.com',
  'meta.com', 'about.meta.com', 'meta.ai',
  'tiktok.com',
  'youtube.com', 'youtu.be',
  'twitter.com', 'x.com',
  'snapchat.com',
  'pinterest.com',
  'linkedin.com',
  'spotify.com',
  'soundcloud.com',
  'apple.com', 'apps.apple.com',
  'play.google.com',
  'maps.apple.com',
];

// Plataformas de delivery/pedidos — se ignoran (no aportan info del lugar)
const DELIVERY_DOMAINS = [
  'rappi.com', 'rappi.co',
  'ifood.com.br', 'ifood.co',
  'ubereats.com',
  'pedidosya.com',
  'domicilios.com',
  'didi.com', 'didiglobal.com',
  'lahaus.com',
  'just-eat.com', 'justeat.com',
];

// Links de reviews — no tienen datos del negocio en sí
const REVIEW_DOMAINS = [
  'tripadvisor.com', 'tripadvisor.co',
  'yelp.com',
  'eltenedor.es', 'thefork.com',
  'opentable.com',
];

function isSocialLink(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return SOCIAL_DOMAINS.some((d) => host.includes(d));
  } catch { return false; }
}

function isDeliveryLink(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return DELIVERY_DOMAINS.some((d) => host.includes(d));
  } catch { return false; }
}

function isReviewLink(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return REVIEW_DOMAINS.some((d) => host.includes(d));
  } catch { return false; }
}

// Dominios corporativos/legales que nunca tienen info del negocio
const CORPORATE_DOMAINS = [
  'microsoft.com', 'office.com', 'microsoftonline.com', 'live.com', 'outlook.com',
  'go.microsoft.com', 'forms.office.com',
  'apple.com', 'icloud.com',
  'google.com/policies', 'policies.google.com',
  'amazon.com/privacy', 'aws.amazon.com',
  'zoom.us', 'webex.com',
  'adobe.com/privacy',
  'cloudflare.com',
];

function isCorporateLink(url) {
  try {
    const full = url.toLowerCase();
    const host = new URL(url).hostname.replace('www.', '');
    return CORPORATE_DOMAINS.some((d) => host.includes(d) || full.includes(d));
  } catch { return false; }
}

function shouldSkipLink(url) {
  return isSocialLink(url) || isDeliveryLink(url) || isReviewLink(url) || isCorporateLink(url);
}

// Determina si una página visitada tiene info útil de negocio.
// IMPORTANTE: se usa solo para el LOG y para filtrar sub-links de agregadores.
// Los links de nivel 0 (del bio) siempre se guardan si no hubo error fatal.
function hasUsefulInfo(linkData) {
  if (!linkData) return false;
  if (linkData.error && !linkData.screenshots?.length) return false;
  // Todo lo que tenga datos estructurados es útil
  if (linkData.screenshots?.length > 0) return true;
  if (linkData.phones?.length > 0)      return true;
  if (linkData.prices?.length > 0)      return true;
  if (linkData.hours?.length > 0)       return true;
  if (linkData.addresses?.length > 0)   return true;
  if ((linkData.subLinks ?? []).length > 0) return true;
  // Texto con señales de negocio
  const text = (linkData.text ?? '').toLowerCase();
  return [
    /\d{1,2}:\d{2}/,
    /cra|calle|carrera|cl\.|avenida|#\s?\d/,
    /whatsapp|reserva|reservar|pedido|menú|menu|carta|precio|\$\d/,
    /lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo/,
    /abierto|cerrado|horario|atenci[oó]n/,
  ].some((re) => re.test(text));
}

function isRelevantHighlight(label) {
  const l = label.toLowerCase();
  return HIGHLIGHT_KEYWORDS.some((k) => l.includes(k));
}

function isAggregator(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return LINK_AGGREGATORS.some((d) => host.includes(d));
  } catch { return false; }
}

// ─── Patrones de extracción (compartidos entre Node y browser) ───────────────

// Ejecuta en Node.js sobre texto plano (para bio y textos ya traídos del browser)
function extractStructured(text) {
  const hourRe = /(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|lun|mar|mi[eé]|jue|vie|s[aá]b|dom|monday|tuesday|wednesday|thursday|friday|saturday|sunday|l[-–]v|l[-–]s|everyday|diario|todos los d[ií]as)[^\n]{0,80}(?:\d{1,2}[:h]\d{0,2}\s?(?:am|pm)?|\d{1,2}\s?(?:am|pm))/gi;
  const addrRe = /(?:cra?\.?\s*\d|carrera\s+\d|cl\.?\s*\d|calle\s+\d|av\.?\s*\d|avenida\s+\d|dg\.?\s*\d|diagonal\s+\d|tv\.?\s*\d|transversal\s+\d)[^\n]{0,100}/gi;
  const phoneRe = /(?:\+57|57)?[\s\-]?(?:3\d{2}[\s\-]?\d{3}[\s\-]?\d{4}|3\d{9}|\(\d{3}\)\s?\d{3}[\s\-]\d{4})/g;
  const priceRe = /\$\s?[\d.,]+(?:\s?(?:mil|k|m|pesos?|cop))?|\b\d{1,3}[.,]\d{3}(?:[.,]\d{3})?(?:\s?(?:cop|COP|mil|k))?\b/gi;
  const dedup = (arr) => [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
  return {
    hours:     dedup(text.match(hourRe)  ?? []),
    addresses: dedup(text.match(addrRe)  ?? []),
    phones:    dedup(text.match(phoneRe) ?? []).filter((p) => p.replace(/\D/g, '').length >= 7),
    prices:    dedup(text.match(priceRe) ?? []),
  };
}

// ─── Consolidación de fuentes con veredicto ───────────────────────────────────

const SOURCE_PRIORITY = { instagram_bio: 1, instagram_highlight: 1, map: 2, website: 3, menu: 4, linktree: 5, unknown: 9 };

function consolidate(result) {
  // Reúne todos los datos etiquetados con fuente
  const bucket = { hours: [], addresses: [], phones: [], prices: [] };

  const tag = (items, source, url) => {
    const priority = SOURCE_PRIORITY[source] ?? 9;
    for (const [key, vals] of Object.entries(items)) {
      for (const val of vals ?? []) {
        bucket[key].push({ value: val, source, url: url ?? 'instagram', priority });
      }
    }
  };

  // 1. Instagram bio (fuente primaria)
  tag(extractStructured(result.bio ?? ''), 'instagram_bio');

  // 2. Links visitados (y sus sub-links)
  // Precios SOLO de fuentes tipo menu — nunca de map, website, linktree, etc.
  const PRICE_SOURCES = new Set(['menu']);
  const flatten = (link, depth = 0) => {
    const src = link.type ?? 'unknown';
    tag({
      hours:     link.hours     ?? [],
      addresses: link.addresses ?? [],
      phones:    link.phones    ?? [],
      prices:    PRICE_SOURCES.has(src) ? (link.prices ?? []) : [],
    }, src, link.url);
    for (const sub of link.subLinks ?? []) flatten(sub, depth + 1);
  };
  for (const link of result.links ?? []) flatten(link);

  // 3. Produce veredicto por campo
  const verdict = {};
  for (const [key, items] of Object.entries(bucket)) {
    if (!items.length) continue;

    // Agrupa por valor normalizado para detectar coincidencias entre fuentes
    const groups = new Map();
    for (const item of items) {
      const norm = item.value.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!groups.has(norm)) groups.set(norm, []);
      groups.get(norm).push(item);
    }

    // Ordena: primero los de menor priority (= más confiable)
    const sorted = [...groups.entries()]
      .map(([norm, occurrences]) => ({
        value:    occurrences[0].value,
        sources:  [...new Set(occurrences.map((o) => o.source))],
        urls:     [...new Set(occurrences.map((o) => o.url).filter(Boolean))],
        priority: Math.min(...occurrences.map((o) => o.priority)),
        confirmedBy: occurrences.length, // cuántas fuentes distintas lo dicen
      }))
      .sort((a, b) => a.priority - b.priority || b.confirmedBy - a.confirmedBy);

    const best = sorted[0];
    const conflicts = sorted.slice(1).filter((s) => s.priority !== best.priority);

    verdict[key] = {
      best:      best.value,
      sources:   best.sources,
      confirmed: best.confirmedBy > 1, // true = varias fuentes coinciden
      all:       sorted,
      conflicts: conflicts.length ? conflicts : undefined,
    };
  }

  return verdict;
}

// ─── Extracción estructurada de una página externa ───────────────────────────

async function extractPageInfo(page) {
  return page.evaluate(() => {
    const body = document.body;
    if (!body) return { text: '', links: [], phones: [], prices: [], hours: [], addresses: [] };

    // ── Texto limpio ──────────────────────────────────────────────────────────
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent) continue;
      const tag = parent.tagName?.toLowerCase();
      if (['script', 'style', 'noscript', 'head'].includes(tag)) continue;
      const t = node.textContent?.trim();
      if (!t || t.length < 2) continue;
      texts.push(t);
    }
    const fullText = [...new Set(texts)].join('\n');

    // ── Links visibles ────────────────────────────────────────────────────────
    const SKIP_HOSTS = ['instagram.com', 'facebook.com', 'twitter.com', 'tiktok.com'];
    const links = [...document.querySelectorAll('a[href]')]
      .map((a) => ({ text: a.innerText?.trim(), href: a.href }))
      .filter((l) => l.href?.startsWith('http') && !SKIP_HOSTS.some((h) => l.href.includes(h)));

    // ── Teléfonos ─────────────────────────────────────────────────────────────
    const phoneRe = /(?:\+57|57)?[\s\-]?(?:3\d{2}[\s\-]?\d{3}[\s\-]?\d{4}|3\d{9}|\(\d{3}\)\s?\d{3}[\s\-]\d{4}|\d{7})/g;
    const phones = [...new Set(fullText.match(phoneRe) ?? [])].map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.replace(/\D/g, '').length >= 7);

    // ── Precios ───────────────────────────────────────────────────────────────
    const priceRe = /\$\s?[\d.,]+(?:\s?(?:mil|k|m|pesos?|cop))?|\b\d{1,3}[.,]\d{3}(?:[.,]\d{3})?(?:\s?(?:cop|COP|mil|k))?\b|\d+[\d.,]*\s?(?:mil|k\s?pesos?|cop)/gi;
    const prices = [...new Set(fullText.match(priceRe) ?? [])].map((p) => p.trim().replace(/\s+/g, ' '));

    // ── Horarios ──────────────────────────────────────────────────────────────
    // Captura líneas que parezcan horarios: "Lunes - Viernes: 8am - 10pm", "L-V 8:00-22:00", etc.
    const hourRe = /(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|lun|mar|mi[eé]|jue|vie|s[aá]b|dom|monday|tuesday|wednesday|thursday|friday|saturday|sunday|l[-–]v|l[-–]s|everyday|diario|todos los d[ií]as)[^\n]{0,80}(?:\d{1,2}[:h]\d{0,2}\s?(?:am|pm)?|\d{1,2}\s?(?:am|pm))/gi;
    const hours = [...new Set(fullText.match(hourRe) ?? [])].map((h) => h.trim());

    // ── Direcciones ───────────────────────────────────────────────────────────
    // Captura patrones de dirección colombiana y genérica
    const addrRe = /(?:cra?\.?|carrera|cl\.?|calle|av\.?|avenida|dg\.?|diagonal|tv\.?|transversal)\s*\d+[^\n]{0,80}(?:#|\d)/gi;
    const addresses = [...new Set(fullText.match(addrRe) ?? [])].map((a) => a.trim());

    return {
      text: fullText.slice(0, 10000),
      links: links.slice(0, 40),
      phones,
      prices: prices.slice(0, 50),
      hours,
      addresses,
    };
  });
}

// ─── Tipo de link ─────────────────────────────────────────────────────────────

function classifyLink(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');
    const path = parsed.pathname.toLowerCase();
    if (host.includes('wa.me') || host.includes('whatsapp'))   return 'whatsapp';
    if (host.includes('maps.google') || host.includes('maps.app.goo') || host.includes('goo.gl')) return 'map';
    if (LINK_AGGREGATORS.some((d) => host.includes(d)))        return 'linktree';
    // me-qr: /link-list/ es un agregador, resto es menú/QR
    if ((host.includes('me-qr.com') || host.includes('me-qr.co')) && path.includes('/link-list/')) return 'linktree';
    if (
      host.includes('menupp') ||
      host.includes('heyzine') ||
      host.includes('issuu') ||
      host.includes('yumminn') ||
      host.includes('me-qr.com') ||
      host.includes('me-qr.co') ||
      host.includes('drive.google') ||
      host.includes('docs.google') ||
      host.includes('notion.so') ||
      host.includes('canva.com') ||
      host.includes('flipsnack') ||
      host.includes('calameo.com') ||
      path.endsWith('.pdf')
    ) return 'menu';
    return 'website';
  } catch { return 'unknown'; }
}

function canonicalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    if ((parsed.protocol === 'http:' && parsed.port === '80') || (parsed.protocol === 'https:' && parsed.port === '443')) {
      parsed.port = '';
    }
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function isSameHost(urlA, urlB) {
  try {
    return new URL(urlA).hostname === new URL(urlB).hostname;
  } catch {
    return false;
  }
}

function inferTypeFromContent(url, info, title = '', hintType = 'unknown') {
  const text = `${title}\n${info?.text ?? ''}`.toLowerCase();
  const visibleLinks = info?.links ?? [];
  const externalLinks = visibleLinks.filter((l) => {
    try {
      return !isSameHost(url, l.href) && !shouldSkipLink(l.href);
    } catch {
      return false;
    }
  });

  if (hintType === 'whatsapp') return 'whatsapp';
  if (hintType === 'map') return 'map';

  if (
    hintType === 'menu' ||
    (info?.prices?.length ?? 0) >= 2 ||
    /(menú|menu|carta|platos?|bebidas?|drinks?|desayuno|brunch|almuerzo|cena|postres?)/i.test(text)
  ) {
    return 'menu';
  }

  if (
    hintType === 'linktree' ||
    externalLinks.length >= 4 ||
    /(link in bio|enlaces|links|reserva aquí|ordenar|pedir)/i.test(text)
  ) {
    return 'linktree';
  }

  return 'website';
}

function isIrrelevantPortalPage(url, title = '', text = '') {
  const haystack = `${title}\n${text}`.toLowerCase();
  try {
    const host = new URL(url).hostname.replace('www.', '');

    if (host.includes('workspace.google.com')) return true;
    if (host.includes('accounts.google.com')) return true;

    if (host.includes('drive.google.com') || host.includes('docs.google.com')) {
      const looksLikeGenericGoogle =
        /(google workspace|google drive|google docs|crear una cuenta|iniciar sesión|ver más apps|accede a tu cuenta|go to google drive)/i.test(haystack);
      const hasBusinessSignals =
        /(menú|menu|carta|precio|horario|direcci|ubicaci|reserva|sede|tel[eé]fono|brunch|restaurant|restaurante|caf[eé])/i.test(haystack);
      if (looksLikeGenericGoogle && !hasBusinessSignals) return true;
    }

    return false;
  } catch {
    return false;
  }
}

function collectCandidateLinks(currentUrl, info, finalType, depth, visited) {
  if (depth >= 3) return [];

  const current = canonicalizeUrl(currentUrl);
  const byHref = new Map();

  for (const link of info?.links ?? []) {
    if (!link?.href) continue;
    const href = canonicalizeUrl(normalizeGoogleDriveUrl(link.href));
    if (!href || href === current) continue;
    if (visited.has(href)) continue;
    if (shouldSkipLink(href)) continue;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (href.includes('workspace.google.com')) continue;
    if (href.includes('accounts.google.com')) continue;

    const text = (link.text ?? '').trim();
    if (/califica tu experiencia|calificar|reseña|review|opinion|valora tu experiencia/i.test(text)) continue;
    const existing = byHref.get(href);
    if (!existing || text.length > (existing.text ?? '').length) {
      byHref.set(href, { href, text });
    }
  }

  const all = [...byHref.values()];
  if (finalType === 'linktree') return all.slice(0, 20);

  const score = (item) => {
    const text = item.text.toLowerCase();
    let value = 0;
    if (isSameHost(currentUrl, item.href)) value += 10;
    if (/menú|menu|carta|precio|horario|ubicaci|direcci|contacto|reserva|sede|nosotros|about|branch|location/.test(text)) {
      value += 20;
    }
    if (finalType === 'menu' && /platos?|bebidas?|food|drinks|pdf|ver|cocina/.test(text)) {
      value += 10;
    }
    return value;
  };

  return all.sort((a, b) => score(b) - score(a)).slice(0, 12);
}

// Normaliza URLs de Google Drive al viewer estándar
function normalizeGoogleDriveUrl(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('drive.google') && !u.hostname.includes('docs.google')) return url;
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return `https://drive.google.com/file/d/${idMatch[1]}/view`;
    return url;
  } catch { return url; }
}

function isHeyzineLink(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');
    return host.includes('heyzine') && parsed.pathname.includes('/flip-book/');
  } catch {
    return false;
  }
}

async function extractHeyzineFlipbook(page, result) {
  console.log('     📖 Heyzine detectado — recorriendo páginas del flipbook...');
  await page.waitForTimeout(4000);

  const seenStates = new Set();
  const maxPages = 20;

  for (let i = 0; i < maxPages; i++) {
    const shot = `${tmpdir()}/ig-link-menu-heyzine-page-${i + 1}-${Date.now()}.png`;
    await page.screenshot({ path: shot, fullPage: false });
    result.screenshots.push(shot);

    const info = await extractPageInfo(page);
    if (info.text?.length > 20) {
      result.text += `${result.text ? '\n\n' : ''}--- HEYZINE PAGE ${i + 1} ---\n${info.text}`;
    }
    result.phones = [...new Set([...result.phones, ...info.phones])];
    result.prices = [...new Set([...result.prices, ...info.prices])];

    if (info.prices.length) {
      console.log(`     💲 Heyzine pág ${i + 1}: ${info.prices.slice(0, 8).join(', ')}`);
    }

    const stateKey = await page.evaluate(() => {
      const text = (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
      const pageIndicator =
        document.querySelector('[class*="page"]')?.textContent?.trim() ??
        document.querySelector('[aria-label*="page" i]')?.textContent?.trim() ??
        '';
      return `${location.href}::${pageIndicator}::${text}`;
    });

    if (seenStates.has(stateKey)) break;
    seenStates.add(stateKey);

    const advanced = await page.evaluate(() => {
      const selectors = [
        'button[aria-label*="next" i]',
        '[aria-label*="next page" i]',
        '[title*="next" i]',
        '.page-next',
        '.next',
        '[class*="next"]',
        '[data-testid*="next"]',
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element instanceof HTMLElement) {
          element.click();
          return true;
        }
      }

      const eventTarget = document.elementFromPoint(window.innerWidth * 0.85, window.innerHeight * 0.5);
      if (eventTarget instanceof HTMLElement) {
        eventTarget.click();
        return true;
      }

      return false;
    });

    if (!advanced) {
      try {
        await page.keyboard.press('ArrowRight');
      } catch {
        break;
      }
    }

    await page.waitForTimeout(2200);
  }
}

// ─── Navegación de links externos (pestañas reales de Playwright) ─────────────

async function visitAndExtract(context, url, depth = 0, visited = new Set()) {
  if (depth > 3) return null;

  url = canonicalizeUrl(normalizeGoogleDriveUrl(url));
  if (visited.has(url)) {
    console.log(`  ↩️  Ya visitado: ${url}`);
    return null;
  }
  if (shouldSkipLink(url)) {
    const reason = isSocialLink(url) ? 'red social' : isDeliveryLink(url) ? 'delivery' : 'reviews';
    console.log(`  ⏭️  Ignorado [${reason}]: ${url}`);
    return null;
  }
  visited.add(url);

  const hintType = classifyLink(url);
  const result = { url, type: 'unknown', hintType, title: '', text: '', phones: [], prices: [], hours: [], addresses: [], subLinks: [], screenshots: [] };

  if (hintType === 'whatsapp') {
    result.type = 'whatsapp';
    console.log(`  💬 WhatsApp: ${url}`);
    return result;
  }

  if (hintType === 'map') {
    result.type = 'map';
    console.log(`  📍 Maps — extrayendo info del negocio: ${url}`);
    const mapPage = await context.newPage();
    try {
      await mapPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

      // Espera a que el business card esté listo (h1 = nombre del lugar)
      await mapPage.waitForSelector('h1', { timeout: 12000 }).catch(() => null);
      await mapPage.waitForTimeout(2000);

      // Scroll del panel lateral para cargar horarios y datos de contacto
      await mapPage.evaluate(() => {
        const panel =
          document.querySelector('[role="main"]') ??
          document.querySelector('div[aria-label]');
        if (panel instanceof HTMLElement) panel.scrollTop = 600;
      });
      await mapPage.waitForTimeout(1200);

      // ── Abre el dropdown/accordion de horarios ──────────────────────────────
      // Google Maps usa aria-expanded en el trigger del accordion.
      // La estrategia es: encontrar el elemento collapsed que está CERCA de texto
      // con formato de hora (a. m. / p. m.), no cualquier aria-expanded en la página.
      const expandStrategy = await mapPage.evaluate(() => {
        const DAY = /domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|sunday|monday|tuesday|wednesday|thursday|friday|saturday/i;
        const HOUR_SIGNAL = /\d{1,2}\s*(?:a\.?\s*m\.?|p\.?\s*m\.?|am\b|pm\b)|abre|cierra|abierto|cerrado|open|closed/i;

        // Estrategia 1: aria-expanded="false" cuyo contenedor cercano tiene señal de hora
        const collapsed = [...document.querySelectorAll('[aria-expanded="false"]')];
        for (const el of collapsed) {
          const vicinity =
            el.closest('li, [role="listitem"], div[jsaction]') ??
            el.parentElement?.parentElement ??
            el.parentElement;
          const text = (vicinity?.textContent ?? el.textContent ?? '').toLowerCase();
          if (HOUR_SIGNAL.test(text)) {
            if (el instanceof HTMLElement) { el.click(); return 'aria-expanded near hours'; }
          }
        }

        // Estrategia 2: botón con aria-label explícito sobre horarios
        const all = [...document.querySelectorAll('button, [role="button"]')];
        const hoursBtn = all.find((b) => {
          const label = (b.getAttribute('aria-label') ?? b.textContent ?? '').toLowerCase();
          return /ver m[aá]s horas|see more hours|horas de apertura|opening hours|horario semanal|weekly hours/i.test(label);
        });
        if (hoursBtn instanceof HTMLElement) { hoursBtn.click(); return 'aria-label hours button'; }

        // Estrategia 3: data-item-id="oh" es el contenedor de horarios en Maps
        const ohSection = document.querySelector('[data-item-id="oh"]');
        if (ohSection instanceof HTMLElement) { ohSection.click(); return 'data-item-id=oh'; }

        // Estrategia 4: primer elemento collapsed cuyo texto tenga un día de la semana
        for (const el of collapsed) {
          if (DAY.test(el.textContent ?? '')) {
            if (el instanceof HTMLElement) { el.click(); return 'aria-expanded near day name'; }
          }
        }

        return null;
      });

      if (expandStrategy) {
        console.log(`     🔓 Horarios abiertos con: ${expandStrategy}`);
        // Espera a que el DOM se actualice con la tabla semanal
        await mapPage.waitForFunction(() => {
          const DAY = /^(domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i;
          const rows = [...document.querySelectorAll('table tr, li, [role="listitem"]')];
          return rows.filter((r) => DAY.test(r.textContent?.trim() ?? '')).length >= 3;
        }, { timeout: 5000 }).catch(() => null); // no falla si no aparece tabla
        await mapPage.waitForTimeout(800);
      } else {
        console.log(`     ⚠️  No se encontró trigger de horarios — leyendo lo que está visible`);
      }

      // Screenshot después del intento de expansión
      const shot = `${tmpdir()}/ig-link-map-${Date.now()}.png`;
      await mapPage.screenshot({ path: shot, fullPage: false });
      result.screenshots.push(shot);

      // ── Extracción estructurada ──────────────────────────────────────────────
      const mapInfo = await mapPage.evaluate(() => {
        const fullText = document.body?.innerText ?? '';
        const DAY_START = /^(domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i;

        // Horarios — tres métodos, del más al menos estructurado
        // Método 1: filas de tabla (más limpio cuando el dropdown está abierto)
        const tableRows = [...document.querySelectorAll('table tr')]
          .map((r) => r.innerText?.replace(/\t+/g, ' – ').replace(/\s{2,}/g, ' ').trim())
          .filter((t) => t && DAY_START.test(t));

        // Método 2: li / role="listitem" / role="row" que empiecen por día
        const listItems = [
          ...document.querySelectorAll('li, [role="listitem"], [role="row"], td'),
        ]
          .map((el) => el.innerText?.replace(/\s+/g, ' ').trim())
          .filter((t) => t && DAY_START.test(t) && t.length < 100);

        // Método 3: regex sobre texto completo (fallback)
        const regexRe = /(?:domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|sunday|monday|tuesday|wednesday|thursday|friday|saturday)[^\n]{0,80}(?:\d{1,2}(?::\d{2})?\s*(?:a\.?\s*m\.?|p\.?\s*m\.?|am|pm)|\bCerrado\b|\bClosed\b)/gi;
        const regexLines = [...new Set(fullText.match(regexRe) ?? [])].map((h) => h.trim());

        // Usa el método que devuelva más días completos (mínimo 5 de 7)
        const hours =
          tableRows.length >= 5  ? tableRows  :
          listItems.length >= 5  ? listItems  :
          regexLines.length >= 3 ? regexLines :
          // último recurso: cualquier línea con hora del texto visible
          [...new Set(fullText.match(/(?:abre|cierra|open|closed|cerrado)[^\n]{0,120}/gi) ?? [])].map((h) => h.trim());

        // Teléfonos
        const phoneRe = /(?:\+57|57)?[\s\-]?(?:3\d{2}[\s\-]?\d{3}[\s\-]?\d{4}|3\d{9}|\(\d{3}\)\s?\d{3}[\s\-]\d{4}|\d{7})/g;
        const phones = [...new Set(fullText.match(phoneRe) ?? [])]
          .map((p) => p.replace(/\s+/g, ' ').trim())
          .filter((p) => p.replace(/\D/g, '').length >= 7);

        // Dirección
        const addrRe = /(?:cra?\.?|carrera|cl\.?|calle|av\.?|avenida|dg\.?|diagonal|tv\.?|transversal)\s*\d+[^\n]{0,80}(?:#|\d)/gi;
        const addresses = [...new Set(fullText.match(addrRe) ?? [])].map((a) => a.trim());

        const title = document.querySelector('h1')?.innerText?.trim() ?? document.title;
        return { text: fullText.slice(0, 6000), phones, hours, addresses, title, hoursMethod: tableRows.length >= 5 ? 'table' : listItems.length >= 5 ? 'list' : 'regex' };
      });

      result.title     = mapInfo.title;
      result.text      = mapInfo.text;
      result.phones    = mapInfo.phones;
      result.hours     = mapInfo.hours;
      result.addresses = mapInfo.addresses;

      console.log(`     📸 ${shot}`);
      console.log(`     🗓  Horarios (método: ${mapInfo.hoursMethod}, ${mapInfo.hours.length} líneas):`);
      mapInfo.hours.forEach((h) => console.log(`        ${h}`));
      if (result.phones.length)    console.log(`     📞 ${result.phones.join(', ')}`);
      if (result.addresses.length) console.log(`     📍 ${result.addresses.join(' | ')}`);

    } catch (e) {
      console.log(`     ✗ Error Maps: ${e.message}`);
      result.error = e.message;
    } finally {
      await mapPage.close().catch(() => {});
    }
    return result;
  }

  const page = await context.newPage();
  await page.route('**/*', (route) => {
    const t = route.request().resourceType();
    if (['media', 'websocket'].includes(t)) route.abort();
    else route.continue();
  });

  const VISIT_TIMEOUT = 20000;

  try {
    console.log(`  🌐 [${hintType}] Abriendo: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: VISIT_TIMEOUT });

    const extraWait = ['menu', 'linktree', 'website'].includes(hintType) ? 3000 : 1500;
    await page.waitForTimeout(extraWait);

    result.title = await page.title();

    const screenshotPath = `${tmpdir()}/ig-link-${hintType}-${depth}-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.screenshots.push(screenshotPath);
    console.log(`     📸 ${screenshotPath}`);

    const info = await extractPageInfo(page);
    result.text = info.text;
    result.phones = info.phones;
    result.prices = info.prices;
    result.hours = info.hours ?? [];
    result.addresses = info.addresses ?? [];

    if (result.phones.length) console.log(`     📞 Teléfonos: ${result.phones.join(', ')}`);
    if (result.prices.length) console.log(`     💲 Precios: ${result.prices.slice(0, 5).join(', ')}`);
    if (result.hours.length) console.log(`     🕐 Horarios: ${result.hours.slice(0, 3).join(' | ')}`);
    if (result.addresses.length) console.log(`     📍 Dirección: ${result.addresses.join(' | ')}`);

    result.type = inferTypeFromContent(url, info, result.title, hintType);
    if (result.type !== hintType) {
      console.log(`     🔎 Reclasificado: ${hintType} → ${result.type}`);
    }

    if (isIrrelevantPortalPage(url, result.title, result.text)) {
      console.log('     ⏹️  Página genérica/portal detectada — no sigo navegando aquí');
      result.type = 'unknown';
      result.irrelevant = true;
      return result;
    }

    if ((url === 'https://drive.google.com/' || url === 'https://docs.google.com/') && !result.prices.length && !result.hours.length && !result.addresses.length) {
      console.log('     ⏹️  Drive genérico sin datos del negocio — corto aquí');
      result.type = 'unknown';
      result.irrelevant = true;
      return result;
    }

    const isPDF = url.toLowerCase().includes('.pdf') || result.title?.toLowerCase().endsWith('.pdf');
    if (isPDF) {
      result.type = 'menu';
      console.log(`     📄 PDF detectado — tomando screenshot completo...`);
      const pdfShot = `${tmpdir()}/ig-link-pdf-${Date.now()}.png`;
      await page.screenshot({ path: pdfShot, fullPage: true });
      result.screenshots.push(pdfShot);
      console.log(`     📸 ${pdfShot}`);
    }

    if (isHeyzineLink(url)) {
      await extractHeyzineFlipbook(page, result);
    }

    if (result.type === 'menu' && depth === 0) {
      console.log(`     🍽️  Buscando secciones del menú...`);
      const clicked = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('a, button')];
        const btn = btns.find((el) => {
          const t = el.innerText?.toLowerCase().trim();
          return t === 'menú' || t === 'menu' || t === 'ver menú' || t === 'carta';
        });
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (clicked) {
        await page.waitForTimeout(3000);
        const afterClick = `${tmpdir()}/ig-link-menu-clicked-${Date.now()}.png`;
        await page.screenshot({ path: afterClick, fullPage: true });
        result.screenshots.push(afterClick);
        console.log(`     📸 tras click: ${afterClick}`);
        const afterInfo = await extractPageInfo(page);
        result.text += '\n\n--- MENÚ ---\n' + afterInfo.text;
        result.prices = [...new Set([...result.prices, ...afterInfo.prices])];
        result.hours = [...new Set([...result.hours, ...(afterInfo.hours ?? [])])];
        result.addresses = [...new Set([...result.addresses, ...(afterInfo.addresses ?? [])])];
        if (afterInfo.prices.length) console.log(`     💲 Precios menú: ${afterInfo.prices.slice(0, 8).join(', ')}`);
      }
    }

    const candidateLinks = collectCandidateLinks(url, info, result.type, depth, visited);
    if (candidateLinks.length) {
      console.log(`     🔎 Navegando ${candidateLinks.length} sublink(s) detectados...`);
    }
    for (const link of candidateLinks) {
      console.log(`       → ${link.text || link.href}`);
      const sub = await visitAndExtract(context, link.href, depth + 1, visited);
      if (sub) {
        const useful = hasUsefulInfo(sub);
        console.log(`         ${useful ? '✅' : '⚠️ '} [${sub.type}] ${sub.title || sub.url}`);
        result.subLinks.push(sub);
      }
    }
  } catch (e) {
    const msg = e.message?.includes('timeout') ? 'timeout (20s)' : e.message;
    console.log(`  ✗ ${msg} — cerrando pestaña`);
    result.error = msg;
  } finally {
    await page.close().catch(() => {});
  }
  return result;
}

// ─── Highlights ───────────────────────────────────────────────────────────────

async function scrapeHighlight(page, pos, index, label, screenshotDir) {
  console.log(`\n  → Abriendo highlight "${label}"...`);
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(HIGHLIGHT_WAIT_MS);

  const urlAfterClick = page.url();
  if (!urlAfterClick.includes('/stories/') && !urlAfterClick.includes('/highlights/')) {
    console.log(`     (no se abrió — URL: ${urlAfterClick})`);
    return [];
  }

  // Extrae el ID del highlight de la URL para detectar si Instagram pasó al siguiente
  const highlightIdMatch = urlAfterClick.match(/highlights\/(\d+)/);
  const originalHighlightId = highlightIdMatch ? highlightIdMatch[1] : null;

  const screenshots = [];
  const linksFound = [];
  for (let i = 0; i < MAX_STORIES; i++) {
    const filename = `${screenshotDir}/highlight-${index + 1}-story-${i + 1}.png`;
    await page.screenshot({ path: filename });
    screenshots.push(filename);
    console.log(`     📸 slide ${i + 1}: ${filename}`);

    // Busca link stickers o URLs visibles dentro del slide
    const slideLinks = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href]')]
        .map((a) => a.href)
        .filter((h) => h && h.startsWith('http') && !h.includes('instagram.com'));
      // También busca texto que parezca URL (link stickers se renderizan como texto)
      const textLinks = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent?.trim() ?? '';
        if (/https?:\/\/[^\s]{6,}/.test(t)) textLinks.push(t.match(/https?:\/\/[^\s]+/)[0]);
      }
      return [...new Set([...links, ...textLinks])];
    });
    if (slideLinks.length) {
      slideLinks.forEach((l) => {
        if (!linksFound.includes(l)) {
          linksFound.push(l);
          console.log(`     🔗 link en slide: ${l}`);
        }
      });
    }

    const vw = page.viewportSize()?.width ?? 1280;
    const vh = page.viewportSize()?.height ?? 900;
    await page.mouse.click(vw * 0.75, vh * 0.6);
    await page.waitForTimeout(STORY_ADVANCE_MS);

    const cur = page.url();
    // Salir si ya no estamos en stories/highlights
    if (!cur.includes('/stories/') && !cur.includes('/highlights/')) break;
    // Salir si Instagram nos pasó automáticamente a OTRO highlight
    if (originalHighlightId) {
      const curIdMatch = cur.match(/highlights\/(\d+)/);
      if (curIdMatch && curIdMatch[1] !== originalHighlightId) {
        console.log(`     (fin del highlight — pasó al siguiente automáticamente)`);
        break;
      }
    }
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  return { screenshots, links: linksFound };
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function ensureLoggedIn(page, context) {
  const notLoggedIn = await page.evaluate(() => {
    const text = document.body.innerText ?? '';
    return text.includes('Iniciar sesión') || text.includes('Log in') || !!document.querySelector('input[name="username"]');
  });
  if (!notLoggedIn) return;

  const igUser = process.env.IG_USERNAME ?? 'mateozuluagac13';
  const igPass = process.env.IG_PASSWORD ?? 'Bogotaocali_14';
  console.log('🔐 Sin sesión activa, haciendo login...');

  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const usernameInput = await page.waitForSelector(
    'input[name="username"], input[name="email"], input[type="text"]:not([type="search"])',
    { timeout: 15000 }
  ).catch(() => null);
  if (!usernameInput) throw new Error('No se cargó el formulario de login');

  await page.waitForTimeout(500);
  await usernameInput.fill(igUser);
  const passInput = await page.$('input[name="pass"], input[name="password"], input[type="password"]');
  if (!passInput) throw new Error('No se encontró el campo de contraseña');
  await passInput.fill(igPass);
  await passInput.press('Enter');
  await page.waitForTimeout(6000);

  for (const sel of ['button:has-text("Ahora no")', 'button:has-text("Not Now")', 'button:has-text("Cancel")']) {
    try { const b = await page.$(sel); if (b) { await b.click(); await page.waitForTimeout(800); } } catch { /**/ }
  }
}

// ─── Extracción de imágenes de un post / carrusel ─────────────────────────────

async function extractPostImages(context, postUrl) {
  const page = await context.newPage();
  const images = [];

  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.waitForSelector('img', { timeout: 8000 }).catch(() => null);

    const seen = new Set();
    const MAX_SLIDES = 20;

    for (let slide = 0; slide < MAX_SLIDES; slide++) {
      const current = await page.evaluate(() => {
        const normalizeSrc = (img) => {
          let src = img.currentSrc || img.src || null;
          if (img.srcset) {
            const parts = img.srcset
              .split(',')
              .map((s) => s.trim().split(' '))
              .filter((part) => part[0]);
            const best = parts.sort((a, b) => parseInt(b[1] ?? 0) - parseInt(a[1] ?? 0))[0];
            if (best?.[0]) src = best[0];
          }
          return src;
        };

        const ogImage = document.querySelector('meta[property="og:image"], meta[name="og:image"]')?.getAttribute('content');

        const scopes = [
          document.querySelector('article'),
          document.querySelector('main'),
          document.body,
        ].filter(Boolean);

        const candidates = [];
        for (const scope of scopes) {
          for (const img of scope.querySelectorAll('img')) {
            const width = img.naturalWidth || img.width || 0;
            const height = img.naturalHeight || img.height || 0;
            const alt = (img.getAttribute('alt') || '').toLowerCase();
            const src = normalizeSrc(img);

            if (!src || src.startsWith('data:')) continue;
            if (width < 200 || height < 200) continue;
            if (/foto del perfil|profile picture|avatar/.test(alt)) continue;

            candidates.push({ src, width, height });
          }
        }

        if (ogImage && !candidates.some((img) => img.src === ogImage)) {
          candidates.push({ src: ogImage, width: null, height: null, og: true });
        }

        if (!candidates.length) return null;

        if (ogImage) {
          const ogCandidate = candidates.find((img) => img.src === ogImage);
          if (ogCandidate) {
            return {
              src: ogCandidate.src,
              width: ogCandidate.width ?? null,
              height: ogCandidate.height ?? null,
            };
          }
        }

        const main = candidates.sort((a, b) => {
          const aArea = (a.width || 0) * (a.height || 0);
          const bArea = (b.width || 0) * (b.height || 0);
          return bArea - aArea;
        })[0];

        return {
          src: main.src,
          width: main.width ?? null,
          height: main.height ?? null,
        };
      });

      if (current?.src && !current.src.startsWith('data:') && !seen.has(current.src)) {
        images.push(current);
        seen.add(current.src);
      }

      const nextClickInfo = await page.evaluate(() => {
        const buttonCandidates = [
          ...document.querySelectorAll('button'),
          ...document.querySelectorAll('[role="button"]'),
        ];

        const nextBtn = buttonCandidates.find((b) => {
          const aria = (b.getAttribute('aria-label') ?? '').trim();
          const text = (b.textContent ?? '').trim();
          return /next|sig|siguiente|prox|próx|näch|suiv|pros/i.test(`${aria} ${text}`);
        });

        if (nextBtn instanceof HTMLElement) {
          nextBtn.click();
          return { clicked: true };
        }

        return { clicked: false };
      });

      if (!nextClickInfo?.clicked) break;
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    console.log(`   ⚠️  Error extrayendo post/carrusel: ${e.message}`);
  } finally {
    await page.close().catch(() => {});
  }

  return images;
}

// ─── Descarga una imagen desde el contexto del browser ────────────────────────

async function downloadImage(page, src, filename) {
  const buffer = await page.evaluate(async (url) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    return [...new Uint8Array(ab)];
  }, src);
  writeFileSync(filename, Buffer.from(buffer));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 Scraping: ${PROFILE_URL}\n`);

  const sessionDir = process.env.IG_SESSION_DIR || `${process.env.HOME}/.spots-ig-session`;
  mkdirSync(sessionDir, { recursive: true });

  const context = await chromium.launchPersistentContext(sessionDir, {
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--disable-web-security'],
    ignoreDefaultArgs: ['--enable-automation'],
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  // Resultado acumulado
  const result = {
    instagram: PROFILE_URL,
    bio: '',
    bioLink: null,       // mejor link (backward compat)
    bioLinks: [],        // TODOS los links encontrados en bio
    visitedLinks: [],    // { url, type, title, text, phones, prices, subLinks, screenshots }
    links: [],           // alias mantenido por compatibilidad
    highlights: [],      // { label, screenshots: [] }
  };

  try {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await ensureLoggedIn(page, context);
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Cierra overlays
    for (const sel of ['button:has-text("Not Now")', 'button:has-text("Ahora no")', 'button:has-text("Aceptar")']) {
      try { const b = await page.$(sel); if (b) { await b.click(); await page.waitForTimeout(600); } } catch { /**/ }
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // Expande bio
    try {
      const moreBtn = await page.$('span:has-text("más"), span:has-text("more"), a:has-text("más"), a:has-text("more")');
      if (moreBtn) { await moreBtn.click({ timeout: 3000 }); await page.waitForTimeout(800); }
    } catch { /**/ }

    // ── Links del modal nativo de Instagram ("y N más") ──────────────────────
    // Instagram permite múltiples bio links nativos — aparecen como modal al hacer clic.
    // El botón se detecta por patrón numérico (idioma-agnóstico): contiene un dígito
    // seguido de una palabra ("más", "more", "plus", "mais", etc.)
    const nativeModalLinks = [];
    try {
      const multiLinkBtn = await page.evaluateHandle(() => {
        // Busca el trigger nativo de IG para múltiples links:
        // suele verse como "dominio.com y 2 más" o "domain.com and 2 more".
        const header = document.querySelector('header') ?? document.querySelector('main');
        if (!header) return null;
        const candidates = [...header.querySelectorAll('a, button, [role="button"], span, div')];
        const moreRe =
          /(?:\b(?:y|and|e)\s+\d+\s+(?:más|mas|more|plus|mais)\b|\b\d+\s+(?:más|mas|more|plus|mais)\b)/i;
        const domainRe = /(?:www\.)?(?:[a-z0-9-]+\.)+(?:co|com|net|org|io|app|site|page|link|me|tv|shop)(?:\/[^\s]*)?/i;
        return candidates.find((el) => {
          const t = el.innerText?.trim() ?? '';
          if (!t || t.length > 120) return false;
          if (!moreRe.test(t)) return false;
          if (!domainRe.test(t)) return false;
          if (/followers|seguidores|following|seguidos|posts|publicaciones/i.test(t)) return false;
          return true;
        }) ?? null;
      });

      const isValid = await multiLinkBtn.evaluate((el) => el !== null && el !== document.body).catch(() => false);

      if (isValid) {
        console.log('🔗 Modal de múltiples links detectado — abriendo...');
        await multiLinkBtn.click();
        await page.waitForTimeout(1500);

        // Extrae links del modal — Instagram lo renderiza como dialog o sheet flotante
        const modalLinks = await page.evaluate(() => {
          const decodeInstagramRedirect = (raw) => {
            if (!raw) return null;
            try {
              const url = new URL(raw, location.origin);
              if (url.hostname.includes('l.instagram.com')) {
                const redirected = url.searchParams.get('u');
                if (redirected) return decodeURIComponent(redirected);
              }
              return url.toString();
            } catch {
              return null;
            }
          };

          const normalizeUrl = (raw) => {
            if (!raw) return null;
            const trimmed = raw.trim().replace(/[),.;]+$/g, '');
            const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
            const decoded = decodeInstagramRedirect(withProtocol) ?? withProtocol;
            try {
              const parsed = new URL(decoded);
              if (parsed.hostname.includes('instagram.com') || parsed.hostname.includes('threads.net')) return null;
              return parsed.toString();
            } catch {
              return null;
            }
          };

          const urlRe = /(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+(?:co|com|net|org|io|app|site|page|link|me|gl|gg|tv|studio|shop|store|cafe|bar|restaurant)(?:\/[^\s"'<>]*)?/gi;

          const dialogs = [...document.querySelectorAll('[role="dialog"]')];
          const modal =
            dialogs.find((d) => /enlaces|links/i.test(d.innerText ?? '')) ??
            dialogs.find((d) => {
              const buttons = d.querySelectorAll('a[href], button, [role="button"]');
              return buttons.length >= 2;
            }) ??
            document.querySelector('[aria-label="Enlaces"], [aria-label="Links"]') ??
            [...document.querySelectorAll('div')].find((d) => {
              const text = d.innerText ?? '';
              const style = getComputedStyle(d);
              return /enlaces|links/i.test(text) && style.position === 'fixed';
            });

          const container = modal ?? document.body;
          const byUrl = new Map();
          const pushLink = (url, text) => {
            const normalized = normalizeUrl(url);
            if (!normalized) return;
            const current = byUrl.get(normalized);
            const nextText = (text ?? '').trim() || normalized;
            if (!current || nextText.length > current.text.length) {
              byUrl.set(normalized, { url: normalized, text: nextText });
            }
          };

          for (const anchor of container.querySelectorAll('a[href]')) {
            pushLink(anchor.href, anchor.innerText);
          }

          const rowCandidates = [...container.querySelectorAll('button, [role="button"], li, section > div, div')];
          for (const row of rowCandidates) {
            const text = row.innerText?.trim();
            if (!text || text.length < 6) continue;
            if (/^enlaces$/i.test(text) || /^links$/i.test(text) || /^cerrar$/i.test(text)) continue;
            const matches = text.match(urlRe) ?? [];
            for (const match of matches) pushLink(match, text.split('\n').filter(Boolean)[0] ?? text);
          }

          return [...byUrl.values()];
        });

        nativeModalLinks.push(...modalLinks);
        console.log(`   → ${modalLinks.length} links en modal: ${modalLinks.map((l) => l.url).join(', ')}`);

        // Cierra el modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(800);
      }
    } catch (e) {
      console.log(`   (sin modal de links: ${e.message})`);
    }

    // ── Bio + todos los links del bio ────────────────────────────────────────
    const { bio, bioLinks } = await page.evaluate(() => {
      const header = document.querySelector('header') ?? document.querySelector('main');
      if (!header) return { bio: '', bioLinks: [] };
      const spans = [...header.querySelectorAll('span, div, p, h1, h2')];
      const candidates = spans.map((el) => el.innerText?.trim() ?? '').filter((t) => t.length > 15 && !t.includes('\n\n\n'));
      const bio = candidates.sort((a, b) => b.length - a.length)[0] ?? header.innerText?.trim() ?? '';

      const normalizeUrl = (raw) => {
        if (!raw) return null;
        const trimmed = raw.trim().replace(/[),.;]+$/g, '');
        const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
        try {
          return new URL(normalized).toString();
        } catch {
          return null;
        }
      };

      const scoreCandidate = (url) => {
        let score = 0;
        if (!url) return score;
        if (url.includes('/flip-book/')) score += 100;
        if (url.includes('menupp')) score += 90;
        if (url.includes('me-qr.com') || url.includes('me-qr.co')) score += 85;
        if (url.includes('heyzine')) score += 80;
        if (url.includes('linktr.ee')) score += 60;
        score += Math.min(url.length, 120);
        const path = (() => {
          try { return new URL(url).pathname; } catch { return ''; }
        })();
        score += path.split('/').filter(Boolean).length * 10;
        return score;
      };

      const candidateMap = new Map();

      // 1) Intenta encontrar <a> externos en el header
      const anchorLinks = [...header.querySelectorAll('a[href]')]
        .map((a) => ({
          href: a.href,
          text: a.innerText?.trim() ?? '',
        }))
        .filter((a) => a.href && !a.href.includes('instagram.com') && a.href.startsWith('http'));

      for (const candidate of anchorLinks) {
        const normalizedHref = normalizeUrl(candidate.href);
        if (normalizedHref) candidateMap.set(normalizedHref, candidate.text || normalizedHref);
        const normalizedText = normalizeUrl(candidate.text);
        if (normalizedText) candidateMap.set(normalizedText, candidate.text || normalizedText);
      }

      // 2) Fallback: busca URLs o dominios en texto plano de la bio
      const urlRe = /https?:\/\/[^\s"'<>]{4,}|(?:www\.)?(?:[a-z0-9-]+\.)+(?:co|com|net|org|io|app|site|page|link|me|gl|gg|tv|studio|shop|store|cafe|bar|restaurant)(?:\/[^\s"'<>]*)?/gi;
      const textMatches = bio.match(urlRe) ?? [];
      for (const raw of textMatches) {
        const normalized = normalizeUrl(raw);
        if (!normalized) continue;
        try {
          const host = new URL(normalized).hostname;
          if (host.includes('instagram.com')) continue;
          candidateMap.set(normalized, raw);
        } catch { /* invalid url, skip */ }
      }

      // Agrega heyzine y me-qr desde todo el texto de la página (alta prioridad)
      const allText = `${bio}\n${header.innerText ?? ''}\n${document.body?.innerText ?? ''}`;
      const explicitHeyzineMatch = allText.match(/(?:https?:\/\/)?(?:www\.)?heyzine\.(?:com|co)\/flip-book\/[^\s"'<>]+/i);
      if (explicitHeyzineMatch) {
        const normalizedHeyzine = normalizeUrl(explicitHeyzineMatch[0])?.replace('https://heyzine.co/', 'https://heyzine.com/');
        if (normalizedHeyzine) candidateMap.set(normalizedHeyzine, explicitHeyzineMatch[0]);
      }

      const explicitMeQrMatch = allText.match(/(?:https?:\/\/)?(?:www\.)?qr\.me-qr\.(?:com|co)\/[^\s"'<>]+/i);
      if (explicitMeQrMatch) {
        const normalizedMeQr = normalizeUrl(explicitMeQrMatch[0]);
        if (normalizedMeQr) candidateMap.set(normalizedMeQr, explicitMeQrMatch[0]);
      }

      // Retorna TODOS los candidatos ordenados por score (no solo el mejor)
      const candidatesRanked = [...candidateMap.entries()]
        .filter(([url]) => {
          try { return !new URL(url).hostname.includes('instagram.com'); }
          catch { return false; }
        })
        .sort((a, b) => scoreCandidate(b[0]) - scoreCandidate(a[0]));

      const bioLinks = candidatesRanked.map(([url, text]) => ({ url, text }));
      return { bio, bioLinks };
    });

    result.bio = bio;

    // Fusiona: modal nativo tiene precedencia (son los links reales de IG),
    // luego agrega los detectados en texto que no estén ya
    const modalUrls = new Set(nativeModalLinks.map((l) => l.url));
    const extraFromEval = (bioLinks ?? []).filter((bl) => !modalUrls.has(bl.url));
    result.bioLinks = [...nativeModalLinks, ...extraFromEval];
    result.bioLink = result.bioLinks[0] ?? null; // backward compat

    console.log('📋 BIO:\n' + bio + '\n');
    if (result.bioLinks.length > 0) {
      console.log(`🔗 Links en bio (${result.bioLinks.length}):`);
      result.bioLinks.forEach((bl, i) => console.log(`   ${i + 1}. ${bl.text} → ${bl.url}`));
    }

    // ── Navegar TODOS los links del bio ─────────────────────────────────────
    // Links de bio: siempre se guardan si se visitaron (son la fuente principal de info)
    if (result.bioLinks.length > 0) {
      console.log(`\n🌐 Visitando ${result.bioLinks.length} link(s) del bio...`);
      for (const bl of result.bioLinks) {
        if (shouldSkipLink(bl.url)) {
          console.log(`\n⏭️  Ignorado (${new URL(bl.url).hostname})`);
          continue;
        }
        console.log(`\n→ [${result.bioLinks.indexOf(bl) + 1}/${result.bioLinks.length}] ${bl.url}`);
        const linkData = await visitAndExtract(context, bl.url, 0, new Set());
        if (linkData) {
          const useful = hasUsefulInfo(linkData);
          console.log(`   ${useful ? '✅' : '⚠️ '} [${linkData.type}] ${linkData.title || linkData.url}`);
          // Siempre guardamos links del bio visitados — no descartamos nada del nivel 0
          result.visitedLinks.push(linkData);
          result.links.push(linkData);
        }
      }
    }

    // ── Volver al perfil y capturar highlights ───────────────────────────────
    console.log('\n↩️  Volviendo al perfil...');
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    const highlightPositions = await page.evaluate(() => {
      const lists = document.querySelectorAll('ul');
      for (const ul of lists) {
        const items = ul.querySelectorAll('li');
        if (items.length > 0) {
          const rects = [];
          items.forEach((li) => {
            const r = li.getBoundingClientRect();
            if (r.width > 40 && r.height > 40 && r.top > 0) {
              const label = li.innerText?.trim().split('\n')[0] ?? '';
              rects.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, label });
            }
          });
          if (rects.length > 0) return rects;
        }
      }
      return [];
    });

    console.log(`\n✨ Highlights encontrados: ${highlightPositions.length}`);
    highlightPositions.forEach((h, i) => console.log(`   ${i + 1}. "${h.label}"`));

    const relevant = highlightPositions.filter((h) => isRelevantHighlight(h.label));
    const ignored  = highlightPositions.filter((h) => !isRelevantHighlight(h.label));
    if (relevant.length) console.log(`\n✅ Relevantes: ${relevant.map((h) => `"${h.label}"`).join(', ')}`);
    if (ignored.length)  console.log(`   Ignorados: ${ignored.map((h) => `"${h.label}"`).join(', ')}`);

    const screenshotDir = `${tmpdir()}/ig-scrape-${Date.now()}`;
    mkdirSync(screenshotDir, { recursive: true });
    console.log(`\n📁 Screenshots: ${screenshotDir}`);

    const highlightLinks = [];
    for (let i = 0; i < relevant.length; i++) {
      const pos = relevant[i];
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
      const { screenshots: shots, links: sLinks } = await scrapeHighlight(page, pos, i, pos.label, screenshotDir);
      result.highlights.push({ label: pos.label, screenshots: shots });
      highlightLinks.push(...sLinks);
    }

    // Visita links encontrados dentro de highlights (menús externos, etc.)
    const uniqueHighlightLinks = [...new Set(highlightLinks)];
    if (uniqueHighlightLinks.length) {
      console.log(`\n🔗 Links en highlights — visitando...`);
      for (const url of uniqueHighlightLinks) {
        if (shouldSkipLink(url)) {
          console.log(`   ⏭️  ${new URL(url).hostname} — ignorado`);
          continue;
        }
        console.log(`   → ${url}`);
        const linkData = await visitAndExtract(context, url, 0, new Set());
        if (linkData) {
          const useful = hasUsefulInfo(linkData);
          console.log(`     ${useful ? '✅' : '⚠️ '} [${linkData.type}] guardado desde highlight`);
          result.links.push({ ...linkData, foundIn: 'highlight' });
        }
      }
    }

    // ── Output estructurado ──────────────────────────────────────────────────
    const allTexts = result.links.map((l) => {
      const subs = (l.subLinks ?? []).map((s) => s.text).join('\n');
      return l.text + '\n' + subs;
    }).join('\n\n');

    // Consolida toda la info extraída de links + sub-links
    const allLinksFlat = result.links.flatMap((l) => [l, ...(l.subLinks ?? [])]);
    const allPhones    = [...new Set(allLinksFlat.flatMap((l) => l.phones ?? []))];
    // Precios solo de fuentes tipo 'menu'
    const allPrices    = [...new Set(allLinksFlat.filter((l) => l.type === 'menu').flatMap((l) => l.prices ?? []))];
    const allHours     = [...new Set(allLinksFlat.flatMap((l) => l.hours ?? []))];
    const allAddresses = [...new Set(allLinksFlat.flatMap((l) => l.addresses ?? []))];

    // ── Fotos del grid ───────────────────────────────────────────────────────
    console.log('\n📷 Extrayendo fotos del grid...');
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Scroll progresivo: recorre todo el feed hasta que no aparezcan posts nuevos
    const MAX_FEED_SCROLLS = 60;   // explora más a fondo perfiles con bastante histórico
    const MAX_PHOTOS       = 120;  // candidatos amplios; la curaduría final la hace Codex
    let lastCount = 0;
    let staleCycles = 0;

    for (let s = 0; s < MAX_FEED_SCROLLS; s++) {
      const count = await page.evaluate(() =>
        document.querySelectorAll('a[href*="/p/"]').length
      );
      if (count >= MAX_PHOTOS) break;
      if (count === lastCount) {
        staleCycles++;
        if (staleCycles >= 3) break; // 3 scrolls sin posts nuevos → fin del feed
      } else {
        staleCycles = 0;
        lastCount = count;
      }
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(900);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Recoge TODOS los posts cargados en el grid
    const gridPosts = await page.evaluate(() => {
      const posts = [];
      const seen = new Set();
      const links = [...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')];
      for (const a of links) {
        const isReel = a.href.includes('/reel/') ||
          !!a.querySelector('svg[aria-label*="eel"], svg[aria-label*="Clip"], svg[aria-label*="Video"]');
        if (isReel) continue;

        const img = a.querySelector('img');
        if (!img) continue;

        // Toma la URL de mayor resolución disponible en srcset
        let src = img.src;
        if (img.srcset) {
          const parts = img.srcset.split(',').map((s) => s.trim().split(' '));
          const best = parts.sort((a, b) => parseInt(b[1] ?? 0) - parseInt(a[1] ?? 0))[0];
          if (best?.[0]) src = best[0];
        }
        if (!src || src.startsWith('data:')) continue;

        const key = a.href; // dedup por URL del post
        if (seen.has(key)) continue;
        seen.add(key);

        // Detecta carrusel por ícono SVG (idioma-agnóstico: busca variantes del aria-label)
        const isCarousel = !!a.querySelector(
          'svg[aria-label*="arousel"], svg[aria-label*="arrusel"], svg[aria-label*="ultiple"], svg[aria-label*="album"]'
        );

        posts.push({ src, href: a.href, isCarousel });
      }
      return posts;
    });

    const carouselCount = gridPosts.filter((p) => p.isCarousel).length;
    console.log(`   Encontrados ${gridPosts.length} posts sin reels (${carouselCount} carruseles)`);

    const photosDir = `${screenshotDir}/photos`;
    mkdirSync(photosDir, { recursive: true });
    result.photos = [];
    const downloadedPhotoSrcs = new Set();

    for (let i = 0; i < gridPosts.length; i++) {
      const { src, href, isCarousel } = gridPosts[i];
      const pad = String(i + 1).padStart(2, '0');

      // ── Post real: abre el post para extraer imagen grande ─────────────────
      console.log(`   ${isCarousel ? '🎠' : '🖼️ '} [${i + 1}] ${isCarousel ? 'Carrusel' : 'Post'} — ${href}`);
      const postImages = await extractPostImages(context, href);

      if (isCarousel) {
        console.log(`       → ${postImages.length} slide(s)`);
        for (let j = 0; j < postImages.length; j++) {
          const filename = `${photosDir}/photo-${pad}-slide-${j + 1}.jpg`;
          try {
            if (downloadedPhotoSrcs.has(postImages[j].src)) {
              console.log(`     ↩️  slide ${j + 1} duplicado global — omitido`);
              continue;
            }
            await downloadImage(page, postImages[j].src, filename);
            downloadedPhotoSrcs.add(postImages[j].src);
            result.photos.push({
              file: filename,
              postUrl: href,
              slide: j + 1,
              width: postImages[j].width ?? null,
              height: postImages[j].height ?? null,
              source: 'post'
            });
            console.log(`     📷 slide ${j + 1}: ${filename}`);
          } catch (e) {
            console.log(`     ⚠️  slide ${j + 1} error: ${e.message}`);
          }
        }

        if (postImages.length === 0) {
          const filename = `${photosDir}/photo-${pad}.jpg`;
          try {
            await downloadImage(page, src, filename);
            result.photos.push({ file: filename, postUrl: href, source: 'grid-fallback' });
            console.log(`   📷 [${i + 1}] fallback miniatura: ${filename}`);
          } catch (e) {
            console.log(`   ⚠️  [${i + 1}] fallback error: ${e.message}`);
          }
        }
      } else {
        const bestImage = postImages[0];
        const filename = `${photosDir}/photo-${pad}.jpg`;

        try {
          if (bestImage?.src) {
            if (downloadedPhotoSrcs.has(bestImage.src)) {
              throw new Error('global duplicate post image');
            }
            await downloadImage(page, bestImage.src, filename);
            downloadedPhotoSrcs.add(bestImage.src);
            result.photos.push({
              file: filename,
              postUrl: href,
              width: bestImage.width ?? null,
              height: bestImage.height ?? null,
              source: 'post'
            });
            console.log(`   📷 [${i + 1}] ${filename}`);
          } else {
            if (downloadedPhotoSrcs.has(src)) throw new Error('global duplicate grid image');
            await downloadImage(page, src, filename);
            downloadedPhotoSrcs.add(src);
            result.photos.push({ file: filename, postUrl: href, source: 'grid-fallback' });
            console.log(`   📷 [${i + 1}] fallback miniatura: ${filename}`);
          }
        } catch (e) {
          try {
            if (!downloadedPhotoSrcs.has(src)) {
              await downloadImage(page, src, filename);
              downloadedPhotoSrcs.add(src);
              result.photos.push({ file: filename, postUrl: href, source: 'grid-fallback' });
              console.log(`   📷 [${i + 1}] fallback miniatura: ${filename}`);
              continue;
            }
          } catch { /**/ }
          console.log(`   ⚠️  [${i + 1}] Error descargando: ${e.message}`);
        }
      }
    }

    // ── Consolidación: contrasta fuentes y produce veredicto ────────────────
    result.verdict = consolidate(result);

    // Guarda JSON completo
    const jsonPath = `${screenshotDir}/data.json`;
    writeFileSync(jsonPath, JSON.stringify(result, null, 2));

    console.log('\n\n══════════════════════════════════════════════════════');
    console.log('  DATOS RECOPILADOS — pasa esto a Claude para interpretar');
    console.log('══════════════════════════════════════════════════════\n');

    console.log(`INSTAGRAM: ${result.instagram}`);
    console.log(`\nBIO:\n${result.bio}`);

    if (result.bioLinks?.length > 0) {
      console.log(`\nLINKS BIO (${result.bioLinks.length}):`);
      result.bioLinks.forEach((bl, i) => console.log(`  ${i + 1}. [${classifyLink(bl.url)}] ${bl.url}`));
    }

    // ── Imprime veredicto consolidado ────────────────────────────────────────
    const v = result.verdict ?? {};
    const verdictFields = [
      ['addresses', '📍 DIRECCIÓN / SEDES'],
      ['hours',     '🕐 HORARIOS'],
      ['phones',    '📞 TELÉFONOS / WHATSAPP'],
      ['prices',    '💲 PRECIOS'],
    ];

    console.log('\n══════════════════════════════════════════════════════');
    console.log('  VEREDICTO CONSOLIDADO');
    console.log('══════════════════════════════════════════════════════');
    console.log('  Fuente primaria: Instagram. Links externos = fuente secundaria.');
    console.log('  ✅ = confirmado por varias fuentes  ⚠️  = solo una fuente  ⚡ = conflicto\n');

    let hasAnyVerdict = false;
    for (const [field, label] of verdictFields) {
      if (!v[field]) continue;
      hasAnyVerdict = true;
      const entry = v[field];
      const icon  = entry.conflicts?.length ? '⚡' : entry.confirmed ? '✅' : '⚠️ ';
      console.log(`${label}:`);
      // Muestra todos los valores ordenados por prioridad de fuente
      for (const item of entry.all) {
        const srcTag  = item.sources.join('+');
        const confirm = item.confirmedBy > 1 ? ` (x${item.confirmedBy} fuentes)` : '';
        const primary = item.priority === 1 ? ' ★ INSTAGRAM' : '';
        console.log(`  ${icon} ${item.value}  [${srcTag}]${confirm}${primary}`);
      }
      if (entry.conflicts?.length) {
        console.log(`     ↳ Conflicto: fuentes distintas dan valores diferentes — usar el marcado ★`);
      }
    }

    if (!hasAnyVerdict) {
      console.log('  (no se detectaron datos estructurados — revisar screenshots y texto de links)');
    }
    console.log('══════════════════════════════════════════════════════\n');

    console.log(`\nLINKS VISITADOS:`);
    const printLink = (l, indent = '  ') => {
      const tag = `[${l.type}]`;
      const info = [
        l.addresses?.length ? `📍 ${l.addresses.join(', ')}` : '',
        l.hours?.length     ? `🕐 ${l.hours.slice(0,2).join(' | ')}` : '',
        l.phones?.length    ? `📞 ${l.phones.join(', ')}` : '',
        l.prices?.length    ? `💲 ${l.prices.slice(0,3).join(', ')}` : '',
      ].filter(Boolean).join('  ');
      console.log(`${indent}• ${tag} ${l.title || l.url}`);
      if (info) console.log(`${indent}  ${info}`);
      if (l.screenshots?.length) console.log(`${indent}  📸 ${l.screenshots[0]}`);
      (l.subLinks ?? []).forEach((s) => printLink(s, indent + '  '));
    };
    result.links.forEach((l) => printLink(l));

    console.log(`\nHIGHLIGHTS CAPTURADOS:`);
    result.highlights.forEach(({ label, screenshots }) => {
      console.log(`\n  "${label}" — ${screenshots.length} slide(s)`);
      screenshots.forEach((f, idx) => {
        const isLast = idx === screenshots.length - 1;
        console.log(`    ${isLast ? '★' : ' '} [${idx + 1}] ${f}`);
      });
    });

    if (result.photos?.length) {
      console.log(`\nFOTOS DEL GRID (${result.photos.length} — sin reels):`);
      result.photos.forEach((p, i) => console.log(`  [${i + 1}] ${p.file}`));
      console.log(`  → Directorio: ${photosDir}`);
    }

    console.log(`\n📄 JSON completo: ${jsonPath}`);
    console.log('\n══════════════════════════════════════════════════════');
    console.log('  Pasa los screenshots + el texto de arriba a Claude y pídele:');
    console.log('  "Extrae: dirección/sedes, website, menú, precios estimados,');
    console.log('   contacto/WhatsApp, horarios por sede, para cuántas personas,');
    console.log('   y palabras clave del lugar."');
    console.log('══════════════════════════════════════════════════════\n');

    await page.waitForTimeout(5000);
  } finally {
    await context.close();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
