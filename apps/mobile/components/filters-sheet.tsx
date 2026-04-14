import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  LayoutChangeEvent,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIconButton, AppPrimaryButton } from '@/components/app-ui';
import {
  DEFAULT_FILTERS,
  type ExploreFilters,
  type ExplorePeriod,
  type ExploreSort,
  type ExploreTab,
  formatBudget,
  matchesSpotToFilters,
  sortSpots,
} from '@/lib/explore-filters';
import {
  aggregatePlaceSpotsFromList,
  getSpotsByTypeFromList,
  normalizeCommercialCenterLabel,
} from '@/lib/mock-spots';
import { useLocationStore } from '@/lib/location-store';
import { useRelayoutSubscription } from '@/lib/relayout';
import { useSpotsStore } from '@/lib/spots-store';

const exploreFoodIcon = require('../assets/explore_food_icon.png');
const exploreCinemaIcon = require('../assets/explore_cinema_icon.png');
const exploreArtIcon = require('../assets/explore_art_icon.png');
const exploreNightlifeIcon = require('../assets/explore_nightlife_icon.png');
const exploreSportsIcon = require('../assets/explore_sports_icon.png');
const exploreFamilyIcon = require('../assets/explore_family_icon.png');
const exploreEventsIcon = require('../assets/explore_events_icon.png');
const exploreNatureIcon = require('../assets/explore_nature_icon.png');

const MIN_PRICE = 0;
const MAX_PRICE = 150000;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const FILTERS_SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.88);
const FILTERS_COLLAPSED_OFFSET = FILTERS_SHEET_HEIGHT;
const filtersUi = {
  bg: '#f6f6f8',
  surface: '#ffffff',
  surfaceMuted: '#f0f0f3',
  text: '#141417',
  textSecondary: '#5f5f67',
  textTertiary: '#85858f',
  accent: '#EF3857',
  accentSoft: 'rgba(239,56,87,0.08)',
};

const chipTextBase = {
  fontSize: 14,
  fontWeight: '600' as const,
};

const chipTextDefaultColor = '#5f5f67';
const chipTextActiveColor = '#000000';

const dayOptions = [
  { label: 'Cualquier día', shortLabel: 'Cualquier día', value: 'Any' },
  { label: 'Domingo', shortLabel: 'D', value: 'Dom' },
  { label: 'Lunes', shortLabel: 'L', value: 'Lun' },
  { label: 'Martes', shortLabel: 'M', value: 'Mar' },
  { label: 'Miércoles', shortLabel: 'X', value: 'Mie' },
  { label: 'Jueves', shortLabel: 'J', value: 'Jue' },
  { label: 'Viernes', shortLabel: 'V', value: 'Vie' },
  { label: 'Sábado', shortLabel: 'S', value: 'Sab' },
  { label: 'Festivos', shortLabel: 'Festivos', value: 'Festivos' },
];

const categoryOptions: Array<{
  label: string;
  value: string;
  image: any;
}> = [
  { label: 'Arte y cultura', value: 'Arte y cultura', image: exploreArtIcon },
  { label: 'Bares y noche', value: 'Bares y noche', image: exploreNightlifeIcon },
  { label: 'Restaurantes y cafés', value: 'Restaurantes y cafés', image: exploreFoodIcon },
  { label: 'Deporte', value: 'Deporte y bienestar', image: exploreSportsIcon },
  { label: 'Familiar', value: 'Familiar', image: exploreFamilyIcon },
  { label: 'Naturaleza', value: 'Naturaleza y aire libre', image: exploreNatureIcon },
];

const sortOptions: Array<{ label: string; value: ExploreSort }> = [
  { label: 'Más nuevos', value: 'recent' },
  { label: 'Mejor calificados', value: 'topRated' },
  { label: 'Más económico', value: 'priceAsc' },
  { label: 'Más costoso', value: 'priceDesc' },
];

const distancePresetOptions = [
  { label: 'Hasta 3 km', value: 3 },
  { label: 'Hasta 5 km', value: 5 },
  { label: 'Hasta 10 km', value: 10 },
  { label: 'Más de 10 km', value: -10 },
] as const;

const budgetPresetOptions = [
  { label: 'Hasta $20k', min: MIN_PRICE, max: 20000 },
  { label: '$20k – $40k', min: 20000, max: 40000 },
  { label: '$40k – $70k', min: 40000, max: 70000 },
  { label: 'Más de $70k', min: 70000, max: MAX_PRICE },
] as const;

const peoplePresetOptions = [
  { label: 'Pareja', value: 2 },
  { label: '3-4', value: 4 },
  { label: '5+', value: 5 },
] as const;

const idealForOptions = [
  { label: 'Con amigos', value: 'con amigos' },
  { label: 'Pareja', value: 'pareja' },
  { label: 'Plan tranqui', value: 'plan tranqui' },
  { label: 'Algo especial', value: 'algo especial' },
  { label: 'Tomar algo', value: 'tomar algo' },
  { label: 'Familiar', value: 'Familiar' },
  { label: 'Pet-friendly', value: 'Pet friendly' },
  { label: 'Al aire libre', value: 'al aire libre' },
  { label: 'Caminar', value: 'caminar' },
  { label: 'Café', value: 'cafe' },
  { label: 'Brunch', value: 'brunch' },
  { label: 'Desayuno', value: 'desayuno' },
  { label: 'Dulce', value: 'dulce' },
  { label: 'Hablar', value: 'hablar' },
  { label: 'Activo', value: 'activo' },
  { label: 'Naturaleza', value: 'naturaleza' },
] as const;

const whenPresetOptions = [
  { label: 'Abierto ahora', value: 'now' },
  { label: 'Fin de semana', value: 'weekend' },
  { label: 'Festivos', value: 'holiday' },
] as const;

const sectorMacrozoneOrder = ['Centro', 'Norte', 'Sur', 'Oeste', 'Otros'] as const;
type SectorMacrozone = (typeof sectorMacrozoneOrder)[number];
const LOCATION_ZONE_PREFIX = 'zone|||';
const LOCATION_MALL_PREFIX = 'mall|||';
type LocationOption = {
  key: string;
  label: string;
  count: number;
  kind: 'zone' | 'mall';
  sector?: string;
  sectors?: string[];
};

type FiltersSheetProps = {
  activeTab: ExploreTab;
  initialFilters: ExploreFilters;
  query: string;
  onApply: (filters: ExploreFilters) => void;
  onClearQuery?: () => void;
  onClose: () => void;
};

type DynamicSectionKey =
  | 'category'
  | 'location'
  | 'availability'
  | 'budget'
  | 'people'
  | 'distance';

export function FiltersSheet({
  activeTab,
  initialFilters,
  query,
  onApply,
  onClearQuery,
  onClose,
}: FiltersSheetProps) {
  useRelayoutSubscription();
  const insets = useSafeAreaInsets();
  const { spots } = useSpotsStore();
  const { userLocation, error: locationError, requestLocation } = useLocationStore();
  const scrollRef = useRef<ScrollView | null>(null);
  const currentScrollYRef = useRef(0);
  const sectionLayoutRef = useRef<Record<DynamicSectionKey, { y: number; height: number } | null>>({
    category: null,
    location: null,
    availability: null,
    budget: null,
    people: null,
    distance: null,
  });

  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialFilters.interests);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [selectedHubNames, setSelectedHubNames] = useState(initialFilters.hubName);
  const [sectorSearch, setSectorSearch] = useState('');
  const [mallSearch, setMallSearch] = useState('');
  const [distance, setDistance] = useState(initialFilters.distance);
  const [minBudget, setMinBudget] = useState(initialFilters.minBudget);
  const [maxBudget, setMaxBudget] = useState(initialFilters.maxBudget);
  const [time, setTime] = useState(initialFilters.time);
  const [period, setPeriod] = useState(initialFilters.period);
  const [selectedDays, setSelectedDays] = useState<string[]>(initialFilters.days);
  const [people, setPeople] = useState(initialFilters.people);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy);
  const [openNowOnly, setOpenNowOnly] = useState(initialFilters.openNowOnly);
  const [hideManuallyAdjusted, setHideManuallyAdjusted] = useState(initialFilters.hideManuallyAdjusted);
  const [neighborhoodPickerOpen, setNeighborhoodPickerOpen] = useState(false);
  const [showAdvancedWhen, setShowAdvancedWhen] = useState(false);
  const [showAllLocationSectors, setShowAllLocationSectors] = useState(false);
  const [showAllLocationMalls, setShowAllLocationMalls] = useState(false);
  const [showAllIdealFor, setShowAllIdealFor] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(FILTERS_COLLAPSED_OFFSET)).current;
  const sectorChipsAnim = useRef(new Animated.Value(1)).current;
  const mallChipsAnim = useRef(new Animated.Value(1)).current;
  const sheetLastOffset = useRef(FILTERS_COLLAPSED_OFFSET);
  const closingRef = useRef(false);
  const categoryValues = useMemo<string[]>(() => categoryOptions.map((option) => option.value), []);
  const idealForValues = useMemo<string[]>(() => idealForOptions.map((option) => option.value), []);
  const selectedCategoryValues = useMemo(
    () => selectedCategories.filter((value) => categoryValues.includes(value)),
    [categoryValues, selectedCategories],
  );
  const selectedIdealForValues = useMemo(
    () => selectedCategories.filter((value) => idealForValues.includes(value)),
    [idealForValues, selectedCategories],
  );

  useEffect(() => {
    const currentPreset = getSelectedWhenPreset({
      openNowOnly: initialFilters.openNowOnly,
      selectedDays: initialFilters.days,
      time: initialFilters.time,
      period: initialFilters.period,
    });

    setSelectedCategories(initialFilters.interests);
    setSelectedNeighborhoods([]);
    setSelectedHubNames(initialFilters.hubName);
    setSectorSearch('');
    setMallSearch('');
    setDistance(initialFilters.distance);
    setMinBudget(initialFilters.minBudget);
    setMaxBudget(initialFilters.maxBudget);
    setTime(initialFilters.time);
    setPeriod(initialFilters.period);
    setSelectedDays(initialFilters.days);
    setPeople(initialFilters.people);
    setSortBy(initialFilters.sortBy);
    setOpenNowOnly(initialFilters.openNowOnly);
    setHideManuallyAdjusted(initialFilters.hideManuallyAdjusted);
    setShowAllLocationSectors(false);
    setShowAllLocationMalls(false);
    setShowAllIdealFor(false);
    setShowAdvancedWhen(currentPreset === null && (
      initialFilters.days.length > 0 ||
      Boolean(initialFilters.time) ||
      Boolean(initialFilters.period)
    ));
  }, [initialFilters]);

  const filters = useMemo<ExploreFilters>(
    () => ({
      interests: selectedCategories,
      hubName: selectedHubNames,
      people,
      minBudget,
      maxBudget,
      time,
      period,
      days: selectedDays,
      distance,
      sortBy,
      openNowOnly,
      hideManuallyAdjusted,
    }),
    [
      distance,
      maxBudget,
      minBudget,
      openNowOnly,
      hideManuallyAdjusted,
      people,
      period,
      selectedCategories,
      selectedHubNames,
      selectedDays,
      sortBy,
      time,
      hideManuallyAdjusted,
    ],
  );

  const activeData = useMemo(
    () => getSpotsByTypeFromList(spots, activeTab === 'places' ? 'place' : 'event'),
    [activeTab, spots],
  );
  const resultsCount = useMemo(() => {
    const filteredSpots = sortSpots(
      activeData.filter((spot) =>
        matchesSpotToFilters(spot, filters, query, userLocation),
      ),
      sortBy,
    );

    if (activeTab !== 'places') {
      return filteredSpots.length;
    }

    return aggregatePlaceSpotsFromList(filteredSpots).length;
  }, [activeData, activeTab, filters, query, sortBy, userLocation]);
  const neighborhoodOptions = useMemo(() => {
    return Array.from(
      new Set(
        activeData
          .map((spot) => spot.neighborhood.trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right, 'es'));
  }, [activeData]);
  const filteredNeighborhoodOptions = useMemo(() => {
    const normalizedSearch = sectorSearch.trim().toLocaleLowerCase('es');
    if (!normalizedSearch) return neighborhoodOptions;
    return neighborhoodOptions.filter((option) =>
      option.toLocaleLowerCase('es').includes(normalizedSearch),
    );
  }, [neighborhoodOptions, sectorSearch]);
  const neighborhoodSections = useMemo(() => {
    const sectionsMap = new Map<SectorMacrozone, string[]>();

    filteredNeighborhoodOptions.forEach((sector) => {
      const macrozone = getSectorMacrozone(sector);
      const current = sectionsMap.get(macrozone) ?? [];
      current.push(sector);
      sectionsMap.set(macrozone, current);
    });

    return sectorMacrozoneOrder
      .map((macrozone) => ({
        macrozone,
        options: (sectionsMap.get(macrozone) ?? []).sort((left, right) =>
          left.localeCompare(right, 'es'),
        ),
      }))
      .filter((section) => section.options.length > 0);
  }, [filteredNeighborhoodOptions]);
  const budgetError = minBudget > maxBudget ? 'Min no puede superar Max.' : null;
  const filteredMallSearch = mallSearch.trim().toLocaleLowerCase('es');
  const locationPreviewFilters = useMemo(
    () => ({
      ...filters,
      hubName: [],
    }),
    [filters],
  );
  const locationCandidateSpots = useMemo(
    () =>
      activeData.filter((spot) =>
        matchesSpotToFilters(spot, locationPreviewFilters, query, userLocation),
      ),
    [activeData, locationPreviewFilters, query, userLocation],
  );
  const locationOptions = useMemo(() => {
    const zoneCounts = new Map<string, number>();
    const mallCounts = new Map<string, { mall: string; count: number; sectors: Set<string> }>();

    locationCandidateSpots.forEach((spot) => {
      const sector = spot.neighborhood.trim();
      const mall = spot.hubName.trim();

      if (
        filteredMallSearch &&
        !sector.toLocaleLowerCase('es').includes(filteredMallSearch) &&
        !mall.toLocaleLowerCase('es').includes(filteredMallSearch)
      ) {
        return;
      }

      if (sector) {
        zoneCounts.set(sector, (zoneCounts.get(sector) ?? 0) + 1);
      }

      if (mall) {
        const normalizedMall = normalizeCommercialCenterLabel(mall);
        const key = normalizedMall.toLocaleLowerCase('es');
        const current = mallCounts.get(key);
        if (current) {
          current.count += 1;
          if (sector) {
            current.sectors.add(sector);
          }
        } else {
          mallCounts.set(key, {
            mall: normalizedMall,
            count: 1,
            sectors: new Set(sector ? [sector] : []),
          });
        }
      }
    });

    const zones: LocationOption[] = Array.from(zoneCounts.entries())
      .map(([label, count]) => ({
        key: encodeZoneSelection(label),
        label,
        count,
        kind: 'zone' as const,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, 'es'));

    const malls = Array.from(mallCounts.values())
      .map(({ mall, count, sectors }) => ({
        key: encodeMallSelection('', mall),
        label: mall,
        count,
        kind: 'mall' as const,
        sectors: Array.from(sectors).sort((left, right) => left.localeCompare(right, 'es')),
      }))
      .sort((left, right) => left.label.localeCompare(right.label, 'es'));

    return {
      zones,
      malls,
    };
  }, [filteredMallSearch, locationCandidateSpots]);
  const selectedLocationOptions = useMemo(
    () => selectedHubNames.map((value) => parseLocationSelection(value)),
    [selectedHubNames],
  );
  const selectedSectorKeys = useMemo(
    () =>
      selectedLocationOptions
        .filter((option) => option.kind === 'zone')
        .map((option) => encodeZoneSelection(option.label)),
    [selectedLocationOptions],
  );
  const selectedSectors = useMemo(
    () =>
      selectedLocationOptions
        .filter((option) => option.kind === 'zone')
        .map((option) => option.label),
    [selectedLocationOptions],
  );
  const selectedMallKeys = useMemo(
    () =>
      selectedHubNames.filter((value) => parseLocationSelection(value).kind === 'mall'),
    [selectedHubNames],
  );
  const mallSectorsByKey = useMemo(
    () =>
      new Map(
        locationOptions.malls.map((option) => [option.key, option.sectors ?? []] as const),
      ),
    [locationOptions.malls],
  );
  const impliedSectorsFromSelectedMalls = useMemo(
    () =>
      Array.from(
        new Set(
          selectedMallKeys.flatMap((key) => mallSectorsByKey.get(key) ?? []),
        ),
      ).sort((left, right) => left.localeCompare(right, 'es')),
    [mallSectorsByKey, selectedMallKeys],
  );
  const activeSectors = useMemo(
    () =>
      Array.from(new Set([...selectedSectors, ...impliedSectorsFromSelectedMalls])).sort((left, right) =>
        left.localeCompare(right, 'es'),
      ),
    [impliedSectorsFromSelectedMalls, selectedSectors],
  );
  const activeSectorKeys = useMemo(
    () => activeSectors.map((sector) => encodeZoneSelection(sector)),
    [activeSectors],
  );
  const visibleLocationSectors = showAllLocationSectors
    ? locationOptions.zones
    : locationOptions.zones.slice(0, 8);
  const locationMallsForDisplay = useMemo(() => {
    if (activeSectors.length === 0) {
      return locationOptions.malls;
    }

    const allowedSectors = new Set(activeSectors);
    return locationOptions.malls.filter((option) =>
      (option.sectors ?? []).some((sector) => allowedSectors.has(sector)),
    );
  }, [activeSectors, locationOptions.malls]);
  const visibleLocationMalls = showAllLocationMalls
    ? locationMallsForDisplay
    : locationMallsForDisplay.slice(0, 10);
  const visibleIdealForOptions = showAllIdealFor ? idealForOptions : idealForOptions.slice(0, 8);
  const visibleLocationSectorSignature = useMemo(
    () => visibleLocationSectors.map((option) => option.key).join('|'),
    [visibleLocationSectors],
  );
  const visibleLocationMallSignature = useMemo(
    () => visibleLocationMalls.map((option) => option.key).join('|'),
    [visibleLocationMalls],
  );
  const hasMountedSectorAnimation = useRef(false);
  const hasMountedMallAnimation = useRef(false);
  const hasDaySelection = selectedDays.length > 0;
  const selectedDistancePreset =
    distancePresetOptions.find((option) => option.value === distance)?.value ?? null;
  const selectedBudgetPreset =
    budgetPresetOptions.find((option) => option.min === minBudget && option.max === maxBudget)?.label ?? null;
  const selectedWhenPreset = getSelectedWhenPreset({
    openNowOnly,
    selectedDays,
    time,
    period,
  });

  useEffect(() => {
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 180,
      mass: 0.9,
    }).start();
  }, [sheetTranslateY]);

  useEffect(() => {
    if (!hasMountedSectorAnimation.current) {
      hasMountedSectorAnimation.current = true;
      return;
    }

    playLocationRefreshAnimation(sectorChipsAnim);
  }, [sectorChipsAnim, visibleLocationSectorSignature]);

  useEffect(() => {
    if (!hasMountedMallAnimation.current) {
      hasMountedMallAnimation.current = true;
      return;
    }

    playLocationRefreshAnimation(mallChipsAnim);
  }, [mallChipsAnim, visibleLocationMallSignature]);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > 4,
        onPanResponderGrant: () => {
          sheetTranslateY.stopAnimation((value) => {
            sheetLastOffset.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const nextValue = clamp(sheetLastOffset.current + gestureState.dy, 0, FILTERS_COLLAPSED_OFFSET);
          sheetTranslateY.setValue(nextValue);
        },
        onPanResponderRelease: (_, gestureState) => {
          const currentValue = clamp(sheetLastOffset.current + gestureState.dy, 0, FILTERS_COLLAPSED_OFFSET);
          if (gestureState.vy > 1 || currentValue > FILTERS_SHEET_HEIGHT * 0.28) {
            closeSheet();
            return;
          }
          openSheet();
        },
      }),
    [sheetTranslateY],
  );

  function clearFilters() {
    setSelectedCategories(DEFAULT_FILTERS.interests);
    setSelectedNeighborhoods([]);
    setSelectedHubNames(DEFAULT_FILTERS.hubName);
    setSectorSearch('');
    setMallSearch('');
    setDistance(DEFAULT_FILTERS.distance);
    setMinBudget(DEFAULT_FILTERS.minBudget);
    setMaxBudget(DEFAULT_FILTERS.maxBudget);
    setTime(DEFAULT_FILTERS.time);
    setPeriod(DEFAULT_FILTERS.period);
    setSelectedDays(DEFAULT_FILTERS.days);
    setPeople(DEFAULT_FILTERS.people);
    setSortBy(DEFAULT_FILTERS.sortBy);
    setOpenNowOnly(DEFAULT_FILTERS.openNowOnly);
    setHideManuallyAdjusted(DEFAULT_FILTERS.hideManuallyAdjusted);
    setShowAdvancedWhen(false);
    setShowAllLocationSectors(false);
    setShowAllLocationMalls(false);
    setShowAllIdealFor(false);
    onClearQuery?.();
  }

  function toggleCategory(value: string) {
    setSelectedCategories((current) => {
      const withoutCategories = current.filter((item) => !categoryValues.includes(item));
      return current.includes(value) ? withoutCategories : [...withoutCategories, value];
    });
  }

  function toggleIdealFor(value: string) {
    setSelectedCategories((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function clearCategorySelections() {
    setSelectedCategories((current) => current.filter((item) => !categoryValues.includes(item)));
  }

  function clearIdealForSelections() {
    setSelectedCategories((current) => current.filter((item) => !idealForValues.includes(item)));
  }

  function toggleNeighborhoodSelection(value: string) {
    setSelectedNeighborhoods((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value].sort((left, right) => left.localeCompare(right, 'es')),
    );
  }

  function toggleHubSelection(value: string) {
    const nextOption = parseLocationSelection(value);

    setSelectedHubNames((current) => {
      const currentOptions = current.map((item) => ({
        key: item,
        parsed: parseLocationSelection(item),
      }));
      const isActive = current.includes(value);

      if (nextOption.kind === 'zone') {
        const nextSectorKeys = isActive
          ? currentOptions
              .filter((option) => option.parsed.kind === 'zone' && option.key !== value)
              .map((option) => option.key)
          : Array.from(
              new Set([
                ...currentOptions
                  .filter((option) => option.parsed.kind === 'zone')
                  .map((option) => option.key),
                value,
              ]),
            );

        const allowedSectors = new Set(nextSectorKeys.map((item) => parseLocationSelection(item).label));
        const nextMallKeys = currentOptions
          .filter((option) => option.parsed.kind === 'mall')
          .filter((option) =>
            allowedSectors.size === 0
              ? true
              : (mallSectorsByKey.get(option.key) ?? []).some((sector) => allowedSectors.has(sector)),
          )
          .map((option) => option.key);

        return [...nextSectorKeys, ...nextMallKeys].sort((left, right) =>
          left.localeCompare(right, 'es'),
        );
      }

      const nextMallKeys = isActive
        ? currentOptions
            .filter((option) => option.parsed.kind === 'mall' && option.key !== value)
            .map((option) => option.key)
        : Array.from(
            new Set([
              ...currentOptions
                .filter((option) => option.parsed.kind === 'mall')
                .map((option) => option.key),
              value,
            ]),
          );

      const nextSectorKeys = currentOptions
        .filter((option) => option.parsed.kind === 'zone')
        .map((option) => option.key);

      return [...nextSectorKeys, ...nextMallKeys].sort((left, right) =>
        left.localeCompare(right, 'es'),
      );
    });
  }

  function clearLocationSelections(kind: 'zone' | 'mall') {
    setSelectedHubNames((current) =>
      current.filter((value) => parseLocationSelection(value).kind !== kind),
    );
  }


  function toggleMacrozoneSelection(options: string[]) {
    setSelectedNeighborhoods((current) => {
      const allSelected = options.length > 0 && options.every((option) => current.includes(option));

      if (allSelected) {
        return current.filter((item) => !options.includes(item));
      }

      return Array.from(new Set([...current, ...options])).sort((left, right) =>
        left.localeCompare(right, 'es'),
      );
    });
  }

  function toggleDaySelection(value: string) {
    if (!value) {
      setSelectedDays([]);
      setTime('');
      setPeriod('');
      return;
    }

    if (value === 'Any') {
      setSelectedDays((current) => (current.includes('Any') ? [] : ['Any']));
      return;
    }

    setSelectedDays((current) => {
      const withoutAny = current.filter((item) => item !== 'Any');
      if (withoutAny.includes(value)) {
        const next = withoutAny.filter((item) => item !== value);
        if (next.length === 0) {
          setTime('');
          setPeriod('');
        }
        return next;
      }

      return [...withoutAny, value];
    });
  }

  function handleTimeChange(value: string) {
    const cleaned = value.replace(/[^\d]/g, '').slice(0, 4);
    if (!cleaned) {
      setTime('');
      return;
    }

    if (cleaned.length <= 2) {
      setTime(cleaned);
      return;
    }

    if (cleaned.length === 3) {
      setTime(`${cleaned.slice(0, 1)}:${cleaned.slice(1)}`);
      return;
    }

    setTime(`${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`);
  }

  function applyDistancePreset(nextDistance: number) {
    setDistance((current) => (current === nextDistance ? DEFAULT_FILTERS.distance : nextDistance));
  }

  function applyBudgetPreset(min: number, max: number) {
    const isActive = minBudget === min && maxBudget === max;
    if (isActive) {
      setMinBudget(DEFAULT_FILTERS.minBudget);
      setMaxBudget(DEFAULT_FILTERS.maxBudget);
      return;
    }

    setMinBudget(min);
    setMaxBudget(max);
  }

  function applyPeoplePreset(nextPeople: number) {
    setPeople((current) => (current === nextPeople ? 0 : nextPeople));
  }

  function applyWhenPreset(
    preset: 'now' | 'weekend' | 'holiday' | 'any',
  ) {
    if (preset !== 'any' && selectedWhenPreset === preset) {
      setOpenNowOnly(false);
      setSelectedDays([]);
      setTime('');
      setPeriod('');
      return;
    }

    if (preset === 'any') {
      setOpenNowOnly(false);
      setSelectedDays([]);
      setTime('');
      setPeriod('');
      return;
    }

    if (preset === 'now') {
      setOpenNowOnly(true);
      setSelectedDays([]);
      setTime('');
      setPeriod('');
      return;
    }

    setOpenNowOnly(false);

    if (preset === 'weekend') {
      setSelectedDays(['Sab', 'Dom']);
      setTime('');
      setPeriod('');
      return;
    }

    setSelectedDays(['Festivos']);
    setTime('');
    setPeriod('');
  }

  function openSheet() {
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 180,
      mass: 0.9,
    }).start();
  }

  function closeSheet(onClosed?: () => void) {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(sheetTranslateY, {
      toValue: FILTERS_COLLAPSED_OFFSET,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      closingRef.current = false;
      if (finished) {
        onClosed?.();
        onClose();
      }
    });
  }

  function applyFilters() {
    closeSheet(() => {
      onApply(filters);
    });
  }

  function handleFiltersScroll(event: { nativeEvent: { contentOffset: { y: number } } }) {
    currentScrollYRef.current = event.nativeEvent.contentOffset.y;
  }

  function handleDynamicSectionLayout(sectionKey: DynamicSectionKey, event: LayoutChangeEvent) {
    const { y, height } = event.nativeEvent.layout;
    const previous = sectionLayoutRef.current[sectionKey];
    sectionLayoutRef.current[sectionKey] = { y, height };

    if (!previous) {
      return;
    }

    if (previous.height === height) {
      return;
    }

    const delta = height - previous.height;
    if (Math.abs(delta) < 1) {
      return;
    }

    const currentScrollY = currentScrollYRef.current;
    if (currentScrollY >= y - 16) {
      scrollRef.current?.scrollTo({
        y: Math.max(0, currentScrollY + delta),
        animated: false,
      });
      currentScrollYRef.current = Math.max(0, currentScrollY + delta);
    }
  }

  return (
    <>
    <Modal transparent visible animationType="none" onRequestClose={() => closeSheet()}>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.scrim,
            {
              opacity: sheetTranslateY.interpolate({
                inputRange: [0, FILTERS_COLLAPSED_OFFSET],
                outputRange: [0.35, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSheet()} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.handleArea} {...sheetPanResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filters</Text>
            <AppIconButton
              name="close"
              onPress={() => closeSheet()}
              tone="light"
            />
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom: 132 + insets.bottom,
                flexGrow: 1,
              },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEnabled
            onScroll={handleFiltersScroll}
            scrollEventThrottle={16}
          >
          <Section title="Ordenar por">
            <View style={styles.sortRow}>
              {sortOptions.map((option) => {
                const active = sortBy === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.sortChip, active && styles.sortChipActive]}
                    onPress={() => setSortBy(option.value)}
                  >
                    <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Divider />

          <Section
            title="Categoría"
            actionLabel={selectedCategoryValues.length > 0 ? 'Quitar' : undefined}
            onActionPress={selectedCategoryValues.length > 0 ? clearCategorySelections : undefined}
            onLayout={(event) => handleDynamicSectionLayout('category', event)}
          >
            <View style={styles.categoryRow}>
              {categoryOptions.map((option) => {
                const active = selectedCategoryValues.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.categoryPill, active && styles.categoryPillActive]}
                    onPress={() => toggleCategory(option.value)}
                  >
                    <Image source={option.image} style={styles.categoryPillImage} resizeMode="contain" />
                    <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Divider />

          <Section
            title="Disponibilidad"
            actionLabel={selectedWhenPreset !== 'any' || showAdvancedWhen ? 'Quitar' : undefined}
            onActionPress={
              selectedWhenPreset !== 'any' || showAdvancedWhen
                ? () => {
                    applyWhenPreset('any');
                    setShowAdvancedWhen(false);
                  }
                : undefined
            }
            onLayout={(event) => handleDynamicSectionLayout('availability', event)}
          >
            {!showAdvancedWhen ? (
              <>
                <View style={styles.presetGrid}>
                  {whenPresetOptions.map((option) => {
                    const active = selectedWhenPreset === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        style={[styles.filterChip, active && styles.filterChipActive]}
                        onPress={() => applyWhenPreset(option.value)}
                      >
                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={() => setShowAdvancedWhen(true)}>
                  <Text style={styles.linkButtonText}>Refinar búsqueda</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.whenLayout}>
                <View style={styles.whenDayChips}>
                  {dayOptions
                    .filter((day) => day.value !== 'Any' && day.value !== 'Festivos')
                    .map((day) => {
                      const active = selectedDays.includes(day.value);
                      return (
                        <Pressable
                          key={day.value}
                          style={[styles.whenDayChip, active && styles.whenDayChipActive]}
                          onPress={() => toggleDaySelection(day.value)}
                        >
                          <Text style={[styles.whenDayChipText, active && styles.whenDayChipTextActive]}>
                            {day.shortLabel}
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>
                <View style={styles.timeRow}>
                  <View
                    style={[
                      styles.timeInputWrap,
                      Boolean(time.trim()) && styles.timeInputWrapSelected,
                      !hasDaySelection && styles.whenDisabled,
                    ]}
                  >
                    <TextInput
                      value={time}
                      onChangeText={handleTimeChange}
                      placeholder="7:00"
                      placeholderTextColor={Boolean(time.trim()) ? 'rgba(255,255,255,0.72)' : '#9d8ea2'}
                      keyboardType="number-pad"
                      style={[styles.timeInput, Boolean(time.trim()) && styles.timeInputSelected]}
                      autoCorrect={false}
                      autoCapitalize="none"
                      editable={hasDaySelection}
                      maxLength={5}
                    />
                  </View>
                  <View
                    style={[
                      styles.periodToggle,
                      !hasDaySelection && styles.whenDisabled,
                    ]}
                  >
                    {(['AM', 'PM'] as const).map((value) => {
                      const active = period === value;
                      return (
                        <Pressable
                          key={value}
                          style={[
                            styles.periodSegment,
                            active && styles.periodSegmentActive,
                          ]}
                          onPress={() =>
                            hasDaySelection
                              ? setPeriod((current) => (current === value ? '' : value))
                              : undefined
                          }
                          disabled={!hasDaySelection}
                        >
                          <Text
                            style={[
                              styles.periodSegmentText,
                              active && styles.periodSegmentTextActive,
                              !hasDaySelection && styles.whenDisabledText,
                            ]}
                          >
                            {value}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <Pressable onPress={() => setShowAdvancedWhen(false)}>
                  <Text style={styles.linkButtonText}>Volver a sugeridos</Text>
                </Pressable>
              </View>
            )}
          </Section>

          <Divider />

          <Section
            title="Distancia"
            actionLabel={distance !== DEFAULT_FILTERS.distance ? 'Quitar' : undefined}
            onActionPress={distance !== DEFAULT_FILTERS.distance ? () => setDistance(DEFAULT_FILTERS.distance) : undefined}
            onLayout={(event) => handleDynamicSectionLayout('distance', event)}
          >
            <View style={styles.presetGrid}>
              {distancePresetOptions.map((option) => {
                const active = selectedDistancePreset === option.value;
                return (
                  <Pressable
                    key={option.label}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => applyDistancePreset(option.value)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {locationError ? (
              <Pressable onPress={requestLocation}>
                <Text style={styles.locationText}>Activa ubicación para usar distancia real</Text>
              </Pressable>
            ) : null}
          </Section>

          <Divider />

          <Section
            title="Ubicación"
            onLayout={(event) => handleDynamicSectionLayout('location', event)}
          >
            <View style={styles.locationContent}>
              <View style={[styles.selectorSearchWrap, styles.locationInlineSearchWrap]}>
                <Ionicons name="search-outline" size={16} color={filtersUi.textTertiary} />
                <TextInput
                  value={mallSearch}
                  onChangeText={setMallSearch}
                  placeholder="Buscar sector o mall"
                  placeholderTextColor={filtersUi.textTertiary}
                  style={styles.selectorSearchInput}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
                {mallSearch.length > 0 ? (
                  <Pressable onPress={() => setMallSearch('')} hitSlop={8} style={styles.inlineSearchClear}>
                    <Ionicons name="close" size={16} color={filtersUi.textTertiary} />
                  </Pressable>
                ) : null}
              </View>
              {locationOptions.zones.length === 0 && locationOptions.malls.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateTitle}>No encontramos ubicaciones</Text>
                  <Text style={styles.emptyStateBody}>Prueba con otro nombre o borra la búsqueda.</Text>
                </View>
              ) : (
                <>
                  {locationOptions.zones.length > 0 ? (
                    <View style={styles.locationSectionBlock}>
                      <View style={styles.locationSubtleRow}>
                        <Text style={styles.locationSubtleLabel}>Sectores</Text>
                        {selectedSectorKeys.length > 0 ? (
                          <Pressable onPress={() => clearLocationSelections('zone')} hitSlop={8}>
                            <Text style={styles.linkButtonText}>Quitar</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <Animated.View
                        style={[
                          styles.selectorChipWrap,
                          getLocationRefreshAnimatedStyle(sectorChipsAnim),
                        ]}
                      >
                        {visibleLocationSectors.map((option) => {
                          const active = activeSectorKeys.includes(option.key);
                          return (
                            <Pressable
                              key={option.key}
                              style={[styles.selectorChip, active && styles.selectorChipActive]}
                              onPress={() => toggleHubSelection(option.key)}
                            >
                              <Text
                                style={[
                                  styles.selectorChipTitle,
                                  active && styles.selectorChipTitleActive,
                                ]}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </Animated.View>
                      {locationOptions.zones.length > 8 ? (
                        <Pressable onPress={() => setShowAllLocationSectors((current) => !current)} hitSlop={8} style={styles.inlineChevronAction}>
                          <Text style={styles.linkButtonText}>{showAllLocationSectors ? 'Ver menos' : 'Ver todos'}</Text>
                          <Ionicons
                            name={showAllLocationSectors ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={filtersUi.accent}
                          />
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  {locationMallsForDisplay.length > 0 ? (
                    <View style={styles.locationSectionBlock}>
                      <View style={styles.locationSubtleRow}>
                        <Text style={styles.locationSubtleLabel}>Malls</Text>
                        {selectedMallKeys.length > 0 ? (
                          <Pressable onPress={() => clearLocationSelections('mall')} hitSlop={8}>
                            <Text style={styles.linkButtonText}>Quitar</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <Animated.View
                        style={[
                          styles.selectorChipWrap,
                          getLocationRefreshAnimatedStyle(mallChipsAnim),
                        ]}
                      >
                        {visibleLocationMalls.map((option) => {
                          const active = selectedMallKeys.includes(option.key);
                          return (
                            <Pressable
                              key={option.key}
                              style={[styles.selectorChip, active && styles.selectorChipActive]}
                              onPress={() => toggleHubSelection(option.key)}
                            >
                              <Text
                                style={[
                                  styles.selectorChipTitle,
                                  active && styles.selectorChipTitleActive,
                                ]}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </Animated.View>
                      {locationMallsForDisplay.length > 10 ? (
                        <Pressable onPress={() => setShowAllLocationMalls((current) => !current)} hitSlop={8} style={styles.inlineChevronAction}>
                          <Text style={styles.linkButtonText}>{showAllLocationMalls ? 'Ver menos' : 'Ver todos'}</Text>
                          <Ionicons
                            name={showAllLocationMalls ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={filtersUi.accent}
                          />
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </Section>

          <Section
            title="Presupuesto"
            actionLabel={selectedBudgetPreset !== null ? 'Quitar' : undefined}
            onActionPress={
              selectedBudgetPreset !== null
                ? () => applyBudgetPreset(DEFAULT_FILTERS.minBudget, DEFAULT_FILTERS.maxBudget)
                : undefined
            }
            onLayout={(event) => handleDynamicSectionLayout('budget', event)}
          >
            <View style={styles.presetGrid}>
              {budgetPresetOptions.map((option) => {
                const active = selectedBudgetPreset === option.label;
                return (
                  <Pressable
                    key={option.label}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => applyBudgetPreset(option.min, option.max)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {selectedBudgetPreset !== null ? (
              <Text style={styles.inlineHint}>
                ${formatBudget(minBudget)} – ${formatBudget(maxBudget)}
              </Text>
            ) : null}
          </Section>

          <Divider />

          <Section
            title="Ideal para"
            actionLabel={selectedIdealForValues.length > 0 ? 'Quitar' : undefined}
            onActionPress={selectedIdealForValues.length > 0 ? clearIdealForSelections : undefined}
          >
            <View style={styles.presetGrid}>
              {visibleIdealForOptions.map((option) => {
                const active = selectedIdealForValues.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => toggleIdealFor(option.value)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {idealForOptions.length > 8 ? (
              <Pressable onPress={() => setShowAllIdealFor((current) => !current)} hitSlop={8} style={styles.inlineChevronAction}>
                <Text style={styles.linkButtonText}>{showAllIdealFor ? 'Ver menos' : 'Ver todos'}</Text>
                <Ionicons
                  name={showAllIdealFor ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={filtersUi.accent}
                />
              </Pressable>
            ) : null}
          </Section>

          <Divider />

          <Section
            title="Personas"
            actionLabel={people !== 0 ? 'Quitar' : undefined}
            onActionPress={people !== 0 ? () => setPeople(0) : undefined}
            onLayout={(event) => handleDynamicSectionLayout('people', event)}
          >
            <View style={styles.presetGrid}>
              {peoplePresetOptions.map((option) => {
                const active = people === option.value;
                return (
                  <Pressable
                    key={option.label}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => applyPeoplePreset(option.value)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: 20 + insets.bottom }]}>
            <Pressable style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </Pressable>
            <View style={styles.applyWrap}>
              <AppPrimaryButton
                label={`Mostrar ${resultsCount} resultado${resultsCount === 1 ? '' : 's'}`}
                onPress={applyFilters}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
    <Modal
      transparent
      visible={neighborhoodPickerOpen}
      animationType="fade"
      onRequestClose={() => setNeighborhoodPickerOpen(false)}
    >
      <View style={styles.selectorOverlay}>
        <Pressable style={styles.selectorScrim} onPress={() => setNeighborhoodPickerOpen(false)} />
        <View style={styles.selectorSheet}>
          <View style={styles.selectorHandle} />
          <View style={styles.selectorHeader}>
            <Text style={styles.selectorTitle}>Selecciona uno o más sectores</Text>
            <Pressable onPress={() => setNeighborhoodPickerOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={22} color={filtersUi.text} />
            </Pressable>
          </View>
          <View style={styles.selectorSearchWrap}>
            <Ionicons name="search-outline" size={16} color={filtersUi.textTertiary} />
            <TextInput
              value={sectorSearch}
              onChangeText={setSectorSearch}
              placeholder="Buscar sector"
              placeholderTextColor={filtersUi.textTertiary}
              style={styles.selectorSearchInput}
              autoCorrect={false}
              autoCapitalize="words"
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.selectorList, { paddingBottom: 10 + insets.bottom }]}>
            <Pressable
              style={[styles.selectorOption, selectedNeighborhoods.length === 0 && styles.selectorOptionActive]}
              onPress={() => {
                setSelectedNeighborhoods([]);
              }}
            >
              <Text style={[styles.selectorOptionText, selectedNeighborhoods.length === 0 && styles.selectorOptionTextActive]}>
                Todos
              </Text>
              {selectedNeighborhoods.length === 0 ? <Ionicons name="checkmark" size={18} color={filtersUi.text} /> : null}
            </Pressable>
            {neighborhoodSections.map((section) => {
              const selectedCount = section.options.filter((option) =>
                selectedNeighborhoods.includes(option),
              ).length;

              return (
              <View key={section.macrozone}>
                <View
                  style={[
                    styles.selectorMacrozoneOption,
                  ]}
                >
                  <View style={styles.selectorMacrozoneMain}>
                    <Text
                      style={[
                        styles.selectorOptionText,
                        styles.selectorMacrozoneText,
                      ]}
                    >
                      {section.macrozone}
                    </Text>
                    <Text style={styles.selectorMacrozoneMeta}>
                      {selectedCount > 0
                        ? `${selectedCount}/${section.options.length}`
                        : section.options.length}
                    </Text>
                  </View>
                  <View style={styles.selectorMacrozoneActions}>
                    <Pressable
                      onPress={() => toggleMacrozoneSelection(section.options)}
                      hitSlop={10}
                      style={styles.selectorMacrozoneActionButton}
                    >
                      <Text style={styles.selectorMacrozoneActionText}>
                        {selectedCount === section.options.length && section.options.length > 0
                          ? 'Quitar'
                          : 'Todos'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                {section.options.map((option) => {
                  const active = selectedNeighborhoods.includes(option);
                  return (
                    <Pressable
                      key={option}
                      style={[
                        styles.selectorOption,
                        styles.selectorSectorOption,
                        active && styles.selectorOptionActive,
                      ]}
                      onPress={() => toggleNeighborhoodSelection(option)}
                    >
                      <Text
                        style={[
                          styles.selectorOptionText,
                          styles.selectorSectorText,
                          active && styles.selectorOptionTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                      {active ? <Ionicons name="checkmark" size={18} color={filtersUi.text} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            )})}
          </ScrollView>
        </View>
      </View>
    </Modal>
    </>
  );
}

function Section({
  title,
  children,
  containerStyle,
  actionLabel,
  onActionPress,
  onLayout,
}: {
  title: string;
  children: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  actionLabel?: string;
  onActionPress?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View style={[styles.section, containerStyle]} onLayout={onLayout}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {actionLabel && onActionPress ? (
          <Pressable onPress={onActionPress} hitSlop={8}>
            <Text style={styles.sectionActionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function getMultiSelectSummary(values: string[], singularLabel: string) {
  if (values.length === 0) {
    return 'Todos';
  }

  if (values.length === 1) {
    return values[0];
  }

  return `${values.length} ${singularLabel === 'sector' ? 'sectores' : 'malls'}`;
}

function getHubSummary(values: string[]) {
  if (values.length === 0) {
    return 'Todos';
  }

  const labels = values.map((value) => parseLocationSelection(value).label);

  if (labels.length === 1) {
    return labels[0];
  }

  return `${labels.length} ubicaciones`;
}

function encodeZoneSelection(zone: string) {
  return `${LOCATION_ZONE_PREFIX}${zone}`;
}

function encodeMallSelection(sector: string, mall: string) {
  return `${LOCATION_MALL_PREFIX}${sector}|||${mall}`;
}

function parseLocationSelection(value: string) {
  if (value.startsWith(LOCATION_ZONE_PREFIX)) {
    return {
      kind: 'zone' as const,
      label: value.slice(LOCATION_ZONE_PREFIX.length),
      sector: '',
    };
  }

  if (value.startsWith(LOCATION_MALL_PREFIX)) {
    const [, sector = '', mall = ''] = value.split('|||');
    return {
      kind: 'mall' as const,
      label: mall,
      sector,
    };
  }

  if (value.includes('|||')) {
    const [sector = '', mall = ''] = value.split('|||');
    return {
      kind: 'mall' as const,
      label: mall,
      sector,
    };
  }

  return {
    kind: 'mall' as const,
    label: value,
    sector: '',
  };
}

function getSelectedWhenPreset({
  openNowOnly,
  selectedDays,
  time,
  period,
}: {
  openNowOnly: boolean;
  selectedDays: string[];
  time: string;
  period: ExplorePeriod;
}) {
  const normalizedSelectedDays = [...selectedDays].sort().join(',');

  if (openNowOnly) return 'now';
  if (normalizedSelectedDays === 'Dom,Sab' && !time && !period) return 'weekend';
  if (normalizedSelectedDays === 'Festivos' && !time && !period) return 'holiday';
  if (selectedDays.length === 0 && !time && !period) return 'any';

  return null;
}

function playLocationRefreshAnimation(value: Animated.Value) {
  value.setValue(0);
  Animated.sequence([
    Animated.timing(value, {
      toValue: 0.4,
      duration: 80,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }),
    Animated.spring(value, {
      toValue: 1,
      damping: 18,
      stiffness: 210,
      mass: 0.8,
      useNativeDriver: true,
    }),
  ]).start();
}

function getLocationRefreshAnimatedStyle(value: Animated.Value) {
  return {
    opacity: value.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0.72, 0.88, 1],
    }),
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      },
      {
        scale: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };
}

function normalizeSectorName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}

function getSectorMacrozone(sector: string): SectorMacrozone {
  const normalized = normalizeSectorName(sector);

  if (
    ['centro', 'granada', 'san pedro'].includes(normalized)
  ) {
    return 'Centro';
  }

  if (
    ['norte', 'versalles', 'santa monica residencial'].includes(normalized)
  ) {
    return 'Norte';
  }

  if (
    [
      'sur',
      'pance',
      'ciudad jardin',
      'la flora',
      'limonar',
      'san fernando',
      'alfaguara',
    ].includes(normalized)
  ) {
    return 'Sur';
  }

  if (
    ['oeste', 'el penon', 'arboleda', 'miraflores', 'los cristales'].includes(normalized)
  ) {
    return 'Oeste';
  }

  return 'Otros';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 40,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheet: {
    height: FILTERS_SHEET_HEIGHT,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: filtersUi.bg,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 10,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d2d2d8',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: filtersUi.text,
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 18,
  },
  section: {
    gap: 12,
    paddingVertical: 4,
    zIndex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  whenSection: {
    zIndex: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: filtersUi.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: filtersUi.accent,
  },
  dayPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    top: 58,
    zIndex: 18,
    backgroundColor: 'transparent',
  },
  divider: {
    height: 1,
    backgroundColor: '#e7e7eb',
  },
  locationFiltersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  locationFilterColumn: {
    flex: 1,
    gap: 8,
  },
  locationFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: filtersUi.textSecondary,
  },
  locationSelectButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: filtersUi.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  locationSelectButtonActive: {
    backgroundColor: filtersUi.accentSoft,
  },
  locationSelectButtonDisabled: {
    opacity: 0.6,
  },
  locationSelectValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  locationSelectValuePlaceholder: {
    color: filtersUi.textTertiary,
  },
  locationSelectValueActive: {
    color: filtersUi.text,
  },
  locationSelectValueDisabled: {
    color: filtersUi.textTertiary,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryPill: {
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: filtersUi.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  categoryPillImage: {
    width: 30,
    height: 30,
  },
  categoryPillActive: {
    backgroundColor: filtersUi.accentSoft,
  },
  categoryPillText: {
    ...chipTextBase,
    color: chipTextDefaultColor,
  },
  categoryPillTextActive: {
    color: chipTextActiveColor,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sortChip: {
    paddingHorizontal: 14,
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: filtersUi.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipActive: {
    backgroundColor: filtersUi.accentSoft,
  },
  sortChipText: {
    ...chipTextBase,
    color: chipTextDefaultColor,
  },
  sortChipTextActive: {
    color: chipTextActiveColor,
  },
  categoryItem: {
    width: 65,
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: filtersUi.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconActive: {
    backgroundColor: filtersUi.accentSoft,
  },
  categoryText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '500',
    color: filtersUi.textSecondary,
    textAlign: 'center',
  },
  categoryTextActive: {
    color: filtersUi.text,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: filtersUi.text,
  },
  metricHint: {
    fontSize: 12,
    fontWeight: '500',
    color: filtersUi.textTertiary,
  },
  sliderTrack: {
    marginTop: 2,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#ddddE3',
    justifyContent: 'center',
    overflow: 'visible',
  },
  sliderFill: {
    position: 'absolute',
    height: 5,
    borderRadius: 999,
    backgroundColor: filtersUi.text,
  },
  sliderThumbTouch: {
    position: 'absolute',
    marginLeft: -20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: filtersUi.surface,
    borderWidth: 2,
    borderColor: filtersUi.text,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  sliderThumbSecondary: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: filtersUi.surface,
    borderWidth: 2,
    borderColor: filtersUi.text,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '500',
    color: filtersUi.accent,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: filtersUi.surface,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: filtersUi.accentSoft,
  },
  filterChipText: {
    ...chipTextBase,
    color: chipTextDefaultColor,
  },
  filterChipTextActive: {
    color: chipTextActiveColor,
  },
  inlineHint: {
    fontSize: 13,
    color: filtersUi.textTertiary,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: filtersUi.accent,
  },
  inlineChevronAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingTop: 2,
  },
  whenDayChips: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
  },
  whenDayChip: {
    minHeight: 38,
    borderRadius: 14,
    backgroundColor: filtersUi.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whenDayChipActive: {
    backgroundColor: filtersUi.accentSoft,
  },
  whenDayChipText: {
    ...chipTextBase,
    color: chipTextDefaultColor,
  },
  whenDayChipTextActive: {
    color: chipTextActiveColor,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  toggleCopy: {
    flex: 1,
    gap: 0,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: filtersUi.text,
  },
  toggleHint: {
    fontSize: 13,
    lineHeight: 18,
    color: filtersUi.textTertiary,
  },
  toggleControl: {
    width: 48,
    height: 30,
    borderRadius: 999,
    paddingHorizontal: 4,
    backgroundColor: '#dedee4',
    justifyContent: 'center',
  },
  toggleControlActive: {
    backgroundColor: '#dedee4',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
  },
  toggleThumbActive: {
    backgroundColor: filtersUi.text,
    marginLeft: 18,
  },
  whenLayout: {
    gap: 12,
  },
  whenColumns: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  daySelectWrap: {
    flex: 0.88,
    height: 44,
    borderRadius: 16,
    backgroundColor: filtersUi.surface,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  daySelectButton: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  daySelectLeading: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelectValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: filtersUi.textTertiary,
  },
  daySelectValueActive: {
    color: filtersUi.text,
  },
  daySelectValueSelected: {
    color: filtersUi.text,
  },
  daySelectWrapActive: {
    backgroundColor: filtersUi.surface,
  },
  dayDropdown: {
    marginTop: 10,
    maxHeight: 220,
    borderRadius: 18,
    backgroundColor: filtersUi.surface,
    padding: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  dayDropdownScroll: {
    maxHeight: 204,
  },
  dayDropdownContent: {
    gap: 4,
  },
  dayDropdownItem: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dayDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dayDropdownItemActive: {
    backgroundColor: filtersUi.surfaceMuted,
  },
  dayDropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: filtersUi.textSecondary,
  },
  dayDropdownTextActive: {
    color: filtersUi.text,
  },
  whenControlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  whenControlsRowActive: {
    // Keeps visual parity when user already touched this block.
  },
  whenControlsColumn: {
    flex: 1.12,
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  timeInputWrap: {
    flex: 0.66,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: filtersUi.surface,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  timeInputWrapSelected: {
    backgroundColor: filtersUi.surfaceMuted,
  },
  timeInput: {
    fontSize: 16,
    fontWeight: '600',
    color: filtersUi.text,
    paddingVertical: 0,
    textAlign: 'center',
    outlineStyle: 'none' as never,
  },
  timeInputSelected: {
    color: filtersUi.text,
  },
  periodToggle: {
    flex: 1.04,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: filtersUi.surface,
    padding: 4,
  },
  periodSegment: {
    minWidth: 48,
    minHeight: 36,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  periodSegmentActive: {
    backgroundColor: filtersUi.accentSoft,
  },
  periodSegmentText: {
    ...chipTextBase,
    color: chipTextDefaultColor,
  },
  periodSegmentTextActive: {
    color: chipTextActiveColor,
  },
  whenDisabled: {
    opacity: 0.46,
  },
  whenDisabledText: {
    color: '#9d8ea2',
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: filtersUi.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peopleValue: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: filtersUi.text,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(245,245,247,0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectorOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  selectorScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  selectorSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: filtersUi.bg,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: SCREEN_HEIGHT * 0.62,
  },
  selectorScroll: {
    flexGrow: 0,
  },
  selectorHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d2d2d8',
    marginBottom: 14,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectorSearchWrap: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: filtersUi.surface,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationInlineSearchWrap: {
    marginBottom: 0,
  },
  locationContent: {
    gap: 12,
  },
  locationSectionBlock: {
    gap: 12,
  },
  selectorSearchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: filtersUi.text,
    paddingVertical: 0,
    outlineStyle: 'none' as never,
  },
  inlineSearchClear: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: filtersUi.text,
  },
  selectorList: {
    gap: 8,
  },
  selectorChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorChip: {
    minHeight: 42,
    borderRadius: 18,
    backgroundColor: filtersUi.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  selectorChipActive: {
    backgroundColor: filtersUi.accentSoft,
  },
  selectorChipTitle: {
    ...chipTextBase,
    color: chipTextDefaultColor,
  },
  selectorChipTitleActive: {
    color: chipTextActiveColor,
  },
  selectorChipMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: filtersUi.textTertiary,
  },
  selectorChipMetaActive: {
    color: filtersUi.textSecondary,
  },
  selectorFooter: {
    paddingTop: 12,
    backgroundColor: filtersUi.bg,
  },
  selectorSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: filtersUi.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  locationSubtleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9a9aa3',
    letterSpacing: 0.2,
    paddingHorizontal: 2,
  },
  locationSubtleRow: {
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorOption: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: filtersUi.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectorOptionActive: {
    backgroundColor: filtersUi.surfaceMuted,
  },
  selectorOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: filtersUi.textSecondary,
  },
  selectorOptionCopy: {
    flex: 1,
    gap: 2,
  },
  selectorOptionMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: filtersUi.textTertiary,
  },
  selectorOptionTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorOptionCount: {
    minWidth: 18,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: filtersUi.textTertiary,
  },
  selectorMacrozoneOption: {
    marginTop: 8,
    paddingRight: 10,
  },
  selectorMacrozoneMain: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    gap: 2,
  },
  selectorMacrozoneText: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: filtersUi.text,
  },
  selectorMacrozoneMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: filtersUi.textTertiary,
  },
  selectorMacrozoneActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectorMacrozoneActionButton: {
    paddingVertical: 4,
  },
  selectorMacrozoneActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: filtersUi.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  selectorGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 4,
  },
  selectorGroupHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: filtersUi.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  selectorGroupMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: filtersUi.textTertiary,
  },
  selectorSectorOption: {
    marginLeft: 14,
  },
  selectorSectorText: {
    fontWeight: '500',
  },
  selectorOptionTextActive: {
    color: filtersUi.text,
  },
  emptyStateCard: {
    borderRadius: 18,
    backgroundColor: filtersUi.surface,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: filtersUi.text,
  },
  emptyStateBody: {
    fontSize: 13,
    lineHeight: 18,
    color: filtersUi.textSecondary,
  },
  clearButton: {
    width: '30%',
    minHeight: 52,
    borderRadius: 28,
    backgroundColor: filtersUi.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: filtersUi.text,
  },
  applyWrap: {
    flex: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: filtersUi.accent,
  },
});
