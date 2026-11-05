import type { Spot } from './mock-spots';
import { buildMenuSearchIndex, menuEvidenceMatches, normalizeSearchText, type MenuSearchEvidence } from '@/lib/menu-search-index';

type SearchField = 'name' | 'location' | 'category' | 'subcategory' | 'tag' | 'mood' | 'menu';
type SearchSignal = { field: SearchField; text: string; menu?: MenuSearchEvidence };
type SearchConcept = { aliases: string[]; evidence?: string[] };
export type SpotSearchMatch = { matches: boolean; score: number; fields: SearchField[] };

// Query equivalents are shared by the catalog. Evidence may be more specific
// than a query, never the reverse: an art category does not prove ceramics.
const concepts: SearchConcept[] = [
  { aliases: ['comida', 'comer', 'restaurante', 'restaurantes'], evidence: ['comida', 'restaurantes y cafes', 'restaurante', 'restaurantes'] },
  { aliases: ['tomar algo', 'trago', 'tragos'], evidence: ['tomar algo', 'bares y noche', 'bar', 'bares', 'cerveza', 'cocteles', 'vino'] },
  { aliases: ['bar', 'bares'], evidence: ['bar', 'bares', 'pub', 'speakeasy', 'audiobar', 'bares y noche'] },
  { aliases: ['cafe', 'cafes', 'cafeteria', 'cafeterias'] },
  { aliases: ['cerveza', 'cervezas', 'pola', 'polas'], evidence: ['cerveza', 'cervezas', 'cerveceria', 'cervecerias', 'cerveza artesanal'] },
  { aliases: ['cerveza artesanal', 'cervezas artesanales', 'pola artesanal'], evidence: ['cerveza artesanal', 'cervezas artesanales'] },
  { aliases: ['cerveza sin alcohol', 'cervezas sin alcohol', 'pola sin alcohol'], evidence: ['cerveza sin alcohol'] },
  { aliases: ['coctel', 'cocteles', 'cocktail', 'cocktails'] },
  { aliases: ['vino', 'vinos', 'wine', 'wines'] },
  { aliases: ['pizza', 'pizzas', 'pizzeria', 'pizzerias'] },
  { aliases: ['hamburguesa', 'hamburguesas', 'burger', 'burgers'] },
  { aliases: ['postre', 'postres'], evidence: ['postres', 'helados', 'pasteleria', 'tortas'] },
  { aliases: ['helado', 'helados', 'gelato', 'gelateria', 'gelaterias'] },
  { aliases: ['panaderia', 'panaderias', 'bakery'] },
  { aliases: ['pasta', 'pastas'] },
  { aliases: ['taco', 'tacos'] },
  { aliases: ['sandwich', 'sandwiches', 'sanduche', 'sanduches'] },
  { aliases: ['ensalada', 'ensaladas'] },
  { aliases: ['jugo', 'jugos'] },
  { aliases: ['limonada', 'limonadas'] },
  { aliases: ['malteada', 'malteadas', 'milkshake', 'milkshakes'] },
  { aliases: ['desayuno', 'desayunos', 'desayunar'] },
  { aliases: ['almuerzo', 'almuerzos', 'almorzar'] },
  { aliases: ['cena', 'cenas', 'cenar'] },
  { aliases: ['arte', 'cultura', 'arte y cultura'], evidence: ['arte y cultura', 'arte', 'cultura', 'ceramica', 'museos', 'galerias', 'teatro', 'pintura'] },
  { aliases: ['ceramica', 'pottery', 'pintar ceramica', 'pintura en ceramica', 'pintura de ceramica'], evidence: ['ceramica', 'pottery'] },
  { aliases: ['pintar', 'pintura', 'pinturas'], evidence: ['pintar', 'pintura', 'pinturas', 'ceramica', 'acuarela'] },
  { aliases: ['museo', 'museos'] },
  { aliases: ['galeria', 'galerias'] },
  { aliases: ['cine', 'pelicula', 'peliculas', 'peli', 'pelis'], evidence: ['cine', 'cine alternativo', 'peliculas'] },
  { aliases: ['senderismo', 'hiking', 'trekking'], evidence: ['senderismo', 'hiking', 'trekking', 'caminatas'] },
  { aliases: ['al aire libre', 'aire libre'], evidence: ['al aire libre', 'aire libre', 'naturaleza y aire libre'] },
  { aliases: ['zoologico', 'zoologicos', 'ver animales', 'animalitos'], evidence: ['zoologico', 'zoologicos', 'fauna', 'animales'] },
  { aliases: ['bailar', 'rumba', 'rumbear'], evidence: ['vida nocturna', 'discoteca', 'bailar', 'rumba', 'salsa', 'reggaeton', 'techno'] },
  { aliases: ['familia', 'familiar', 'familiares', 'plan familiar', 'ninos', 'para ninos'], evidence: ['familia', 'familiar', 'familiares', 'ninos', 'infantil'] },
  { aliases: ['pet friendly', 'admite mascotas', 'con mascotas', 'con perros'], evidence: ['pet friendly', 'admite mascotas', 'acepta mascotas', 'mascotas permitidas'] },
  { aliases: ['sin gluten', 'libre de gluten', 'gluten free'] },
  { aliases: ['sin lactosa', 'libre de lactosa'] },
  { aliases: ['sin alcohol', 'bebidas sin alcohol', 'mocktail', 'mocktails'] },
  { aliases: ['sin azucar', 'libre de azucar'] },
];

const ignoredWords = new Set([
  'a', 'al', 'algo', 'buscando', 'busco', 'con', 'de', 'del', 'donde', 'el', 'en',
  'es', 'gustaria', 'hacer', 'ir', 'la', 'las', 'lo', 'los', 'lugar', 'lugares',
  'me', 'para', 'plan', 'por', 'puedo', 'que', 'quiero', 'quisiera', 'salir',
  'tipo', 'un', 'una', 'ver', 'y',
]);

export function normalizeSpotSearch(value: string) {
  return normalizeSearchText(value);
}

const vocabulary = concepts.map(concept => ({
  aliases: concept.aliases.map(normalizeSpotSearch),
  evidence: (concept.evidence ?? concept.aliases).map(normalizeSpotSearch),
}));
const phrases = vocabulary.flatMap(concept => concept.aliases.map(alias => ({
  alias, words: alias.split(' '), evidence: concept.evidence,
}))).sort((a, b) => b.words.length - a.words.length);
const assertedAbsences = new Set(vocabulary.flatMap(concept => concept.evidence).filter(value => value.startsWith('sin ')));
const documentCache = new WeakMap<Spot, SearchSignal[]>();
const fieldWeight: Record<SearchField, number> = { name: 80, location: 45, category: 30, subcategory: 60, tag: 55, mood: 35, menu: 60 };

function containsPhrase(text: string, phrase: string) {
  return (` ${text} `).includes(` ${phrase} `);
}

function isPositiveSignal(text: string) {
  if (assertedAbsences.has(text)) return true;
  return !/\b(?:no|sin|excepto|nunca|prohibido|prohibida|prohibidos|prohibidas)\b/.test(text);
}

function searchDocument(spot: Spot) {
  const cached = documentCache.get(spot);
  if (cached) return cached;
  const signals: SearchSignal[] = [];
  const add = (field: SearchField, values: (string | undefined)[]) => {
    for (const value of values) {
      const text = normalizeSpotSearch(value ?? '');
      if (text && (field === 'name' || field === 'location' || isPositiveSignal(text))) signals.push({ field, text });
    }
  };
  add('name', [spot.name, spot.brandName]);
  add('location', [spot.branchName, spot.neighborhood, spot.hubName, spot.city, spot.address]);
  add('category', [spot.category]);
  add('subcategory', spot.subcategories ?? []);
  add('tag', spot.tags ?? []);
  add('mood', spot.moods ?? []);
  for (const menu of buildMenuSearchIndex(spot).evidence) signals.push({ field: 'menu', text: menu.text, menu });
  // Promotional prose and inferred category aliases remain excluded.
  documentCache.set(spot, signals);
  return signals;
}

function queryGroups(query: string) {
  const words = query.split(' ').filter(Boolean);
  const groups: { literal: string; evidence: string[] }[] = [];
  for (let i = 0; i < words.length;) {
    const concept = phrases.find(phrase => phrase.words.every((word, offset) => word === words[i + offset]));
    if (concept) {
      groups.push({ literal: concept.alias, evidence: concept.evidence });
      i += concept.words.length;
    } else {
      if (!ignoredWords.has(words[i])) groups.push({ literal: words[i], evidence: [words[i]] });
      i++;
    }
  }
  return groups;
}

export function isExactSpotSearchName(spot: Spot, query: string) {
  const normalized = normalizeSpotSearch(query);
  return Boolean(normalized) && [spot.name, spot.brandName].some(name => normalizeSpotSearch(name ?? '') === normalized);
}

export function createSpotSearch(query: string): (spot: Spot) => SpotSearchMatch {
  const normalized = normalizeSpotSearch(query);
  if (!normalized) return () => ({ matches: true, score: 0, fields: [] });
  const groups = queryGroups(normalized);
  const noMatch: SpotSearchMatch = { matches: false, score: 0, fields: [] };
  const matchBranch = (spot: Spot): SpotSearchMatch => {
    const document = searchDocument(spot);
    const names = document.filter(signal => signal.field === 'name');
    // Named businesses remain discoverable even when their name is also an
    // activity or contains query-control words such as Domingo or Norte.
    if (names.some(signal => signal.text === normalized) && normalized) return { matches: true, score: 1000, fields: ['name'] };
    if (!groups.length) return { matches: true, score: 0, fields: [] };
    const fields = new Set<SearchField>();
    let score = 0;
    for (const group of groups) {
      let best = 0;
      for (const signal of document) {
        const matches = signal.field === 'name'
          ? signal.text.includes(group.literal)
          : signal.menu ? group.evidence.some(term => term.length >= 3 && menuEvidenceMatches(signal.menu!, term))
          : group.evidence.some(term => term.length >= 3 && containsPhrase(signal.text, term));
        if (matches) {
          fields.add(signal.field);
          best = Math.max(best, fieldWeight[signal.field]);
        }
      }
      if (!best) return noMatch;
      score += best;
    }
    // Whole-name matches outrank attribute-only matches, regardless of how many
    // tags a place happens to have. Explicit price/date sorts still win outside.
    const nameBonus = names.reduce((best, signal) => Math.max(best,
      signal.text.startsWith(normalized) ? 800 : containsPhrase(signal.text, normalized) ? 600 : signal.text.includes(normalized) ? 400 : 0), 0);
    return { matches: true, score: nameBonus + Math.min(score, 180), fields: [...fields] };
  };
  return spot => (spot.branches?.length ? spot.branches : [spot])
    .map(matchBranch).reduce((best, result) => result.matches && (!best.matches || result.score > best.score) ? result : best, noMatch);
}
