import type { MenuCatalogItem, Spot } from './mock-spots';
import * as refreshedSources from '../public/menu-search-sources.json';

export function normalizeSearchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export type MenuSearchEvidence = {
  itemIndex: number;
  name: string;
  section: string;
  sourceUrl: string;
  verifiedAt: string;
  sourcePage?: number;
  terms: string[];
  text: string;
};
export type MenuSearchPending = { itemIndex: number; name: string; reason: string };
type SearchProduct = Omit<MenuCatalogItem, 'price' | 'category'> & { category: string };
type RefreshedSource = { products: SearchProduct[]; verifiedAt: string; sourceUrl: string; evidenceFile: string; scopeBranchId?: number };
const sources: Record<string, RefreshedSource> = refreshedSources.sources;

const has = (text: string, term: string) => (` ${text} `).includes(` ${term} `);
const drinkFamilies = [
  { term: 'cerveza', pattern: /\b(?:cerveza|cervezas|beer|beers)\b/ },
  { term: 'vino', pattern: /\b(?:vino|vinos|wine|wines|tintos|espumantes)\b/ },
  { term: 'cafe', pattern: /\b(?:cafe|cafes|coffee|espresso|americano|cappuccino|capuccino|latte|mocaccino|macchiato|flat white|cold brew)\b/ },
  { term: 'coctel', pattern: /\b(?:coctel|cocteles|cocteleria|cocktail|cocktails|mojito|margarita|negroni|daiquiri|martini|gin tonic)\b/ },
];
const protectedTerms = new Map([
  ['cerveza', 'cerveza'], ['cervezas', 'cerveza'], ['cerveceria', 'cerveza'], ['cervecerias', 'cerveza'],
  ['cerveza artesanal', 'cerveza artesanal'], ['cervezas artesanales', 'cerveza artesanal'],
  ['vino', 'vino'], ['vinos', 'vino'], ['wine', 'vino'], ['wines', 'vino'],
  ['cafe', 'cafe'], ['cafes', 'cafe'], ['cafeteria', 'cafe'], ['cafeterias', 'cafe'],
  ['coctel', 'coctel'], ['cocteles', 'coctel'], ['cocktail', 'coctel'], ['cocktails', 'coctel'],
  ['sin alcohol', 'sin alcohol'], ['bebidas sin alcohol', 'sin alcohol'], ['mocktail', 'sin alcohol'], ['mocktails', 'sin alcohol'],
  ['cerveza sin alcohol', 'cerveza sin alcohol'],
]);

function publicSource(value: unknown) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

function productTerms(item: SearchProduct) {
  const name = normalizeSearchText(item.name);
  const section = normalizeSearchText(item.menuSection || item.sourceCategory ||
    (!['mains', 'starters', 'desserts', 'drinks', 'extras', 'cover', 'tickets'].includes(item.category) ? item.category : ''));
  const category = normalizeSearchText(item.category);
  const food = /\b(?:mains|starters|desserts|postres|tortas|helados|salsas|adiciones|entradas|platos|carnes|pizzas|hamburguesas)\b/.test(category);
  const drink = !food && (category === 'drinks' || /\b(?:bebidas|cervezas|vinos|cocteles|cocteleria|cafes|licores|cafe)\b/.test(section));
  const terms = new Set<string>();
  if (drink) {
    const nameFamilies = drinkFamilies.filter(family => family.pattern.test(name) && !has(name, `sin ${family.term}`));
    const sectionFamilies = /\b(?:sin|no)\b/.test(section) ? [] : drinkFamilies.filter(family => family.pattern.test(section));
    // A mixed heading ("Cerveza y vino") cannot classify every product as both.
    for (const family of nameFamilies.length ? nameFamilies : sectionFamilies.length === 1 ? sectionFamilies : []) terms.add(family.term);
    if (terms.has('cerveza') && /\b(?:artesanal|artesanales)\b/.test(`${name} ${section}`)) terms.add('cerveza artesanal');
    if (/\bsin (?:alcohol|licor)\b|\bmocktails?\b/.test(name) || /^bebidas sin (?:alcohol|licor)$|^mocktails?$/.test(section)) terms.add('sin alcohol');
    if (terms.has('cerveza') && terms.has('sin alcohol')) terms.add('cerveza sin alcohol');
    if (terms.size || category === 'drinks') terms.add('tomar algo');
  }
  if (item.category === 'desserts') terms.add('postres');
  for (const term of ['sin gluten', 'sin lactosa', 'sin azucar']) if (has(name, term)) terms.add(term);
  return { section, text: name, terms: Array.from(terms) };
}

export function buildMenuSearchIndex(spot: Pick<Spot, 'menuItems' | 'menuUrl' | 'menuItemsVerifiedAt'> & { branchId?: number | null }) {
  const evidence: MenuSearchEvidence[] = [];
  const pending: MenuSearchPending[] = [];
  // A current, exact-source snapshot replaces (not appends to) an older menu.
  // Otherwise discontinued products could survive indefinitely in search.
  const snapshot = sources[publicSource(spot.menuUrl)];
  const latestCatalogCheck = Math.max(0, ...(spot.menuItems ?? []).map(item => Date.parse(item.verifiedAt || spot.menuItemsVerifiedAt || '') || 0));
  const refreshed = snapshot && (snapshot.scopeBranchId === undefined || snapshot.scopeBranchId === spot.branchId) &&
    Date.parse(snapshot.verifiedAt) >= latestCatalogCheck ? snapshot : undefined;
  const items = refreshed ? refreshed.products : spot.menuItems ?? [];
  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const item = items[itemIndex];
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const sourceUrl = publicSource(item.sourceUrl) || publicSource(item.source_url) ||
      publicSource(item.source) || publicSource(item.officialMenuUrl) || publicSource(item.menuUrl) ||
      (spot.menuItemsVerifiedAt ? publicSource(spot.menuUrl) : '');
    const verifiedAt = item.verifiedAt || spot.menuItemsVerifiedAt || '';
    const scope = normalizeSearchText(item.sourceScope || '');
    let reason = '';
    if (!name) reason = 'missing_name';
    else if (item.available === false || ['sold_out', 'unavailable', 'disabled'].includes(item.availability || '')) reason = 'unavailable';
    else if (/pendiente|por confirmar|no confirmad/.test(scope)) reason = 'branch_scope_unconfirmed';
    else if (!sourceUrl) reason = 'missing_source';
    else if (!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(verifiedAt) || !Number.isFinite(Date.parse(verifiedAt))) reason = 'missing_verification_date';
    if (reason) { pending.push({ itemIndex, name, reason }); continue; }
    evidence.push({ itemIndex, name, sourceUrl, verifiedAt,
      sourcePage: item.sourcePage ?? item.source_page, ...productTerms(item) });
  }
  return { evidence, pending };
}

export function menuEvidenceMatches(evidence: MenuSearchEvidence, term: string) {
  const canonical = protectedTerms.get(term);
  if (canonical) return evidence.terms.includes(canonical);
  const specificSection = !/\b(?:y|sin|no)\b|[&,/]/.test(evidence.section);
  return has(evidence.text, term) || evidence.terms.some(value => has(value, term)) ||
    (specificSection && has(evidence.section, term));
}
