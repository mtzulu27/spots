import { getPublicJson } from './public-json-cache';
import { scenarioBudget, type BudgetScenario } from './budget-scenarios';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import type { MenuCatalogItem, Spot } from '@/lib/mock-spots';
import { normalizeCommercialCenterLabel, normalizeSpotCategory } from '@/lib/mock-spots';
import { backendEnabled } from '@/lib/supabase';
import { getScheduleExceptionSegments } from '@/lib/schedule-status';

// Bump when the published catalog changes so newly added places are not hidden by an old snapshot.
const spotsCacheKey = 'spots-cache-v25';
const staticCatalogPath = '/spots-catalog.json';

type SpotRow = {
  business_status?: Spot['businessStatus'];
  id: number;
  type: 'place' | 'event';
  starts_at?: string | null;
  ends_at?: string | null;
  ticket_price?: number | null;
  venue_spot_id?: number | null;
  venue_branch_id?: number | null;
  venue_branch_slug?: string | null;
  venue_name?: string | null;
  venue_logo_url?: string | null;
  slug: string;
  name: string;
  short_description: string;
  cover_image_url: string;
  logo_url?: string;
  gallery_urls: string[] | null;
  category: string;
  subcategories: string[] | null;
  city: string;
  likes: string;
  tags: string[] | null;
  moods: string[] | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  created_at: string;
  updated_at: string;
  editorial_badge?: string | null;
};

type BranchRow = {
  business_status?: Spot['businessStatus'];
  city?: string;
  id: number;
  spot_id: number;
  slug: string;
  neighborhood?: string | null;
  mall?: string | null;
  hours: string;
  holiday_mode: 'inherit' | 'same_as_sunday' | 'closed' | 'custom' | null;
  holiday_open_time: string | null;
  holiday_close_time: string | null;
  holiday_split_open_time: string | null;
  holiday_split_close_time: string | null;
  address: string;
  min_budget: number;
  max_budget?: number;
  max_people: number;
  min_people?: number;
  typical_budget?: number;
  budget_basis?: string;
  budget_scenarios?: BudgetScenario[];
  menu_calculation_note?: string;
  google_maps_url?: string;
  website_url?: string;
  menu_url: string;
  menu_items?: MenuCatalogItem[] | null;
  whatsapp: string;
  phone: string;
  instagram: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

type BranchHourRow = {
  id: number;
  branch_id: number;
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  split_open_time: string | null;
  split_close_time: string | null;
  sort_order: number | null;
};

type SpotRowsSnapshot = {
  spots: SpotRow[];
  branches: BranchRow[];
  branchHours: BranchHourRow[];
};

type SpotsStoreValue = {
  spots: Spot[];
  loading: boolean;
  backendEnabled: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshIfStale: () => Promise<void>;
};

const SpotsStoreContext = createContext<SpotsStoreValue>({
  spots: [],
  loading: false,
  backendEnabled: false,
  error: null,
  refresh: async () => {},
  refreshIfStale: async () => {},
});

const autoImportedPrioritySlugs = new Set([
  'platillos-voladores',
  'cafe-quindio',
  'la-topa-tolondra',
  'la-fugitiva',
  'greens-bolos-club',
  'space-jump',
  'mister-wings',
  'karens-pizza',
  'storia-damore',
  'dose-sky-lounge',
  'zorro-azul',
  'saipan-airsoft',
  'ecoparque-de-la-biodiversidad',
  'hacienda-del-bosque',
  'once-once',
  'lengua-de-mariposa',
  'tom-glen',
  'penelope-martini',
  'pampa-malbec',
  'huna-huna-social-club',
  'miyamoto',
  'crepes-y-waffles',
  'cantina-la-15',
  'fuku-ramen-bar',
  'kora-vibes',
  'el-colibri',
  'bengala-bandolero',
  'sonido-central',
  'la-boheme',
  'furtivo',
  'gente-comun',
]);

function readCachedSpots(preferredKey?: string) {
  const cacheKeys = preferredKey ? [preferredKey] : listCachedSpotKeys();

  if (typeof window === 'undefined') {
    return null;
  }

  for (const key of cacheKeys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        continue;
      }

      const parsed = JSON.parse(raw) as Spot[];
      const normalized = Array.isArray(parsed)
        ? parsed.map((spot) => ({
            ...spot,
            category: normalizeSpotCategory(spot.category),
            subcategories: Array.isArray(spot.subcategories) ? spot.subcategories : [],
            branches: spot.branches?.map((branch) => ({
              ...branch,
              category: normalizeSpotCategory(branch.category),
              subcategories: Array.isArray(branch.subcategories) ? branch.subcategories : [],
            })),
          }))
        : [];

      if (normalized.length > 0) {
        return normalized;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function listCachedSpotKeys() {
  if (typeof window === 'undefined') {
    return [];
  }

  const keys = Object.keys(window.localStorage);
  const legacy = keys
    .filter((key) => key.startsWith('spots-cache-v'))
    .sort((left, right) => right.localeCompare(left));

  return [spotsCacheKey, ...legacy.filter((item) => item !== spotsCacheKey)];
}

function writeCachedSpots(spots: Spot[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(spotsCacheKey, JSON.stringify(spots));
  } catch {
    // Ignore cache write issues.
  }
}

function getPrimarySpotImage(
  coverImageUrl: string,
  galleryUrls: string[] | null | undefined,
) {
  const firstGalleryImage = galleryUrls?.find(
    (url) => typeof url === 'string' && url.trim().length > 0,
  )?.trim();

  return coverImageUrl?.trim() || firstGalleryImage || '';
}

function normalizeSpotSubcategories(values: string[] | null | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export function mapRowsToSpots(spotRows: SpotRow[], branchRows: BranchRow[], branchHourRows: BranchHourRow[]) {
  const activeSpots = spotRows.filter((spot) => spot.is_active !== false && spot.business_status !== 'permanently_closed');
  const spotsWithBranches = new Set(branchRows.map((branch) => branch.spot_id));
  const branchesBySpot = new Map<number, BranchRow[]>();
  const hoursByBranch = new Map<number, BranchHourRow[]>();

  branchRows.forEach((branch) => {
    if (branch.is_active === false || branch.business_status === 'permanently_closed') {
      return;
    }

    const current = branchesBySpot.get(branch.spot_id);
    if (current) {
      current.push(branch);
    } else {
      branchesBySpot.set(branch.spot_id, [branch]);
    }
  });

  branchHourRows.forEach((row) => {
    const current = hoursByBranch.get(row.branch_id);
    if (current) {
      current.push(row);
    } else {
      hoursByBranch.set(row.branch_id, [row]);
    }
  });

  activeSpots.sort((left, right) => {
    const leftRank = getSpotFeedPriorityRank(left, branchesBySpot.get(left.id) ?? []);
    const rightRank = getSpotFeedPriorityRank(right, branchesBySpot.get(right.id) ?? []);
    if (leftRank !== rightRank) {
      return rightRank - leftRank;
    }

    return right.id - left.id;
  });

  const flattened: Spot[] = [];

  activeSpots.forEach((spot) => {
    const canonicalCategory = normalizeSpotCategory(spot.category);
    const normalizedSubcategories = normalizeSpotSubcategories(spot.subcategories);
    const enrichedTags = enrichSpotTaxonomy(spot.slug, spot.tags ?? [], 'tags');
    const enrichedMoods = enrichSpotTaxonomy(spot.slug, spot.moods ?? [], 'moods');
    const branches = (branchesBySpot.get(spot.id) ?? []).sort(
      (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0),
    );
    const feedPriorityRank = getSpotFeedPriorityRank(spot, branches);
    const manuallyAdjusted =
      wasManuallyAdjusted(spot.created_at, spot.updated_at) ||
      branches.some((branch) => wasManuallyAdjusted(branch.created_at, branch.updated_at));

    if (!branches.length) {
      // Hidden branches must not reappear as a synthetic branchless place.
      if (spotsWithBranches.has(spot.id)) return;
      flattened.push({
        id: spot.slug,
        businessStatus: spot.business_status,
        spotId: spot.id,
        branchId: null,
        placeSlug: spot.slug,
        branchSlug: spot.slug,
        feedPriorityRank,
        manuallyAdjusted,
        editorialBadge: spot.editorial_badge ?? null,
        createdAt: spot.created_at,
        updatedAt: spot.updated_at,
        likeTargetId: String(spot.id),
        type: spot.type,
        startsAt: spot.starts_at,
        endsAt: spot.ends_at,
        ticketPrice: spot.ticket_price,
        venueSpotId: spot.venue_spot_id,
        venueBranchId: spot.venue_branch_id,
        venueBranchSlug: spot.venue_branch_slug,
        venueName: spot.venue_name,
        venueLogoUrl: spot.venue_logo_url,
        name: spot.name,
        brandName: spot.name,
        branchName: '',
        neighborhood: '',
        hubName: '',
        category: canonicalCategory,
        subcategories: normalizedSubcategories,
        city: spot.city,
        likes: spot.likes,
        image: getPrimarySpotImage(spot.cover_image_url, spot.gallery_urls),
        logoUrl: spot.logo_url,
        galleryImages: spot.gallery_urls ?? [],
        shortDescription: spot.short_description,
        description: spot.short_description,
        interests: [],
        maxPeople: 1,
        days: [],
        distanceKm: 0,
        minBudget: 0,
        maxBudget: 0,
        budgetPilot: true,
        budgetScenarios: [],
        typicalBudget: 0,
        hours: '',
        address: '',
        instagram: '',
        whatsapp: '',
        phone: '',
        menuUrl: '',
        menuItems: [],
        tags: enrichedTags,
        moods: enrichedMoods,
      });
      return;
    }

    branches.forEach((branch) => {
      const weeklyHours = (hoursByBranch.get(branch.id) ?? []).sort(
        (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0),
      );
      const derivedHours = buildBranchHoursSummary(branch, weeklyHours);
      const normalizedNeighborhood = normalizeNeighborhoodLabel(
        branch.neighborhood,
        branch.mall,
        branch.address,
      );
      const normalizedMall = normalizeMallLabel(
        branch.mall,
        normalizedNeighborhood,
      );
      const branchDescription = spot.short_description.trim();
      const scenarios = branch.budget_scenarios ?? [];
      const estimates = scenarios.map(scenario => scenarioBudget(branch.menu_items ?? [], 2, scenario).perPerson);
      const reference = estimates[0] ?? 0;

      flattened.push({
        id: branch.slug,
        businessStatus: spot.business_status === 'temporarily_closed' ? spot.business_status : branch.business_status ?? spot.business_status,
        spotId: spot.id,
        branchId: branch.id,
        placeSlug: spot.slug,
        branchSlug: branch.slug,
        feedPriorityRank,
        manuallyAdjusted,
        editorialBadge: spot.editorial_badge ?? null,
        createdAt: spot.created_at,
        updatedAt: spot.updated_at,
        likeTargetId: String(spot.id),
        type: spot.type,
        startsAt: spot.starts_at,
        endsAt: spot.ends_at,
        ticketPrice: spot.ticket_price,
        venueSpotId: spot.venue_spot_id,
        venueBranchId: spot.venue_branch_id,
        venueBranchSlug: spot.venue_branch_slug,
        venueName: spot.venue_name,
        venueLogoUrl: spot.venue_logo_url,
        name: spot.name,
        brandName: spot.name,
        branchName: normalizedNeighborhood,
        neighborhood: normalizedNeighborhood,
        hubName: normalizedMall,
        category: canonicalCategory,
        city: branch.city || spot.city,
        likes: spot.likes,
        image: getPrimarySpotImage(spot.cover_image_url, spot.gallery_urls),
        logoUrl: spot.logo_url,
        galleryImages: spot.gallery_urls ?? [],
        shortDescription: spot.short_description,
        description: branchDescription,
        interests: [],
        subcategories: normalizedSubcategories,
        maxPeople: branch.max_people,
        minPeople: branch.min_people,
        budgetPilot: true,
        budgetScenarios: scenarios,
        typicalBudget: reference,
        budgetBasis: branch.budget_basis ?? scenarios[0]?.concept ?? 'Presupuesto por confirmar: falta una selección con precios de esta sede.',
        menuCalculationNote: branch.menu_calculation_note,
        googleMapsUrl: branch.google_maps_url,
        websiteUrl: branch.website_url,
        days: [],
        distanceKm: 0,
        minBudget: reference,
        maxBudget: reference > 0 ? Math.max(...estimates.filter((price): price is number => price !== null)) : 0,
        hours: derivedHours,
        address: branch.address,
        instagram: branch.instagram,
        whatsapp: branch.whatsapp,
        phone: branch.phone,
        menuUrl: branch.menu_url,
        menuItems: Array.isArray(branch.menu_items) ? branch.menu_items : [],
        tags: enrichedTags,
        moods: enrichedMoods,
        latitude: branch.latitude ?? undefined,
        longitude: branch.longitude ?? undefined,
      });
    });
  });

  return flattened;
}

function getSpotFeedPriorityRank(spot: SpotRow, branches: BranchRow[]) {
  const manuallyAdjusted =
    wasManuallyAdjusted(spot.created_at, spot.updated_at) ||
    branches.some((branch) => wasManuallyAdjusted(branch.created_at, branch.updated_at));

  if (manuallyAdjusted) {
    return 2;
  }

  if (autoImportedPrioritySlugs.has(spot.slug)) {
    return 0;
  }

  return 1;
}

function wasManuallyAdjusted(createdAt?: string | null, updatedAt?: string | null) {
  if (!createdAt || !updatedAt) {
    return false;
  }

  const createdTime = Date.parse(createdAt);
  const updatedTime = Date.parse(updatedAt);
  if (!Number.isFinite(createdTime) || !Number.isFinite(updatedTime)) {
    return false;
  }

  return updatedTime - createdTime > 60_000;
}

function enrichSpotTaxonomy(
  slug: string,
  values: string[],
  kind: 'tags' | 'moods',
) {
  const normalizedSlug = slug.trim().toLowerCase();
  const nextValues = [...values];

  if (normalizedSlug === 'cafe-pintado') {
    const extras = kind === 'tags' ? ['familiar', 'familia'] : ['plan familiar'];
    extras.forEach((extra) => {
      if (!nextValues.some((value) => value.trim().toLowerCase() === extra)) {
        nextValues.push(extra);
      }
    });
  }

  return nextValues;
}


function normalizeNeighborhoodLabel(
  neighborhood: string | null | undefined,
  mall: string | null | undefined,
  address: string,
) {
  const cleanedNeighborhood = (neighborhood ?? '').trim();
  if (!cleanedNeighborhood) {
    return '';
  }

  const normalizedNeighborhood = normalizeLabelToken(cleanedNeighborhood);
  const context = normalizeLabelToken(`${mall} ${address}`);

  if (context.includes('cl 9 #56-250') || context.includes('cl. 9 #56-250')) {
    return 'Pampa Linda';
  }

  if (
    normalizedNeighborhood.includes('normandia') ||
    context.includes('normandia sebastian de belalcazar') ||
    context.includes('sebastian de belalcazar')
  ) {
    return 'El Peñón';
  }

  if (
    normalizedNeighborhood.includes('cristales') ||
    normalizedNeighborhood.includes('tejares') ||
    context.includes('los cristales') ||
    context.includes('tejares')
  ) {
    return 'Tejares-Cristales';
  }

  if (context.includes('plaza lili') || context.includes('hotel plaza lili')) {
    return 'Valle del Lili';
  }

  if (normalizedNeighborhood === 'comuna 17') {
    if (
      context.includes('plaza lili') ||
      context.includes('hotel plaza lili') ||
      context.includes('valle del lili') ||
      context.includes('lili')
    ) {
      return 'Valle del Lili';
    }

    if (context.includes('la hacienda')) {
      return 'La Hacienda';
    }

    if (context.includes('limonar')) {
      return 'Limonar';
    }

    if (context.includes('caney')) {
      return 'El Caney';
    }
  }

  if (
    normalizedNeighborhood === 'chipichape' ||
    context.includes('chipichape') ||
    context.includes('pacific center') ||
    context.includes('pacific mall')
  ) {
    return 'Zona Chipichape';
  }

  if (normalizedNeighborhood === 'cuarto de legua') {
    return 'Guadalupe';
  }

  if (normalizeLabelToken(mall ?? '') === 'unicentro') {
    return 'Ciudad Jardín';
  }

  if (normalizeLabelToken(mall ?? '') === 'mallplaza') {
    return 'Guadalupe';
  }

  if (normalizedNeighborhood !== 'canasgordas') {
    return cleanedNeighborhood;
  }

  if (
    context.includes('pance') ||
    context.includes('puerto 125') ||
    context.includes('lago verde') ||
    context.includes('carulla pance')
  ) {
    return 'Pance';
  }

  return 'Ciudad Jardín';
}

function normalizeMallLabel(mall: string | null | undefined, neighborhood: string) {
  const cleanedMall = normalizeCommercialCenterLabel(mall ?? '');
  if (!cleanedMall) {
    return '';
  }

  if (normalizeLabelToken(cleanedMall) === 'plazuela municipal') {
    if (normalizeLabelToken(neighborhood) === 'granada') {
      return 'Plazuela Municipal Granada';
    }

    if (normalizeLabelToken(neighborhood) === 'ciudad jardin') {
      return 'Plazuela Municipal Ciudad Jardín';
    }
  }

  if (normalizeLabelToken(cleanedMall) === normalizeLabelToken(neighborhood)) {
    return '';
  }

  return cleanedMall;
}

function normalizeLabelToken(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s{2,}/g, ' ')
    .trim();
}


async function fetchStaticCatalog() {
  if (Platform.OS !== 'web') {
    throw new Error('El catálogo estático solo está disponible en web.');
  }

  const payload = await getPublicJson(staticCatalogPath, 2_000) as Partial<SpotRowsSnapshot>;

  return {
    spots: Array.isArray(payload.spots) ? (payload.spots as SpotRow[]) : [],
    branches: Array.isArray(payload.branches) ? (payload.branches as BranchRow[]) : [],
    branchHours: Array.isArray(payload.branchHours)
      ? (payload.branchHours as BranchHourRow[])
      : [],
  } satisfies SpotRowsSnapshot;
}

const weekdayOptions = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
] as const;

function buildBranchHoursSummary(branch: BranchRow, weeklyHours: BranchHourRow[]) {
  if (!weeklyHours.length) {
    return branch.hours || '';
  }

  const grouped = buildGroupedWeeklySummary(weeklyHours);
  const holiday = buildHolidaySummary(branch);
  const parts = [grouped, holiday, ...getScheduleExceptionSegments(branch.hours || '')].filter(Boolean);
  return parts.join(' · ') || branch.hours || '';
}

function buildGroupedWeeklySummary(weeklyHours: BranchHourRow[]) {
  const ordered = weekdayOptions.map((day) => {
    const row = weeklyHours.find((entry) => entry.day_of_week === day.value);
    return {
      dayIndex: day.value,
      label: day.label,
      scheduleLabel: buildDailyScheduleLabel(row),
    };
  });

  const groups: Array<{ dayIndexes: number[]; label: string }> = [];

  ordered.forEach((row, index) => {
    if (!row.scheduleLabel) {
      return;
    }

    const previous = groups[groups.length - 1];
    if (
      previous &&
      previous.label === row.scheduleLabel &&
      previous.dayIndexes[previous.dayIndexes.length - 1] === index - 1
    ) {
      previous.dayIndexes.push(index);
      return;
    }

    groups.push({ dayIndexes: [index], label: row.scheduleLabel });
  });

  return groups
    .map((group) => `${formatDayIndexRange(group.dayIndexes)} ${group.label}`.trim())
    .join(' · ');
}

function buildDailyScheduleLabel(row?: BranchHourRow) {
  if (!row) {
    return '';
  }

  if (row.is_closed) {
    return 'Cerrado';
  }

  if (!row.open_time || !row.close_time) {
    return '';
  }

  return `${formatDbTime(row.open_time)}-${formatDbTime(row.close_time)}${buildSplitLabel(
    row.split_open_time,
    row.split_close_time,
  )}`;
}

function buildHolidaySummary(branch: BranchRow) {
  if (branch.holiday_mode === 'closed') {
    return 'Festivos cerrado';
  }

  if (branch.holiday_mode === 'same_as_sunday') {
    return 'Festivos como domingo';
  }

  if (branch.holiday_mode !== 'custom') {
    const festiveSegment = branch.hours
      ?.split('·')
      .map((segment) => segment.trim())
      .find((segment) => /\b(?:festivos?|fest)\b/i.test(segment));

    if (!festiveSegment) {
      return 'Festivos por definir';
    }

    const directive = festiveSegment.replace(/^.*?\b(?:festivos?|fest)\b\s*/i, '').trim();
    return directive ? `Festivos ${directive}` : 'Festivos por definir';
  }

  if (!branch.holiday_open_time || !branch.holiday_close_time) {
    return 'Festivos horario especial';
  }

  return `Festivos ${formatDbTime(branch.holiday_open_time)}-${formatDbTime(branch.holiday_close_time)}${buildSplitLabel(
    branch.holiday_split_open_time,
    branch.holiday_split_close_time,
  )}`;
}

function buildSplitLabel(openTime: string | null, closeTime: string | null) {
  return openTime && closeTime ? ` / ${formatDbTime(openTime)}-${formatDbTime(closeTime)}` : '';
}

function formatDbTime(value: string) {
  return value.slice(0, 5);
}

function formatDayIndexRange(dayIndexes: number[]) {
  const labels = dayIndexes
    .map((index) => weekdayOptions[index]?.label ?? '')
    .filter(Boolean);

  if (labels.length === 0) {
    return '';
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return `${labels[0]}-${labels[labels.length - 1]}`;
}

export function SpotsStoreProvider({ children }: { children: ReactNode }) {
  const shouldUseCatalog = Platform.OS === 'web';
  const cachedSpots = useMemo(() => (shouldUseCatalog ? readCachedSpots(spotsCacheKey) : null), [shouldUseCatalog]);
  const [spots, setSpots] = useState<Spot[]>(shouldUseCatalog ? cachedSpots ?? [] : []);
  const [loading, setLoading] = useState(shouldUseCatalog && !(cachedSpots && cachedSpots.length > 0));
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef<Promise<void> | null>(null);
  const lastAttempt = useRef<number | null>(null);
  const lastContent = useRef<string | null>(null);

  const refresh = useCallback((): Promise<void> => {
    if (!shouldUseCatalog) return Promise.resolve();
    if (inFlight.current) return inFlight.current;
    lastAttempt.current = Date.now();
    const request = (async () => {
    try {
      const snapshot = await fetchStaticCatalog();
      const content = JSON.stringify(snapshot);
      if (content !== lastContent.current) {
        const nextSpots = mapRowsToSpots(snapshot.spots, snapshot.branches, snapshot.branchHours);
        setSpots(nextSpots);
        writeCachedSpots(nextSpots);
        lastContent.current = content;
      }
      setError(null);
    } catch (err) {
      const fallbackSpots = readCachedSpots();
      if (fallbackSpots && fallbackSpots.length > 0) {
        setSpots(fallbackSpots);
      }
      setError(err instanceof Error ? err.message : 'No pudimos cargar Spots');
      throw err;
    } finally {
      inFlight.current = null;
      setLoading(false);
    }
    })();
    inFlight.current = request;
    return request;
  }, [shouldUseCatalog]);

  const refreshIfStale = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    // Throttle failures too, so navigating offline does not repeatedly retry.
    if (lastAttempt.current !== null && Date.now() - lastAttempt.current < 60_000) return Promise.resolve();
    return refresh();
  }, [refresh]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setSpots([]);
      setLoading(false);
      return;
    }

    void refreshIfStale().catch(() => {});
  }, [refreshIfStale]);

  const value = useMemo(
    () => ({
      spots,
      loading,
      backendEnabled: false,
      error,
      refresh,
      refreshIfStale,
    }),
    [spots, loading, error, refresh, refreshIfStale],
  );

  return (
    <SpotsStoreContext.Provider value={value}>
      {children}
    </SpotsStoreContext.Provider>
  );
}

export function useSpotsStore() {
  return useContext(SpotsStoreContext);
}
