import type { Spot } from '@/lib/mock-spots';
import {
  hasScheduleAvailabilityForDay,
  isScheduleOpenNow,
  matchesScheduleForDayTime,
  matchesScheduleForHolidayTime,
} from '@/lib/schedule-status';
import type { UserLocation } from '@/lib/location-store';

export type ExploreTab = 'places' | 'now';
export type ExplorePeriod = 'AM' | 'PM' | '';
export type ExploreSort = 'relevance' | 'recent' | 'priceAsc' | 'priceDesc' | 'topRated';

export type ExploreFilters = {
  interests: string[];
  hubName: string[];
  people: number;
  minBudget: number;
  maxBudget: number;
  time: string;
  period: ExplorePeriod;
  days: string[];
  distance: number;
  sortBy: ExploreSort;
  openNowOnly: boolean;
  hideManuallyAdjusted: boolean;
};

type QueryIntentFilters = Pick<
  ExploreFilters,
  | 'interests'
  | 'days'
  | 'openNowOnly'
  | 'hubName'
  | 'time'
  | 'period'
  | 'minBudget'
  | 'maxBudget'
> & {
  dayPart: '' | 'morning' | 'afternoon' | 'night' | 'lateNight';
  requiredTerms: string[];
};

const LOCATION_ZONE_PREFIX = 'zone|||';
const LOCATION_MALL_PREFIX = 'mall|||';
const queryIntentZones = [
  'Granada',
  'Pance',
  'Ciudad Jardín',
  'Valle del Lili',
  'La Hacienda',
  'El Caney',
  'Limonar',
  'La Flora',
  'Guadalupe',
  'El Peñón',
  'San Fernando',
  'Tejares-Cristales',
  'Zona Chipichape',
  'Centro',
  'Norte',
  'Sur',
  'Oeste',
] as const;

const queryIntentMacrozones: Record<string, string[]> = {
  Centro: ['Centro', 'Granada', 'San Pedro'],
  Norte: ['Norte', 'Versalles', 'Santa Monica Residencial', 'Zona Chipichape'],
  Sur: ['Sur', 'Pance', 'Ciudad Jardín', 'La Flora', 'Limonar', 'San Fernando', 'Alfaguara', 'Guadalupe', 'Valle del Lili', 'La Hacienda', 'El Caney'],
  Oeste: ['Oeste', 'El Peñón', 'Arboleda', 'Miraflores', 'Tejares-Cristales'],
};
const queryIntentMalls = [
  'Lago Verde',
  'Marbella Plaza',
  'Alto Pance',
  'Cañaveral Pance',
  'Puerto 125',
  'Mall La María',
  'Carulla Pance',
  'Lyrata',
  'Río',
  'Campanella Plaza',
  'Verde Arena',
  'Las Velas',
  'Palmas Mall',
  'La Leyenda',
  'El Lago',
  'Giardino Mall',
  'Plaza Armonía',
  'Solaz Plaza',
  'Casa del Río',
  'Natura Plaza',
  'Jardín Plaza',
  'Unicentro',
  'Mallplaza',
  'Pacific Center',
  'Chipichape',
  'Plazuela Municipal Granada',
  'Plazuela Municipal Ciudad Jardín',
] as const;
const semanticStopWords = new Set([
  'algo',
  'con',
  'de',
  'del',
  'donde',
  'el',
  'en',
  'es',
  'ir',
  'la',
  'las',
  'lo',
  'los',
  'lugar',
  'lugares',
  'para',
  'plan',
  'por',
  'quiero',
  'quisiera',
  'salir',
  'tipo',
  'una',
  'un',
  'ver',
  'y',
]);
const spotInterestSignalsCache = new WeakMap<Spot, Set<string>>();
const structuredInterestGroups = [
  {
    primary: 'Arte y cultura',
    aliases: ['Arte y cultura'],
    subcategories: ['Museos', 'Galerías', 'Cine alternativo', 'Tertulias', 'Monumentos', 'Teatro', 'Standup', 'Comediantes', 'Danza', 'Poesía'],
  },
  {
    primary: 'Tomar algo',
    aliases: ['Tomar algo', 'Bares y noche'],
    subcategories: ['Cerveza', 'Cocktails', 'Vino', 'Café', 'Tardear', 'Cerveza artesanal', 'Rooftop', 'Pub', 'Terraza', 'Speakeasy', 'After office'],
  },
  {
    primary: 'Vida nocturna',
    aliases: ['Vida nocturna', 'Bares y noche'],
    subcategories: ['Salsa', 'Reggaetón', 'Techno', 'Disco', 'Dancehall', 'Crossover', 'Karaoke', 'Shows en vivo'],
  },
  {
    primary: 'Comida',
    aliases: ['Comida', 'Restaurantes y cafés'],
    subcategories: [
      'Desayuno',
      'Brunch',
      'Almuerzo',
      'Tardear',
      'Cena',
      'Postres',
      'Café',
      'Panadería',
      'Pastelería',
      'Waffles',
      'Pancakes',
      'Bowls',
      'Sandwiches',
      'Huevos',
      'Tostadas',
      'Açaí',
      'Fruta',
      'Jugos',
      'Saludable',
      'Vegana',
      'Vegetariana',
      'Colombiana',
      'Americana',
      'Mediterránea',
      'Mimosas',
      'Italiana',
      'Mexicana',
      'Japonesa',
      'Nikkei',
      'Asiática',
      'Fusión',
      'Pizza',
      'Pasta',
      'Sushi',
      'Tacos',
      'Ramen',
      'Poke',
      'Pitas',
      'Hamburguesas',
      'Pollo frito',
      'Parrilla',
      'Mariscos',
      'Tapas',
      'Helado',
      'Galletas',
      'Tortas',
      'Cheesecake',
      'Brownies',
      'Donas',
      'Chocolatería',
    ],
  },
  {
    primary: 'Bienestar',
    aliases: ['Bienestar', 'Deporte y bienestar'],
    subcategories: ['Yoga', 'Pilates', 'Spa', 'Masajes', 'Gym', 'Running', 'Hiking', 'Meditación'],
  },
  {
    primary: 'Familiar',
    aliases: ['Familiar'],
    subcategories: ['Parques infantiles', 'Juegos', 'Manualidades', 'Pintar', 'Cerámica', 'Plan familiar', 'Animales', 'Diversión'],
  },
  {
    primary: 'Al aire libre',
    aliases: ['Al aire libre', 'Naturaleza y aire libre'],
    subcategories: ['Parques', 'Miradores', 'Caminatas', 'Montañas', 'Running', 'Hiking', 'Picnic', 'Camping'],
  },
] as const;

export const DEFAULT_FILTERS: ExploreFilters = {
  interests: [],
  hubName: [],
  people: 0,
  minBudget: 0,
  maxBudget: 300000,
  time: '',
  period: '',
  days: [],
  distance: 50,
  sortBy: 'recent',
  openNowOnly: false,
  hideManuallyAdjusted: false,
};

type RawParam = string | string[] | undefined;

function getSingleValue(value: RawParam) {
  return Array.isArray(value) ? value[0] : value;
}

function parseNumber(value: RawParam, fallback: number) {
  const parsed = Number(getSingleValue(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value: RawParam) {
  const raw = getSingleValue(value);
  if (!raw) return [];
  return raw.split(',').filter(Boolean);
}

export function parseExploreTab(value: RawParam): ExploreTab {
  const parsed = getSingleValue(value);
  return parsed === 'now' || parsed === 'home' ? 'now' : 'places';
}

export function parseFiltersFromParams(
  params: Record<string, RawParam>,
): ExploreFilters {
  const rawPeriod = getSingleValue(params.period);
  const period: ExplorePeriod =
    rawPeriod === 'AM' || rawPeriod === 'PM' ? rawPeriod : '';

  return {
    interests: parseList(params.interests),
    hubName: parseList(params.hubName),
    people: parseNumber(params.people, DEFAULT_FILTERS.people),
    minBudget: parseNumber(params.minBudget, DEFAULT_FILTERS.minBudget),
    maxBudget: parseNumber(params.maxBudget, DEFAULT_FILTERS.maxBudget),
    time: getSingleValue(params.time) ?? DEFAULT_FILTERS.time,
    period,
    days: parseList(params.days).length
      ? parseList(params.days)
      : DEFAULT_FILTERS.days,
    distance: parseNumber(params.distance, DEFAULT_FILTERS.distance),
    sortBy: parseSortValue(params.sortBy),
    openNowOnly: getSingleValue(params.openNowOnly) === 'true',
    hideManuallyAdjusted: getSingleValue(params.hideManuallyAdjusted) === 'true',
  };
}

export function serializeFilters(filters: ExploreFilters) {
  return {
    interests: filters.interests.join(','),
    hubName: filters.hubName.join(','),
    people: String(filters.people),
    minBudget: String(filters.minBudget),
    maxBudget: String(filters.maxBudget),
    time: filters.time,
    period: filters.period,
    days: filters.days.join(','),
    distance: String(filters.distance),
    sortBy: filters.sortBy,
    openNowOnly: String(filters.openNowOnly),
    hideManuallyAdjusted: String(filters.hideManuallyAdjusted),
  };
}

export function formatBudget(value: number) {
  return new Intl.NumberFormat('es-CO').format(value);
}

export function formatApproxBudgetPerPersonLabel(minBudget: number, maxBudget: number) {
  if (minBudget <= 0 && maxBudget <= 0) {
    return 'Por definir';
  }

  const baseBudget = minBudget > 0 ? minBudget : maxBudget;
  return `~$${formatBudget(baseBudget)} COP / pers.`;
}

export function isFiltersActive(filters: ExploreFilters) {
  return (
    filters.interests.length !== DEFAULT_FILTERS.interests.length ||
    filters.hubName.join(',') !== DEFAULT_FILTERS.hubName.join(',') ||
    filters.people !== DEFAULT_FILTERS.people ||
    filters.minBudget !== DEFAULT_FILTERS.minBudget ||
    filters.maxBudget !== DEFAULT_FILTERS.maxBudget ||
    filters.time !== DEFAULT_FILTERS.time ||
    filters.period !== DEFAULT_FILTERS.period ||
    filters.days.join(',') !== DEFAULT_FILTERS.days.join(',') ||
    filters.distance !== DEFAULT_FILTERS.distance ||
    filters.openNowOnly !== DEFAULT_FILTERS.openNowOnly ||
    filters.hideManuallyAdjusted !== DEFAULT_FILTERS.hideManuallyAdjusted
  );
}

export function matchesSpotToFilters(
  spot: Spot,
  filters: ExploreFilters,
  query: string,
  userLocation?: UserLocation | null,
) {
  const { residualQuery, filters: queryIntentFilters } = parseQueryIntent(query);
  const mergedFilters = mergeFiltersWithQueryIntent(filters, queryIntentFilters);
  const normalizedQuery = normalizeSearchText(residualQuery);
  const matchesQuery = matchesSemanticQuery(
    spot,
    normalizedQuery,
    queryIntentFilters.requiredTerms,
  );
  const spotInterestSignals = getSpotInterestSignals(spot);
  const matchesInterests = matchesStructuredInterestFilters(mergedFilters.interests, spotInterestSignals);
  const matchesPeople = mergedFilters.people === 0 || spot.maxPeople >= mergedFilters.people;
  const matchesHubName = matchesSpotLocationFilters(spot, mergedFilters.hubName);
  const activeDayFilters = mergedFilters.days.length > 0 ? mergedFilters.days : ['Any'];
  const matchesDays =
    mergedFilters.days.length === 0 ||
    mergedFilters.days.includes('Any') ||
    mergedFilters.days.some((day) => doesSpotMatchDayFilter(spot, day));
  const matchesTime =
    ((!mergedFilters.time || !mergedFilters.period) && !queryIntentFilters.dayPart) ||
    activeDayFilters.some((day) =>
      queryIntentFilters.dayPart
        ? doesSpotMatchDayPart(spot, day, queryIntentFilters.dayPart)
        : doesSpotMatchTimeSelection(spot, day, mergedFilters.time, mergedFilters.period),
    );
  if (mergedFilters.distance !== DEFAULT_FILTERS.distance && !userLocation) {
    return false;
  }
  const effectiveDistance = getEffectiveSpotDistanceKm(spot, userLocation);
  const matchesDistance =
    mergedFilters.distance === DEFAULT_FILTERS.distance
      ? true
      : mergedFilters.distance < 0
        ? effectiveDistance !== null && effectiveDistance > Math.abs(mergedFilters.distance)
        : effectiveDistance !== null && effectiveDistance <= mergedFilters.distance;
  const spotMinBudget = Number.isFinite(spot.minBudget) ? spot.minBudget : 0;
  const spotMaxBudget = Number.isFinite(spot.maxBudget) ? spot.maxBudget : spotMinBudget;
  const matchesBudget =
    spotMaxBudget >= mergedFilters.minBudget && spotMinBudget <= mergedFilters.maxBudget;
  const matchesOpenNow = !mergedFilters.openNowOnly || isSpotOpenNow(spot);
  const matchesManualAdjusted = !mergedFilters.hideManuallyAdjusted || !spot.manuallyAdjusted;

  return (
    matchesQuery &&
    matchesInterests &&
    matchesHubName &&
    matchesPeople &&
    matchesDays &&
    matchesTime &&
    matchesDistance &&
    matchesBudget &&
    matchesOpenNow &&
    matchesManualAdjusted
  );
}

function matchesStructuredInterestFilters(selectedInterests: string[], spotInterestSignals: Set<string>) {
  if (selectedInterests.length === 0) {
    return true;
  }

  const normalizedSelections = selectedInterests
    .map((interest) => normalizeSearchText(interest))
    .filter(Boolean);

  if (normalizedSelections.length === 0) {
    return true;
  }

  const remainingSelections = new Set(normalizedSelections);

  for (const group of structuredInterestGroups) {
    const primarySelected = remainingSelections.has(normalizeSearchText(group.primary));
    const selectedSubcategories = group.subcategories
      .map((subcategory) => normalizeSearchText(subcategory))
      .filter((subcategory) => remainingSelections.has(subcategory));

    if (!primarySelected && selectedSubcategories.length === 0) {
      continue;
    }

    remainingSelections.delete(normalizeSearchText(group.primary));
    group.aliases.forEach((alias) => remainingSelections.delete(normalizeSearchText(alias)));
    selectedSubcategories.forEach((subcategory) => remainingSelections.delete(subcategory));

    if (primarySelected) {
      const primaryMatches = group.aliases
        .flatMap((alias) => getInterestMatchTerms(alias))
        .some((term) => spotInterestSignals.has(term));

      if (!primaryMatches) {
        return false;
      }
    }

    if (
      selectedSubcategories.length > 0 &&
      !selectedSubcategories.some((subcategory) =>
        getInterestMatchTerms(subcategory).some((term) => spotInterestSignals.has(term)),
      )
    ) {
      return false;
    }
  }

  if (remainingSelections.size === 0) {
    return true;
  }

  return Array.from(remainingSelections).some((interest) =>
    getInterestMatchTerms(interest).some((term) => spotInterestSignals.has(term)),
  );
}

function mergeFiltersWithQueryIntent(
  filters: ExploreFilters,
  queryIntentFilters: QueryIntentFilters,
): ExploreFilters {
  return {
    ...filters,
    interests: Array.from(new Set([...filters.interests, ...queryIntentFilters.interests])),
    days: Array.from(new Set([...filters.days, ...queryIntentFilters.days])),
    hubName: Array.from(new Set([...filters.hubName, ...queryIntentFilters.hubName])),
    time: filters.time || queryIntentFilters.time,
    period: filters.period || queryIntentFilters.period,
    minBudget:
      filters.minBudget !== DEFAULT_FILTERS.minBudget
        ? filters.minBudget
        : queryIntentFilters.minBudget,
    maxBudget:
      filters.maxBudget !== DEFAULT_FILTERS.maxBudget
        ? filters.maxBudget
        : queryIntentFilters.maxBudget,
    openNowOnly: filters.openNowOnly || queryIntentFilters.openNowOnly,
  };
}

function parseQueryIntent(query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return {
      residualQuery: '',
      filters: {
        interests: [],
        days: [],
        hubName: [],
        time: '',
        period: '',
        minBudget: DEFAULT_FILTERS.minBudget,
        maxBudget: DEFAULT_FILTERS.maxBudget,
        dayPart: '',
        requiredTerms: [],
        openNowOnly: false,
      } satisfies QueryIntentFilters,
    };
  }

  let workingQuery = normalizedQuery;
  const interests = new Set<string>();
  const days = new Set<string>();
  const hubName = new Set<string>();
  const semanticHints = new Set<string>();
  let openNowOnly = false;
  let time = '';
  let period: ExplorePeriod = '';
  let dayPart: QueryIntentFilters['dayPart'] = '';
  let minBudget = DEFAULT_FILTERS.minBudget;
  let maxBudget = DEFAULT_FILTERS.maxBudget;

  const applyPattern = (pattern: RegExp) => {
    if (!pattern.test(workingQuery)) {
      return false;
    }

    workingQuery = workingQuery.replace(pattern, ' ');
    return true;
  };

  if (applyPattern(/\babiert(?:o|a)s?\s+ahora\b|\bahora\s+mismo\b/g)) {
    openNowOnly = true;
  }

  if (applyPattern(/\bfin\s+de\s+semana\b|\bfinde\b|\bfds\b/g)) {
    days.add('Sab');
    days.add('Dom');
  }

  if (applyPattern(/\bfestivos?\b/g)) {
    days.add('Festivos');
  }

  if (applyPattern(/\bdomingos?\b|\bdominical(?:es)?\b/g)) {
    days.add('Dom');
  }

  if (applyPattern(/\blunes\b/g)) {
    days.add('Lun');
  }

  if (applyPattern(/\bmartes\b/g)) {
    days.add('Mar');
  }

  if (applyPattern(/\bmiercoles\b|\bmiércoles\b/g)) {
    days.add('Mie');
  }

  if (applyPattern(/\bjueves\b/g)) {
    days.add('Jue');
  }

  if (applyPattern(/\bviernes\b/g)) {
    days.add('Vie');
  }

  if (applyPattern(/\bsabados?\b|\bsabado\b/g)) {
    days.add('Sab');
  }

  if (applyPattern(/\bmadrugada\b|\bde madrugada\b/g)) {
    dayPart = 'lateNight';
    semanticHints.add('madrugada');
  }

  if (applyPattern(/\ben la noche\b|\bnoche\b|\bnocturn[ao]s?\b/g)) {
    dayPart = 'night';
    semanticHints.add('noche');
  }

  if (applyPattern(/\ben la tarde\b|\btarde\b/g)) {
    dayPart = 'afternoon';
    semanticHints.add('tarde');
  }

  if (applyPattern(/\ben la manana\b|\ben la mañana\b|\bmanana\b|\bmañana\b/g)) {
    dayPart = 'morning';
    semanticHints.add('manana');
  }

  if (applyPattern(/\bfamiliar(?:es)?\b|\bfamilia(?:r)?\b|\bniñ(?:o|os|a|as)\b/g)) {
    interests.add('Familiar');
    semanticHints.add('familiar');
    semanticHints.add('familia');
  }

  if (
    applyPattern(
      /\bcomer\b|\bcomida\b|\balmorz(?:ar|o)\b|\bcen(?:ar|a)\b|\bdesayun(?:ar|o)\b|\bbrunch\b|\brestaurante?s?\b/g,
    )
  ) {
    interests.add('Comida');
    semanticHints.add('comer');
    semanticHints.add('comida');
    semanticHints.add('restaurante');
  }

  if (
    applyPattern(
      /\btomar\b|\btrago\b|\btragos\b|\bcerveza\b|\bcervezas\b|\bpola\b|\bpolas\b|\bcoctel(?:es)?\b|\bcocktail(?:s)?\b|\bbar(?:es)?\b|\brumba\b|\bbailar\b|\bvino\b/g,
    )
  ) {
    interests.add('Tomar algo');
    interests.add('Bares y noche');
    semanticHints.add('tomar algo');
    semanticHints.add('bar');
    semanticHints.add('cocteles');
    semanticHints.add('cerveza');
    semanticHints.add('vino');
  }

  if (
    applyPattern(
      /\bfamiliar(?:es)?\b|\bfamilia(?:r)?\b|\bniñ(?:o|os|a|as)\b|\bbeb[eé]s?\b/g,
    )
  ) {
    interests.add('Familiar');
    semanticHints.add('familiar');
    semanticHints.add('familia');
    semanticHints.add('ninos');
  }

  if (
    applyPattern(
      /\bver animales\b|\bver animalitos\b|\banimales\b|\banimalitos\b|\bzoologic(?:o|os)\b|\bzool[oó]gic(?:o|os)\b|\bfauna\b/g,
    )
  ) {
    semanticHints.add('animales');
    semanticHints.add('zoologico');
    semanticHints.add('fauna');
  }

  if (
    applyPattern(
      /\bhiking\b|\bsenderismo\b|\btrekking\b|\bcaminar\b|\bmirador(?:es)?\b|\bplantas\b|\bjardin(?:es)?\b|\bjard[ií]n(?:es)?\b|\bbotanico\b|\bbot[aá]nico\b|\bnaturaleza\b|\baire libre\b|\bparque\b/g,
    )
  ) {
    interests.add('Al aire libre');
    interests.add('Naturaleza y aire libre');
    semanticHints.add('naturaleza');
    semanticHints.add('aire libre');
    semanticHints.add('caminar');
  }

  if (applyPattern(/\bmascotas?\b|\bperros?\b|\bgatos?\b|\bpet friendly\b/g)) {
    interests.add('Pet friendly');
    semanticHints.add('pet friendly');
    semanticHints.add('mascotas');
  }

  if (
    applyPattern(
      /\bdar bala\b|\bpaintball\b|\bairsoft\b|\bgotcha\b|\bdisparar\b|\btirotear\b/g,
    )
  ) {
    interests.add('Bienestar');
    interests.add('Deporte y bienestar');
    semanticHints.add('paintball');
    semanticHints.add('airsoft');
    semanticHints.add('aventura');
  }

  if (
    applyPattern(
      /\barte\b|\bcultura\b|\bmuseo(?:s)?\b|\bteatro\b|\bgaler[ií]a(?:s)?\b|\bexposici[oó]n(?:es)?\b|\bpintar\b|\bpintura\b|\bceramica\b|\bcer[aá]mica\b|\bpottery\b/g,
    )
  ) {
    interests.add('Arte y cultura');
    semanticHints.add('arte');
    semanticHints.add('cultura');
    semanticHints.add('pintar');
    semanticHints.add('ceramica');
  }

  if (applyPattern(/\bcine\b|\bpeli(?:s)?\b|\bpel[ií]cula(?:s)?\b/g)) {
    interests.add('Cine');
    semanticHints.add('cine');
    semanticHints.add('pelicula');
  }

  if (applyPattern(/\bevento(?:s)?\b|\bconcierto(?:s)?\b|\bshow(?:s)?\b/g)) {
    semanticHints.add('eventos');
    semanticHints.add('show');
  }

  const maxBudgetMatch = workingQuery.match(
    /\b(?:menos de|por menos de|hasta|maximo|maximo de|máximo|máximo de)\s*\$?\s*(\d+)(?:\s*(k|mil))?\b/,
  );
  if (maxBudgetMatch) {
    maxBudget = parseBudgetAmount(maxBudgetMatch[1], maxBudgetMatch[2]);
    workingQuery = workingQuery.replace(maxBudgetMatch[0], ' ');
  }

  const minBudgetMatch = workingQuery.match(
    /\b(?:mas de|más de|desde)\s*\$?\s*(\d+)(?:\s*(k|mil))?\b/,
  );
  if (minBudgetMatch) {
    minBudget = parseBudgetAmount(minBudgetMatch[1], minBudgetMatch[2]);
    workingQuery = workingQuery.replace(minBudgetMatch[0], ' ');
  }

  queryIntentZones.forEach((zone) => {
    const normalizedZone = normalizeSearchText(zone);
    const zonePattern = new RegExp(`\\b${escapeRegExp(normalizedZone)}\\b`, 'g');
    if (zonePattern.test(workingQuery)) {
      const expandedZones = queryIntentMacrozones[zone] ?? [zone];
      expandedZones.forEach((expandedZone) => {
        hubName.add(`${LOCATION_ZONE_PREFIX}${expandedZone}`);
      });
      workingQuery = workingQuery.replace(zonePattern, ' ');
    }
  });

  queryIntentMalls.forEach((mall) => {
    const normalizedMall = normalizeSearchText(mall);
    const mallPattern = new RegExp(`\\b${escapeRegExp(normalizedMall)}\\b`, 'g');
    if (mallPattern.test(workingQuery)) {
      const relatedZone = getQueryIntentMallZone(mall);
      hubName.add(`${LOCATION_MALL_PREFIX}${relatedZone}|||${mall}`);
      workingQuery = workingQuery.replace(mallPattern, ' ');
    }
  });

  const residualTokens = workingQuery
    .split(/\s+/)
    .filter((token) => token && !semanticStopWords.has(token));
  const requiredTerms = Array.from(new Set([...residualTokens, ...semanticHints]));
  const residualQuery = requiredTerms.join(' ');

  return {
    residualQuery,
    filters: {
      interests: Array.from(interests),
      days: Array.from(days),
      hubName: Array.from(hubName),
      time,
      period,
      minBudget,
      maxBudget,
      dayPart,
      requiredTerms,
      openNowOnly,
    } satisfies QueryIntentFilters,
  };
}

function getQueryIntentMallZone(mall: string) {
  switch (mall) {
    case 'Lago Verde':
    case 'Marbella Plaza':
    case 'Alto Pance':
    case 'Cañaveral Pance':
    case 'Puerto 125':
    case 'Mall La María':
    case 'Carulla Pance':
    case 'Lyrata':
    case 'Río':
    case 'Campanella Plaza':
    case 'Verde Arena':
      return 'Pance';
    case 'Las Velas':
    case 'Palmas Mall':
    case 'La Leyenda':
    case 'El Lago':
    case 'Giardino Mall':
    case 'Plaza Armonía':
    case 'Solaz Plaza':
    case 'Casa del Río':
    case 'Natura Plaza':
    case 'Jardín Plaza':
    case 'Unicentro':
      return 'Ciudad Jardín';
    case 'Mallplaza':
      return 'Guadalupe';
    case 'Pacific Center':
    case 'Chipichape':
      return 'Zona Chipichape';
    case 'Plazuela Municipal Granada':
      return 'Granada';
    case 'Plazuela Municipal Ciudad Jardín':
      return 'Ciudad Jardín';
    default:
      return '';
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sortSpots(
  spots: Spot[],
  sortBy: ExploreSort,
  getLikesCount?: (spotId: string | number) => number,
) {
  if (sortBy === 'relevance') {
    return [...spots]
      .map((spot, index) => ({ spot, index }))
      .sort((a, b) => {
        const rankDiff = b.spot.feedPriorityRank - a.spot.feedPriorityRank;
        return rankDiff !== 0 ? rankDiff : a.index - b.index;
      })
      .map((item) => item.spot);
  }

  return [...spots]
    .map((spot, index) => ({ spot, index }))
    .sort((a, b) => {
      if (sortBy === 'recent') {
        const bIsNew = b.spot.editorialBadge === 'Recién añadido' ? 1 : 0;
        const aIsNew = a.spot.editorialBadge === 'Recién añadido' ? 1 : 0;
        const newDiff = bIsNew - aIsNew;
        if (newDiff !== 0) {
          return newDiff;
        }

        const bCreatedAt = Date.parse(b.spot.createdAt ?? '') || 0;
        const aCreatedAt = Date.parse(a.spot.createdAt ?? '') || 0;
        const createdDiff = bCreatedAt - aCreatedAt;
        if (createdDiff !== 0) {
          return createdDiff;
        }

        const diff = Number(b.spot.spotId ?? 0) - Number(a.spot.spotId ?? 0);
        return diff !== 0 ? diff : a.index - b.index;
      }

      if (sortBy === 'priceAsc') {
        const diff = getBudgetLowerBound(a.spot) - getBudgetLowerBound(b.spot);
        return diff !== 0 ? diff : a.index - b.index;
      }

      if (sortBy === 'priceDesc') {
        const diff = getBudgetUpperBound(b.spot) - getBudgetUpperBound(a.spot);
        return diff !== 0 ? diff : a.index - b.index;
      }

      const likesDiff =
        (getLikesCount?.(b.spot.likeTargetId) ?? Number(b.spot.likes) ?? 0) -
        (getLikesCount?.(a.spot.likeTargetId) ?? Number(a.spot.likes) ?? 0);
      return likesDiff !== 0 ? likesDiff : a.index - b.index;
    })
    .map((item) => item.spot);
}

export function getEffectiveSpotDistanceKm(
  spot: Spot,
  userLocation?: UserLocation | null,
): number | null {
  if (spot.branches && spot.branches.length > 0) {
    const branchDistances: number[] = spot.branches
      .map((branch) => getEffectiveSpotDistanceKm(branch, userLocation))
      .filter((distance): distance is number => distance !== null);

    if (branchDistances.length > 0) {
      return Math.min(...branchDistances);
    }
  }

  if (
    userLocation &&
    typeof spot.latitude === 'number' &&
    typeof spot.longitude === 'number'
  ) {
    return calculateHaversineDistanceKm(
      userLocation.latitude,
      userLocation.longitude,
      spot.latitude,
      spot.longitude,
    );
  }

  if (userLocation) {
    return null;
  }

  return spot.distanceKm;
}

const semanticSearchMap: Record<string, string[]> = {
  frio: ['cafe', 'cafeteria', 'panaderia', 'chocolate', 'postres', 'brunch', 'bebidas calientes', 'algo caliente'],
  hambre: ['restaurantes', 'comida', 'brunch', 'pizza', 'hamburguesas', 'sushi', 'panaderia', 'postres', 'algo rico'],
  brunch: ['brunch', 'desayuno', 'cafe', 'cafeteria', 'panaderia'],
  chill: ['plan tranqui', 'hablar', 'cafe', 'vino', 'cocteles', 'terraza'],
  romántico: ['en pareja', 'vino', 'terraza', 'algo especial', 'hablar'],
  romantico: ['en pareja', 'vino', 'terraza', 'algo especial', 'hablar'],
  pareja: ['en pareja', 'romántico', 'algo especial', 'vino'],
  amigos: ['con amigos', 'cocteles', 'bar', 'rumba', 'bailar', 'tomar algo'],
  bailar: ['bailar', 'rumba', 'salsa', 'reggaeton', 'vida nocturna', 'bares y noche'],
  trago: ['tomar algo', 'cocteles', 'bar', 'vino', 'cerveza'],
  tomar: ['tomar algo', 'cocteles', 'bar', 'vino', 'cerveza'],
  cerveza: ['cerveza', 'polas', 'pola', 'cerveza artesanal', 'bar', 'pub', 'tomar algo'],
  cocteles: ['cocteles', 'cocktails', 'bar', 'trago', 'tomar algo'],
  cocktail: ['cocteles', 'cocktails', 'bar', 'trago', 'tomar algo'],
  cocktails: ['cocteles', 'cocktails', 'bar', 'trago', 'tomar algo'],
  vino: ['vino', 'copas', 'bar', 'terraza', 'romantico'],
  cafe: ['cafe', 'cafeteria', 'brunch', 'panaderia', 'postres'],
  caliente: ['cafe', 'chocolate', 'sopa', 'panaderia', 'algo caliente'],
  dulce: ['postres', 'panaderia', 'cafe', 'algo rico'],
  pizza: ['pizza', 'pizzeria'],
  hamburguesa: ['hamburguesas', 'burger'],
  hamburguesas: ['hamburguesas', 'burger'],
  burger: ['burger', 'hamburguesas'],
  sushi: ['sushi', 'japones'],
  pasta: ['pasta', 'spaghetti', 'fettuccine', 'ravioli', 'lasagna', 'lasaña'],
  italiano: ['italiano', 'trattoria'],
  postres: ['postres', 'dulce', 'panaderia', 'cafe'],
  pan: ['panaderia', 'brunch', 'desayuno', 'postres'],
  desayuno: ['desayuno', 'brunch', 'cafe', 'panaderia'],
  naturaleza: ['naturaleza', 'aire libre', 'caminar', 'mirador', 'parque'],
  parque: ['parque', 'aire libre', 'naturaleza', 'caminar'],
  caminar: ['caminar', 'aire libre', 'naturaleza', 'parque'],
  hiking: ['hiking', 'senderismo', 'caminar', 'naturaleza', 'aire libre'],
  senderismo: ['senderismo', 'hiking', 'caminar', 'naturaleza', 'aire libre'],
  trekking: ['trekking', 'hiking', 'senderismo', 'caminar', 'naturaleza'],
  mirador: ['mirador', 'naturaleza', 'aire libre', 'caminar'],
  plantas: ['plantas', 'jardin', 'jardín', 'naturaleza', 'aire libre'],
  jardin: ['jardin', 'jardín', 'plantas', 'naturaleza', 'aire libre'],
  'jardin botanico': ['jardin botanico', 'jardín botánico', 'plantas', 'naturaleza'],
  animales: ['animales', 'zoologico', 'zoológico', 'fauna'],
  animalitos: ['animales', 'zoologico', 'zoológico', 'fauna'],
  zoologico: ['zoologico', 'zoológico', 'animales', 'fauna'],
  zoológico: ['zoologico', 'zoológico', 'animales', 'fauna'],
  fauna: ['fauna', 'animales', 'zoologico', 'zoológico', 'naturaleza'],
  familia: ['familia', 'familiar', 'ninos', 'parque', 'zoologico'],
  ninos: ['ninos', 'familiar', 'familia', 'parque'],
  niños: ['ninos', 'niños', 'familiar', 'familia', 'parque'],
  bebe: ['bebe', 'bebé', 'familiar', 'familia', 'ninos'],
  bebé: ['bebe', 'bebé', 'familiar', 'familia', 'ninos'],
  mascotas: ['pet friendly', 'mascotas', 'perros'],
  perros: ['pet friendly', 'mascotas', 'perros'],
  gatos: ['pet friendly', 'mascotas', 'gatos'],
  'dar bala': ['paintball', 'airsoft', 'gotcha', 'aventura'],
  paintball: ['paintball', 'airsoft', 'gotcha', 'aventura'],
  airsoft: ['airsoft', 'paintball', 'gotcha', 'aventura'],
  gotcha: ['gotcha', 'paintball', 'airsoft', 'aventura'],
  pintar: ['pintar', 'pintura', 'ceramica', 'cerámica', 'arte', 'manualidades', 'taller creativo'],
  pintura: ['pintar', 'pintura', 'ceramica', 'cerámica', 'arte', 'manualidades', 'taller creativo'],
  ceramica: ['ceramica', 'cerámica', 'pintar', 'arte', 'manualidades', 'pottery'],
  cerámica: ['ceramica', 'cerámica', 'pintar', 'arte', 'manualidades', 'pottery'],
  pottery: ['pottery', 'ceramica', 'cerámica', 'pintar', 'arte'],
  cultura: ['cultura', 'museo', 'teatro', 'cine', 'arte', 'arte y cultura'],
  museo: ['museo', 'arte', 'cultura', 'exposicion', 'exposición', 'arte y cultura'],
  exposicion: ['exposicion', 'exposición', 'arte', 'museo'],
  exposición: ['exposicion', 'exposición', 'arte', 'museo'],
  galeria: ['galeria', 'galería', 'arte'],
  galería: ['galeria', 'galería', 'arte'],
  teatro: ['teatro', 'cultura', 'arte', 'arte y cultura'],
  concierto: ['concierto', 'eventos', 'musica', 'música', 'show'],
  musica: ['musica', 'música', 'concierto', 'eventos', 'rumba'],
  música: ['musica', 'música', 'concierto', 'eventos', 'rumba'],
  evento: ['evento', 'eventos', 'concierto', 'show'],
  eventos: ['evento', 'eventos', 'concierto', 'show'],
  show: ['show', 'evento', 'eventos', 'concierto'],
  peli: ['cine', 'pelicula', 'película', 'pelis', 'arte y cultura'],
  pelis: ['cine', 'pelicula', 'película', 'pelis', 'arte y cultura'],
  pelicula: ['cine', 'pelicula', 'película', 'pelis', 'arte y cultura'],
  película: ['cine', 'pelicula', 'película', 'pelis', 'arte y cultura'],
  domingo: ['domingo', 'dominical', 'dom'],
  dominical: ['domingo', 'dominical', 'dom'],
  festivo: ['festivo', 'festivos'],
  festivos: ['festivo', 'festivos'],
  rooftop: ['rooftop', 'terraza', 'cocteles', 'bar', 'tomar algo'],
  terraza: ['terraza', 'rooftop', 'cocteles', 'vino'],
};

function matchesSemanticQuery(
  spot: Spot,
  normalizedQuery: string,
  requiredTerms: string[] = [],
) {
  if (!normalizedQuery) return true;

  const haystack = getSpotSearchDocument(spot);

  const queryGroups = buildSemanticGroups(normalizedQuery, requiredTerms);
  return queryGroups.every((group) => group.some((term) => haystack.includes(term)));
}

function getInterestMatchTerms(interest: string) {
  const normalizedInterest = normalizeSearchText(interest);

  switch (normalizedInterest) {
    case 'comida':
    case 'restaurantes y cafes':
      return ['comida', 'restaurantes y cafes', 'restaurantes', 'cafe', 'desayuno', 'brunch', 'almuerzo', 'cena', 'postres'];
    case 'tardear':
      return ['tardear', 'cafe', 'postres', 'panaderia', 'waffles', 'pancakes'];
    case 'tomar algo':
      return ['tomar algo', 'bares y noche', 'bar', 'cocteles', 'cocktails', 'vino', 'cerveza', 'rooftop', 'terraza', 'pub', 'speakeasy', 'cafe', 'after office', 'tardear'];
    case 'cocktails':
      return ['cocktails', 'cocteles', 'bar', 'trago', 'tomar algo'];
    case 'vida nocturna':
      return ['vida nocturna', 'bares y noche', 'salsa', 'reggaeton', 'techno', 'disco', 'dancehall', 'crossover', 'karaoke', 'shows en vivo'];
    case 'bienestar':
      return ['bienestar', 'deporte y bienestar', 'yoga', 'pilates', 'spa', 'masajes', 'gym', 'running', 'hiking', 'meditacion'];
    case 'al aire libre':
      return ['al aire libre', 'naturaleza y aire libre', 'naturaleza', 'miradores', 'caminatas', 'parques', 'montanas', 'hiking', 'running', 'picnic', 'camping'];
    default:
      return [normalizedInterest];
  }
}

function getSpotInterestSignals(spot: Spot) {
  const cached = spotInterestSignalsCache.get(spot);
  if (cached) {
    return cached;
  }

  const signals = new Set<string>();

  spot.interests.forEach((value) => {
    const normalized = normalizeSearchText(value);
    if (normalized) signals.add(normalized);
  });

  const normalizedCategory = normalizeSearchText(spot.category);
  if (normalizedCategory) {
    signals.add(normalizedCategory);
  }

  spot.tags.forEach((value) => {
    const normalized = normalizeSearchText(value);
    if (normalized) signals.add(normalized);
  });

  spot.moods.forEach((value) => {
    const normalized = normalizeSearchText(value);
    if (normalized) signals.add(normalized);
  });

  getSpotSearchAliases(spot).forEach((value) => {
    const normalized = normalizeSearchText(value);
    if (normalized) signals.add(normalized);
  });

  spotInterestSignalsCache.set(spot, signals);
  return signals;
}

function getSpotSearchAliases(spot: Spot) {
  const aliases = new Set<string>();

  switch (spot.category) {
    case 'Comida':
    case 'Restaurantes y cafés':
    case 'Restaurantes':
      ['comer', 'comida', 'almuerzo', 'cena', 'desayuno', 'brunch', 'tardear', 'postres', 'restaurante', 'restaurantes', 'algo rico'].forEach((value) =>
        aliases.add(value),
      );
      break;
    case 'Bares y noche':
      ['bar', 'cocteles', 'cocktails', 'cerveza', 'trago', 'tomar algo', 'rumba', 'vida nocturna', 'discoteca', 'bailar'].forEach((value) =>
        aliases.add(value),
      );
      break;
    case 'Familiar':
      ['familia', 'familiar', 'ninos', 'plan familiar'].forEach((value) => aliases.add(value));
      break;
    case 'Naturaleza y aire libre':
      ['aire libre', 'al aire libre', 'naturaleza', 'caminar', 'parque', 'mirador'].forEach((value) =>
        aliases.add(value),
      );
      break;
    case 'Pet friendly':
      ['pet friendly', 'mascotas', 'perros'].forEach((value) => aliases.add(value));
      break;
    case 'Arte y cultura':
      ['arte', 'cultura', 'museo', 'teatro', 'pintar', 'pintura', 'ceramica', 'manualidades'].forEach((value) =>
        aliases.add(value),
      );
      break;
    case 'Cine':
      ['cine', 'peliculas', 'pelicula', 'arte y cultura', 'cultura'].forEach((value) => aliases.add(value));
      break;
    case 'Deporte y bienestar':
      ['deporte', 'bienestar', 'entrenar', 'mover el cuerpo', 'yoga', 'pilates', 'spa', 'masajes', 'gym'].forEach((value) => aliases.add(value));
      break;
  }

  if (spot.tags.some((tag) => normalizeSearchText(tag).includes('ital'))) {
    ['italiano', 'trattoria'].forEach((value) => aliases.add(value));
  }

  if (spot.tags.some((tag) => normalizeSearchText(tag).includes('pasta'))) {
    ['pasta', 'spaghetti', 'fettuccine', 'ravioli', 'lasagna', 'lasaña'].forEach((value) =>
      aliases.add(value),
    );
  }

  if (spot.tags.some((tag) => normalizeSearchText(tag).includes('pizza'))) {
    ['pizza', 'pizzeria'].forEach((value) => aliases.add(value));
  }

  if (spot.tags.some((tag) => normalizeSearchText(tag).includes('hamburg'))) {
    ['hamburguesa', 'hamburguesas', 'burger'].forEach((value) => aliases.add(value));
  }

  if (spot.tags.some((tag) => normalizeSearchText(tag).includes('sushi'))) {
    ['sushi', 'japones'].forEach((value) => aliases.add(value));
  }

  if (spot.tags.some((tag) => normalizeSearchText(tag).includes('cafe'))) {
    ['cafe', 'cafeteria', 'tomar cafe'].forEach((value) => aliases.add(value));
  }

  if (
    spot.moods.some((mood) =>
      ['cocteles', 'bar', 'tomar algo', 'vino', 'rumba'].some((value) =>
        normalizeSearchText(mood).includes(value),
      ),
    )
  ) {
    ['tomar', 'tomar cerveza', 'cerveza', 'cocteles', 'bar'].forEach((value) => aliases.add(value));
  }

  if (
    spot.tags.some((tag) =>
      ['paintball', 'airsoft', 'gotcha', 'tactico', 'táctico'].some((value) =>
        normalizeSearchText(tag).includes(normalizeSearchText(value)),
      ),
    )
  ) {
    ['paintball', 'airsoft', 'gotcha', 'dar bala', 'aventura'].forEach((value) =>
      aliases.add(value),
    );
  }

  return Array.from(aliases);
}

function getSpotSearchDocument(spot: Spot) {
  const branchSignals = (spot.branches ?? []).flatMap((branch) => [
    branch.name,
    branch.branchName,
    branch.neighborhood,
    branch.hubName,
    branch.address,
    branch.hours,
    ...branch.tags,
    ...branch.moods,
    ...getSpotScheduleAliases(branch),
    ...getSpotBudgetAliases(branch),
  ]);

  return normalizeSearchText(
    [
      spot.name,
      spot.brandName,
      spot.branchName,
      spot.neighborhood,
      spot.hubName,
      spot.category,
      spot.city,
      spot.shortDescription,
      spot.description,
      spot.address,
      spot.hours,
      spot.instagram,
      spot.menuUrl,
      ...spot.tags,
      ...spot.moods,
      ...getSpotSearchAliases(spot),
      ...getSpotScheduleAliases(spot),
      ...getSpotBudgetAliases(spot),
      ...branchSignals,
    ].join(' '),
  );
}

function getSpotScheduleAliases(spot: Spot) {
  const aliases = new Set<string>();
  const normalizedHours = normalizeSearchText(spot.hours);

  if (/\bdom\b|\bdomingo\b/.test(normalizedHours)) {
    aliases.add('domingo');
    aliases.add('dominical');
  }

  if (/\bsab\b|\bsabado\b/.test(normalizedHours)) {
    aliases.add('sabado');
    aliases.add('fin de semana');
  }

  if (/\bfest\b|\bfestivo/.test(normalizedHours)) {
    aliases.add('festivos');
    aliases.add('festivo');
  }

  if (/\b(1[8-9]|2[0-3]):/.test(normalizedHours)) {
    aliases.add('noche');
  }

  if (/\b(1[2-7]):/.test(normalizedHours)) {
    aliases.add('tarde');
  }

  if (/\b(0?[6-9]|10|11):/.test(normalizedHours)) {
    aliases.add('manana');
    aliases.add('mañana');
  }

  return Array.from(aliases);
}

function getSpotBudgetAliases(spot: Spot) {
  const aliases = new Set<string>();
  const minBudget = Number(spot.minBudget || 0);

  if (minBudget === 0) {
    return Array.from(aliases);
  }

  if (minBudget <= 20000) {
    aliases.add('barato');
    aliases.add('economico');
    aliases.add('económico');
  } else if (minBudget <= 40000) {
    aliases.add('precio medio');
  } else {
    aliases.add('caro');
    aliases.add('premium');
  }

  return Array.from(aliases);
}

function buildSemanticGroups(query: string, requiredTerms: string[] = []) {
  const directTerms = (requiredTerms.length > 0 ? requiredTerms : query.split(/\s+/))
    .map((term) => normalizeSearchText(term))
    .filter(Boolean);

  return directTerms.map((term) => {
    const relatedTerms = semanticSearchMap[term] ?? [];
    return Array.from(new Set([term, ...relatedTerms].map(normalizeSearchText).filter(Boolean)));
  });
}

function calculateHaversineDistanceKm(
  userLat: number,
  userLng: number,
  spotLat: number,
  spotLng: number,
) {
  const earthRadiusKm = 6371;
  const latDiff = toRadians(spotLat - userLat);
  const lngDiff = toRadians(spotLng - userLng);
  const startLat = toRadians(userLat);
  const endLat = toRadians(spotLat);

  const a =
    Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
    Math.sin(lngDiff / 2) *
      Math.sin(lngDiff / 2) *
      Math.cos(startLat) *
      Math.cos(endLat);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function matchesHubSelection(spot: Spot, selectedHub: string) {
  if (selectedHub.startsWith(LOCATION_ZONE_PREFIX)) {
    const selectedSector = selectedHub.slice(LOCATION_ZONE_PREFIX.length);
    return normalizeSearchText(spot.neighborhood) === normalizeSearchText(selectedSector);
  }

  let selectedSector = '';
  let selectedHubName = selectedHub;

  if (selectedHub.startsWith(LOCATION_MALL_PREFIX)) {
    const [, rawSector = '', rawMall = ''] = selectedHub.split('|||');
    selectedSector = rawSector;
    selectedHubName = rawMall;
  } else if (selectedHub.includes('|||')) {
    const [rawSector = '', rawMall = ''] = selectedHub.split('|||');
    selectedSector = rawSector;
    selectedHubName = rawMall;
  }

  const sameHub =
    normalizeSearchText(spot.hubName) === normalizeSearchText(selectedHubName);

  if (!sameHub) {
    return false;
  }

  if (!selectedSector) {
    return true;
  }

  return normalizeSearchText(spot.neighborhood) === normalizeSearchText(selectedSector);
}

function matchesSpotLocationFilters(spot: Spot, selectedLocations: string[]) {
  if (selectedLocations.length === 0) {
    return true;
  }

  const selectedZones = selectedLocations.filter((value) =>
    value.startsWith(LOCATION_ZONE_PREFIX),
  );
  const selectedMalls = selectedLocations.filter((value) =>
    value.startsWith(LOCATION_MALL_PREFIX) ||
    (!value.startsWith(LOCATION_ZONE_PREFIX) && value.includes('|||')),
  );

  const matchesSelectedZone =
    selectedZones.length === 0 ||
    selectedZones.some((value) => matchesHubSelection(spot, value));
  const matchesSelectedMall =
    selectedMalls.length === 0 ||
    selectedMalls.some((value) => matchesHubSelection(spot, value));

  return matchesSelectedZone && matchesSelectedMall;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`´"]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function doesSpotMatchTimeSelection(
  spot: Spot,
  dayCode: string,
  time: string,
  period: ExplorePeriod,
): boolean {
  const targetMinutes = parsePickerTimeToMinutes(time, period);
  if (targetMinutes === null) {
    return true;
  }

  if (dayCode === 'Any') {
    return ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].some((code) =>
      doesSpotMatchTimeSelection(spot, code, time, period),
    );
  }

  if (dayCode === 'Festivos') {
    const cleanedHoliday = spot.hours.replace(/\s*·\s*Horario por confirmar/gi, '').trim();
    if (!cleanedHoliday) {
      return false;
    }

    return matchesScheduleForHolidayTime(cleanedHoliday, targetMinutes);
  }

  const cleaned = spot.hours.replace(/\s*·\s*Horario por confirmar/gi, '').trim();
  if (!cleaned) {
    return false;
  }

  return matchesScheduleForDayTime(cleaned, dayCode, targetMinutes);
}

function doesSpotMatchDayPart(
  spot: Spot,
  dayCode: string,
  dayPart: QueryIntentFilters['dayPart'],
): boolean {
  const targetMinutes = getDayPartMinutes(dayPart);
  if (!targetMinutes.length) {
    return true;
  }

  return targetMinutes.some((minutes) =>
    doesSpotMatchMinutesSelection(spot, dayCode, minutes),
  );
}

function doesSpotMatchMinutesSelection(
  spot: Spot,
  dayCode: string,
  targetMinutes: number,
): boolean {
  if (dayCode === 'Any') {
    return ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].some((code) =>
      doesSpotMatchMinutesSelection(spot, code, targetMinutes),
    );
  }

  if (dayCode === 'Festivos') {
    const cleanedHoliday = spot.hours.replace(/\s*·\s*Horario por confirmar/gi, '').trim();
    if (!cleanedHoliday) {
      return false;
    }

    return matchesScheduleForHolidayTime(cleanedHoliday, targetMinutes);
  }

  const cleaned = spot.hours.replace(/\s*·\s*Horario por confirmar/gi, '').trim();
  if (!cleaned) {
    return false;
  }

  return matchesScheduleForDayTime(cleaned, dayCode, targetMinutes);
}

function parseSortValue(value: RawParam): ExploreSort {
  const parsed = getSingleValue(value);
  if (
    parsed === 'relevance' ||
    parsed === 'recent' ||
    parsed === 'priceAsc' ||
    parsed === 'priceDesc' ||
    parsed === 'topRated'
  ) {
    return parsed;
  }

  return DEFAULT_FILTERS.sortBy;
}

function getBudgetLowerBound(spot: Spot) {
  if (spot.minBudget > 0) return spot.minBudget;
  return spot.maxBudget;
}

function getBudgetUpperBound(spot: Spot) {
  if (spot.maxBudget > 0) return spot.maxBudget;
  return spot.minBudget;
}

export function isSpotOpenNow(spot: Spot) {
  return isScheduleOpenNow(spot.hours);
}

function doesSpotMatchDayFilter(spot: Spot, day: string) {
  return hasScheduleAvailabilityForDay(spot.hours, day);
}

function parsePickerTimeToMinutes(value: string, period: ExplorePeriod) {
  if (!value || !period) return null;

  const cleaned = value.replace(/[^\d]/g, '');
  if (!cleaned) return null;

  let hours = 0;
  let minutes = 0;

  if (cleaned.length <= 2) {
    hours = Number(cleaned);
  } else if (cleaned.length === 3) {
    hours = Number(cleaned.slice(0, 1));
    minutes = Number(cleaned.slice(1));
  } else {
    hours = Number(cleaned.slice(0, 2));
    minutes = Number(cleaned.slice(2, 4));
  }

  if (!Number.isFinite(hours) || hours < 1 || hours > 12) return null;
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 59) return null;

  const normalizedHours = period === 'AM'
    ? hours === 12 ? 0 : hours
    : hours === 12 ? 12 : hours + 12;

  return normalizedHours * 60 + minutes;
}

function parseBudgetAmount(rawAmount: string, rawScale?: string) {
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount)) {
    return DEFAULT_FILTERS.maxBudget;
  }

  if (!rawScale) {
    return amount;
  }

  const scale = normalizeSearchText(rawScale);
  if (scale === 'k' || scale === 'mil') {
    return amount * 1000;
  }

  return amount;
}

function getDayPartMinutes(dayPart: QueryIntentFilters['dayPart']) {
  switch (dayPart) {
    case 'morning':
      return [6 * 60, 8 * 60, 10 * 60, 11 * 60];
    case 'afternoon':
      return [12 * 60, 14 * 60, 16 * 60, 18 * 60];
    case 'night':
      return [19 * 60, 21 * 60, 23 * 60];
    case 'lateNight':
      return [0, 2 * 60, 4 * 60, 5 * 60];
    default:
      return [];
  }
}
