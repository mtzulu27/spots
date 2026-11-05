import { DiscoveryPlaceCard } from '@/components/discovery-place-card'
import { SharePlaceButton } from '@/components/share-place-button'
import { getCategoryLabel } from '@/lib/category-icons';
import { formatPeopleLabel } from '@/lib/people-label'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SpotsIcon as Ionicons } from '@/components/spots-icon';
import { Entrance } from '@/components/entrance'
import { accountUi } from '@/lib/account-ui'
import { discoverySurfaceShadow } from '@/lib/discovery-surface'
import { CategoryIcon } from '@/components/category-icon'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import {
  AppState,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { topContentInset } from '@/lib/layout-insets'
import { AppBookmarkButton, AppIconButton, AppPrimaryButton, AppVisitedButton, appColors, spotsUi } from '@/components/app-ui'
import { useBookmarksStore } from '@/lib/bookmarks-store'
import { useVisitedStore } from '@/lib/visited-store'
import { formatApproxBudgetPerPersonLabel, getEffectiveSpotDistanceKm } from '@/lib/explore-filters'
import { useLocationStore } from '@/lib/location-store'
import { useRelayoutSubscription } from '@/lib/relayout'
import {
  getOpenStatusFromSchedule,
  getScheduleDayRows,
  getHolidayScheduleRow,
  getScheduleDisplayLabel,
  getScheduleLabel,
  getTodayScheduleLabel,
} from '@/lib/schedule-status'
import {
  aggregatePlaceBranches,
  aggregatePlaceSpotsFromList,
  getBrandBranchesFromList,
  getBranchLocationLabel,
  getOtherBranchesFromList,
  getSimilarSpotsFromList,
  getSpotByIdFromList,
  getSpotFeedSubtitle,
  normalizeCommercialCenterLabel,
  normalizeSpotCategory,
  type Spot,
} from '@/lib/mock-spots'
import { useSpotsStore } from '@/lib/spots-store'
import { isRecentlyAdded } from '@/lib/discovery-ranking'
import { NewPlaceBadge } from '@/components/new-place-badge'
import { PlanBudgetCalculator } from '@/components/plan-budget-calculator'
import { getPlaceHeroScrollMetrics, PLACE_HERO_HEIGHT, PLACE_HERO_SCROLL_START } from '@/lib/place-hero-scroll.mjs'

const exploreFoodIcon = require('../../assets/explore_food_icon.png')
const exploreCinemaIcon = require('../../assets/explore_cinema_icon.png')
const exploreArtIcon = require('../../assets/explore_art_icon.png')
const exploreNightlifeIcon = require('../../assets/explore_nightlife_icon.png')
const exploreSportsIcon = require('../../assets/explore_sports_icon.png')
const exploreFamilyIcon = require('../../assets/explore_family_icon.png')
const exploreEventsIcon = require('../../assets/explore_events_icon.png')
const exploreNatureIcon = require('../../assets/explore_nature_icon.png')

type DetailStat = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  statusLabel?: string
  statusTone?: 'open' | 'closed'
}

const emptySpotForActions: Spot = {
  id: '',
  spotId: 0,
  branchId: null,
  placeSlug: '',
  branchSlug: '',
  feedPriorityRank: 1,
  manuallyAdjusted: false,
  likeTargetId: '0',
  type: 'place',
  name: '',
  brandName: '',
  branchName: '',
  neighborhood: '',
  hubName: '',
  category: 'Comida',
  subcategories: [],
  city: 'Cali',
  likes: '0',
  image: '',
  galleryImages: [],
  shortDescription: '',
  description: '',
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
  tags: [],
  moods: [],
}

const detailUi = accountUi
const DETAIL_ICON_SIZE = 18
const DETAIL_ACTION_ICON_SIZE = 16

function getPriceLabel(spot: Spot) {
  return formatApproxBudgetPerPersonLabel(spot.minBudget, spot.maxBudget, spot.typicalBudget, spot.budgetPilot, spot.budgetBasis).replace(' COP', '')
}

function isMenuppUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return hostname === 'menupp.co' || hostname.endsWith('.menupp.co')
  } catch {
    return false
  }
}

function getMenuActionLabel(category: Spot['category'], menuUrl: string) {
  if (isMenuppUrl(menuUrl)) return 'Menu'

  const normalizedCategory = normalizeSpotCategory(category)
  return normalizedCategory === 'Comida' || normalizedCategory === 'Restaurantes' || normalizedCategory === 'Bares y noche'
    ? 'Menu'
    : 'Website'
}

function getPlaceLocationSummary(branches: Spot[]) {
  const labels = Array.from(
    new Set(branches.map((branch) => getBranchLocationLabel(branch, branches)).filter(Boolean)),
  )

  if (!labels.length) {
    return 'Cali'
  }

  if (labels.length <= 2) {
    return labels.join(', ')
  }

  return `${labels.slice(0, 2).join(', ')} y ${labels.length - 2} más`
}

function getBranchSummaryLabel(branches: Spot[]) {
  const labels = Array.from(
    new Set(branches.map((branch) => getBranchLocationLabel(branch, branches)).filter(Boolean)),
  )

  if (!labels.length) {
    return ''
  }

  return `${branches.length} sedes: ${getPlaceLocationSummary(branches)}`
}

function getBranchSelectorMeta(branch: Spot) {
  return null
}

function getBranchSelectorTitle(branch: Spot, allBranches: Spot[]) {
  return getBranchLocationLabel(branch, allBranches)
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) {
    return Number(distanceKm.toFixed(1))
  }

  return Math.round(distanceKm * 10) / 10
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function buildGalleryImages(detailSpot: Spot) {
  return Array.from(
    new Set([
      detailSpot.image,
      ...(detailSpot.galleryImages ?? []),
    ].map(image => image?.trim()).filter(Boolean)),
  ).slice(0, 10)
}

function getOpenStatus(spot: Spot) {
  return getOpenStatusFromSchedule(spot.hours, new Date(), spot.businessStatus)
}

export default function SpotDetailScreen() {
  const [isStandalonePwa, setIsStandalonePwa] = useState(Platform.OS !== 'web');
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    setIsStandalonePwa(
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    );
  }, []);
  useRelayoutSubscription()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const { id, branch } = useLocalSearchParams<{ id: string; branch?: string }>()
  const { spots, loading } = useSpotsStore()
  const { isBookmarked, toggleBookmark } = useBookmarksStore()
  const { isVisited, toggleVisited } = useVisitedStore()
  const { userLocation } = useLocationStore()
  const [, forceResumeRender] = useState(0)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [branchPickerOpen, setBranchPickerOpen] = useState(false)
  const [branchPickerMounted, setBranchPickerMounted] = useState(false)
  const [branchContentLoading, setBranchContentLoading] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [scheduleExpanded, setScheduleExpanded] = useState(false)
  const [scheduleContentMounted, setScheduleContentMounted] = useState(false)
  const [scheduleContentHeight, setScheduleContentHeight] = useState(0)
  const [budgetCalculatorOpen, setBudgetCalculatorOpen] = useState(false)
  const [galleryViewportWidth, setGalleryViewportWidth] = useState(windowWidth)
  const GALLERY_VELOCITY_PROJECTION = 160
  const galleryDragStartIndexRef = useRef(0)
  const galleryTranslateX = useRef(new Animated.Value(0)).current
  const galleryTranslateRef = useRef(0)
  const galleryGestureStartTranslateRef = useRef(0)
  const branchPickerOpacity = useRef(new Animated.Value(0)).current
  const branchPickerTranslateY = useRef(new Animated.Value(28)).current
  const scheduleExpandProgress = useRef(new Animated.Value(0)).current
  const heroIntroOpacity = useRef(new Animated.Value(0)).current
  const heroIntroTranslateY = useRef(new Animated.Value(18)).current
  const sheetIntroOpacity = useRef(new Animated.Value(0)).current
  const sheetIntroTranslateY = useRef(new Animated.Value(26)).current
  const branchContentOpacity = useRef(new Animated.Value(1)).current
  const branchContentTranslateY = useRef(new Animated.Value(0)).current
  const branchLoadingOverlayOpacity = useRef(new Animated.Value(0)).current
  const previousAnimatedBranchIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (Platform.OS === 'web') {
      return
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        forceResumeRender((current) => current + 1)
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  const spot =
    getSpotByIdFromList(spots, id ?? '')
  const isEvent = spot?.type === 'event'
  const brandBranches = useMemo(
    () => (spot && !isEvent ? getBrandBranchesFromList(spots, spot) : []),
    [isEvent, spot, spots],
  )
  const detailSpot = useMemo(
    () => (spot && !isEvent && brandBranches.length ? aggregatePlaceBranches(brandBranches) : spot),
    [brandBranches, isEvent, spot],
  )
  const selectedBranch = useMemo(
    () =>
      !isEvent
        ? brandBranches.find((branch) => branch.id === selectedBranchId) ?? brandBranches[0] ?? null
        : null,
    [brandBranches, isEvent, selectedBranchId],
  )
  const initialBranchId = useMemo(() => {
    if (isEvent) {
      return null
    }

    const routeBranchId =
      typeof id === 'string' && brandBranches.some((candidate) => candidate.id === id)
        ? id
        : null
    const preferredBranchId =
      typeof branch === 'string' && brandBranches.some((candidate) => candidate.id === branch)
        ? branch
        : null

    return preferredBranchId ?? routeBranchId ?? brandBranches[0]?.id ?? null
  }, [branch, brandBranches, id, isEvent])

  useEffect(() => {
    setSelectedBranchId(initialBranchId)
  }, [initialBranchId])

  useEffect(() => {
    if (isEvent || !selectedBranch?.id) {
      previousAnimatedBranchIdRef.current = null
      setBranchContentLoading(false)
      branchContentOpacity.setValue(1)
      branchContentTranslateY.setValue(0)
      branchLoadingOverlayOpacity.setValue(0)
      return
    }

    if (!previousAnimatedBranchIdRef.current) {
      previousAnimatedBranchIdRef.current = selectedBranch.id
      setBranchContentLoading(false)
      branchContentOpacity.setValue(1)
      branchContentTranslateY.setValue(0)
      branchLoadingOverlayOpacity.setValue(0)
      return
    }

    if (previousAnimatedBranchIdRef.current === selectedBranch.id) {
      return
    }

    previousAnimatedBranchIdRef.current = selectedBranch.id
    setBranchContentLoading(true)
    branchContentOpacity.setValue(0)
    branchContentTranslateY.setValue(14)
    branchLoadingOverlayOpacity.setValue(1)

    Animated.parallel([
      Animated.timing(branchContentOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(branchContentTranslateY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(branchLoadingOverlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start()

    const timeout = setTimeout(() => {
      setBranchContentLoading(false)
    }, 220)

    return () => clearTimeout(timeout)
  }, [
    branchContentOpacity,
    branchContentTranslateY,
    branchLoadingOverlayOpacity,
    isEvent,
    selectedBranch?.id,
  ])

  useEffect(() => {
    if (branchPickerOpen) {
      setBranchPickerMounted(true)
      Animated.parallel([
        Animated.timing(branchPickerOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(branchPickerTranslateY, {
          toValue: 0,
          damping: 18,
          stiffness: 210,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start()
      return
    }

    if (!branchPickerMounted) {
      return
    }

    Animated.parallel([
      Animated.timing(branchPickerOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(branchPickerTranslateY, {
        toValue: 20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setBranchPickerMounted(false)
    })
  }, [branchPickerMounted, branchPickerOpen, branchPickerOpacity, branchPickerTranslateY])

  useEffect(() => {
    if (scheduleExpanded) {
      setScheduleContentMounted(true)
      Animated.timing(scheduleExpandProgress, {
        toValue: 1,
        duration: 340,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: false,
      }).start()
      return () => scheduleExpandProgress.stopAnimation()
    }

    if (!scheduleContentMounted) {
      return
    }

    Animated.timing(scheduleExpandProgress, {
      toValue: 0,
      duration: 280,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setScheduleContentMounted(false)
    })
    return () => scheduleExpandProgress.stopAnimation()
  }, [scheduleContentMounted, scheduleExpanded, scheduleExpandProgress])

  useEffect(() => {
    if (!detailSpot) {
      return
    }

    heroIntroOpacity.setValue(0)
    heroIntroTranslateY.setValue(18)
    sheetIntroOpacity.setValue(0)
    sheetIntroTranslateY.setValue(26)

    Animated.sequence([
      Animated.parallel([
        Animated.timing(heroIntroOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(heroIntroTranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(sheetIntroOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetIntroTranslateY, {
          toValue: 0,
          damping: 18,
          stiffness: 170,
          mass: 0.95,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [
    detailSpot,
    heroIntroOpacity,
    heroIntroTranslateY,
    sheetIntroOpacity,
    sheetIntroTranslateY,
  ])

  const contextSpot = (!isEvent && selectedBranch ? selectedBranch : detailSpot) as Spot | undefined

  const statCards = useMemo<DetailStat[]>(
    () => {
      if (!detailSpot || !contextSpot) {
        return []
      }

      const multiBranchPlace = !isEvent && brandBranches.length > 1 && !selectedBranch
      const idealFor =
        contextSpot.moods.length > 0 ? contextSpot.moods.slice(0, 3).join(' · ') : 'Parche casual'
      const scheduleStatus = multiBranchPlace ? null : getOpenStatus(contextSpot)

      return [
        {
          icon: 'people-outline',
          label: 'Personas',
          value: formatPeopleLabel(contextSpot.minPeople, contextSpot.maxPeople),
        },
        {
          icon: 'time-outline',
          label: 'Horario',
          value: multiBranchPlace ? 'Varia por sede' : getScheduleDisplayLabel(contextSpot.hours),
          statusLabel: scheduleStatus?.label,
          statusTone: scheduleStatus?.tone,
        },
        {
          icon: 'wallet-outline',
          label: isEvent ? 'Entrada' : 'Presupuesto',
          value: getPriceLabel(contextSpot),
        },
        {
          icon: 'sparkles-outline',
          label: 'Ideal para',
          value: idealFor,
        },
      ]
    },
    [brandBranches.length, contextSpot, detailSpot, isEvent, selectedBranch],
  )
  const selectedBranchDistance = useMemo(() => {
    if (!detailSpot) {
      return null
    }

    if (isEvent) {
      return getEffectiveSpotDistanceKm(detailSpot, userLocation)
    }

    return contextSpot ? getEffectiveSpotDistanceKm(contextSpot, userLocation) : null
  }, [contextSpot, detailSpot, isEvent, userLocation])

  const resolvedContextSpot = (contextSpot ?? detailSpot) as Spot | undefined
  const selectedBranchOpenStatus =
    !isEvent && resolvedContextSpot ? getOpenStatus(resolvedContextSpot) : null
  const hasSelectedBranchStatus = Boolean(selectedBranchOpenStatus)
  const todayScheduleLabel = resolvedContextSpot?.businessStatus === 'temporarily_closed'
    ? 'Cerrado temporalmente'
    : resolvedContextSpot ? getTodayScheduleLabel(resolvedContextSpot.hours) : ''
  const weeklyScheduleRows = resolvedContextSpot
    ? [...getScheduleDayRows(resolvedContextSpot.hours), getHolidayScheduleRow(resolvedContextSpot.hours)]
    : []

  const bookmarked = detailSpot ? isBookmarked(detailSpot.likeTargetId) : false
  const visited = detailSpot ? isVisited(detailSpot.likeTargetId) : false
  const similarSpots = detailSpot
    ? isEvent
      ? getSimilarSpotsFromList(spots, detailSpot)
      : aggregatePlaceSpotsFromList(spots)
          .filter(
            (item) =>
              item.id !== detailSpot.id &&
              item.brandName.toLowerCase() !== detailSpot.brandName.toLowerCase() &&
              item.category === detailSpot.category,
          )
          .slice(0, 3)
    : []
  const otherBranches = detailSpot
    ? isEvent
      ? getOtherBranchesFromList(spots, detailSpot)
      : brandBranches
    : []
  const canSelectBranch = !isEvent && otherBranches.length > 1
  const additionalBranchesCount = canSelectBranch ? Math.max(otherBranches.length - 1, 0) : 0
  const galleryImages = useMemo(
    () => (detailSpot ? buildGalleryImages(detailSpot) : []),
    [detailSpot],
  )
  const hasMenu = resolvedContextSpot ? hasValueLink(resolvedContextSpot.menuUrl) : false
  const hasInstagram = resolvedContextSpot ? hasValueLink(resolvedContextSpot.instagram) : false
  const placeInstagram = detailSpot?.instagram ?? ''
  const hasPlaceInstagram = hasValueLink(placeInstagram)
  const hasWhatsApp = resolvedContextSpot ? hasValueLink(resolvedContextSpot.whatsapp) : false
  const hasPhone = resolvedContextSpot ? hasValueText(resolvedContextSpot.phone) : false
  const showMenu =
    hasMenu &&
    (resolvedContextSpot?.category !== 'Eventos' || isMenuppUrl(resolvedContextSpot.menuUrl))
  const menuActionLabel = resolvedContextSpot
    ? getMenuActionLabel(resolvedContextSpot.category, resolvedContextSpot.menuUrl)
    : 'Menu'
  const googleMapsUrl = resolvedContextSpot ? getGoogleMapsUrl(resolvedContextSpot) : null
  const openPlaceMap = () => {
    if (!resolvedContextSpot) return
    router.push({ pathname: '/place-map', params: { branch: resolvedContextSpot.id, returnSpot: id } })
  }
  const primaryAction = getPrimaryAction({
    hasWhatsApp,
    hasPhone,
    hasMenu: showMenu,
    hasInstagram,
    spot: resolvedContextSpot ?? spot ?? emptySpotForActions,
    onMap: openPlaceMap,
  })
  const categoryIcon = getCategoryIcon(detailSpot?.category ?? 'Comida')
  const baseHeroHeight = PLACE_HERO_HEIGHT
  const sheetMaxOffset = Math.max(1, windowHeight - baseHeroHeight)
  const baseHeroHeightValue = useRef(new Animated.Value(baseHeroHeight)).current
  const sheetTranslateY = useRef(new Animated.Value(0)).current
  const infoScrollPosition = useRef(new Animated.Value(0)).current
  const [galleryHeaderHidden, setGalleryHeaderHidden] = useState(false)
  useEffect(() => {
    const listener = sheetTranslateY.addListener(({ value }) => {
      setGalleryHeaderHidden(value >= sheetMaxOffset * 0.9)
    })
    return () => sheetTranslateY.removeListener(listener)
  }, [sheetTranslateY, sheetMaxOffset])
  const galleryHeaderOpacity = sheetTranslateY.interpolate({
    inputRange: [0, sheetMaxOffset * 0.9],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })
  const galleryHeaderTranslate = sheetTranslateY.interpolate({
    inputRange: [0, sheetMaxOffset * 0.9],
    outputRange: [0, -16],
    extrapolate: 'clamp',
  })
  const sheetOffsetRef = useRef(0)
  const galleryLastTap = useRef<{ time: number; x: number; y: number } | null>(null)
  const infoScrollY = useRef(0)
  const sheetAnimating = useRef(false)
  const infoScrollRef = useRef<ScrollView>(null)
  const handleDragStart = useRef(0)
  const { distance: collapseDistance } = getPlaceHeroScrollMetrics(0, insets.top)
  const scrollCollapse = infoScrollPosition.interpolate({
    inputRange: [PLACE_HERO_SCROLL_START, PLACE_HERO_SCROLL_START + Math.max(1, collapseDistance)],
    outputRange: [0, collapseDistance],
    extrapolate: 'clamp',
  })
  const effectiveSheetOffset = Animated.subtract(sheetTranslateY, scrollCollapse)
  const coverFocus = effectiveSheetOffset.interpolate({
    inputRange: [-Math.max(1, collapseDistance), 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })
  const heroAnimatedHeight = Animated.add(effectiveSheetOffset, baseHeroHeightValue)
  // Collapse only the clipped cover, not its flow footprint: scroll geometry stays stable.
  const heroFootprintHeight = Animated.add(baseHeroHeightValue, sheetTranslateY)
  const galleryCornerRadius = effectiveSheetOffset.interpolate({
    inputRange: [0, sheetMaxOffset],
    outputRange: [44, 0],
    extrapolate: 'clamp',
  })
  const galleryHandleInset = effectiveSheetOffset.interpolate({
    inputRange: [0, sheetMaxOffset],
    outputRange: [0, insets.bottom],
    extrapolate: 'clamp',
  })
  const heroContentOpacity = sheetTranslateY.interpolate({
    inputRange: [0, sheetMaxOffset * 0.55, sheetMaxOffset],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  })
  const collapsedHeroOpacity = effectiveSheetOffset.interpolate({
    inputRange: [-Math.max(1, collapseDistance * 0.65), 0],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  const heroContentTranslateY = sheetTranslateY.interpolate({
    inputRange: [0, sheetMaxOffset],
    outputRange: [0, 16],
    extrapolate: 'clamp',
  })
  const galleryDotsOpacity = sheetTranslateY.interpolate({
    inputRange: [sheetMaxOffset * 0.5, sheetMaxOffset],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  useEffect(() => {
    setGalleryIndex(0)
    galleryTranslateRef.current = 0
    galleryGestureStartTranslateRef.current = 0
    galleryTranslateX.setValue(0)
    sheetTranslateY.stopAnimation()
    sheetTranslateY.setValue(0)
    sheetOffsetRef.current = 0
    sheetAnimating.current = false
    infoScrollY.current = 0
    infoScrollPosition.setValue(0)
    infoScrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [detailSpot?.id])

  useEffect(() => {
    const width = Math.max(galleryViewportWidth, 1)
    const nextTranslate = -galleryIndex * width
    galleryTranslateRef.current = nextTranslate
    galleryGestureStartTranslateRef.current = nextTranslate
    galleryTranslateX.setValue(nextTranslate)
  }, [galleryViewportWidth, galleryTranslateX])

  function resolveGalleryTargetIndex(dx: number, velocityX = 0) {
    const width = Math.max(galleryViewportWidth, 1)
    const maxIndex = Math.max(galleryImages.length - 1, 0)
    const startIndex = galleryDragStartIndexRef.current
    const projectedOffset = dx + velocityX * GALLERY_VELOCITY_PROJECTION
    const projectedIndex = startIndex - projectedOffset / width

    return clamp(Math.round(projectedIndex), 0, maxIndex)
  }

  function applyGalleryEdgeResistance(value: number) {
    const width = Math.max(galleryViewportWidth, 1)
    const maxIndex = Math.max(galleryImages.length - 1, 0)
    const minTranslate = -maxIndex * width
    const maxTranslate = 0

    if (value > maxTranslate) {
      const excess = value - maxTranslate
      return maxTranslate + excess * 0.28
    }

    if (value < minTranslate) {
      const excess = value - minTranslate
      return minTranslate + excess * 0.28
    }

    return value
  }

  function snapGalleryToIndex(targetIndex: number, velocityX = 0) {
    const width = Math.max(galleryViewportWidth, 1)
    const targetTranslate = -targetIndex * width
    setGalleryIndex(targetIndex)
    galleryTranslateRef.current = targetTranslate
    galleryGestureStartTranslateRef.current = targetTranslate
    Animated.spring(galleryTranslateX, {
      toValue: targetTranslate,
      damping: 20,
      stiffness: 210,
      mass: 0.95,
      velocity: -velocityX,
      useNativeDriver: true,
    }).start()
  }

  function snapSheet(toValue: number) {
    sheetTranslateY.stopAnimation((value) => {
      if (typeof value === 'number') sheetOffsetRef.current = value
    })
    sheetAnimating.current = true
    if (toValue > 0) {
      infoScrollY.current = 0
      infoScrollPosition.setValue(0)
      infoScrollRef.current?.scrollTo({ y: 0, animated: false })
    }
    const animation = Animated.spring(sheetTranslateY, {
      toValue,
      damping: 18,
      stiffness: 220,
      mass: 0.9,
      overshootClamping: toValue === sheetMaxOffset,
      useNativeDriver: false,
    })
    animation.start(({ finished }) => {
      if (finished) {
        sheetOffsetRef.current = toValue
        sheetAnimating.current = false
      }
    })
  }

  function handleBackPress() {
    const navigateBack = () => {
      if (router.canGoBack()) {
        router.back()
        return
      }

      router.replace('/(tabs)/explore')
    }

    if (sheetAnimating.current) {
      sheetTranslateY.stopAnimation((value) => {
        const currentValue = typeof value === 'number' ? value : sheetOffsetRef.current
        sheetAnimating.current = false
        sheetOffsetRef.current = currentValue
        if (currentValue < -1) {
          navigateBack()
        } else {
          snapSheet(0)
        }
      })
      return
    }

    if (sheetOffsetRef.current >= sheetMaxOffset * 0.8) {
      snapSheet(0)
      return
    }

    navigateBack()
  }

  function handleInfoScroll(event: any) {
    const y = Math.max(0, event.nativeEvent.contentOffset.y)
    infoScrollY.current = y
    infoScrollPosition.setValue(y)
  }

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > 3,
        onPanResponderGrant: () => {
          sheetTranslateY.stopAnimation((value) => {
            sheetAnimating.current = false
            sheetOffsetRef.current = typeof value === 'number' ? value : 0
            handleDragStart.current = sheetOffsetRef.current - getPlaceHeroScrollMetrics(infoScrollY.current, insets.top).collapse
          })
        },
        onPanResponderMove: (_, gestureState) => {
          const nextValue = clamp(handleDragStart.current + gestureState.dy, -collapseDistance, sheetMaxOffset)
          sheetTranslateY.setValue(Math.max(0, nextValue))
          const y = nextValue < 0 ? PLACE_HERO_SCROLL_START - nextValue : 0
          infoScrollY.current = y
          infoScrollPosition.setValue(y)
          infoScrollRef.current?.scrollTo({ y, animated: false })
        },
        onPanResponderRelease: (_, gestureState) => {
          const currentValue = clamp(handleDragStart.current + gestureState.dy, -collapseDistance, sheetMaxOffset)
          sheetOffsetRef.current = Math.max(0, currentValue)
          // Scroll-controlled sizes never snap on release; gallery opening still settles.
          if (currentValue > 0) snapSheet(currentValue > sheetMaxOffset * 0.5 || gestureState.vy > 0.6 ? sheetMaxOffset : 0)
        },
        onPanResponderTerminate: () => {
          if (infoScrollY.current === 0) snapSheet(sheetOffsetRef.current > sheetMaxOffset * 0.5 ? sheetMaxOffset : 0)
        },
      }),
    [sheetMaxOffset, sheetTranslateY, collapseDistance, insets.top],
  )

  const galleryPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          galleryImages.length > 1 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 6,
        onPanResponderGrant: () => {
          galleryDragStartIndexRef.current = galleryIndex
          galleryTranslateX.stopAnimation((value) => {
            const currentValue = typeof value === 'number' ? value : 0
            galleryTranslateRef.current = currentValue
            galleryGestureStartTranslateRef.current = currentValue
          })
        },
        onPanResponderMove: (_, gestureState) => {
          const nextTranslate = applyGalleryEdgeResistance(
            galleryGestureStartTranslateRef.current + gestureState.dx,
          )
          galleryTranslateRef.current = nextTranslate
          galleryTranslateX.setValue(nextTranslate)
        },
        onPanResponderRelease: (event, gestureState) => {
          const isTap = Math.abs(gestureState.dx) < 8 && Math.abs(gestureState.dy) < 8
          if (isTap && sheetOffsetRef.current < sheetMaxOffset * 0.8) {
            galleryLastTap.current = null
            snapSheet(sheetMaxOffset)
            return
          }
          if (isTap && sheetOffsetRef.current >= sheetMaxOffset * 0.8) {
            const tap = { time: Date.now(), x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }
            const previous = galleryLastTap.current
            if (previous && tap.time - previous.time < 320 && Math.hypot(tap.x - previous.x, tap.y - previous.y) < 32) {
              galleryLastTap.current = null
              snapSheet(0)
            } else {
              galleryLastTap.current = tap
            }
            return
          }
          galleryLastTap.current = null
          snapGalleryToIndex(
            resolveGalleryTargetIndex(gestureState.dx, gestureState.vx),
            gestureState.vx,
          )
        },
        onPanResponderTerminate: () => {
          snapGalleryToIndex(galleryDragStartIndexRef.current)
        },
      }),
    [galleryImages.length, galleryIndex, galleryTranslateX, galleryViewportWidth, sheetMaxOffset],
  )

  if (!detailSpot || !resolvedContextSpot) {
    return (
      <View style={styles.emptyScreen}>
        <View style={styles.emptyStateWrap}>
          <ActivityIndicator size="large" color={appColors.primaryDark} />
          <Text style={styles.emptyStateText}>
            {loading ? 'Cargando lugar...' : 'No encontramos este lugar.'}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <Entrance style={styles.screen}>
      <ScrollView
        ref={infoScrollRef}
        testID="place-detail-scroll"
        stickyHeaderIndices={Platform.OS === 'web' ? undefined : [0]}
        removeClippedSubviews={false}
        style={styles.pageScroll}
        contentContainerStyle={[styles.pageScrollContent, {
          paddingBottom: isStandalonePwa ? insets.bottom : 12,
          minHeight: windowHeight + PLACE_HERO_SCROLL_START + collapseDistance,
        }]}
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        onScroll={handleInfoScroll}
        showsVerticalScrollIndicator={false}
      >
      {/* RN Web's generated sticky wrapper intercepts taps below the clipped hero. */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          { height: heroFootprintHeight },
          Platform.OS === 'web' ? ({ position: 'sticky', top: 0, zIndex: 10 } as never) : null,
        ]}
      >
      <Animated.View
        testID="place-detail-hero"
        style={[
          styles.heroStage,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: heroAnimatedHeight,
            borderBottomLeftRadius: galleryCornerRadius,
            borderBottomRightRadius: galleryCornerRadius,
            opacity: heroIntroOpacity,
            transform: [{ translateY: heroIntroTranslateY }],
          },
          Platform.OS === 'web'
            ? ({ position: 'sticky', top: 0 } as never)
            : null,
        ]}
      >
        <Animated.View
          testID="place-detail-hero-media"
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width
            if (nextWidth > 0 && nextWidth !== galleryViewportWidth) {
              setGalleryViewportWidth(nextWidth)
            }
          }}
          {...galleryPanResponder.panHandlers}
          style={[
            styles.heroGalleryWrap,
            // One cover surface grows with the drag; scroll only clips it.
            { height: heroFootprintHeight },
            Platform.OS === 'web'
              ? ({
                  touchAction: 'pan-y',
                  filter: coverFocus.interpolate({ inputRange: [0, 1], outputRange: ['blur(0px)', 'blur(8px)'] }),
                  transform: [{ scale: coverFocus.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
                } as never)
              : null,
          ]}
        >
          <Animated.View
            style={[
              styles.heroGalleryTrack,
              {
                width: galleryViewportWidth * Math.max(galleryImages.length, 1),
                transform: [{ translateX: galleryTranslateX }],
                ...(Platform.OS === 'web'
                  ? ({
                      willChange: 'transform',
                    } as const)
                  : null),
              },
            ]}
          >
            {galleryImages.map((imageUrl, index) => (
              Math.abs(index - galleryIndex) <= 1 ? <ImageBackground
                key={`${imageUrl}-${index}`}
                source={{ uri: imageUrl }}
                style={[styles.heroGalleryPage, { width: galleryViewportWidth }]}
                imageStyle={styles.heroImage}
              /> : <View key={`${imageUrl}-${index}`} style={[styles.heroGalleryPage, { width: galleryViewportWidth }]} />
            ))}
          </Animated.View>
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.heroOverlay, { backgroundColor: '#000', opacity: coverFocus.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.64] }) }]} />

        <View pointerEvents="box-none" style={styles.heroChrome}>
          <Animated.View
            pointerEvents={galleryHeaderHidden ? 'auto' : 'none'}
            accessibilityElementsHidden={!galleryHeaderHidden}
            importantForAccessibility={galleryHeaderHidden ? 'auto' : 'no-hide-descendants'}
            aria-hidden={!galleryHeaderHidden}
            style={{ position: 'absolute', top: topContentInset(insets), left: 18, zIndex: 20, opacity: sheetTranslateY.interpolate({ inputRange: [sheetMaxOffset * 0.8, sheetMaxOffset], outputRange: [0, 1], extrapolate: 'clamp' }) }}
          >
            <AppIconButton
              name="arrow-back"
              tone="light"
              accessibilityLabel="Volver"
              onPress={handleBackPress}
            />
          </Animated.View>
          <Animated.View
            pointerEvents={galleryHeaderHidden ? 'none' : 'auto'}
            accessibilityElementsHidden={galleryHeaderHidden}
            importantForAccessibility={galleryHeaderHidden ? 'no-hide-descendants' : 'auto'}
            aria-hidden={galleryHeaderHidden}
            style={[styles.topActions, { paddingTop: topContentInset(insets), opacity: galleryHeaderOpacity, transform: [{ translateY: galleryHeaderTranslate }] }]}
          >
            <AppIconButton
              name="arrow-back"
              tone="light"
              onPress={handleBackPress}
            />
            <View style={styles.topActionRow}>
              {!isEvent ? (
                <AppVisitedButton
                  visited={visited}
                  tone="light"
                  activeColor={detailUi.accent}
                  onPress={() => void toggleVisited(detailSpot.likeTargetId)}
                />
              ) : null}
              <AppBookmarkButton
                bookmarked={bookmarked}
                tone="light"
                activeColor={detailUi.accent}
                onPress={() => void toggleBookmark(detailSpot.likeTargetId)}
              />
              <SharePlaceButton spot={detailSpot} />
            </View>
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.heroCopy,
              {
                opacity: Animated.multiply(heroContentOpacity, collapsedHeroOpacity),
                transform: [{ translateY: heroContentTranslateY }],
              },
            ]}
          >
            <View style={styles.heroBadges}>
              {resolvedContextSpot.businessStatus === 'temporarily_closed' && <View style={styles.heroChip}><Text style={styles.heroChipText}>Cerrado temporalmente</Text></View>}
              {isRecentlyAdded(detailSpot, new Date()) && <NewPlaceBadge />}
              <View style={styles.heroChip}>
                <CategoryIcon
                  category={detailSpot.category}
                  size={12}
                  color="#ffffff"
                />
                <Text style={styles.heroChipText}>{getCategoryLabel(detailSpot.category)}</Text>
              </View>
            </View>

            <View style={styles.heroIdentity}>
              {!isEvent && detailSpot.logoUrl ? <View style={styles.heroLogoBadge}><Image source={{ uri: detailSpot.logoUrl }} resizeMode="cover" accessibilityLabel={`Logo de ${detailSpot.brandName}`} style={styles.heroLogo} /></View> : null}
              <Text style={[styles.heroTitle, !isEvent && styles.heroIdentityTitle]}>{isEvent ? detailSpot.name : detailSpot.brandName}</Text>
            </View>
            {isEvent ? (
              <Text style={styles.heroSubtitle}>
                {`${detailSpot.brandName} · ${getBranchLocationLabel(detailSpot)}`}
              </Text>
            ) : brandBranches.length > 1 ? (
              <>
                <View style={styles.heroMetaInline}>
                  <View style={styles.heroLocationRow}>
                    <Ionicons name="location-outline" size={14} color="#fff7fb" />
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.heroLocationText}>
                      {`${brandBranches.length} sedes: ${getPlaceLocationSummary(otherBranches)}`}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.heroMetaInline}>
                  <View style={styles.heroLocationRow}>
                    <Ionicons name="location-outline" size={14} color="#fff7fb" />
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.heroLocationText}>
                      {getBranchLocationLabel(detailSpot) ? `1 sede: ${getBranchLocationLabel(detailSpot)}` : 'Sede por confirmar'}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </Animated.View>
        </View>

        {galleryImages.length > 1 ? (
          <Animated.View style={[styles.galleryDotsWrap, { opacity: galleryDotsOpacity }]}>
            <View style={styles.galleryDots}>
              {galleryImages.map((_, index) => {
                const inputRange = [-(index + 1) * Math.max(1, galleryViewportWidth), -index * Math.max(1, galleryViewportWidth), (1 - index) * Math.max(1, galleryViewportWidth)]
                return (
                <View key={`gallery-dot-${index}`} style={styles.galleryDotSlot}>
                  <Animated.View
                    style={[
                      styles.galleryDotShape,
                      {
                        opacity: galleryTranslateX.interpolate({
                          inputRange: [-(index + 1) * Math.max(1, galleryViewportWidth), -index * Math.max(1, galleryViewportWidth), (1 - index) * Math.max(1, galleryViewportWidth)],
                          outputRange: [0.42, 1, 0.42],
                          extrapolate: 'clamp',
                        }),
                      },
                    ]}
                  >
                    <Animated.View style={[styles.galleryDotCore, { transform: [{ scaleX: galleryTranslateX.interpolate({ inputRange, outputRange: [0, 2, 0], extrapolate: 'clamp' }) }] }]} />
                    {[-1, 1].map(direction => <Animated.View key={direction} style={[styles.galleryDot, { transform: [{ translateX: galleryTranslateX.interpolate({ inputRange, outputRange: [0, direction * 8, 0], extrapolate: 'clamp' }) }] }]} />)}
                  </Animated.View>
                </View>
              ) })}
            </View>
          </Animated.View>
        ) : null}

        <Animated.View
          style={[
            styles.heroHandleArea,
            { bottom: galleryHandleInset },
            Platform.OS === 'web'
              ? ({
                  touchAction: 'none',
                } as never)
              : null,
          ]}
          {...sheetPanResponder.panHandlers}
        >
          <View style={styles.heroHandle} />
        </Animated.View>
      </Animated.View>
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            opacity: sheetIntroOpacity,
            marginTop: -28,
            transform: [{ translateY: sheetIntroTranslateY }],
          },
        ]}
      >
        <View style={[styles.sheetTopInset, !isEvent && styles.placeSheetTopInset]} />
        <View>
          <View style={[styles.panel, isStandalonePwa && { paddingBottom: 0 }]}>
            <View style={styles.section}>
              {!isEvent && resolvedContextSpot.description ? (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.bodyText, styles.placeDescription]}>{resolvedContextSpot.description}</Text>
                </View>
              ) : null}
              {!isEvent && otherBranches.length ? (
                <View style={styles.sectionBlock}>
                  <View style={styles.branchSelectorStack}>
                    <Pressable
                      onPress={() => {
                        if (canSelectBranch) {
                          setBranchPickerOpen(true)
                        }
                      }}
                      disabled={!canSelectBranch}
                      accessibilityRole="button"
                      accessibilityLabel={`Cambiar sede: ${selectedBranch ? getBranchSelectorTitle(selectedBranch, otherBranches) : 'Escoge una sede'}`}
                      style={[styles.compactBranchField, discoverySurfaceShadow]}
                    >
                      <View style={styles.compactBranchCopy}>
                        <Text
                          numberOfLines={1}
                          style={styles.compactBranchTitle}
                        >
                          {selectedBranch ? getBranchSelectorTitle(selectedBranch, otherBranches) : 'Escoge una sede'}
                        </Text>
                      </View>
                        {selectedBranch && selectedBranchOpenStatus?.label ? (
                          <View style={styles.compactBranchStatus}>
                            <View
                              style={[
                                styles.compactBranchDot,
                                selectedBranchOpenStatus?.tone === 'open'
                                  ? styles.branchSelectorDotOpen
                                  : styles.branchSelectorDotClosed,
                              ]}
                            />
                            <Text
                              style={styles.compactBranchMeta}
                            >
                              {selectedBranchOpenStatus.label}
                            </Text>
                          </View>
                        ) : selectedBranch ? (
                          <Text style={styles.compactBranchMeta}>Horario por confirmar</Text>
                        ) : null}
                      {canSelectBranch ? (
                        <Ionicons name="chevron-forward" size={16} color={detailUi.textSecondary} />
                      ) : null}
                    </Pressable>
                  </View>
                  <View style={styles.sectionDivider} />
                </View>
              ) : null}

              {!isEvent ? (
                <View style={styles.branchContentWrap}>
                  <Animated.View
                    style={{
                      opacity: branchContentOpacity,
                      transform: [{ translateY: branchContentTranslateY }],
                    }}
                  >
                    <View style={[styles.sectionBlock, styles.scheduleSectionBlock]}>
                      <Text style={styles.sectionEyebrow}>Información</Text>
                      <View style={styles.compactInfoGroup}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Horario semanal"
                        accessibilityState={{ expanded: scheduleExpanded }}
                        onPress={() => setScheduleExpanded((current) => !current)}
                        style={styles.compactScheduleCard}
                      >
                        <View style={styles.scheduleCardHeader}>
                          <View style={styles.compactInfoIcon}>
                            <Ionicons name="time-outline" size={DETAIL_ICON_SIZE} color={detailUi.text} />
                          </View>
                          <View style={styles.scheduleCardCopy}>
                            <View style={styles.scheduleTodayInline}>
                              <Text style={styles.compactTodayLabel}>Hoy</Text>
                              <Text
                                style={styles.compactInfoValue}
                              >
                                {todayScheduleLabel || getScheduleDisplayLabel(resolvedContextSpot.hours) || 'Horario por confirmar'}
                              </Text>
                            </View>
                          </View>
                          <Ionicons
                            name={scheduleExpanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={detailUi.textSecondary}
                          />
                        </View>

                        {scheduleContentMounted ? (
                          <Animated.View
                            style={[
                              styles.scheduleExpandedWrap,
                              {
                                height: scheduleExpandProgress.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, scheduleContentHeight || 1],
                                }),
                                opacity: scheduleExpandProgress,
                                transform: [
                                  {
                                    translateY: scheduleExpandProgress.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [-8, 0],
                                    }),
                                  },
                                ],
                              },
                            ]}
                          >
                            <View
                              style={styles.scheduleExpandedList}
                              onLayout={(event) => {
                                const nextHeight = event.nativeEvent.layout.height
                                if (nextHeight !== scheduleContentHeight) {
                                  setScheduleContentHeight(nextHeight)
                                }
                              }}
                            >
                              {weeklyScheduleRows.map((row) => (
                                <View
                                  key={row.code}
                                  style={[
                                    styles.scheduleDayRow,
                                    row.isToday && styles.scheduleDayRowToday,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.scheduleDayName,
                                      row.isToday && styles.scheduleDayNameToday,
                                      row.isToday && selectedBranchOpenStatus?.tone === 'closed' && styles.scheduleDayTextClosed,
                                    ]}
                                  >
                                    {row.label}
                                  </Text>
                                  <View style={styles.scheduleDayValueWrap}>
                                    {row.valueLines.map((line, index) => (
                                      <Text
                                        key={`${row.code}-${index}`}
                                        style={[
                                          styles.scheduleDayValue,
                                          row.isToday && styles.scheduleDayValueToday,
                                          row.isToday &&
                                            selectedBranchOpenStatus?.tone === 'open' &&
                                            styles.scheduleDayValueTodayOpen,
                                          row.isToday &&
                                            selectedBranchOpenStatus?.tone === 'closed' &&
                                            styles.scheduleDayValueTodayClosed,
                                        ]}
                                      >
                                        {line}
                                      </Text>
                                    ))}
                                  </View>
                                </View>
                              ))}
                            </View>
                          </Animated.View>
                        ) : null}
                      </Pressable>
                    {hasValueText(resolvedContextSpot.address) ? (
                      <Pressable
                        onPress={openPlaceMap}
                        style={styles.compactInfoRow}
                      >
                        <View style={styles.compactInfoIcon}>
                          <Ionicons name="location-outline" size={DETAIL_ICON_SIZE} color={detailUi.text} />
                        </View>
                        <View style={styles.statCopy}>
                          <Text style={styles.compactAddress}>
                            {normalizeCommercialCenterLabel(resolvedContextSpot.address)}
                          </Text>
                          <Text style={styles.compactInfoHint}>
                            {selectedBranchDistance !== null
                              ? `A ${formatDistance(selectedBranchDistance)} km de ti`
                              : 'Ver ubicación y ruta'}
                          </Text>
                        </View>
                        <Ionicons
                          name="open-outline"
                          size={DETAIL_ACTION_ICON_SIZE}
                          color={detailUi.textSecondary}
                          style={styles.statTrailingIcon}
                        />
                      </Pressable>
                    ) : null}
                    <View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Calcular presupuesto del plan"
                        disabled={resolvedContextSpot.businessStatus === 'temporarily_closed' || (resolvedContextSpot.minBudget <= 0 && resolvedContextSpot.maxBudget <= 0)}
                        onPress={() => setBudgetCalculatorOpen(true)}
                        style={({ pressed }) => [styles.compactInfoRow, pressed && styles.budgetCardPressed]}
                      >
                        <View style={styles.compactInfoIcon}>
                          <Ionicons name="wallet-outline" size={DETAIL_ICON_SIZE} color={detailUi.text} />
                        </View>
                        <View style={[styles.statCopy, styles.compactStatCopy]}>
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={styles.compactInfoValue}
                          >
                            {getPriceLabel(resolvedContextSpot).split(' · ')[0]}
                          </Text>
                        </View>
                        {(resolvedContextSpot.minBudget > 0 || resolvedContextSpot.maxBudget > 0) ? <Ionicons name="calculator-outline" size={DETAIL_ACTION_ICON_SIZE} color={detailUi.textSecondary} /> : null}
                      </Pressable>
                      <View style={styles.compactInfoRow}>
                        <View style={styles.compactInfoIcon}>
                          <Ionicons name="people-outline" size={DETAIL_ICON_SIZE} color={detailUi.text} />
                        </View>
                        <View style={[styles.statCopy, styles.compactStatCopy]}>
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={styles.compactInfoValue}
                          >
                            {formatPeopleLabel(resolvedContextSpot.minPeople, resolvedContextSpot.maxPeople, true)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  </View>

                    {showMenu || hasWhatsApp || hasPhone || googleMapsUrl ? (
                      <View style={[styles.sectionBlock, styles.quickActionsSectionBlock]}>
                        <View style={styles.branchActionsHeading}>
                          <Text style={styles.sectionEyebrow}>En esta sede</Text>
                        </View>
                        <View style={styles.branchActionRow}>
                          {googleMapsUrl ? (
                            <BranchActionButton
                              icon="map-outline"
                              label="Cómo llegar"
                              onPress={() => openExternal(googleMapsUrl)}
                            />
                          ) : null}
                          {showMenu ? (
                            <BranchActionButton
                              icon={menuActionLabel === 'Website' ? 'globe-outline' : 'book-outline'}
                              label={menuActionLabel === 'Menu' ? 'Ver carta' : 'Website'}
                              onPress={() => openExternal(resolvedContextSpot.menuUrl)}
                            />
                          ) : null}
                          {hasWhatsApp ? (
                            <BranchActionButton
                              icon="chatbox-ellipses-outline"
                              label={
                                normalizeSpotCategory(resolvedContextSpot.category) === 'Comida' ||
                                resolvedContextSpot.category === 'Restaurantes'
                                  ? 'Escribir'
                                  : 'Contactar'
                              }
                              onPress={() => openWhatsApp(resolvedContextSpot.whatsapp)}
                            />
                          ) : null}
                          {hasPhone ? (
                            <BranchActionButton
                              icon="call-outline"
                              label="Llamar"
                              onPress={() => openPhone(resolvedContextSpot.phone)}
                            />
                          ) : null}
                        </View>
                      </View>
                    ) : null}
                  </Animated.View>
                  {branchContentLoading ? (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.branchContentOverlay,
                        {
                          opacity: branchLoadingOverlayOpacity,
                        },
                      ]}
                    >
                      <View style={styles.branchContentOverlayCard}>
                        <ActivityIndicator size="small" color={detailUi.textSecondary} />
                        <Text style={styles.branchContentOverlayText}>Cargando sede</Text>
                      </View>
                    </Animated.View>
                  ) : null}
                </View>
              ) : (
                <>
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionEyebrow}>Descripción</Text>
                    <Text style={styles.bodyText}>{detailSpot.description}</Text>
                  </View>

                  <View style={styles.sectionBlock}>
                    <View style={styles.statsGrid}>
                      {statCards.map((item) => (
                        <View key={item.label} style={styles.statCard}>
                          <View style={styles.statIconWrap}>
                            <Ionicons name={item.icon} size={18} color={detailUi.text} />
                          </View>
                          <View style={styles.statCopy}>
                            <Text style={styles.statLabel}>{item.label}</Text>
                            {item.statusLabel ? (
                              <Text
                                style={[
                                  styles.statStatus,
                                  item.statusTone === 'open'
                                    ? styles.statStatusOpen
                                    : styles.statStatusClosed,
                                ]}
                              >
                                {item.statusLabel}
                              </Text>
                            ) : null}
                            <Text style={styles.statValue}>{item.value}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
              {!isEvent && hasPlaceInstagram ? (
                <View style={styles.placeSocialSection}>
                  <Text style={styles.sectionEyebrow}>Redes del lugar</Text>
                  <View style={styles.compactInfoGroup}>
                    <Pressable accessibilityRole="link" accessibilityLabel={`Instagram de ${detailSpot.brandName}`} onPress={() => openInstagram(placeInstagram)} style={styles.compactInfoRow}>
                      <View style={styles.compactInfoIcon}><Ionicons name="logo-instagram" size={DETAIL_ICON_SIZE} color={detailUi.text} /></View>
                      <Text style={[styles.compactInfoValue, styles.placeSocialText]}>{getInstagramLabel(placeInstagram)}</Text>
                      <Ionicons name="open-outline" size={DETAIL_ACTION_ICON_SIZE} color={detailUi.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              ) : null}
              <View style={[styles.sectionBlock, styles.similarSectionBlock]}>
                <Text style={styles.sectionEyebrow}>Lugares similares</Text>
                {similarSpots.length ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.similarRail}
                    contentContainerStyle={styles.similarScrollContent}
                  >
                    {similarSpots.map((item) => (
                      <SimilarSpotCard
                        key={item.id}
                        spot={item}
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.emptyState}>No encontramos similares por ahora</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
      </ScrollView>

      {!isEvent ? (
        <Modal
          transparent
          visible={branchPickerMounted}
          animationType="none"
          onRequestClose={() => setBranchPickerOpen(false)}
        >
          <View style={styles.selectorOverlay}>
            <Animated.View
              pointerEvents="none"
              style={[styles.selectorScrim, { opacity: branchPickerOpacity }]}
            />
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setBranchPickerOpen(false)} />
            <Animated.View
              style={[
                styles.selectorSheet,
                {
                  opacity: branchPickerOpacity,
                  transform: [{ translateY: branchPickerTranslateY }],
                },
              ]}
            >
              <View style={styles.selectorHeader}>
                <Text style={styles.selectorTitle}>Selecciona una sede</Text>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.selectorList}
              >
                {otherBranches.map((branch) => {
                  const active = branch.id === selectedBranch?.id
                  const branchStatus = getOpenStatus(branch)
                  const openTone = branchStatus?.tone
                  return (
                    <Pressable
                      key={branch.id}
                      accessibilityRole="radio"
                      accessibilityLabel={`${getBranchSelectorTitle(branch, otherBranches)}${branchStatus?.label ? `, ${branchStatus.label}` : ''}`}
                      accessibilityState={{ checked: active }}
                      aria-checked={active}
                      onPress={() => {
                        setSelectedBranchId(branch.id)
                        setBranchPickerOpen(false)
                      }}
                      style={[styles.compactBranchField, styles.sheetOptionSurface, active && styles.sheetOptionSelected]}
                    >
                      <View style={styles.compactBranchCopy}>
                        <Text
                          numberOfLines={1}
                          style={[styles.compactBranchTitle, !active && styles.sheetOptionIdleTitle]}
                        >
                          {getBranchSelectorTitle(branch, otherBranches)}
                        </Text>
                      </View>
                        {branchStatus?.label ? (
                          <View style={styles.compactBranchStatus}>
                            <View
                              style={[
                                styles.compactBranchDot,
                                openTone === 'open'
                                  ? styles.branchSelectorDotOpen
                                  : openTone === 'closed'
                                    ? styles.branchSelectorDotClosed
                                    : styles.branchSelectorDotNeutral,
                              ]}
                            />
                            <Text
                              style={styles.compactBranchMeta}
                            >
                              {branchStatus.label}
                            </Text>
                          </View>
                        ) : null}
                    </Pressable>
                  )
                })}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      ) : null}

      {!isEvent && resolvedContextSpot && (resolvedContextSpot.minBudget > 0 || resolvedContextSpot.maxBudget > 0)
        ? <PlanBudgetCalculator spot={resolvedContextSpot} visible={budgetCalculatorOpen && resolvedContextSpot.businessStatus !== 'temporarily_closed'} onClose={() => setBudgetCalculatorOpen(false)} />
        : null}

    </Entrance>
  )
}

function BranchActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.branchActionButton}>
      <View style={styles.branchActionGlyph}><Ionicons name={icon} size={DETAIL_ICON_SIZE} color={detailUi.text} /></View>
      <Text style={styles.branchActionText}>{label}</Text>
    </Pressable>
  )
}

function SelectorRadio({
  active,
  tone,
}: {
  active: boolean
  tone?: 'open' | 'closed'
}) {
  const scale = useRef(new Animated.Value(active ? 1 : 0.5)).current
  const opacity = useRef(new Animated.Value(active ? 1 : 0)).current

  useEffect(() => {
    if (active) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          damping: 14,
          stiffness: 220,
          mass: 0.7,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start()
      return
    }

    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.5,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start()
  }, [active, opacity, scale])

  return (
    <View
      style={[
        styles.selectorRadio,
        tone === 'open'
          ? styles.selectorRadioOpen
          : tone === 'closed'
            ? styles.selectorRadioClosed
            : styles.selectorRadioNeutral,
      ]}
    >
      <Animated.View
        style={[
          styles.selectorRadioDot,
          tone === 'open'
            ? styles.selectorRadioDotOpen
            : tone === 'closed'
              ? styles.selectorRadioDotClosed
              : styles.selectorRadioDotNeutral,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
    </View>
  )
}

function SimilarSpotCard({ spot }: { spot: Spot }) {
  const router = useRouter()
  const { isBookmarked, toggleBookmark } = useBookmarksStore()
  return <DiscoveryPlaceCard spot={spot} bookmarked={isBookmarked(spot.likeTargetId)} onPress={() => router.push(`/spot/${spot.id}`)} onToggleBookmark={() => toggleBookmark(spot.likeTargetId)} />
}

function getPrimaryAction({
  hasWhatsApp,
  hasPhone,
  hasMenu,
  hasInstagram,
  spot,
  onMap,
}: {
  hasWhatsApp: boolean
  hasPhone: boolean
  hasMenu: boolean
  hasInstagram: boolean
  spot: Spot
  onMap: () => void
}) {
  const isEvent = spot.type === 'event'

  if (hasWhatsApp) {
    return {
      label: isEvent ? 'Saber más' : 'Escribir',
      onPress: () => openWhatsApp(spot.whatsapp),
    }
  }

  if (hasInstagram) {
    return {
      label: isEvent ? 'Saber más' : 'Ver Instagram',
      onPress: () => openInstagram(spot.instagram),
    }
  }

  if (hasPhone) {
    return {
      label: 'Llamar',
      onPress: () => openPhone(spot.phone),
    }
  }

  if (hasMenu) {
    return {
      label: getMenuActionLabel(spot.category, spot.menuUrl) === 'Menu' ? 'Ver menu' : 'Ver website',
      onPress: () => openExternal(spot.menuUrl),
    }
  }

  return {
    label: 'Como llegar',
    onPress: onMap,
  }
}

function getCategoryIcon(category: Spot['category']): keyof typeof Ionicons.glyphMap {
  switch (normalizeSpotCategory(category)) {
    case 'Arte y cultura':
      return 'color-palette-outline'
    case 'Bares y noche':
      return 'wine-outline'
    case 'Cine':
      return 'film-outline'
    case 'Comida':
    case 'Restaurantes':
      return 'restaurant-outline'
    case 'Eventos':
      return 'ticket-outline'
    case 'Deporte y bienestar':
      return 'barbell-outline'
    case 'Familiar':
      return 'people-outline'
    case 'Pet friendly':
      return 'paw-outline'
    case 'Naturaleza y aire libre':
      return 'leaf-outline'
    default:
      return 'sparkles-outline'
  }
}

function getCategoryImage(category: Spot['category']) {
  switch (normalizeSpotCategory(category)) {
    case 'Arte y cultura':
      return exploreArtIcon
    case 'Bares y noche':
      return exploreNightlifeIcon
    case 'Cine':
      return exploreCinemaIcon
    case 'Comida':
    case 'Restaurantes':
      return exploreFoodIcon
    case 'Eventos':
      return exploreEventsIcon
    case 'Deporte y bienestar':
      return exploreSportsIcon
    case 'Familiar':
    case 'Pet friendly':
      return exploreFamilyIcon
    case 'Naturaleza y aire libre':
      return exploreNatureIcon
    default:
      return null
  }
}

async function openExternal(url: string) {
  await Linking.openURL(url)
}

function getGoogleMapsUrl(spot: Spot) {
  if (spot.googleMapsUrl && /^https:\/\//.test(spot.googleMapsUrl)) return spot.googleMapsUrl
  const hasCoordinates = Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude)
  if (!hasCoordinates && !hasValueText(spot.address)) return null
  const query = hasCoordinates
    ? `${spot.latitude},${spot.longitude}`
    : [spot.brandName || spot.name, spot.address, spot.city].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

async function openInstagram(handleOrUrl: string) {
  const url = handleOrUrl.startsWith('http')
    ? handleOrUrl
    : `https://instagram.com/${handleOrUrl.replace(/^@/, '')}`
  await openExternal(url)
}

function getInstagramLabel(value: string) {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      const handle = url.pathname.split('/').filter(Boolean)[0]
      return /(^|\.)instagram\.com$/i.test(url.hostname) && handle ? `@${handle}` : 'Instagram'
    } catch {
      return 'Instagram'
    }
  }
  const handle = value.trim().replace(/^@/, '').split(/[/?#]/)[0]
  return handle ? `@${handle}` : 'Instagram'
}

async function openWhatsApp(phone: string) {
  const value = String(phone ?? '').trim()
  if (/^https?:\/\//i.test(value)) {
    await openExternal(value)
    return
  }
  const digits = value.replace(/\D/g, '')
  if (!digits) return
  const normalizedDigits = digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits
  await openExternal(`https://wa.me/${normalizedDigits}`)
}

async function openPhone(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '')
  await openExternal(`tel:${digits}`)
}

function hasValueLink(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return Boolean(
    normalized &&
      normalized !== 'sin dato' &&
      normalized !== 'sin confirmar' &&
      normalized !== 'no disponible',
  )
}

function hasValueText(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return Boolean(
    normalized &&
      normalized !== 'sin dato' &&
      normalized !== 'sin confirmar' &&
      normalized !== 'no disponible',
  )
}


const styles = StyleSheet.create({
  heroIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIdentityTitle: { flexShrink: 1, minWidth: 0, maxWidth: '100%' },
  heroLogoBadge: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff', backgroundColor: '#fff', overflow: 'hidden' },
  heroLogo: { width: '100%', height: '100%' },
  compactBranchField: { minHeight: 48, borderRadius: 14, backgroundColor: detailUi.surface, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  compactBranchCopy: { flex: 1, minWidth: 0 },
  compactBranchTitle: { fontSize: 14, fontWeight: '600', color: detailUi.text },
  compactBranchStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  compactBranchDot: { width: 5, height: 5, borderRadius: 3 },
  compactBranchMeta: { fontSize: 12, lineHeight: 18, color: detailUi.textSecondary },
  sheetOptionSurface: { borderWidth: 1, borderColor: 'transparent' },
  sheetOptionSelected: { backgroundColor: '#e8e8ee', borderColor: '#b8b8c2' },
  sheetOptionIdleTitle: { fontWeight: '500' },
  branchActionsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  branchActionGlyph: { width: 46, height: 46, borderRadius: 23, backgroundColor: detailUi.surface, alignItems: 'center', justifyContent: 'center' },
  placeSocialSection: { marginTop: 6, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e7e7eb', gap: 12 },
  placeSocialText: { flex: 1 },
  compactInfoGroup: { backgroundColor: detailUi.surface, borderRadius: 18, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 4 },
  compactInfoRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: 12, paddingVertical: 12 },
  compactInfoIcon: { width: 19, alignItems: 'center', justifyContent: 'center' },
  compactInfoValue: { fontSize: 14, lineHeight: 21, color: detailUi.text, fontWeight: '400' },
  compactInfoHint: { fontSize: 12, lineHeight: 18, color: detailUi.textTertiary },
  compactAddress: { fontSize: 14, lineHeight: 20, color: detailUi.text },
  compactTodayLabel: { fontSize: 12, lineHeight: 18, color: detailUi.textTertiary },
  compactScheduleCard: { paddingVertical: 12, minHeight: 52 },
  emptyScreen: {
    flex: 1,
    backgroundColor: detailUi.bg,
  },
  emptyStateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 16,
    lineHeight: 22,
    color: detailUi.textSecondary,
    textAlign: 'center',
  },
  screen: {
    flex: 1,
    backgroundColor: detailUi.bg,
    overflow: 'hidden',
  },
  heroStage: {
    overflow: 'hidden',
    position: 'relative',
    zIndex: 3,
    elevation: 10,
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
  },
  heroGalleryWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f0a10',
  },
  heroGalleryScroll: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGalleryScrollContent: {
    height: '100%',
  },
  heroGalleryTrack: {
    flexDirection: 'row',
    height: '100%',
  },
  heroGalleryPage: {
    height: '100%',
  },
  heroChrome: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 52,
  },
  heroImage: {
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  topActionRow: {
    flexDirection: 'row',
    gap: 10,
    zIndex: 21,
  },
  heroCopy: {
    gap: 8,
  },
  heroBadges: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
    marginBottom: 0,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  heroChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#ffffff',
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '600',
    color: '#ffffff',
    maxWidth: 280,
  },
  heroSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff7fb',
  },
  heroMetaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 4,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    flex: 1,
  },
  heroLocationText: {
    fontSize: 12,
    color: '#fff7fb',
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
  },
  heroIdealForRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
    marginTop: 4,
  },
  heroIdealForLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },
  heroIdealForChips: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroIdealForChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroIdealForChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  galleryDotsWrap: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 70,
    alignItems: 'center',
  },
  galleryDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  galleryDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  galleryDotSlot: {
    width: 24,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryDotShape: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  galleryDotCore: { position: 'absolute', width: 8, height: 8, backgroundColor: '#ffffff' },
  sheet: {
    position: 'relative',
    width: '100%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    backgroundColor: detailUi.bg,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
    zIndex: 1,
  },
  heroHandleArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
    backgroundColor: 'transparent',
    zIndex: 4,
  },
  heroHandle: {
    width: 46,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  sheetTopInset: {
    height: 58,
  },
  placeSheetTopInset: { height: 40 },
  sheetScroll: {
    flex: 1,
  },
  pageScroll: {
    flex: 1,
  },
  pageScrollContent: {
    flexGrow: 1,
  },
  sheetContent: {
    flexGrow: 1,
  },
  panel: {
    backgroundColor: detailUi.bg,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
    gap: 22,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 4,
    paddingBottom: 4,
    borderRadius: 18,
    backgroundColor: detailUi.surfaceMuted,
    width: '100%',
  },
  tabPill: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: detailUi.surface,
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: detailUi.textSecondary,
  },
  tabPillTextActive: {
    color: detailUi.text,
  },
  statsGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  dualStatsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  statCard: {
    borderRadius: 18,
    backgroundColor: detailUi.surface,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    shadowColor: '#000000',
    shadowOpacity: 0,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 0,
  },
  compactStatCard: {
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    flexShrink: 1,
  },
  compactStatCardWide: {
    flex: 1,
  },
  budgetCardPressed: { opacity: 0.72 },
  compactStatCardTight: {
    flexShrink: 0,
    minWidth: 160,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: detailUi.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCopy: {
    flex: 1,
    gap: 3,
  },
  statTrailingIcon: {
    alignSelf: 'center',
  },
  compactStatCopy: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 0,
    minWidth: 0,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: detailUi.textSecondary,
  },
  statValue: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: detailUi.text,
  },
  compactStatValue: {
    textAlign: 'left',
    flexShrink: 1,
    includeFontPadding: false,
    flexWrap: 'nowrap',
  },
  statStatus: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  statStatusOpen: {
    color: '#26834a',
  },
  statStatusClosed: {
    color: '#8b8b94',
  },
  scheduleCard: {
    borderRadius: 18,
    backgroundColor: detailUi.surface,
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
    shadowColor: '#000000',
    shadowOpacity: 0,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 0,
  },
  scheduleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleCardCopy: {
    flex: 1,
    gap: 3,
  },
  scheduleTodayInline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 2,
  },
  scheduleTodayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: detailUi.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  scheduleTodaySeparator: {
    fontSize: 12,
    fontWeight: '600',
    color: detailUi.textSecondary,
  },
  scheduleTodayValueOpen: {
    color: '#26834a',
  },
  scheduleTodayValueClosed: {
    color: '#8b8b94',
  },
  scheduleTodayStatus: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  scheduleTodayStatusOpen: {
    color: '#26834a',
  },
  scheduleTodayStatusClosed: {
    color: '#8b8b94',
  },
  scheduleExpandedList: {
    gap: 0,
    paddingTop: 12,
    paddingLeft: 31,
  },
  scheduleExpandedWrap: {
    overflow: 'hidden',
  },
  scheduleDayRow: {
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  scheduleDayRowToday: {
    borderWidth: 0,
  },
  scheduleDayTextClosed: {
    color: '#9B9BA3',
    fontWeight: '400',
  },
  scheduleDayName: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
    color: '#8b8b94',
  },
  scheduleDayNameToday: {
    color: detailUi.text,
    fontWeight: '500',
  },
  scheduleDayValueWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  scheduleDayValue: {
    textAlign: 'right',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    color: '#8b8b94',
  },
  scheduleDayValueToday: {
    color: detailUi.text,
    fontWeight: '500',
  },
  scheduleDayValueTodayOpen: {
    color: '#26834a',
  },
  scheduleDayValueTodayClosed: {
    color: '#9B9BA3',
    fontWeight: '400',
  },
  section: {
    gap: 16,
  },
  sectionBlock: {
    gap: 12,
  },
  scheduleSectionBlock: {
    marginTop: 0,
  },
  quickInfoSectionBlock: {
    marginTop: 12,
  },
  quickActionsSectionBlock: {
    marginTop: 24,
  },
  similarSectionBlock: {
    marginTop: 0,
  },
  similarRail: {
    marginRight: -20,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e7e7eb',
    marginTop: 0,
    marginBottom: 0,
  },
  sectionEyebrow: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: detailUi.textTertiary,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: detailUi.text,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: detailUi.text,
  },
  placeDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: detailUi.textSecondary,
    marginBottom: 8,
  },
  distanceCard: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: detailUi.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distanceCardText: {
    fontSize: 14,
    fontWeight: '500',
    color: detailUi.text,
  },
  distanceInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  distanceInlineText: {
    fontSize: 14,
    fontWeight: '500',
    color: detailUi.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: detailUi.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: detailUi.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    lineHeight: 22,
    color: detailUi.text,
    fontWeight: '500',
  },
  quickTile: {
    minHeight: 68,
    borderRadius: 18,
    backgroundColor: detailUi.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickTileCopy: {
    flex: 1,
    gap: 2,
  },
  quickTileLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: detailUi.textSecondary,
  },
  quickTileDisabled: {
    opacity: 0.46,
  },
  quickTileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTileIconDisabled: {
    backgroundColor: detailUi.surfaceMuted,
  },
  quickTileText: {
    fontSize: 15,
    fontWeight: '500',
    color: detailUi.text,
  },
  quickTileTextDisabled: {
    color: '#8f818d',
  },
  stack: {
    gap: 12,
  },
  branchSelectorStack: {
    position: 'relative',
  },
  branchSelectorField: {
    minHeight: 62,
    borderRadius: 18,
    backgroundColor: detailUi.surface,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 0,
  },
  branchSelectorFieldActiveOpen: {
    backgroundColor: detailUi.surface,
  },
  branchSelectorFieldActiveClosed: {
    backgroundColor: detailUi.surface,
  },
  branchSelectorFieldCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  branchSelectorStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  branchSelectorFieldTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: detailUi.text,
    flexShrink: 1,
  },
  branchSelectorFieldTitleActiveOpen: {
    color: detailUi.text,
  },
  branchSelectorFieldTitleActiveClosed: {
    color: detailUi.text,
  },
  branchSelectorFieldMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: detailUi.textSecondary,
  },
  branchSelectorFieldMetaActiveOpen: {
    color: detailUi.textSecondary,
  },
  branchSelectorFieldMetaActiveClosed: {
    color: detailUi.textSecondary,
  },
  branchSelectorAction: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    flexShrink: 0,
  },
  branchSelectorActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  branchSelectorActionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: detailUi.textSecondary,
  },
  branchSelectorDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  branchSelectorDotOpen: {
    backgroundColor: '#26834a',
  },
  branchSelectorDotClosed: {
    backgroundColor: '#8b8b94',
  },
  branchSelectorDotNeutral: {
    backgroundColor: '#8b8b94',
  },
  branchContentWrap: {
    position: 'relative',
  },
  branchContentOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 246, 248, 0.62)',
    borderRadius: 24,
  },
  branchContentOverlayCard: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 0,
  },
  branchContentOverlayText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: detailUi.textSecondary,
  },
  branchSelectorCard: {
    borderRadius: 18,
    backgroundColor: detailUi.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  branchSelectorCardActive: {
    backgroundColor: appColors.primaryDark,
  },
  branchSelectorCopy: {
    flex: 1,
    gap: 2,
  },
  branchSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: detailUi.text,
  },
  branchSelectorTitleActive: {
    color: '#ffffff',
  },
  branchSelectorMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: detailUi.textSecondary,
  },
  branchSelectorHelper: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    color: '#8e7e8a',
  },
  branchSelectorMetaActive: {
    color: '#f4dfe9',
  },
  branchSelectorHelperActive: {
    color: '#f8ecf1',
  },
  selectorOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  selectorScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 6, 10, 0.28)',
  },
  selectorSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: detailUi.bg,
    paddingTop: 24,
    paddingHorizontal: 18,
    paddingBottom: 26,
    maxHeight: '70%',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 6,
  },
  selectorHeader: {
    paddingBottom: 4,
  },
  selectorTitle: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: detailUi.textTertiary,
  },
  selectorList: {
    gap: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  selectorOption: {
    minHeight: 62,
    borderRadius: 18,
    backgroundColor: detailUi.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectorOptionCopy: {
    flex: 1,
    gap: 4,
  },
  selectorOptionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: detailUi.text,
  },
  selectorOptionTextOpen: {
    color: detailUi.text,
  },
  selectorOptionTextClosed: {
    color: detailUi.text,
  },
  selectorOptionTextActive: {
    color: detailUi.text,
  },
  selectorOptionMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: detailUi.textSecondary,
  },
  selectorOptionMetaOpen: {
    color: detailUi.textSecondary,
  },
  selectorOptionMetaClosed: {
    color: detailUi.textSecondary,
  },
  selectorRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  selectorRadioOpen: {
    borderColor: '#2f7f58',
  },
  selectorRadioClosed: {
    borderColor: '#b65569',
  },
  selectorRadioNeutral: {
    borderColor: detailUi.textSecondary,
  },
  selectorRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectorRadioDotOpen: {
    backgroundColor: '#2f7f58',
  },
  selectorRadioDotClosed: {
    backgroundColor: '#b65569',
  },
  selectorRadioDotNeutral: {
    backgroundColor: detailUi.textSecondary,
  },
  branchDetailCard: {
    borderRadius: 20,
    backgroundColor: detailUi.surface,
    padding: 16,
    gap: 14,
  },
  branchDetailCopy: {
    gap: 4,
  },
  branchDetailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: detailUi.text,
  },
  branchDetailMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: detailUi.textSecondary,
  },
  branchActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  branchActionButton: {
    minHeight: 74,
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  branchActionText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: detailUi.text,
  },
  branchCard: {
    borderRadius: 18,
    backgroundColor: detailUi.surface,
    padding: 14,
    gap: 5,
  },
  branchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: detailUi.text,
  },
  branchMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: detailUi.textSecondary,
  },
  similarCard: {
    width: 256,
    gap: 12,
  },
  similarImage: {
    height: 188,
    justifyContent: 'space-between',
    borderRadius: 24,
    overflow: 'hidden',
  },
  similarImageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  similarImageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  similarCategoryChip: {
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
  similarCategoryChipImage: {
    width: 24,
    height: 24,
  },
  similarBody: {
    paddingHorizontal: 4,
    paddingBottom: 4,
    gap: 8,
  },
  similarFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  similarTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '500',
    color: detailUi.text,
  },
  similarMetaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  similarMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
  },
  similarMetaGroupWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  similarMetaText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
    color: detailUi.textSecondary,
  },
  similarImageStyle: {
    resizeMode: 'cover',
    borderRadius: 24,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,10,12,0.22)',
  },
  similarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,10,12,0.28)',
  },
  emptyState: {
    fontSize: 15,
    color: detailUi.textSecondary,
  },
  similarScrollContent: {
    gap: 14,
    paddingRight: 20,
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 24,
    backgroundColor: detailUi.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#130914',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  bottomPriceWrap: {
    minWidth: 82,
    gap: 2,
  },
  bottomPriceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: detailUi.textSecondary,
  },
  bottomPriceValue: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '600',
    color: detailUi.text,
  },
})
