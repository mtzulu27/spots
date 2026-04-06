import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIconButton, AppPrimaryButton, appColors } from '@/components/app-ui';
import {
  DEFAULT_FILTERS,
  type ExploreFilters,
  formatBudget,
  isFiltersActive,
  matchesSpotToFilters,
  parseExploreTab,
  parseFiltersFromParams,
  serializeFilters,
} from '@/lib/explore-filters';
import { useLocationStore } from '@/lib/location-store';
import { useRelayoutSubscription } from '@/lib/relayout';
import { getSpotsByTypeFromList } from '@/lib/mock-spots';
import { useSpotsStore } from '@/lib/spots-store';

const MIN_DISTANCE = 0;
const MAX_DISTANCE = 50;
const MIN_PRICE = 0;
const MAX_PRICE = 150000;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const FILTERS_SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.88);
const FILTERS_COLLAPSED_OFFSET = FILTERS_SHEET_HEIGHT;
const dayOptions = [
  { label: 'D', value: 'Dom' },
  { label: 'L', value: 'Lun' },
  { label: 'M', value: 'Mar' },
  { label: 'X', value: 'Mie' },
  { label: 'J', value: 'Jue' },
  { label: 'V', value: 'Vie' },
  { label: 'S', value: 'Sab' },
];
const categoryOptions: Array<{
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { label: 'Arte y cultura', value: 'Arte y cultura', icon: 'color-palette-outline' },
  { label: 'Bares y noche', value: 'Bares y noche', icon: 'wine-outline' },
  { label: 'Restaurantes y cafés', value: 'Restaurantes y cafés', icon: 'restaurant-outline' },
  { label: 'Deporte', value: 'Deporte y bienestar', icon: 'barbell-outline' },
  { label: 'Familiar', value: 'Familiar', icon: 'people-outline' },
  { label: 'Naturaleza', value: 'Naturaleza y aire libre', icon: 'leaf-outline' },
];
const idealForOptions = [{ label: 'Pet-friendly', value: 'Pet friendly', icon: 'paw-outline' }] as const;
const timeOptions = ['7:00', '9:00', '11:00'];
const filtersUi = {
  bg: '#f5f5f7',
  surface: '#ffffff',
  surfaceMuted: '#ededf0',
  text: '#141417',
  textSecondary: '#5f5f67',
  textTertiary: '#8b8b94',
  accent: '#EF3857',
  accentSoft: 'rgba(239,56,87,0.12)',
};

export default function FiltersScreen() {
  useRelayoutSubscription();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const activeTab = parseExploreTab(params.tab);
  const query = typeof params.query === 'string' ? params.query : '';
  const parsed = parseFiltersFromParams(params);
  const { spots } = useSpotsStore();
  const { userLocation, error: locationError, requestLocation } = useLocationStore();

  const [selectedCategories, setSelectedCategories] = useState<string[]>(parsed.interests);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [selectedHubNames, setSelectedHubNames] = useState(parsed.hubName);
  const [distance, setDistance] = useState(parsed.distance);
  const [minBudget, setMinBudget] = useState(parsed.minBudget);
  const [maxBudget, setMaxBudget] = useState(parsed.maxBudget);
  const [time, setTime] = useState(parsed.time);
  const [period, setPeriod] = useState(parsed.period);
  const [selectedDays, setSelectedDays] = useState<string[]>(parsed.days);
  const [people, setPeople] = useState(parsed.people);
  const [openNowOnly, setOpenNowOnly] = useState(parsed.openNowOnly);
  const [hideManuallyAdjusted, setHideManuallyAdjusted] = useState(parsed.hideManuallyAdjusted);
  const [isDraggingDistance, setIsDraggingDistance] = useState(false);
  const [distanceTrackWidth, setDistanceTrackWidth] = useState(1);
  const [budgetTrackWidth, setBudgetTrackWidth] = useState(1);
  const [activeBudgetThumb, setActiveBudgetThumb] = useState<'min' | 'max' | null>(null);
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

  const distanceX = useRef(new Animated.Value(0)).current;
  const distanceScale = useRef(new Animated.Value(1)).current;
  const minBudgetX = useRef(new Animated.Value(0)).current;
  const maxBudgetX = useRef(new Animated.Value(0)).current;
  const minBudgetScale = useRef(new Animated.Value(1)).current;
  const maxBudgetScale = useRef(new Animated.Value(1)).current;
  const sheetTranslateY = useRef(new Animated.Value(FILTERS_COLLAPSED_OFFSET)).current;
  const sheetLastOffset = useRef(FILTERS_COLLAPSED_OFFSET);

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
      sortBy: parsed.sortBy,
      openNowOnly,
      hideManuallyAdjusted,
    }),
    [
      distance,
      maxBudget,
      minBudget,
      parsed.sortBy,
      openNowOnly,
      people,
      period,
      selectedCategories,
      selectedHubNames,
      selectedDays,
      time,
      hideManuallyAdjusted,
    ],
  );

  const activeData = useMemo(
    () => getSpotsByTypeFromList(spots, activeTab === 'places' ? 'place' : 'event'),
    [activeTab, spots],
  );
  const resultsCount = useMemo(
    () =>
      activeData.filter((spot) =>
        matchesSpotToFilters(spot, filters, query, userLocation),
      ).length,
    [activeData, filters, query, userLocation],
  );
  const activeFiltersCount = Number(query.trim().length > 0) + countActiveFilters(filters);
  const budgetError = minBudget > maxBudget ? 'Min no puede superar Max.' : null;

  const distancePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderGrant: (event) => {
          setIsDraggingDistance(true);
          animateScale(distanceScale, 1.08);
          updateDistanceFromX(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          updateDistanceFromX(event.nativeEvent.locationX);
        },
        onPanResponderRelease: () => {
          setIsDraggingDistance(false);
          animateScale(distanceScale, 1);
        },
        onPanResponderTerminate: () => {
          setIsDraggingDistance(false);
          animateScale(distanceScale, 1);
        },
      }),
    [distanceTrackWidth],
  );

  const budgetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderGrant: (event) => {
          const touchX = event.nativeEvent.locationX;
          const minX = ratioFromBudget(minBudget) * budgetTrackWidth;
          const maxX = ratioFromBudget(maxBudget) * budgetTrackWidth;
          const nextActive = Math.abs(touchX - minX) <= Math.abs(touchX - maxX) ? 'min' : 'max';
          setActiveBudgetThumb(nextActive);
          animateScale(nextActive === 'min' ? minBudgetScale : maxBudgetScale, 1.08);
          updateBudgetFromX(nextActive, touchX);
        },
        onPanResponderMove: (event) => {
          if (!activeBudgetThumb) return;
          updateBudgetFromX(activeBudgetThumb, event.nativeEvent.locationX);
        },
        onPanResponderRelease: () => {
          animateScale(minBudgetScale, 1);
          animateScale(maxBudgetScale, 1);
          setActiveBudgetThumb(null);
        },
        onPanResponderTerminate: () => {
          animateScale(minBudgetScale, 1);
          animateScale(maxBudgetScale, 1);
          setActiveBudgetThumb(null);
        },
      }),
    [activeBudgetThumb, budgetTrackWidth, maxBudget, minBudget],
  );

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

  useEffect(() => {
    if (isDraggingDistance) return;
    distanceX.setValue(ratioFromDistance(distance) * distanceTrackWidth);
  }, [distance, distanceTrackWidth, distanceX, isDraggingDistance]);

  useEffect(() => {
    if (activeBudgetThumb) return;
    minBudgetX.setValue(ratioFromBudget(minBudget) * budgetTrackWidth);
    maxBudgetX.setValue(ratioFromBudget(maxBudget) * budgetTrackWidth);
  }, [activeBudgetThumb, budgetTrackWidth, maxBudget, maxBudgetX, minBudget, minBudgetX]);

  useEffect(() => {
    openSheet();
  }, []);

  function updateDistanceFromX(locationX: number) {
    const width = Math.max(distanceTrackWidth, 1);
    const clamped = clamp(locationX, 0, width);
    const ratio = clamped / width;
    distanceX.setValue(clamped);
    setDistance(distanceFromRatio(ratio));
  }

  function updateBudgetFromX(target: 'min' | 'max', locationX: number) {
    const width = Math.max(budgetTrackWidth, 1);
    const clamped = clamp(locationX, 0, width);
    const nextBudget = budgetFromRatio(clamped / width);

    if (target === 'min') {
      const limited = Math.min(nextBudget, maxBudget);
      setMinBudget(limited);
      minBudgetX.setValue(ratioFromBudget(limited) * width);
      return;
    }

    const limited = Math.max(nextBudget, minBudget);
    setMaxBudget(limited);
    maxBudgetX.setValue(ratioFromBudget(limited) * width);
  }

  function clearFilters() {
    setSelectedCategories(DEFAULT_FILTERS.interests);
    setSelectedNeighborhoods([]);
    setSelectedHubNames(DEFAULT_FILTERS.hubName);
    setDistance(DEFAULT_FILTERS.distance);
    setMinBudget(DEFAULT_FILTERS.minBudget);
    setMaxBudget(DEFAULT_FILTERS.maxBudget);
    setTime(DEFAULT_FILTERS.time);
    setPeriod(DEFAULT_FILTERS.period);
    setSelectedDays(DEFAULT_FILTERS.days);
    setPeople(DEFAULT_FILTERS.people);
    setOpenNowOnly(DEFAULT_FILTERS.openNowOnly);
    setHideManuallyAdjusted(DEFAULT_FILTERS.hideManuallyAdjusted);
  }

  function applyFilters() {
    closeSheet(() => {
      router.replace({
        pathname: '/(tabs)/explore',
        params: {
          ...serializeFilters(filters),
          tab: activeTab,
          query,
        },
      });
    });
  }

  function closeFilters() {
    closeSheet(() => {
      router.replace({
        pathname: '/(tabs)/explore',
        params: {
          ...serializeFilters(filters),
          tab: activeTab,
          query,
        },
      });
    });
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

  function toggleDay(value: string) {
    setSelectedDays((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function cycleTime() {
    const currentIndex = timeOptions.indexOf(time);
    const nextValue = timeOptions[(currentIndex + 1) % timeOptions.length];
    setTime(nextValue);
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
    Animated.timing(sheetTranslateY, {
      toValue: FILTERS_COLLAPSED_OFFSET,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClosed?.();
      }
    });
  }

  return (
    <View style={styles.overlay}>
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
        <Pressable style={StyleSheet.absoluteFill} onPress={() => closeFilters()} />
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
          <AppIconButton name="close" onPress={closeFilters} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: 132 + insets.bottom,
              flexGrow: 1,
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isDraggingDistance && !activeBudgetThumb}
        >
          <Section title="Categorias">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={96}
              contentContainerStyle={styles.categoryRow}
            >
              {categoryOptions.map((option) => {
                const active = selectedCategoryValues.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    style={styles.categoryItem}
                    onPress={() => toggleCategory(option.value)}
                  >
                    <View style={[styles.categoryIcon, active && styles.categoryIconActive]}>
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={active ? '#ffffff' : appColors.primaryDark}
                      />
                    </View>
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Section>

          <Divider />

          <Section title="Ideal para">
            <View style={styles.daysRow}>
              {idealForOptions.map((option) => {
                const active = selectedIdealForValues.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                    onPress={() => toggleIdealFor(option.value)}
                  >
                    <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Divider />

          <Section title="Distancia">
            <View style={styles.metricRow}>
              <Text style={styles.metricValue}>{distance} km</Text>
              <Text style={styles.metricHint}>0 - 50</Text>
            </View>
            <View
              style={styles.sliderTrack}
              onLayout={(event) => setDistanceTrackWidth(event.nativeEvent.layout.width)}
              {...distancePanResponder.panHandlers}
            >
              <Animated.View style={[styles.sliderFill, { width: distanceX }]} />
              <Animated.View
                style={[
                  styles.sliderThumbTouch,
                  { transform: [{ translateX: distanceX }, { scale: distanceScale }] },
                ]}
              >
                <View style={styles.sliderThumb} />
              </Animated.View>
            </View>
            {locationError ? (
              <Pressable onPress={requestLocation}>
                <Text style={styles.locationText}>Activa ubicación para usar distancia real</Text>
              </Pressable>
            ) : null}
          </Section>

          <Divider />

          <Section title="Presupuesto">
            <View style={styles.metricRow}>
              <Text style={styles.metricValue}>${formatBudget(minBudget)}</Text>
              <Text style={styles.metricValue}>${formatBudget(maxBudget)}</Text>
            </View>
            <View
              style={styles.sliderTrack}
              onLayout={(event) => setBudgetTrackWidth(event.nativeEvent.layout.width)}
              {...budgetPanResponder.panHandlers}
            >
              <Animated.View
                style={[
                  styles.sliderFill,
                  {
                    marginLeft: minBudgetX,
                    width: Animated.subtract(maxBudgetX, minBudgetX),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.sliderThumbTouch,
                  { transform: [{ translateX: minBudgetX }, { scale: minBudgetScale }] },
                ]}
              >
                <View style={styles.sliderThumbSecondary} />
              </Animated.View>
              <Animated.View
                style={[
                  styles.sliderThumbTouch,
                  { transform: [{ translateX: maxBudgetX }, { scale: maxBudgetScale }] },
                ]}
              >
                <View style={styles.sliderThumbSecondary} />
              </Animated.View>
            </View>
            {budgetError ? <Text style={styles.errorText}>{budgetError}</Text> : null}
          </Section>

          <Divider />

          <Section title="Cuando">
            <View style={styles.whenRow}>
              <Pressable style={styles.timePill} onPress={cycleTime}>
                <Text style={styles.timePillText}>{time}</Text>
              </Pressable>
              <Pressable
                style={styles.timePill}
                onPress={() => setPeriod((current) => (current === 'PM' ? 'AM' : 'PM'))}
              >
                <Text style={styles.timePillText}>{period}</Text>
              </Pressable>
            </View>
            <View style={styles.daysRow}>
              {dayOptions.map((day) => (
                <Pressable
                  key={day.value}
                  style={[styles.dayChip, selectedDays.includes(day.value) && styles.dayChipActive]}
                  onPress={() => toggleDay(day.value)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      selectedDays.includes(day.value) && styles.dayChipTextActive,
                    ]}
                  >
                    {day.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>

          <Divider />

          <Section title="Disponibilidad">
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>Solo lugares abiertos</Text>
              </View>
              <Pressable
                onPress={() => setOpenNowOnly((current) => !current)}
                style={[styles.toggleControl, openNowOnly && styles.toggleControlActive]}
              >
                <View style={[styles.toggleThumb, openNowOnly && styles.toggleThumbActive]} />
              </Pressable>
            </View>
          </Section>

          <Divider />

          <Section title="Personas">
            <View style={styles.peopleRow}>
              <Pressable
                style={styles.stepperButton}
                onPress={() => setPeople((value) => Math.max(0, value - 1))}
              >
                <Ionicons name="remove" size={18} color={appColors.primaryDark} />
              </Pressable>
              <Text style={styles.peopleValue}>{people}</Text>
              <Pressable
                style={styles.stepperButton}
                onPress={() => setPeople((value) => value + 1)}
              >
                <Ionicons name="add" size={18} color={appColors.primaryDark} />
              </Pressable>
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
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function countActiveFilters(filters: ExploreFilters) {
  if (!isFiltersActive(filters)) return 0;

  let count = 0;
  if (filters.interests.length > 0) count += 1;
  if (filters.hubName.length > 0) count += 1;
  if (filters.distance !== DEFAULT_FILTERS.distance) count += 1;
  if (filters.minBudget !== DEFAULT_FILTERS.minBudget) count += 1;
  if (filters.maxBudget !== DEFAULT_FILTERS.maxBudget) count += 1;
  if (filters.time !== DEFAULT_FILTERS.time || filters.period !== DEFAULT_FILTERS.period) count += 1;
  if (filters.days.length > 0) count += 1;
  if (filters.people > 0) count += 1;
  if (filters.openNowOnly !== DEFAULT_FILTERS.openNowOnly) count += 1;
  if (filters.hideManuallyAdjusted !== DEFAULT_FILTERS.hideManuallyAdjusted) count += 1;
  return count;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function ratioFromDistance(value: number) {
  return (value - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE);
}

function distanceFromRatio(ratio: number) {
  return Math.round(MIN_DISTANCE + ratio * (MAX_DISTANCE - MIN_DISTANCE));
}

function ratioFromBudget(value: number) {
  return (value - MIN_PRICE) / (MAX_PRICE - MIN_PRICE);
}

function budgetFromRatio(ratio: number) {
  return Math.round((MIN_PRICE + ratio * (MAX_PRICE - MIN_PRICE)) / 1000) * 1000;
}

function animateScale(value: Animated.Value, toValue: number) {
  Animated.timing(value, {
    toValue,
    duration: 120,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  }).start();
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
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
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: filtersUi.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 22,
    backgroundColor: filtersUi.bg,
  },
  section: {
    gap: 14,
    paddingVertical: 0,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.24,
    textTransform: 'uppercase',
    color: filtersUi.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e2e8',
  },
  categoryRow: {
    paddingRight: 56,
    gap: 14,
  },
  categoryItem: {
    width: 82,
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: filtersUi.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconActive: {
    backgroundColor: filtersUi.accentSoft,
  },
  categoryText: {
    fontSize: 12,
    lineHeight: 15,
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
    fontSize: 22,
    fontWeight: '700',
    color: filtersUi.text,
  },
  metricHint: {
    fontSize: 13,
    fontWeight: '500',
    color: filtersUi.textTertiary,
  },
  sliderTrack: {
    marginTop: 2,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#dcdde3',
    justifyContent: 'center',
    overflow: 'visible',
  },
  sliderFill: {
    position: 'absolute',
    height: 4,
    borderRadius: 999,
    backgroundColor: filtersUi.text,
  },
  sliderThumbTouch: {
    position: 'absolute',
    marginLeft: -22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: filtersUi.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sliderThumbSecondary: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: filtersUi.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '500',
    color: filtersUi.text,
  },
  whenRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timePill: {
    minWidth: 92,
    minHeight: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: filtersUi.surface,
  },
  timePillText: {
    fontSize: 16,
    fontWeight: '600',
    color: filtersUi.text,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: filtersUi.surface,
  },
  dayChipActive: {
    backgroundColor: filtersUi.accentSoft,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: filtersUi.textSecondary,
  },
  dayChipTextActive: {
    color: filtersUi.text,
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: filtersUi.text,
  },
  toggleHint: {
    fontSize: 13,
    lineHeight: 18,
    color: filtersUi.textSecondary,
  },
  toggleControl: {
    width: 56,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 4,
    backgroundColor: '#dbdbe2',
    justifyContent: 'center',
  },
  toggleControlActive: {
    backgroundColor: filtersUi.accent,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
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
    fontSize: 22,
    fontWeight: '700',
    color: filtersUi.text,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(245,245,247,0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    width: '30%',
    minHeight: 52,
    borderRadius: 18,
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
