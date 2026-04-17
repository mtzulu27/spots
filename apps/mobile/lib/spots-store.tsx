import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import type { Spot } from '@/lib/mock-spots';
import { normalizeCommercialCenterLabel } from '@/lib/mock-spots';
import { backendEnabled } from '@/lib/supabase';

const spotsCacheKey = 'spots-cache-v12';
const staticCatalogPath = '/spots-catalog.json';

type SpotRow = {
  id: number;
  type: 'place' | 'event';
  slug: string;
  name: string;
  short_description: string;
  cover_image_url: string;
  gallery_urls: string[] | null;
  category: string;
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
  id: number;
  spot_id: number;
  slug: string;
  neighborhood: string;
  mall: string;
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
  menu_url: string;
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
};

const SpotsStoreContext = createContext<SpotsStoreValue>({
  spots: [],
  loading: false,
  backendEnabled: false,
  error: null,
  refresh: async () => {},
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

function readCachedSpots() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(spotsCacheKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Spot[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
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

  return firstGalleryImage || coverImageUrl || '';
}

function mapRowsToSpots(spotRows: SpotRow[], branchRows: BranchRow[], branchHourRows: BranchHourRow[]) {
  const activeSpots = spotRows.filter((spot) => spot.is_active !== false);
  const branchesBySpot = new Map<number, BranchRow[]>();
  const hoursByBranch = new Map<number, BranchHourRow[]>();

  branchRows.forEach((branch) => {
    if (branch.is_active === false) {
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
      flattened.push({
        id: spot.slug,
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
        name: spot.name,
        brandName: spot.name,
        branchName: '',
        neighborhood: '',
        hubName: '',
        category: spot.category,
        city: spot.city,
        likes: spot.likes,
        image: getPrimarySpotImage(spot.cover_image_url, spot.gallery_urls),
        galleryImages: spot.gallery_urls ?? [],
        shortDescription: spot.short_description,
        description: spot.short_description,
        interests: [],
        maxPeople: 1,
        days: [],
        distanceKm: 0,
        minBudget: 0,
        maxBudget: 0,
        hours: '',
        address: '',
        instagram: '',
        whatsapp: '',
        phone: '',
        menuUrl: '',
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
      const branchDescription = buildBranchDescription(
        spot,
        branch,
        normalizedNeighborhood,
        normalizedMall,
      );

      flattened.push({
        id: branch.slug,
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
        name: spot.name,
        brandName: spot.name,
        branchName: normalizedNeighborhood,
        neighborhood: normalizedNeighborhood,
        hubName: normalizedMall,
        category: spot.category,
        city: spot.city,
        likes: spot.likes,
        image: getPrimarySpotImage(spot.cover_image_url, spot.gallery_urls),
        galleryImages: spot.gallery_urls ?? [],
        shortDescription: spot.short_description,
        description: branchDescription,
        interests: [],
        maxPeople: branch.max_people,
        days: [],
        distanceKm: 0,
        minBudget: branch.min_budget,
        maxBudget: branch.max_budget ?? branch.min_budget,
        hours: derivedHours,
        address: branch.address,
        instagram: branch.instagram,
        whatsapp: branch.whatsapp,
        phone: branch.phone,
        menuUrl: branch.menu_url,
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

function buildBranchDescription(
  spot: SpotRow,
  branch: BranchRow,
  normalizedNeighborhood: string,
  normalizedMall: string,
) {
  const normalizedSlug = branch.slug.trim().toLowerCase();

  if (normalizedSlug === 'casa-banana-granada') {
    return 'Casa Bananá en Granada es una parada de bakery y brunch pensada para antojo dulce, café y parche chill en una de las zonas más movidas del norte. Esta sede funciona muy bien para desayunos tardíos, una pausa suave entre vueltas por el barrio o un plan relajado con postres y algo rico a cualquier hora del día.';
  }

  if (normalizedSlug === 'casa-banana-puerto-125') {
    return 'Casa Bananá en Puerto 125, Pance, junta bakery, brunch y café en un punto cómodo para el sur de la ciudad. Esta sede se presta para un parche más tranquilo, para arrancar la mañana con algo dulce, resolver un brunch sin complicarse o caer por café y postre después de darse una vuelta por el corredor de Pance.';
  }

  const locationParts = [normalizedMall, normalizedNeighborhood].filter(Boolean);
  const locationLabel = locationParts.join(', ');
  const offering = collectSpotKeywords(spot.tags);
  const moods = collectSpotKeywords(spot.moods);
  const base = spot.short_description.trim();
  const opening = locationLabel
    ? `${spot.name} en ${locationLabel}`
    : `${spot.name}`;
  const offerCopy = offering.length
    ? ` con foco en ${formatList(offering)}`
    : '';
  const moodSentence = moods.length
    ? `Su vibra va más por ${formatList(moods)}.`
    : '';

  return `${opening} es una buena opción${offerCopy}.${moodSentence}${base ? ` ${base}` : ''}`.trim();
}

function normalizeNeighborhoodLabel(
  neighborhood: string,
  mall: string,
  address: string,
) {
  const cleanedNeighborhood = neighborhood.trim();
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

  if (normalizeLabelToken(mall) === 'unicentro') {
    return 'Ciudad Jardín';
  }

  if (normalizeLabelToken(mall) === 'mallplaza') {
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

function normalizeMallLabel(mall: string, neighborhood: string) {
  const cleanedMall = normalizeCommercialCenterLabel(mall);
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

function collectSpotKeywords(values: string[] | null, limit = 3) {
  return (values ?? [])
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, limit);
}

function formatList(values: string[]) {
  if (!values.length) {
    return '';
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} y ${values[1]}`;
  }

  return `${values.slice(0, -1).join(', ')} y ${values[values.length - 1]}`;
}

async function fetchStaticCatalog() {
  if (Platform.OS !== 'web') {
    throw new Error('El catálogo estático solo está disponible en web.');
  }

  const response = await fetch(staticCatalogPath, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`No pudimos descargar el catálogo estático (${response.status}).`);
  }

  const payload = (await response.json()) as Partial<SpotRowsSnapshot>;

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
  const parts = [grouped, holiday].filter(Boolean);
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
    return 'Festivos cerrado';
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
  const cachedSpots = useMemo(() => (shouldUseCatalog ? readCachedSpots() : null), [shouldUseCatalog]);
  const [spots, setSpots] = useState<Spot[]>(shouldUseCatalog ? cachedSpots ?? [] : []);
  const [loading, setLoading] = useState(shouldUseCatalog && !(cachedSpots && cachedSpots.length > 0));
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const snapshot = await fetchStaticCatalog();
      const nextSpots = mapRowsToSpots(snapshot.spots, snapshot.branches, snapshot.branchHours);
      setSpots(nextSpots);
      writeCachedSpots(nextSpots);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar Spots');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setSpots([]);
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      try {
        const snapshot = await fetchStaticCatalog();
        if (active) {
          const nextSpots = mapRowsToSpots(snapshot.spots, snapshot.branches, snapshot.branchHours);
          setSpots(nextSpots);
          writeCachedSpots(nextSpots);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'No pudimos cargar Spots');
          setSpots(readCachedSpots() ?? []);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      spots,
      loading,
      backendEnabled: false,
      error,
      refresh,
    }),
    [spots, loading, error],
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
