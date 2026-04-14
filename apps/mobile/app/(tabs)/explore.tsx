import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AppAvatar,
  AppBookmarkButton,
  AppIconButton,
  AppPrimaryButton,
  AppSegmentedTabs,
  SearchField,
  appColors,
  spotsUi,
} from '@/components/app-ui';
import { ExploreMap } from '@/components/explore-map';
import { FiltersSheet } from '@/components/filters-sheet';
import { submitFeedbackNote } from '@/lib/feedback-notes';
import { formatApproxBudgetPerPersonLabel } from '@/lib/explore-filters';
import { useAuthStore } from '@/lib/auth-store';
import { useBookmarksStore } from '@/lib/bookmarks-store';
import {
  DEFAULT_FILTERS,
  type ExploreTab,
  getEffectiveSpotDistanceKm,
  isFiltersActive,
  matchesSpotToFilters,
  parseExploreTab,
  parseFiltersFromParams,
  serializeFilters,
  sortSpots,
} from '@/lib/explore-filters';
import {
  aggregatePlaceSpotsFromList,
  getBranchLocationLabel,
  getSpotFeedSubtitle,
  getSpotsByTypeFromList,
  type Spot,
} from '@/lib/mock-spots';
import { formatLikesCount, useLikesStore } from '@/lib/likes-store';
import { useLocationStore } from '@/lib/location-store';
import { useSpotsStore } from '@/lib/spots-store';
import { backendEnabled, supabase } from '@/lib/supabase';
import { submitPlaceSuggestion } from '@/lib/place-suggestions';
import {
  getWebPushSnapshot,
  sendWebPushSelfTest,
  subscribeToWebPush,
  type WebPushSnapshot,
} from '@/lib/web-push';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const exploreFoodIcon = require('../../assets/explore_food_icon.png');
const exploreCinemaIcon = require('../../assets/explore_cinema_icon.png');
const exploreArtIcon = require('../../assets/explore_art_icon.png');
const exploreNightlifeIcon = require('../../assets/explore_nightlife_icon.png');
const exploreSportsIcon = require('../../assets/explore_sports_icon.png');
const exploreFamilyIcon = require('../../assets/explore_family_icon.png');
const exploreEventsIcon = require('../../assets/explore_events_icon.png');
const exploreNatureIcon = require('../../assets/explore_nature_icon.png');

function getCategoryImage(category: Spot['category']) {
  switch (category) {
    case 'Arte y cultura':
      return exploreArtIcon;
    case 'Bares y noche':
      return exploreNightlifeIcon;
    case 'Cine':
      return exploreCinemaIcon;
    case 'Restaurantes y cafés':
    case 'Restaurantes':
      return exploreFoodIcon;
    case 'Eventos':
      return exploreEventsIcon;
    case 'Deporte y bienestar':
      return exploreSportsIcon;
    case 'Familiar':
    case 'Pet friendly':
      return exploreFamilyIcon;
    case 'Naturaleza y aire libre':
      return exploreNatureIcon;
    default:
      return null;
  }
}

function getCategoryIcon(category: Spot['category']): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'Arte y cultura':
      return 'color-palette-outline';
    case 'Bares y noche':
      return 'wine-outline';
    case 'Cine':
      return 'film-outline';
    case 'Restaurantes y cafés':
    case 'Restaurantes':
      return 'restaurant-outline';
    case 'Eventos':
      return 'ticket-outline';
    case 'Deporte y bienestar':
      return 'barbell-outline';
    case 'Familiar':
      return 'people-outline';
    case 'Pet friendly':
      return 'paw-outline';
    case 'Naturaleza y aire libre':
      return 'leaf-outline';
    default:
      return 'sparkles-outline';
  }
}

function getCategoryAccent(category: Spot['category']) {
  switch (category) {
    case 'Arte y cultura':
      return '#6B1D4A';
    case 'Bares y noche':
      return '#FF2D55';
    case 'Cine':
      return '#1B1464';
    case 'Restaurantes y cafés':
    case 'Restaurantes':
      return '#F5C400';
    case 'Eventos':
      return '#FF6B00';
    case 'Deporte y bienestar':
      return '#00C48C';
    case 'Familiar':
      return '#FFB6D9';
    case 'Pet friendly':
      return '#00C48C';
    case 'Naturaleza y aire libre':
      return '#C8E600';
    default:
      return spotsUi.textSecondary;
  }
}

const encouragements = [
  'Hoy es un día excelente para tomarse algo',
  'Cali esta pidiendo un plancito rico',
  'Buen día para salir un rato y descubrir algo nuevo',
  'Hoy se presta para un parche suave por la ciudad',
  'Tu siguiente parche favorito puede estar más cerca de lo que crees',
  'Buen día para cambiar de spot y probar algo distinto',
  'Hoy pinta para descubrir un lugar nuevo en la ciudad',
  'Puede que hoy encuentres ese lugar para volver muchas veces',
];

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

const defaultWebPushSnapshot: WebPushSnapshot = {
  installed: false,
  permission: 'unsupported',
  subscribed: false,
  supported: false,
};

const categoryOptions: Array<{
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  image?: any;
}> = [
  { label: 'Arte y cultura', value: 'Arte y cultura', icon: 'color-palette-outline', image: exploreArtIcon },
  { label: 'Bares y noche', value: 'Bares y noche', icon: 'wine-outline', image: exploreNightlifeIcon },
  { label: 'Restaurantes y cafés', value: 'Restaurantes y cafés', icon: 'restaurant-outline', image: exploreFoodIcon },
  { label: 'Deporte', value: 'Deporte y bienestar', icon: 'barbell-outline', image: exploreSportsIcon },
  { label: 'Familiar', value: 'Familiar', icon: 'people-outline', image: exploreFamilyIcon },
  { label: 'Naturaleza', value: 'Naturaleza y aire libre', icon: 'leaf-outline', image: exploreNatureIcon },
];

function getPriceLabel(spot: Spot) {
  return formatApproxBudgetPerPersonLabel(spot.minBudget, spot.maxBudget);
}

function getFeedMinPriceLabel(spot: Spot) {
  return formatApproxBudgetPerPersonLabel(spot.minBudget, spot.maxBudget)
}

function getPreferredDetailBranchId(
  spot: Spot,
  userLocation?: { latitude: number; longitude: number } | null,
) {
  if (spot.type !== 'place') {
    return null;
  }

  const branchCandidates = spot.branches && spot.branches.length > 0 ? spot.branches : [spot];
  if (!branchCandidates.length) {
    return null;
  }

  let preferredBranch = branchCandidates[0] ?? null;
  let bestDistance = preferredBranch ? getEffectiveSpotDistanceKm(preferredBranch, userLocation) : null;

  branchCandidates.slice(1).forEach((branch) => {
    const branchDistance = getEffectiveSpotDistanceKm(branch, userLocation);

    if (branchDistance === null) {
      return;
    }

    if (bestDistance === null || branchDistance < bestDistance) {
      preferredBranch = branch;
      bestDistance = branchDistance;
    }
  });

  return preferredBranch?.id ?? null;
}

type ExploreLayoutMode = 'editorial' | 'grid' | 'list' | 'map';
type NewPlaceBanner = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
};

function isNewSpot(spot: Spot) {
  return spot.editorialBadge === 'Recién añadido';
}
type WebPushToast = {
  title: string;
  message: string;
  tone: 'default' | 'success' | 'error';
};

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const activeTab = parseExploreTab(params.tab);
  const filters = parseFiltersFromParams(params);
  const query = typeof params.query === 'string' ? params.query : '';
  const [draftQuery, setDraftQuery] = useState(query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [suggestPlacesOpen, setSuggestPlacesOpen] = useState(false);
  const [suggestPlacesVisible, setSuggestPlacesVisible] = useState(false);
  const [suggestedPlacesDraft, setSuggestedPlacesDraft] = useState<string[]>(['']);
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [layoutMode, setLayoutMode] = useState<ExploreLayoutMode>('editorial');
  const [topBarTotalHeight, setTopBarTotalHeight] = useState(220);
  const [headerChromeHeight, setHeaderChromeHeight] = useState(0);
  const [categoriesHeight, setCategoriesHeight] = useState(0);
  const [topBarHeight, setTopBarHeight] = useState(0);
  const [resultsBarHeight, setResultsBarHeight] = useState(0);
  const { spots, refresh } = useSpotsStore();
  const { getLikesCount, isLiked, toggleLike } = useLikesStore();
  const { isBookmarked, toggleBookmark } = useBookmarksStore();
  const { userLocation } = useLocationStore();
  const { avatarUrl, fullName, session, user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [mapVisibleSpotIds, setMapVisibleSpotIds] = useState<string[]>([]);
  const [newPlaceBanner, setNewPlaceBanner] = useState<NewPlaceBanner | null>(null);
  const [webPushToast, setWebPushToast] = useState<WebPushToast | null>(null);
  const [webPushSnapshot, setWebPushSnapshot] = useState<WebPushSnapshot>(defaultWebPushSnapshot);
  const [webPushLoading, setWebPushLoading] = useState(false);
  const headerChromeProgress = useRef(new Animated.Value(1)).current;
  const layoutTransition = useRef(new Animated.Value(1)).current;
  const topBarIntro = useRef(new Animated.Value(0)).current;
  const feedIntro = useRef(new Animated.Value(0)).current;
  const resultsRefresh = useRef(new Animated.Value(1)).current;
  const newPlaceBannerProgress = useRef(new Animated.Value(0)).current;
  const suggestModalProgress = useRef(new Animated.Value(0)).current;
  const feedbackModalProgress = useRef(new Animated.Value(0)).current;
  const quickCategoryProgress = useRef(
    new Map(categoryOptions.map((option) => [option.value, new Animated.Value(0)])),
  ).current;
  const headerExpandedRef = useRef(true);
  const headerAnimationInFlightRef = useRef(false);
  const lastHeaderToggleAtRef = useRef(0);
  const lastScrollHandledAtRef = useRef(0);
  const lastScrollY = useRef(0);
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null);
  const scrollDistanceRef = useRef(0);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webPushToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestModalCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackModalCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousResultsTriggerRef = useRef<string | null>(null);
  const webPushToastProgress = useRef(new Animated.Value(0)).current;
  const querySyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deferredQuery = useDeferredValue(draftQuery);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    if (draftQuery === query) {
      if (querySyncTimeoutRef.current) {
        clearTimeout(querySyncTimeoutRef.current);
        querySyncTimeoutRef.current = null;
      }
      return;
    }

    if (querySyncTimeoutRef.current) {
      clearTimeout(querySyncTimeoutRef.current);
    }

    querySyncTimeoutRef.current = setTimeout(() => {
      startTransition(() => {
        router.replace({
          pathname: '/(tabs)/explore',
          params: {
            ...serializeFilters(filters),
            tab: activeTab,
            query: draftQuery,
          },
        });
      });
    }, 180);

    return () => {
      if (querySyncTimeoutRef.current) {
        clearTimeout(querySyncTimeoutRef.current);
        querySyncTimeoutRef.current = null;
      }
    };
  }, [activeTab, draftQuery, filters, query, router]);

  const greetingName = useMemo(() => {
    if (fullName.trim()) {
      return fullName.trim().split(' ')[0];
    }

    const email = user?.email ?? '';
    return email ? email.split('@')[0] : 'Mateo';
  }, [fullName, user?.email]);

  const encouragement = useMemo(() => {
    const identitySeed =
      user?.id ??
      user?.email ??
      greetingName;
    const daySeed = getTodayKey();
    const seed = hashString(`${identitySeed}-${daySeed}`) % encouragements.length;
    return encouragements[seed];
  }, [greetingName, user?.email, user?.id]);

  useEffect(() => {
    const animations = categoryOptions.map((option) =>
      Animated.spring(quickCategoryProgress.get(option.value) ?? new Animated.Value(0), {
        toValue: filters.interests.includes(option.value) ? 1 : 0,
        tension: 140,
        friction: 11,
        useNativeDriver: true,
      }),
    );

    Animated.parallel(animations).start();
  }, [filters.interests, quickCategoryProgress]);

  const refreshWebPushSnapshot = useCallback(async () => {
    if (Platform.OS !== 'web') {
      setWebPushSnapshot(defaultWebPushSnapshot);
      return defaultWebPushSnapshot;
    }

    const nextSnapshot = await getWebPushSnapshot();
    setWebPushSnapshot(nextSnapshot);
    return nextSnapshot;
  }, []);

  const showWebPushToast = useCallback(
    ({ message, title, tone }: WebPushToast) => {
      if (webPushToastTimeoutRef.current) {
        clearTimeout(webPushToastTimeoutRef.current);
      }

      setWebPushToast({ message, title, tone });
      webPushToastProgress.setValue(0);

      Animated.spring(webPushToastProgress, {
        toValue: 1,
        tension: 95,
        friction: 12,
        useNativeDriver: true,
      }).start();

      webPushToastTimeoutRef.current = setTimeout(() => {
        Animated.timing(webPushToastProgress, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            setWebPushToast((current) =>
              current?.title === title && current?.message === message ? null : current,
            );
          }
        });
      }, 3200);
    },
    [webPushToastProgress],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    let active = true;

    void getWebPushSnapshot()
      .then((snapshot) => {
        if (active) {
          setWebPushSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (active) {
          setWebPushSnapshot(defaultWebPushSnapshot);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    return () => {
      if (webPushToastTimeoutRef.current) {
        clearTimeout(webPushToastTimeoutRef.current);
      }
      
    };
  }, []);

  const handleNotificationsPress = useCallback(async () => {
    if (webPushLoading) {
      return;
    }

    if (Platform.OS !== 'web') {
      showWebPushToast({
        message: 'Esta primera version de push quedo montada para la web instalada en pantalla de inicio.',
        title: 'Disponible en la PWA',
        tone: 'default',
      });
      return;
    }

    if (!user?.id) {
      showWebPushToast({
        message: 'Inicia sesion para vincular este dispositivo a tu cuenta.',
        title: 'Necesitas iniciar sesion',
        tone: 'error',
      });
      return;
    }

    setWebPushLoading(true);

    try {
      const snapshot = await refreshWebPushSnapshot();

      if (!snapshot.supported) {
        showWebPushToast({
          message: 'Este navegador no soporta Web Push o no esta corriendo en un contexto seguro.',
          title: 'Push no disponible',
          tone: 'error',
        });
        return;
      }

      if (!snapshot.installed) {
        showWebPushToast({
          message: 'Instala la web en tu pantalla de inicio y vuelve a tocar la campana para activar avisos fuera de la app.',
          title: 'Agrega Spots a inicio',
          tone: 'default',
        });
        return;
      }

      if (!snapshot.subscribed) {
        await subscribeToWebPush(user.id);
        await refreshWebPushSnapshot();
        showWebPushToast({
          message: 'Listo. Ahora Spots puede avisarte aunque cierres la PWA instalada.',
          title: 'Notificaciones activadas',
          tone: 'success',
        });
        return;
      }

      await sendWebPushSelfTest(session?.access_token ?? null);
      showWebPushToast({
        message: 'Te mandamos una notificacion de prueba a este dispositivo. Si no aparece de inmediato, revisa permisos del sistema.',
        title: 'Prueba enviada',
        tone: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos activar las notificaciones.';
      showWebPushToast({
        message,
        title: 'No pudimos continuar',
        tone: 'error',
      });
    } finally {
      setWebPushLoading(false);
    }
  }, [refreshWebPushSnapshot, session?.access_token, showWebPushToast, user?.id, webPushLoading]);
  const showNewPlaceBanner = useCallback((banner: NewPlaceBanner) => {
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
    }

    setNewPlaceBanner(banner);
    newPlaceBannerProgress.setValue(0);

    Animated.spring(newPlaceBannerProgress, {
      toValue: 1,
      tension: 90,
      friction: 11,
      useNativeDriver: true,
    }).start();

    bannerTimeoutRef.current = setTimeout(() => {
      Animated.timing(newPlaceBannerProgress, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setNewPlaceBanner((current) => (current?.id === banner.id ? null : current));
        }
      });
    }, 5200);
  }, [newPlaceBannerProgress]);

  useEffect(() => {
    if (!backendEnabled || !supabase) {
      return;
    }

    const client = supabase;
    const channel = client
      .channel('spots-new-place-banner')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'spots' },
        (payload) => {
          const row = payload.new as {
            id?: number;
            type?: string;
            name?: string;
            city?: string;
            cover_image_url?: string;
            gallery_urls?: string[] | null;
            is_active?: boolean | null;
          };

          if (row.type !== 'place' || row.is_active === false || !row.id || !row.name) {
            return;
          }

          showNewPlaceBanner({
            id: String(row.id),
            title: row.name,
            subtitle: row.city || 'Nuevo lugar en la ciudad',
            image:
              row.gallery_urls?.find(
                (url) => typeof url === 'string' && url.trim().length > 0,
              )?.trim() ||
              row.cover_image_url ||
              'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
          });
        },
      )
      .subscribe();

    return () => {
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
      client.removeChannel(channel);
    };
  }, [showNewPlaceBanner]);

  const activeData = useMemo(
    () =>
      getSpotsByTypeFromList(spots, activeTab === 'places' ? 'place' : 'event'),
    [activeTab, spots],
  );
  const filteredData = useMemo(
    () =>
      activeData.filter((spot) =>
        matchesSpotToFilters(spot, filters, deferredQuery, userLocation),
      ),
    [activeData, deferredQuery, filters, userLocation],
  );
  const hasActiveFilters = deferredQuery.trim().length > 0 || isFiltersActive(filters);
  const visibleBaseData =
    !hasActiveFilters && filteredData.length === 0 && activeData.length > 0
      ? activeData
      : filteredData;
  const groupedVisibleBaseData = useMemo(
    () =>
      activeTab === 'places' && layoutMode !== 'map'
        ? aggregatePlaceSpotsFromList(visibleBaseData)
        : visibleBaseData,
    [activeTab, layoutMode, visibleBaseData],
  );
  const visibleData = useMemo(
    () => sortSpots(groupedVisibleBaseData, filters.sortBy, getLikesCount),
    [filters.sortBy, getLikesCount, groupedVisibleBaseData],
  );
  useEffect(() => {
    if (layoutMode !== 'editorial') {
      setLayoutMode('editorial');
    }
  }, [layoutMode]);
  const activeFiltersCount = getActiveFiltersCount(filters);
  const activeCriteriaCount = activeFiltersCount + (deferredQuery.trim().length > 0 ? 1 : 0);
  const resultsAnimationTrigger = `${activeTab}|${deferredQuery}|${serializeFilters(filters)}`;
  const disableFeedBounce = layoutMode !== 'map' && visibleData.length <= 2;

  function getSpotHref(spot: Spot) {
    const preferredBranchId = getPreferredDetailBranchId(spot, userLocation);

    if (!preferredBranchId) {
      return `/spot/${spot.id}`;
    }

    return `/spot/${preferredBranchId}`;
  }

  

  function resetSuggestionDraft() {
    setSuggestedPlacesDraft(['']);
    setSuggestionSubmitting(false);
  }

  function resetFeedbackDraft() {
    setFeedbackDraft('');
    setFeedbackSubmitting(false);
  }

  function openSuggestPlaces() {
    resetSuggestionDraft();
    if (suggestModalCloseTimeoutRef.current) {
      clearTimeout(suggestModalCloseTimeoutRef.current);
    }
    setSuggestPlacesVisible(true);
    setSuggestPlacesOpen(true);
  }

  function closeSuggestPlaces(force = false) {
    if (suggestionSubmitting && !force) {
      return;
    }

    setSuggestPlacesOpen(false);
  }

  function handleSuggestPlacesRequestClose() {
    closeSuggestPlaces();
  }

  function openFeedback() {
    resetFeedbackDraft();
    if (feedbackModalCloseTimeoutRef.current) {
      clearTimeout(feedbackModalCloseTimeoutRef.current);
    }
    setFeedbackVisible(true);
    setFeedbackOpen(true);
  }

  function closeFeedback(force = false) {
    if (feedbackSubmitting && !force) {
      return;
    }

    setFeedbackOpen(false);
  }

  function handleFeedbackRequestClose() {
    closeFeedback();
  }

  function updateSuggestedPlace(index: number, value: string) {
    setSuggestedPlacesDraft((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? value : entry)),
    );
  }

  function addSuggestedPlaceField() {
    setSuggestedPlacesDraft((current) => [...current, '']);
  }

  function removeSuggestedPlaceField(index: number) {
    setSuggestedPlacesDraft((current) =>
      current.length <= 1 ? current : current.filter((_, entryIndex) => entryIndex !== index),
    );
  }

  async function handleSubmitSuggestion() {
    if (suggestionSubmitting) {
      return;
    }

    setSuggestionSubmitting(true);

    try {
      await submitPlaceSuggestion({
        places: suggestedPlacesDraft,
        userId: user?.id ?? null,
        fullName,
        email: user?.email ?? null,
      });

      setSuggestionSubmitting(false);
      closeSuggestPlaces(true);
      showWebPushToast({
        title: 'Sugerencia enviada',
        message: 'La guardamos para revisarla después por fecha y subirla por bloques.',
        tone: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No pudimos guardar tu sugerencia por ahora.';

      showWebPushToast({
        title: 'No pudimos enviarla',
        message,
        tone: 'error',
      });
      setSuggestionSubmitting(false);
    }
  }

  async function handleSubmitFeedback() {
    if (feedbackSubmitting) {
      return;
    }

    setFeedbackSubmitting(true);

    try {
      await submitFeedbackNote({
        note: feedbackDraft,
        userId: user?.id ?? null,
        fullName,
        email: user?.email ?? null,
      });

      setFeedbackSubmitting(false);
      closeFeedback(true);
      showWebPushToast({
        title: 'Feedback guardado',
        message: 'Quedó guardado para revisarlo después y convertirlo en mejoras.',
        tone: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No pudimos guardar tu feedback por ahora.';

      showWebPushToast({
        title: 'No pudimos enviarlo',
        message,
        tone: 'error',
      });
      setFeedbackSubmitting(false);
    }
  }

  const mappableData = useMemo(
    () =>
      visibleData.filter(
        (spot) => typeof spot.latitude === 'number' && typeof spot.longitude === 'number',
      ),
    [visibleData],
  );
  const mapVisibleData = useMemo(() => {
    if (mapVisibleSpotIds.length === 0) {
      return mappableData;
    }

    const visibleIds = new Set(mapVisibleSpotIds);
    return visibleData.filter((spot) => visibleIds.has(spot.id));
  }, [mappableData, mapVisibleSpotIds, visibleData]);
  const theme = {
    background: '#f5f5f7',
    surface: '#ffffff',
    surfaceMuted: '#ededf0',
    textPrimary: '#141417',
    textSecondary: '#5f5f67',
    textTertiary: '#8b8b94',
    iconMuted: '#2e2e34',
    border: 'transparent',
    activeSurface: 'rgba(239,56,87,0.1)',
    activeBorder: 'rgba(239,56,87,0.16)',
    accent: '#EF3857',
    accentSoft: 'rgba(239,56,87,0.12)',
  };

  useFocusEffect(
    useCallback(() => {
      topBarIntro.setValue(0);
      feedIntro.setValue(0);

      Animated.stagger(90, [
        Animated.timing(topBarIntro, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
        Animated.timing(feedIntro, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
      ]).start();
    }, [feedIntro, topBarIntro]),
  );

  useEffect(() => {
    if (previousResultsTriggerRef.current === null) {
      previousResultsTriggerRef.current = resultsAnimationTrigger;
      resultsRefresh.setValue(1);
      return;
    }

    if (previousResultsTriggerRef.current === resultsAnimationTrigger) {
      return;
    }

    previousResultsTriggerRef.current = resultsAnimationTrigger;
    resultsRefresh.setValue(0);
    Animated.timing(resultsRefresh, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [resultsAnimationTrigger, resultsRefresh]);

  useEffect(() => {
    if (suggestPlacesOpen) {
      if (suggestModalCloseTimeoutRef.current) {
        clearTimeout(suggestModalCloseTimeoutRef.current);
      }
      setSuggestPlacesVisible(true);
      suggestModalProgress.setValue(0);
      Animated.spring(suggestModalProgress, {
        toValue: 1,
        damping: 18,
        stiffness: 180,
        mass: 0.95,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(suggestModalProgress, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    suggestModalCloseTimeoutRef.current = setTimeout(() => {
      setSuggestPlacesVisible(false);
      resetSuggestionDraft();
    }, 220);

    return () => {
      if (suggestModalCloseTimeoutRef.current) {
        clearTimeout(suggestModalCloseTimeoutRef.current);
      }
    };
  }, [suggestModalProgress, suggestPlacesOpen, suggestionSubmitting]);

  useEffect(() => {
    if (feedbackOpen) {
      if (feedbackModalCloseTimeoutRef.current) {
        clearTimeout(feedbackModalCloseTimeoutRef.current);
      }
      setFeedbackVisible(true);
      feedbackModalProgress.setValue(0);
      Animated.spring(feedbackModalProgress, {
        toValue: 1,
        damping: 18,
        stiffness: 180,
        mass: 0.95,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(feedbackModalProgress, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    feedbackModalCloseTimeoutRef.current = setTimeout(() => {
      setFeedbackVisible(false);
      resetFeedbackDraft();
    }, 220);

    return () => {
      if (feedbackModalCloseTimeoutRef.current) {
        clearTimeout(feedbackModalCloseTimeoutRef.current);
      }
    };
  }, [feedbackModalProgress, feedbackOpen, feedbackSubmitting]);

  function changeLayout(nextLayout: ExploreLayoutMode) {
    if (nextLayout === layoutMode) return;

    Animated.timing(layoutTransition, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setLayoutMode(nextLayout);
      Animated.timing(layoutTransition, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  }

  const handleVisibleSpotsChange = useCallback((nextIds: string[]) => {
    setMapVisibleSpotIds((current) => {
      if (
        current.length === nextIds.length &&
        current.every((value, index) => value === nextIds[index])
      ) {
        return current;
      }

      return nextIds;
    });
  }, []);

  function changeTab(nextTab: ExploreTab) {
    setDraftQuery('');
    router.replace({
      pathname: '/(tabs)/explore',
      params: {
        ...serializeFilters(DEFAULT_FILTERS),
        tab: nextTab,
        query: '',
      },
    });
  }

  function updateQuery(nextQuery: string) {
    setDraftQuery(nextQuery);
  }

  function applyFilters(nextFilters: typeof filters) {
    router.replace({
      pathname: '/(tabs)/explore',
      params: {
        ...serializeFilters(nextFilters),
        tab: activeTab,
        query: draftQuery,
      },
    });
  }

  function toggleQuickCategory(value: string) {
    const nextInterests = filters.interests.includes(value) ? [] : [value];

    applyFilters({
      ...filters,
      interests: nextInterests,
    });
  }

  function clearAppliedFilters() {
    setDraftQuery('');
    router.replace({
      pathname: '/(tabs)/explore',
      params: {
        ...serializeFilters(DEFAULT_FILTERS),
        tab: activeTab,
        query: '',
      },
    });
  }

  function clearQueryOnly() {
    setDraftQuery('');
    router.replace({
      pathname: '/(tabs)/explore',
      params: {
        ...serializeFilters(filters),
        tab: activeTab,
        query: '',
      },
    });
  }

  function animateHeader(expanded: boolean, options?: { force?: boolean }) {
    if (headerExpandedRef.current === expanded) return;
    const now = Date.now();

    if (!options?.force) {
      if (headerAnimationInFlightRef.current) {
        return;
      }

      if (now - lastHeaderToggleAtRef.current < 180) {
        return;
      }
    }

    headerExpandedRef.current = expanded;
    headerAnimationInFlightRef.current = true;
    lastHeaderToggleAtRef.current = now;
    Animated.timing(headerChromeProgress, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      easing: expanded ? undefined : undefined,
      useNativeDriver: false,
    }).start(() => {
      headerAnimationInFlightRef.current = false;
    });
  }

  function handleScroll(event: {
    nativeEvent: {
      contentOffset: { y: number };
      contentSize: { height: number };
      layoutMeasurement: { height: number };
    };
  }) {
    const now = Date.now();
    if (now - lastScrollHandledAtRef.current < 32) {
      return;
    }
    lastScrollHandledAtRef.current = now;

    const nextY = Math.max(0, event.nativeEvent.contentOffset.y);
    const maxScrollY = Math.max(
      0,
      event.nativeEvent.contentSize.height - event.nativeEvent.layoutMeasurement.height,
    );
    const compactScrollRange = maxScrollY <= Math.max(96, headerChromeHeight + resultsBarHeight + 24);
    if (maxScrollY <= 56) {
      scrollDirectionRef.current = null;
      scrollDistanceRef.current = 0;
      lastScrollY.current = 0;
      animateHeader(true, { force: true });
      return;
    }
    const delta = nextY - lastScrollY.current;
    if (Math.abs(delta) < 6) {
      lastScrollY.current = nextY;
      return;
    }
    const isNearBottom = nextY >= Math.max(0, maxScrollY - 24);

    if (nextY <= 24) {
      scrollDirectionRef.current = null;
      scrollDistanceRef.current = 0;
      animateHeader(true, { force: true });
    } else if (Math.abs(delta) > 2) {
      const direction = delta > 0 ? 'down' : 'up';

      if (scrollDirectionRef.current !== direction) {
        scrollDirectionRef.current = direction;
        scrollDistanceRef.current = Math.min(Math.abs(delta), 4);
      }

      scrollDistanceRef.current += Math.abs(delta);

      if (
        direction === 'down' &&
        (
          (compactScrollRange && nextY > 18 && scrollDistanceRef.current > 18) ||
          (!compactScrollRange && nextY > 56 && scrollDistanceRef.current > 34)
        )
      ) {
        animateHeader(false);
        scrollDistanceRef.current = 0;
      }

      if (direction === 'up' && isNearBottom) {
        scrollDistanceRef.current = 0;
      } else if (direction === 'up' && scrollDistanceRef.current > 42) {
        animateHeader(true);
        scrollDistanceRef.current = 0;
      }
    }

    lastScrollY.current = nextY;
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  const chromeHeight = headerChromeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, headerChromeHeight || 1],
  });
  const chromeTranslateY = headerChromeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 0],
  });
  const topBarBottomRadius = headerChromeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });
  const topBarShadowOpacity = headerChromeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0],
  });
  const topBarShadowRadius = headerChromeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const topBarShadowOffsetY = headerChromeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });
  const headerChromePaddingBottom = headerChromeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2],
  });
  const resultsBarMarginTop = headerChromeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 12],
  });
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {webPushToast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.webPushToastWrap,
            {
              paddingTop: Math.max(insets.top, 16),
              opacity: webPushToastProgress,
              transform: [
                {
                  translateY: webPushToastProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-18, 0],
                  }),
                },
                {
                  scale: webPushToastProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.webPushToast,
              webPushToast.tone === 'success'
                ? styles.webPushToastSuccess
                : webPushToast.tone === 'error'
                  ? styles.webPushToastError
                  : styles.webPushToastDefault,
            ]}
          >
            <Text style={styles.webPushToastTitle}>{webPushToast.title}</Text>
            <Text style={styles.webPushToastMessage}>{webPushToast.message}</Text>
          </View>
        </Animated.View>
      ) : null}

      <Animated.View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, 16) + 14,
            backgroundColor: theme.background,
            opacity: topBarIntro,
            borderBottomLeftRadius: topBarBottomRadius,
            borderBottomRightRadius: topBarBottomRadius,
            shadowOpacity: topBarShadowOpacity,
            shadowRadius: topBarShadowRadius,
            shadowOffset: { width: 0, height: topBarShadowOffsetY },
            transform: [
              {
                translateY: topBarIntro.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
        onLayout={(event) => {
          const nextHeight = event.nativeEvent.layout.height;
          if (nextHeight !== topBarTotalHeight) {
            setTopBarTotalHeight(nextHeight);
          }
        }}
      >
        <Animated.View
          style={[
            styles.searchCollapsible,
            {
              height: topBarHeight || undefined,
              opacity: 1,
              transform: [{ translateY: 0 }],
            },
          ]}
        >
          <View
            style={styles.topRow}
            onLayout={(event) => {
              const nextHeight = event.nativeEvent.layout.height;
              if (nextHeight !== topBarHeight) {
                setTopBarHeight(nextHeight);
              }
            }}
          >
            <View style={styles.profileWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ir a mi cuenta"
                hitSlop={10}
                onPress={() => router.push('/(tabs)/account')}
              >
                <AppAvatar uri={avatarUrl} size={48} />
              </Pressable>
              <View style={styles.titleWrap}>
                <Text style={[styles.topGreeting, { color: theme.textPrimary }]}>Hola, {greetingName}</Text>
                <Text style={[styles.topSubtitle, { color: theme.textSecondary }]}>{encouragement}</Text>
              </View>
            </View>
            <View style={styles.topActions}>
              <AppIconButton
                name={webPushSnapshot.subscribed ? 'notifications' : 'notifications-outline'}
                tone="light"
                onPress={handleNotificationsPress}
              />
            </View>
          </View>
        </Animated.View>

        <View style={styles.searchRow}>
          <View style={styles.searchFieldWrap}>
            <SearchField
              value={draftQuery}
              onChangeText={updateQuery}
              showClearButton={draftQuery.trim().length > 0}
              debounceMs={140}
              placeholder="Busca un lugar o escribe lo que quieres hacer"
              variant="light"
            />
          </View>
        </View>

        <Animated.View
          style={[
            styles.headerChrome,
            {
              height: chromeHeight,
              opacity: headerChromeProgress,
              transform: [{ translateY: chromeTranslateY }],
            },
          ]}
          >
            <View
              style={[styles.headerChromeInner, { paddingBottom: headerChromePaddingBottom }]}
              onLayout={(event) => {
                const nextHeight = event.nativeEvent.layout.height;
                if (nextHeight !== headerChromeHeight) {
                  setHeaderChromeHeight(nextHeight);
                }
              }}
            >
            <Animated.View
              style={[
                styles.searchCollapsible,
                {
                  height: categoriesHeight || undefined,
                  opacity: 1,
                  transform: [{ translateY: 0 }],
                },
              ]}
            >
              <View
                onLayout={(event) => {
                  const nextHeight = event.nativeEvent.layout.height;
                  if (nextHeight !== categoriesHeight) {
                    setCategoriesHeight(nextHeight);
                  }
                }}
      >
        <Animated.ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickCategories}
                >
                  {categoryOptions.map((option) => {
                    const active = filters.interests.includes(option.value);
                    const accent = getCategoryAccent(option.value as Spot['category']);
                    const progress = quickCategoryProgress.get(option.value) ?? new Animated.Value(0);
                    return (
                      <Pressable
                        key={option.value}
                        style={styles.quickCategory}
                        onPress={() => toggleQuickCategory(option.value)}
                      >
                        <Animated.View
                          style={[
                            option.image ? styles.quickCategoryImageWrap : styles.quickCategoryIcon,
                            {
                              transform: [
                                {
                                  scale: progress.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 1.08],
                                  }),
                                },
                              ],
                            },
                            !active && !option.image && {
                              backgroundColor: theme.surface,
                              borderColor: theme.border,
                            },
                            active &&
                              !option.image && {
                                backgroundColor: accent,
                              },
                          ]}
                        >
                          <Animated.View
                            pointerEvents="none"
                            style={[
                              styles.quickCategoryBlurBlob,
                              {
                                backgroundColor: accent,
                                opacity: progress.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, 0.26],
                                }),
                                transform: [
                                  {
                                    scale: progress.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [0.72, 1.18],
                                    }),
                                  },
                                ],
                              },
                            ]}
                          />
                          {option.image ? (
                            <Animated.Image
                              source={option.image}
                              style={[
                                styles.quickCategoryImage,
                                {
                                  transform: [
                                    {
                                      scale: progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1.04, 1.14],
                                      }),
                                    },
                                  ],
                                },
                              ]}
                              resizeMode="contain"
                            />
                          ) : (
                            <Ionicons
                              name={option.icon}
                              size={22}
                              color={active ? theme.textPrimary : theme.textSecondary}
                            />
                          )}
                        </Animated.View>
                      </Pressable>
                    );
                  })}
                </Animated.ScrollView>
              </View>
            </Animated.View>
            <AppSegmentedTabs
              value={activeTab}
              onChange={changeTab}
              options={[
                { key: 'places', label: 'Lugares' },
                { key: 'now', label: 'Parches' },
              ]}
            />
          </View>
        </Animated.View>

        <Animated.View
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            if (nextHeight !== resultsBarHeight) {
              setResultsBarHeight(nextHeight);
            }
          }}
          style={{
            marginTop: resultsBarMarginTop,
            opacity: resultsRefresh,
            transform: [
              {
                translateY: resultsRefresh.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          }}
        >
          <View style={styles.resultsBar}>
            <View style={styles.resultsInfo}>
              <Text style={[styles.resultsText, { color: theme.textPrimary }]}>
                {visibleData.length} resultados
              </Text>
              {activeCriteriaCount > 0 ? (
                <Pressable
                  style={[styles.resultsFilterPill, { backgroundColor: theme.accentSoft }]}
                  onPress={clearAppliedFilters}
                >
                  <Text style={[styles.resultsFilterPillText, { color: theme.accent }]}>
                    ({activeCriteriaCount}) filtros
                  </Text>
                  <Ionicons name="close" size={14} color={theme.accent} />
                </Pressable>
              ) : (
                <Text style={[styles.resultsHint, { color: theme.textSecondary }]}>
                  {deferredQuery.trim().length > 0 ? 'Búsqueda activa' : 'Sin filtros'}
                </Text>
              )}
            </View>
            <Pressable
              style={[
                styles.filterButton,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
              onPress={() => setFiltersOpen(true)}
            >
              <Ionicons name="options-outline" size={20} color={theme.iconMuted} />
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>

      {newPlaceBanner ? (
        <Animated.View
          style={[
            styles.newPlaceBannerWrap,
            {
              top: topBarTotalHeight + 12,
              opacity: newPlaceBannerProgress,
              transform: [
                {
                  translateY: newPlaceBannerProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-14, 0],
                  }),
                },
                {
                  scale: newPlaceBannerProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable
            style={styles.newPlaceBanner}
            onPress={() => {
              const nextId = newPlaceBanner.id;
              Animated.timing(newPlaceBannerProgress, {
                toValue: 0,
                duration: 160,
                useNativeDriver: true,
              }).start(() => {
                setNewPlaceBanner(null);
                router.push(`/spot/${nextId}`);
              });
            }}
          >
            <Image source={{ uri: newPlaceBanner.image }} style={styles.newPlaceBannerImage} />
            <View style={styles.newPlaceBannerBody}>
              <Text style={[styles.newPlaceBannerEyebrow, { color: theme.accent }]}>Nuevo en Spots</Text>
              <Text numberOfLines={1} style={styles.newPlaceBannerTitle}>
                {newPlaceBanner.title}
              </Text>
              <Text numberOfLines={1} style={styles.newPlaceBannerSubtitle}>
                {newPlaceBanner.subtitle}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#fff7fb" />
          </Pressable>
        </Animated.View>
      ) : null}

      <Animated.ScrollView
        style={[
          styles.feed,
          {
            backgroundColor: theme.background,
            opacity: feedIntro,
            transform: [
              {
                translateY: feedIntro.interpolate({
                  inputRange: [0, 1],
                  outputRange: [28, 0],
                }),
              },
            ],
          },
        ]}
        contentContainerStyle={[
          styles.feedContent,
          {
            paddingTop: topBarTotalHeight + 12,
            paddingBottom: 28 + insets.bottom,
            flexGrow: 1,
          },
        ]}
        bounces={!disableFeedBounce}
        alwaysBounceVertical={!disableFeedBounce}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={Platform.OS !== 'web' ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.iconMuted}
            colors={[theme.iconMuted]}
          />
        ) : undefined}
      >
        <ResultsAppear key={resultsAnimationTrigger}>
        <Animated.View
          style={[
            styles.layoutStage,
            {
              opacity: layoutTransition,
              transform: [
                {
                  translateY: layoutTransition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
        {visibleData.length ? (
          layoutMode === 'map' ? (
            <View style={styles.mapWrap}>
              <ExploreMap
                spots={mappableData}
                onOpenSpot={(spotId) => router.push(`/spot/${spotId}`)}
                onVisibleSpotsChange={handleVisibleSpotsChange}
              />
              <View style={styles.mapFeedWrap}>
                <View style={styles.mapFeedHeader}>
                  <Text style={[styles.mapFeedTitle, { color: theme.textPrimary }]}>
                    En esta vista
                  </Text>
                  <Text style={[styles.mapFeedCount, { color: theme.textSecondary }]}>
                    {mapVisibleData.length} lugar{mapVisibleData.length === 1 ? '' : 'es'}
                  </Text>
                </View>
                {mapVisibleData.length ? (
                  <View style={styles.listWrap}>
                    {mapVisibleData.map((spot) => (
                        <Link key={spot.id} href={getSpotHref(spot)} asChild>
                          <Pressable style={styles.listCard}>
                          <View style={styles.listCardImageWrap}>
                            <Image source={{ uri: spot.image }} style={styles.listCardImage} />
                            {isNewSpot(spot) ? (
                              <View style={styles.newBadgeWrap}>
                                <View style={styles.newBadge}>
                                  <Text style={styles.newBadgeText}>Recién añadido</Text>
                                </View>
                              </View>
                            ) : null}
                          </View>
                          <View style={styles.listCardBody}>
                            <View style={styles.listCardHeader}>
                              <Text
                                numberOfLines={2}
                                style={[styles.listCardTitle, { color: theme.textPrimary }]}
                              >
                                {spot.type === 'event' ? spot.name : spot.brandName}
                              </Text>
                              <View style={styles.cardHeaderActions}>
                                <View style={styles.cardHeaderLeading}>
                                  <View style={styles.categoryChip}>
                                    {getCategoryImage(spot.category) ? (
                                      <Image source={getCategoryImage(spot.category)} style={styles.categoryChipImage} />
                                    ) : (
                                      <Ionicons
                                        name={getCategoryIcon(spot.category)}
                                        size={14}
                                        color={getCategoryAccent(spot.category)}
                                      />
                                    )}
                                  </View>
                                  {isNewSpot(spot) ? (
                                    <View style={styles.newBadge}>
                                      <Text style={styles.newBadgeText}>Recién añadido</Text>
                                    </View>
                                  ) : null}
                                </View>
                                {spot.type === 'place' ? (
                                  <AppBookmarkButton
                                    bookmarked={isBookmarked(spot.likeTargetId)}
                                    onPress={(event) => {
                                      event?.stopPropagation?.();
                                      event?.preventDefault?.();
                                      void toggleBookmark(spot.likeTargetId);
                                    }}
                                    activeColor={theme.textPrimary}
                                  />
                                ) : null}
                              </View>
                            </View>
                            <View style={styles.listCardFooter}>
                              <View style={styles.feedMetaInline}>
                                <View style={styles.feedMetaGroup}>
                                  <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
                                  <Text
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={[styles.feedMetaText, styles.feedLocationText, { color: theme.textSecondary }]}
                                  >
                                    {spot.type === 'event'
                                      ? getSpotFeedSubtitle(spot)
                                      : getBranchLocationLabel(spot)}
                                  </Text>
                                </View>
                                <View style={styles.feedPriceInline}>
                                  <Ionicons name="cash-outline" size={12} color={theme.textSecondary} />
                                  <Text style={[styles.feedMetaText, { color: theme.textSecondary }]}>
                                    {getFeedMinPriceLabel(spot)}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.feedMetaText,
                                    {
                                      color: isLiked(spot.likeTargetId) ? theme.accent : theme.textTertiary,
                                    },
                                  ]}
                                >
                                  {isLiked(spot.likeTargetId) ? '♥' : '♡'} {formatLikesCount(getLikesCount(spot.likeTargetId))}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </Pressable>
                        </Link>
                    ))}
                  </View>
                ) : (
                  <View style={styles.mapEmptyFeed}>
                    <Text style={[styles.resultsHint, { color: theme.textSecondary }]}>
                      Haz zoom o mueve el mapa para ver lugares en esta zona.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : layoutMode === 'grid' ? (
            <View style={styles.gridWrap}>
              {visibleData.map((spot) => (
                  <Link key={spot.id} href={getSpotHref(spot)} asChild>
                    <Pressable style={styles.gridCard}>
                    <ImageBackground
                      source={{ uri: spot.image }}
                      style={styles.gridCardImage}
                      imageStyle={styles.gridCardImageStyle}
                    >
                      <View style={styles.cardOverlay} />
                      <View style={styles.gridCardMeta}>
                        <View style={styles.cardHeaderActions}>
                          <View style={styles.cardHeaderLeading}>
                            <View style={styles.categoryChip}>
                              {getCategoryImage(spot.category) ? (
                                <Image source={getCategoryImage(spot.category)} style={styles.categoryChipImage} />
                              ) : (
                                <Ionicons
                                  name={getCategoryIcon(spot.category)}
                                  size={14}
                                  color={getCategoryAccent(spot.category)}
                                />
                              )}
                            </View>
                            {isNewSpot(spot) ? (
                              <View style={styles.newBadge}>
                                <Text style={styles.newBadgeText}>Recién añadido</Text>
                              </View>
                            ) : null}
                          </View>
                          {spot.type === 'place' ? (
                            <AppBookmarkButton
                              bookmarked={isBookmarked(spot.likeTargetId)}
                              onPress={(event) => {
                                event?.stopPropagation?.();
                                event?.preventDefault?.();
                                void toggleBookmark(spot.likeTargetId);
                              }}
                              activeColor={theme.textPrimary}
                            />
                          ) : null}
                        </View>
                      </View>
                    </ImageBackground>
                    <View style={styles.gridCardBody}>
                      <Text numberOfLines={2} style={[styles.gridCardTitle, { color: theme.textPrimary }]}>
                        {spot.type === 'event' ? spot.name : spot.brandName}
                      </Text>
                      <View style={styles.gridCardFooter}>
                        <View style={styles.feedMetaInline}>
                          <View style={styles.feedMetaGroup}>
                            <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
                            <Text
                              numberOfLines={1}
                              ellipsizeMode="tail"
                              style={[styles.feedMetaText, styles.feedLocationText, { color: theme.textSecondary }]}
                            >
                              {spot.type === 'event'
                                ? getSpotFeedSubtitle(spot)
                                : (spot.branchCount ?? 0) > 1
                                  ? `${spot.branchCount ?? 0} sedes`
                                  : getBranchLocationLabel(spot)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.feedMetaText,
                              {
                                color: isLiked(spot.likeTargetId) ? theme.accent : theme.textTertiary,
                              },
                            ]}
                          >
                            {isLiked(spot.likeTargetId) ? '♥' : '♡'} {formatLikesCount(getLikesCount(spot.likeTargetId))}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                  </Link>
              ))}
            </View>
          ) : layoutMode === 'list' ? (
            <View style={styles.listWrap}>
              {visibleData.map((spot) => (
                  <Link key={spot.id} href={getSpotHref(spot)} asChild>
                    <Pressable style={styles.listCard}>
                    <ImageBackground
                      source={{ uri: spot.image }}
                      style={styles.listCardImage}
                      imageStyle={styles.listCardImageStyle}
                    >
                      <View style={styles.cardOverlay} />
                      <View style={styles.listCardImageMeta}>
                        <View style={styles.cardHeaderActions}>
                          <View style={styles.cardHeaderLeading}>
                            <View style={styles.categoryChip}>
                              {getCategoryImage(spot.category) ? (
                                <Image source={getCategoryImage(spot.category)} style={styles.categoryChipImage} />
                              ) : (
                                <Ionicons
                                  name={getCategoryIcon(spot.category)}
                                  size={14}
                                  color={getCategoryAccent(spot.category)}
                                />
                              )}
                            </View>
                            {isNewSpot(spot) ? (
                              <View style={styles.newBadge}>
                                <Text style={styles.newBadgeText}>Recién añadido</Text>
                              </View>
                            ) : null}
                          </View>
                          {spot.type === 'place' ? (
                            <AppBookmarkButton
                              bookmarked={isBookmarked(spot.likeTargetId)}
                              onPress={(event) => {
                                event?.stopPropagation?.();
                                event?.preventDefault?.();
                                void toggleBookmark(spot.likeTargetId);
                              }}
                              activeColor={theme.textPrimary}
                            />
                          ) : null}
                        </View>
                      </View>
                    </ImageBackground>
                    <View style={styles.listCardBody}>
                      <Text numberOfLines={2} style={[styles.listCardTitle, { color: theme.textPrimary }]}>
                        {spot.type === 'event' ? spot.name : spot.brandName}
                      </Text>
                      <Text numberOfLines={2} style={[styles.listCardSubtitle, { color: theme.textSecondary }]}>
                        {spot.shortDescription}
                      </Text>
                      <View style={styles.listCardFooter}>
                        <View style={styles.feedMetaInline}>
                          <View style={styles.feedMetaGroup}>
                            <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
                            <Text
                              numberOfLines={1}
                              ellipsizeMode="tail"
                              style={[styles.feedMetaText, styles.feedLocationText, { color: theme.textSecondary }]}
                            >
                              {getSpotFeedSubtitle(spot)}
                            </Text>
                          </View>
                          <View style={styles.feedPriceInline}>
                            <Ionicons name="cash-outline" size={12} color={theme.textSecondary} />
                            <Text style={[styles.feedMetaText, { color: theme.textSecondary }]}>
                              {getFeedMinPriceLabel(spot)}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.feedMetaText,
                            {
                              color: isLiked(spot.likeTargetId) ? theme.accent : theme.textTertiary,
                            },
                          ]}
                        >
                          {isLiked(spot.likeTargetId) ? '♥' : '♡'} {formatLikesCount(getLikesCount(spot.likeTargetId))}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                  </Link>
              ))}
            </View>
          ) : (
            visibleData.map((spot) => (
                <Link key={spot.id} href={getSpotHref(spot)} asChild>
                  <Pressable style={styles.card}>
                  <ImageBackground
                    source={{ uri: spot.image }}
                    style={styles.cardImage}
                    imageStyle={styles.cardImageStyle}
                  >
                    <View style={styles.cardOverlay} />
                    <View style={styles.cardImageMeta}>
                      <View style={styles.cardHeaderActions}>
                        <View style={styles.cardHeaderLeading}>
                          <View style={styles.categoryChip}>
                            {getCategoryImage(spot.category) ? (
                              <Image source={getCategoryImage(spot.category)} style={styles.categoryChipImage} />
                            ) : (
                              <Ionicons
                                name={getCategoryIcon(spot.category)}
                                size={14}
                                color={getCategoryAccent(spot.category)}
                              />
                            )}
                          </View>
                          {isNewSpot(spot) ? (
                            <View style={styles.newBadge}>
                              <Text style={styles.newBadgeText}>Recién añadido</Text>
                            </View>
                          ) : null}
                        </View>
                        {spot.type === 'place' ? (
                        <AppBookmarkButton
                          bookmarked={isBookmarked(spot.likeTargetId)}
                          onPress={(event) => {
                            event?.stopPropagation?.();
                            event?.preventDefault?.();
                            void toggleBookmark(spot.likeTargetId);
                          }}
                          activeColor={theme.textPrimary}
                        />
                        ) : null}
                      </View>
                    </View>
                  </ImageBackground>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                          {spot.type === 'event' ? spot.name : spot.brandName}
                    </Text>
                    <View style={styles.cardFooterRow}>
                      <View style={styles.feedMetaInline}>
                        <View style={styles.feedMetaGroup}>
                          <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={[styles.feedMetaText, styles.feedLocationText, { color: theme.textSecondary }]}
                          >
                            {getSpotFeedSubtitle(spot)}
                          </Text>
                        </View>
                        <View style={styles.feedPriceInline}>
                          <Ionicons name="cash-outline" size={12} color={theme.textSecondary} />
                          <Text style={[styles.feedMetaText, { color: theme.textSecondary }]}>
                            {getFeedMinPriceLabel(spot)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.feedMetaText,
                            {
                              color: isLiked(spot.likeTargetId) ? theme.accent : theme.textTertiary,
                            },
                          ]}
                        >
                          {isLiked(spot.likeTargetId) ? '♥' : '♡'} {formatLikesCount(getLikesCount(spot.likeTargetId))}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
                </Link>
            ))
          )
        ) : (
          <View style={styles.emptyState}>
            {activeTab === 'now' ? (
              <>
                <View style={[styles.emptyBadge, { backgroundColor: theme.accentSoft }]}>
                  <Ionicons name="sparkles-outline" size={14} color={theme.accent} />
                  <Text style={[styles.emptyBadgeText, { color: theme.accent }]}>Muy pronto</Text>
                </View>
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                  Los parches llegan pronto a Spots
                </Text>
                <Text style={[styles.emptyCopy, { color: theme.textSecondary }]}>
                  Estamos armando esta pestaña para que encuentres planes, movidas y cosas que
                  pasan en la ciudad sin tener que rebuscarlas por fuera.
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No hay resultados</Text>
                <Text style={[styles.emptyCopy, { color: theme.textSecondary }]}>
                  {layoutMode === 'map'
                    ? 'Completa coordenadas o cambia filtros para ver lugares en el mapa.'
                    : 'Ajusta filtros o cambia la busqueda para encontrar algo mejor.'}
                </Text>
              </>
            )}
          </View>
        )}
        </Animated.View>
        </ResultsAppear>
      </Animated.ScrollView>

      <View
        style={[
          styles.feedbackFabStack,
          {
            bottom: Math.max(insets.bottom, 8) + 24,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Añadir feedback"
          onPress={openFeedback}
          style={[styles.suggestFab, styles.feedbackFabSecondary]}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={spotsUi.textPrimary} />
          <Text style={[styles.suggestFabText, styles.feedbackFabSecondaryText]}>Añadir feedback</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sugerir lugares"
          onPress={openSuggestPlaces}
          style={styles.suggestFab}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff7fb" />
          <Text style={styles.suggestFabText}>Sugerir lugares</Text>
        </Pressable>
      </View>

      <Modal
        visible={suggestPlacesVisible}
        transparent
        animationType="none"
        onRequestClose={handleSuggestPlacesRequestClose}
      >
        <View style={styles.suggestModalRoot}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.suggestModalBackdrop,
              {
                opacity: suggestModalProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleSuggestPlacesRequestClose} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.suggestModalKeyboard}
          >
            <Animated.View
              style={[
                styles.suggestModalCard,
                {
                  paddingBottom: 18 + Math.max(insets.bottom, 12),
                  maxHeight: '84%',
                },
                {
                  opacity: suggestModalProgress,
                  transform: [
                    {
                      translateY: suggestModalProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [56, 0],
                      }),
                    },
                    {
                      scale: suggestModalProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.suggestModalHeader}>
                <View style={styles.suggestModalTitleWrap}>
                  <Text style={styles.suggestModalTitle}>Sugerir lugares</Text>
                  <Text style={styles.suggestModalCopy}>
                    Escribe uno o varios lugares para revisarlos luego por fecha de sugerencia.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar sugerencias"
                  onPress={handleSuggestPlacesRequestClose}
                  style={styles.suggestModalClose}
                >
                  <Ionicons name="close" size={20} color={spotsUi.textPrimary} />
                </Pressable>
              </View>

              <View style={styles.suggestFieldsWrap}>
                <ScrollView
                  style={styles.suggestFieldsScroll}
                  contentContainerStyle={styles.suggestFields}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {suggestedPlacesDraft.map((value, index) => (
                    <View key={`suggest-place-${index}`} style={styles.suggestFieldRow}>
                      <View style={styles.suggestInputWrap}>
                        <TextInput
                          value={value}
                          onChangeText={(nextValue) => updateSuggestedPlace(index, nextValue)}
                          placeholder={`Lugar ${index + 1}`}
                          placeholderTextColor="rgba(255,255,255,0.36)"
                          style={[
                            styles.suggestInput,
                            Platform.OS === 'web'
                              ? ({
                                  outlineWidth: 0,
                                  outlineStyle: 'none',
                                  outlineColor: 'transparent',
                                } as never)
                              : null,
                          ]}
                        />
                      </View>

                      {suggestedPlacesDraft.length > 1 ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Eliminar lugar ${index + 1}`}
                          onPress={() => removeSuggestedPlaceField(index)}
                          style={styles.suggestFieldAction}
                        >
                          <Ionicons name="remove" size={20} color="#fff7fb" />
                        </Pressable>
                      ) : null}

                      {index === suggestedPlacesDraft.length - 1 ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Agregar otro lugar"
                          onPress={addSuggestedPlaceField}
                          style={styles.suggestFieldAction}
                        >
                          <Ionicons name="add" size={20} color="#fff7fb" />
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.suggestModalFooter}>
                <AppPrimaryButton
                  label={suggestionSubmitting ? 'Enviando...' : 'Enviar sugerencia'}
                  loading={suggestionSubmitting}
                  onPress={handleSubmitSuggestion}
                  fullWidth
                />
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={feedbackVisible}
        transparent
        animationType="none"
        onRequestClose={handleFeedbackRequestClose}
      >
        <View style={styles.suggestModalRoot}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.suggestModalBackdrop,
              {
                opacity: feedbackModalProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleFeedbackRequestClose} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.suggestModalKeyboard}
          >
            <Animated.View
              style={[
                styles.suggestModalCard,
                {
                  paddingBottom: 18 + Math.max(insets.bottom, 12),
                  maxHeight: '78%',
                },
                {
                  opacity: feedbackModalProgress,
                  transform: [
                    {
                      translateY: feedbackModalProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [56, 0],
                      }),
                    },
                    {
                      scale: feedbackModalProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.suggestModalHeader}>
                <View style={styles.suggestModalTitleWrap}>
                  <Text style={styles.suggestModalTitle}>Añadir feedback</Text>
                  <Text style={styles.suggestModalCopy}>
                    Deja ideas, problemas o mejoras que quieras que revisemos e implementemos después.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar feedback"
                  onPress={handleFeedbackRequestClose}
                  style={styles.suggestModalClose}
                >
                  <Ionicons name="close" size={20} color={spotsUi.textPrimary} />
                </Pressable>
              </View>

              <View style={styles.feedbackTextAreaWrap}>
                <TextInput
                  value={feedbackDraft}
                  onChangeText={setFeedbackDraft}
                  placeholder="Escribe aquí todo lo que notaste, ideas nuevas, bugs o mejoras que quieras guardar..."
                  placeholderTextColor="rgba(255,255,255,0.36)"
                  multiline
                  textAlignVertical="top"
                  style={[
                    styles.feedbackTextArea,
                    Platform.OS === 'web'
                      ? ({
                          outlineWidth: 0,
                          outlineStyle: 'none',
                          outlineColor: 'transparent',
                        } as never)
                      : null,
                  ]}
                />
              </View>

              <View style={styles.suggestModalFooter}>
                <AppPrimaryButton
                  label={feedbackSubmitting ? 'Guardando...' : 'Guardar feedback'}
                  loading={feedbackSubmitting}
                  onPress={handleSubmitFeedback}
                  fullWidth
                />
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {filtersOpen ? (
        <FiltersSheet
          activeTab={activeTab}
          initialFilters={filters}
          query={deferredQuery}
          onApply={applyFilters}
          onClearQuery={clearQueryOnly}
          onClose={() => setFiltersOpen(false)}
        />
      ) : null}
    </View>
  );
}

function getActiveFiltersCount(filters: typeof DEFAULT_FILTERS) {
  let count = 0;
  if (filters.interests.length > 0) count += 1;
  if (filters.hubName.length > 0) count += 1;
  if (filters.people !== DEFAULT_FILTERS.people) count += 1;
  if (filters.minBudget !== DEFAULT_FILTERS.minBudget) count += 1;
  if (filters.maxBudget !== DEFAULT_FILTERS.maxBudget) count += 1;
  if (filters.time !== DEFAULT_FILTERS.time || filters.period !== DEFAULT_FILTERS.period) count += 1;
  if (filters.days.length > 0) count += 1;
  if (filters.distance !== DEFAULT_FILTERS.distance) count += 1;
  if (filters.openNowOnly !== DEFAULT_FILTERS.openNowOnly) count += 1;
  if (filters.hideManuallyAdjusted !== DEFAULT_FILTERS.hideManuallyAdjusted) count += 1;
  return count;
}

function ResultsAppear({
  children,
}: {
  children: ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: spotsUi.bg,
  },
  webPushToastWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 40,
  },
  webPushToast: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#2A0F16',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
  },
  webPushToastDefault: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(239,56,87,0.18)',
  },
  webPushToastSuccess: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(239,56,87,0.22)',
  },
  webPushToastError: {
    backgroundColor: '#FFF5F7',
    borderColor: 'rgba(239,56,87,0.28)',
  },
  webPushToastTitle: {
    color: '#141417',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  webPushToastMessage: {
    color: '#2E2E34',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: spotsUi.bg,
    paddingHorizontal: 18,
    paddingBottom: 8,
    gap: 8,
    shadowColor: '#000000',
  },
  searchCollapsible: {
    overflow: 'hidden',
  },
  headerChrome: {
    overflow: 'hidden',
  },
  headerChromeInner: {
    gap: 6,
    paddingBottom: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  profileWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeToggle: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  themeToggleLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  titleWrap: {
    flex: 1,
    gap: 3,
  },
  topGreeting: {
    fontSize: 22,
    fontWeight: '600',
    color: spotsUi.textPrimary,
  },
  topSubtitle: {
    color: spotsUi.textTertiary,
    fontSize: 11,
    lineHeight: 18,
  },
  segmented: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: spotsUi.surfaceInput,
    borderRadius: 18,
    padding: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  segmentTab: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTabActive: {
    backgroundColor: spotsUi.surfaceElevated,
  },
  segmentTabInactive: {
    backgroundColor: 'transparent',
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  segmentLabelActive: {
    color: '#FFFFFF',
  },
  segmentLabelInactive: {
    color: spotsUi.textHint,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchFieldWrap: {
    flex: 1,
  },
  feed: {
    flex: 1,
    backgroundColor: spotsUi.bg,
  },
  newPlaceBannerWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 40,
  },
  newPlaceBanner: {
    minHeight: 82,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  newPlaceBannerImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#5f5f67',
  },
  newPlaceBannerBody: {
    flex: 1,
    gap: 3,
  },
  newPlaceBannerEyebrow: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.12,
    textTransform: 'uppercase',
    color: spotsUi.textSecondary,
  },
  newPlaceBannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: spotsUi.textPrimary,
  },
  newPlaceBannerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: spotsUi.textSecondary,
  },
  feedContent: {
    paddingHorizontal: 16,
    gap: 18,
  },
  feedbackFabStack: {
    position: 'absolute',
    right: 16,
    zIndex: 35,
    gap: 10,
    alignItems: 'flex-end',
  },
  suggestFab: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#EF3857',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,247,251,0.22)',
    shadowColor: '#2A0F16',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  suggestFabText: {
    color: '#fff7fb',
    fontSize: 15,
    fontWeight: '700',
  },
  feedbackFabSecondary: {
    backgroundColor: 'rgba(23,17,21,0.92)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  feedbackFabSecondaryText: {
    color: spotsUi.textPrimary,
  },
  suggestModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  suggestModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,8,13,0.52)',
  },
  suggestModalKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  suggestModalCard: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#171115',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 18,
  },
  suggestModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  suggestModalTitleWrap: {
    flex: 1,
    gap: 6,
  },
  suggestModalTitle: {
    color: spotsUi.textPrimary,
    fontSize: 26,
    fontWeight: '700',
  },
  suggestModalCopy: {
    color: spotsUi.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  suggestModalClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  suggestFieldsWrap: {
    flex: 1,
    minHeight: 0,
  },
  suggestFieldsScroll: {
    flex: 1,
  },
  suggestFields: {
    gap: 12,
    paddingBottom: 8,
  },
  suggestModalFooter: {
    paddingTop: 4,
  },
  suggestFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestInputWrap: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  suggestInput: {
    minHeight: 48,
    color: '#fff7fb',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },
  feedbackTextAreaWrap: {
    minHeight: 220,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  feedbackTextArea: {
    minHeight: 188,
    color: '#fff7fb',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
  },
  suggestFieldAction: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCategories: {
    paddingRight: 18,
    gap: 4,
  },
  quickCategory: {
    width: 78,
    minHeight: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCategoryIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  quickCategoryImageWrap: {
    width: 78,
    height: 78,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  quickCategoryBlurBlob: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  quickCategoryImage: {
    width: 76,
    height: 76,
  },
  resultsBar: {
    marginTop: 0,
    paddingHorizontal: 4,
    paddingVertical: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  resultsInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  resultsText: {
    color: spotsUi.textPrimary,
    fontWeight: '600',
  },
  resultsHint: {
    color: spotsUi.textSecondary,
    fontWeight: '600',
  },
  resultsFilterPill: {
    minHeight: 30,
    borderRadius: 999,
    backgroundColor: spotsUi.surfaceInput,
    paddingLeft: 12,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultsFilterPillText: {
    color: spotsUi.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  layoutSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  layoutSwitcherButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: spotsUi.surfaceInput,
  },
  layoutSwitcherButtonActive: {
    backgroundColor: spotsUi.surfaceElevated,
  },
  layoutStage: {
    gap: 24,
  },
  card: {
    gap: 12,
  },
  cardImage: {
    height: 188,
    justifyContent: 'space-between',
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardImageStyle: {
    resizeMode: 'cover',
    borderRadius: 24,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  cardImageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardHeaderActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  cardHeaderLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flexShrink: 1,
  },
  cardBody: {
    gap: 8,
    paddingHorizontal: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: spotsUi.textPrimary,
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLocationText: {
    fontSize: 14,
    fontWeight: '400',
    color: spotsUi.textSecondary,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  feedMetaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  feedMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
    flexShrink: 1,
  },
  feedPriceInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  feedMetaText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
  },
  feedLocationText: {
    flexShrink: 1,
    minWidth: 0,
  },
  newBadgeWrap: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  newBadge: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(20,20,23,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#141417',
  },
  categoryChip: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(20,20,23,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryChipImage: {
    width: 24,
    height: 24,
  },
  cardSupportText: {
    fontSize: 13,
    fontWeight: '700',
    color: spotsUi.textPrimary,
  },
  cardLikes: {
    fontSize: 13,
    fontWeight: '600',
    color: spotsUi.textPrimary,
    backgroundColor: spotsUi.glassBg,
    borderWidth: 1,
    borderColor: spotsUi.glassBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: 'hidden',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  gridCard: {
    width: '48%',
    gap: 10,
  },
  gridCardImage: {
    height: 150,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  gridCardImageStyle: {
    resizeMode: 'cover',
    borderRadius: 22,
  },
  gridCardMeta: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridCardBody: {
    gap: 8,
    paddingHorizontal: 2,
  },
  gridCardTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: spotsUi.textPrimary,
  },
  gridCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  gridCardLikes: {
    fontSize: 12,
    fontWeight: '500',
    color: spotsUi.textSecondary,
  },
  listWrap: {
    gap: 0,
  },
  listCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: spotsUi.borderSubtle,
  },
  listCardImageWrap: {
    width: 96,
    height: 96,
  },
  listCardImage: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    backgroundColor: '#1b1b1f',
  },
  listCardImageStyle: {
    resizeMode: 'cover',
    borderRadius: 16,
  },
  listCardImageMeta: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listCardBody: {
    flex: 1,
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 96,
  },
  listCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  listCardTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '600',
    color: spotsUi.textPrimary,
  },
  listCardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
  },
  listCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mapWrap: {
    gap: 16,
  },
  mapFeedWrap: {
    gap: 12,
  },
  mapFeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mapFeedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: spotsUi.textPrimary,
  },
  mapFeedCount: {
    fontSize: 13,
    fontWeight: '600',
    color: spotsUi.textSecondary,
  },
  mapEmptyFeed: {
    paddingVertical: 16,
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingVertical: 36,
    gap: 10,
    alignItems: 'center',
  },
  emptyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  emptyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: spotsUi.textPrimary,
    textAlign: 'center',
  },
  emptyCopy: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    color: spotsUi.textSecondary,
  },
});
