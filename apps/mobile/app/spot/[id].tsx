import { DiscoveryPlaceCard } from '@/components/discovery-place-card'
import { SharePlaceButton } from '@/components/share-place-button'
import { getCategoryLabel } from '@/lib/category-icons';
import { useEffect, useMemo, useRef, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Entrance } from '@/components/entrance'
import { accountUi } from '@/lib/account-ui'
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
import { AppBookmarkButton, AppIconButton, AppLikeButton, AppPrimaryButton, appColors, spotsUi } from '@/components/app-ui'
import { useBookmarksStore } from '@/lib/bookmarks-store'
import { formatApproxBudgetPerPersonLabel, getEffectiveSpotDistanceKm } from '@/lib/explore-filters'
import { formatLikesCount, useLikesStore } from '@/lib/likes-store'
import { useLocationStore } from '@/lib/location-store'
import { useRelayoutSubscription } from '@/lib/relayout'
import {
  getOpenStatusFromSchedule,
  getScheduleDayRows,
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

function getPriceLabel(spot: Spot) {
  return formatApproxBudgetPerPersonLabel(spot.minBudget, spot.maxBudget).replace(' COP', '')
}

function getMenuActionLabel(category: Spot['category']) {
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

function getOpenStatus(schedule: string) {
  return getOpenStatusFromSchedule(schedule)
}

export default function SpotDetailScreen() {
  useRelayoutSubscription()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const { id, branch } = useLocalSearchParams<{ id: string; branch?: string }>()
  const { spots, loading } = useSpotsStore()
  const { getLikesCount, isLiked, toggleLike } = useLikesStore()
  const { isBookmarked, toggleBookmark } = useBookmarksStore()
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
    getSpotByIdFromList(spots, id ?? '1') ?? getSpotByIdFromList(spots, spots[0]?.id ?? '1')
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
        duration: 180,
        useNativeDriver: false,
      }).start()
      return
    }

    if (!scheduleContentMounted) {
      return
    }

    Animated.timing(scheduleExpandProgress, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start(() => {
      setScheduleContentMounted(false)
    })
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
      const scheduleStatus = multiBranchPlace ? null : getOpenStatus(contextSpot.hours)

      return [
        {
          icon: 'people-outline',
          label: 'Personas',
          value: `1 - ${contextSpot.maxPeople}`,
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
    !isEvent && resolvedContextSpot ? getOpenStatus(resolvedContextSpot.hours) : null
  const hasSelectedBranchStatus = Boolean(selectedBranchOpenStatus)
  const todayScheduleLabel = resolvedContextSpot ? getTodayScheduleLabel(resolvedContextSpot.hours) : ''
  const weeklyScheduleRows = resolvedContextSpot ? getScheduleDayRows(resolvedContextSpot.hours) : []

  const likeCount = detailSpot ? getLikesCount(detailSpot.likeTargetId) : 0
  const liked = detailSpot ? isLiked(detailSpot.likeTargetId) : false
  const bookmarked = detailSpot ? isBookmarked(detailSpot.likeTargetId) : false
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
  const hasWhatsApp = resolvedContextSpot ? hasValueLink(resolvedContextSpot.whatsapp) : false
  const hasPhone = resolvedContextSpot ? hasValueText(resolvedContextSpot.phone) : false
  const showMenu = hasMenu && resolvedContextSpot?.category !== 'Eventos'
  const menuActionLabel = resolvedContextSpot ? getMenuActionLabel(resolvedContextSpot.category) : 'Menu'
  const primaryAction = getPrimaryAction({
    hasWhatsApp,
    hasPhone,
    hasMenu: showMenu,
    hasInstagram,
    spot: resolvedContextSpot ?? spot ?? emptySpotForActions,
  })
  const categoryIcon = getCategoryIcon(detailSpot?.category ?? 'Comida')
  const baseHeroHeight = 382
  const heroPanelOverlap = 28
  const sheetMaxOffset = Math.max(1, windowHeight - baseHeroHeight)
  const panelCompressionFactor = 1
  const baseHeroHeightValue = useRef(new Animated.Value(baseHeroHeight)).current
  const baseSheetTopValue = useRef(new Animated.Value(baseHeroHeight - heroPanelOverlap)).current
  const sheetTranslateY = useRef(new Animated.Value(0)).current
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
  const upwardScrollDistance = useRef(0)
  const scrollCollapseTriggered = useRef(false)
  const sheetAnimating = useRef(false)
  const [infoScrollLocked, setInfoScrollLocked] = useState(false)
  const infoScrollRef = useRef<ScrollView>(null)
  const scrollSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingScrollTarget = useRef<number | null>(null)
  const scrollLayoutSettledAt = useRef(0)
  useEffect(() => () => {
    if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current)
  }, [])
  const collapseDistance = Math.max(0, baseHeroHeight - heroPanelOverlap - (insets.top + 72))
  const effectiveSheetOffset = sheetTranslateY.interpolate({
    inputRange: [-collapseDistance, 0, sheetMaxOffset],
    outputRange: [-collapseDistance, 0, sheetMaxOffset],
    extrapolate: 'clamp',
  })
  const heroAnimatedHeight = Animated.add(effectiveSheetOffset, baseHeroHeightValue)
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
  const sheetAnimatedTop = Animated.add(
    baseSheetTopValue,
    effectiveSheetOffset.interpolate({
      inputRange: [-collapseDistance, 0, sheetMaxOffset],
      outputRange: [-collapseDistance, 0, sheetMaxOffset * panelCompressionFactor],
    }),
  )
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
  const heroGalleryOpacity = sheetTranslateY.interpolate({
    inputRange: [sheetMaxOffset * 0.28, sheetMaxOffset * 0.62, sheetMaxOffset],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  })
  const heroImageOpacity = sheetTranslateY.interpolate({
    inputRange: [sheetMaxOffset * 0.4, sheetMaxOffset],
    outputRange: [1, 0.08],
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

  function snapSheet(toValue: number, fromScroll = false) {
    pendingScrollTarget.current = null
    if (scrollSettleTimer.current) {
      clearTimeout(scrollSettleTimer.current)
      scrollSettleTimer.current = null
    }
    upwardScrollDistance.current = 0
    scrollCollapseTriggered.current = toValue < 0
    sheetAnimating.current = true
    setInfoScrollLocked(true)
    infoScrollRef.current?.scrollTo({ y: infoScrollY.current, animated: false })
    const animation = fromScroll ? Animated.timing(sheetTranslateY, {
      toValue,
      duration: 550,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }) : Animated.spring(sheetTranslateY, {
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
        setInfoScrollLocked(false)
        scrollLayoutSettledAt.current = Date.now() + 180
      }
    })
  }

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > 3,
        onPanResponderGrant: () => {
          if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current)
          sheetTranslateY.stopAnimation((value) => {
            sheetAnimating.current = false
            setInfoScrollLocked(false)
            sheetOffsetRef.current = typeof value === 'number' ? value : 0
          })
        },
        onPanResponderMove: (_, gestureState) => {
          const nextValue = clamp(sheetOffsetRef.current + gestureState.dy, -collapseDistance, sheetMaxOffset)
          sheetTranslateY.setValue(nextValue)
        },
        onPanResponderRelease: (_, gestureState) => {
          const currentValue = clamp(sheetOffsetRef.current + gestureState.dy, -collapseDistance, sheetMaxOffset)
          const startedInGallery = sheetOffsetRef.current >= sheetMaxOffset * 0.8
          if (startedInGallery && (gestureState.dy <= -14 || (gestureState.dy < -3 && gestureState.vy < -0.25))) {
            snapSheet(0)
            return
          }
          // A short downward gesture restores the cover instead of requiring a full drag.
          const startedCollapsed = collapseDistance > 0 && sheetOffsetRef.current <= -collapseDistance * 0.8
          if (startedCollapsed && (gestureState.dy >= 14 || (gestureState.dy > 3 && gestureState.vy > 0.25))) {
            snapSheet(0)
            return
          }
          if (gestureState.vy < -0.6 || currentValue < -collapseDistance * 0.5) {
            snapSheet(-collapseDistance)
            return
          }
          if (gestureState.vy > 0.6 || currentValue > sheetMaxOffset * 0.5) {
            snapSheet(sheetMaxOffset)
            return
          }

          snapSheet(0)
        },
        onPanResponderTerminate: () => {
          snapSheet(sheetOffsetRef.current > sheetMaxOffset * 0.5 ? sheetMaxOffset : 0)
        },
      }),
    [sheetMaxOffset, sheetTranslateY, collapseDistance],
  )

  const galleryPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !sheetAnimating.current,
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
      <Animated.View
        style={[
          styles.heroStage,
          {
            height: heroAnimatedHeight,
            borderBottomLeftRadius: galleryCornerRadius,
            borderBottomRightRadius: galleryCornerRadius,
            opacity: heroIntroOpacity,
            transform: [{ translateY: heroIntroTranslateY }],
          },
        ]}
      >
        <Animated.View style={[styles.heroBaseWrap, { opacity: heroImageOpacity }]}>
          <ImageBackground
            source={{ uri: detailSpot.image }}
            style={styles.heroBaseImage}
            imageStyle={styles.heroImage}
          />
          <View pointerEvents="none" style={styles.heroOverlay} />
          <View pointerEvents="none" style={styles.heroBottomShadow} />
        </Animated.View>

        <Animated.View
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width
            if (nextWidth > 0 && nextWidth !== galleryViewportWidth) {
              setGalleryViewportWidth(nextWidth)
            }
          }}
          {...galleryPanResponder.panHandlers}
          style={[
            styles.heroGalleryWrap,
            { opacity: heroGalleryOpacity },
            Platform.OS === 'web'
              ? ({
                  touchAction: 'pan-y',
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
              <ImageBackground
                key={`${imageUrl}-${index}`}
                source={{ uri: imageUrl }}
                style={[styles.heroGalleryPage, { width: galleryViewportWidth }]}
                imageStyle={styles.heroImage}
              />
            ))}
          </Animated.View>
        </Animated.View>

        <View pointerEvents="box-none" style={styles.heroChrome}>
          <Animated.View
            pointerEvents={galleryHeaderHidden ? 'auto' : 'none'}
            accessibilityElementsHidden={!galleryHeaderHidden}
            importantForAccessibility={galleryHeaderHidden ? 'auto' : 'no-hide-descendants'}
            aria-hidden={!galleryHeaderHidden}
            style={{ position: 'absolute', top: insets.top + 16, left: 18, zIndex: 5, opacity: sheetTranslateY.interpolate({ inputRange: [sheetMaxOffset * 0.8, sheetMaxOffset], outputRange: [0, 1], extrapolate: 'clamp' }) }}
          >
            <AppIconButton name="arrow-back" tone="light" accessibilityLabel="Cerrar galería y volver al lugar" onPress={() => snapSheet(0)} />
          </Animated.View>
          <Animated.View
            pointerEvents={galleryHeaderHidden ? 'none' : 'auto'}
            accessibilityElementsHidden={galleryHeaderHidden}
            importantForAccessibility={galleryHeaderHidden ? 'no-hide-descendants' : 'auto'}
            aria-hidden={galleryHeaderHidden}
            style={[styles.topActions, { paddingTop: insets.top + 16, opacity: galleryHeaderOpacity, transform: [{ translateY: galleryHeaderTranslate }] }]}
          >
            <AppIconButton
              name="arrow-back"
              tone="light"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back()
                  return
                }

                router.replace('/(tabs)/explore')
              }}
            />
            <View style={styles.topActionRow}>
              <AppLikeButton
                liked={liked}
                tone="light"
                activeColor={detailUi.accent}
                onPress={() => toggleLike(detailSpot.likeTargetId)}
              />
              <AppBookmarkButton
                bookmarked={bookmarked}
                tone="light"
                activeColor={detailUi.text}
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
              <View style={styles.heroChip}>
                <CategoryIcon
                  category={detailSpot.category}
                  size={12}
                  color="#ffffff"
                />
                <Text style={styles.heroChipText}>{getCategoryLabel(detailSpot.category)}</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{isEvent ? detailSpot.name : detailSpot.brandName}</Text>
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
                      {`1 sede: ${getBranchLocationLabel(detailSpot)}`}
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

      <Animated.View
        style={[
          styles.sheet,
          {
            opacity: sheetIntroOpacity,
            top: Animated.subtract(sheetAnimatedTop, 32),
            transform: [{ translateY: sheetIntroTranslateY }],
          },
        ]}
      >
        <View style={styles.sheetTopInset} />
        <ScrollView
          ref={infoScrollRef}
          scrollEnabled={!infoScrollLocked}
          style={[styles.sheetScroll, Platform.OS === 'web' ? ({ overflowAnchor: 'none', overscrollBehavior: 'none' } as never) : null]}
          bounces={false}
          overScrollMode="never"
          scrollEventThrottle={16}
          onScroll={event => {
            const y = Math.max(0, event.nativeEvent.contentOffset.y)
            const delta = y - infoScrollY.current
            infoScrollY.current = y
            if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current)
            if (sheetAnimating.current) return
            if (y <= 1 && delta < 0 && sheetOffsetRef.current < -1) {
              snapSheet(0, true)
              return
            }
            const { contentSize, layoutMeasurement } = event.nativeEvent
            const maxScrollY = Math.max(0, contentSize.height - layoutMeasurement.height)
            if (maxScrollY > 1 && y >= maxScrollY - 1 && delta > 0 && !scrollCollapseTriggered.current && Math.abs(sheetOffsetRef.current) <= 1) {
              snapSheet(-collapseDistance, true)
              return
            }
            if (Date.now() < scrollLayoutSettledAt.current) return
            if (delta < -4) upwardScrollDistance.current = 0
            else if (delta > 0) upwardScrollDistance.current += delta
            const collapseCover = !scrollCollapseTriggered.current && Math.abs(sheetOffsetRef.current) <= 1 && upwardScrollDistance.current >= 32
            if (collapseCover) pendingScrollTarget.current = -collapseDistance
            if (pendingScrollTarget.current === null) return
            // Wait for wheel/touch momentum to settle before resizing the scroll viewport.
            scrollSettleTimer.current = setTimeout(() => {
              scrollSettleTimer.current = null
              const target = pendingScrollTarget.current
              if (!sheetAnimating.current && target !== null) snapSheet(target, true)
            }, 100)
          }}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
          contentContainerStyle={[
            styles.sheetContent,
            {
              paddingBottom: insets.bottom,
              flexGrow: 1,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.panel}>
            <View style={styles.section}>
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
                      style={[
                        styles.branchSelectorField,
                        selectedBranch &&
                          hasSelectedBranchStatus &&
                          (selectedBranchOpenStatus?.tone === 'open'
                            ? styles.branchSelectorFieldActiveOpen
                            : styles.branchSelectorFieldActiveClosed),
                      ]}
                    >
                      <View style={styles.branchSelectorFieldCopy}>
                        <Text
                          style={[
                            styles.branchSelectorFieldTitle,
                            selectedBranch &&
                              hasSelectedBranchStatus &&
                              (selectedBranchOpenStatus?.tone === 'open'
                                ? styles.branchSelectorFieldTitleActiveOpen
                                : styles.branchSelectorFieldTitleActiveClosed),
                          ]}
                        >
                          {selectedBranch ? getBranchSelectorTitle(selectedBranch, otherBranches) : 'Escoge una sede'}
                        </Text>
                        {selectedBranch && selectedBranchOpenStatus?.label ? (
                          <View style={styles.branchSelectorStatusRow}>
                            <View
                              style={[
                                styles.branchSelectorDot,
                                selectedBranchOpenStatus?.tone === 'open'
                                  ? styles.branchSelectorDotOpen
                                  : styles.branchSelectorDotClosed,
                              ]}
                            />
                            <Text
                              style={[
                                styles.branchSelectorFieldMeta,
                                selectedBranch &&
                                  hasSelectedBranchStatus &&
                                  (selectedBranchOpenStatus?.tone === 'open'
                                    ? styles.branchSelectorFieldMetaActiveOpen
                                    : styles.branchSelectorFieldMetaActiveClosed),
                              ]}
                            >
                              {selectedBranchOpenStatus.label}
                            </Text>
                          </View>
                        ) : selectedBranch ? (
                          <Text style={styles.branchSelectorFieldMeta}>Horario por confirmar</Text>
                        ) : null}
                      </View>
                      {canSelectBranch ? (
                        <View style={styles.branchSelectorAction}>
                          <View style={styles.branchSelectorActionRow}>
                            <Text style={styles.branchSelectorActionText}>
                              {'Cambiar sede'}
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color={detailUi.textSecondary} />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.branchSelectorAction}>
                          <Text style={styles.branchSelectorActionText}>Sede única</Text>
                        </View>
                      )}
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
                    <View style={styles.sectionBlock}>
                      <Text style={styles.bodyText}>{resolvedContextSpot.description}</Text>
                    </View>

                    <View style={[styles.sectionBlock, styles.scheduleSectionBlock]}>
                      <Text style={styles.sectionEyebrow}>Información</Text>
                      <Pressable
                        onPress={() => setScheduleExpanded((current) => !current)}
                        style={styles.scheduleCard}
                      >
                        <View style={styles.scheduleCardHeader}>
                          <View style={styles.statIconWrap}>
                            <Ionicons name="time-outline" size={18} color={detailUi.text} />
                          </View>
                          <View style={styles.scheduleCardCopy}>
                            <View style={styles.scheduleTodayInline}>
                              <Text style={styles.scheduleTodayLabel}>Hoy</Text>
                              <Text style={styles.scheduleTodaySeparator}>·</Text>
                              <Text
                                style={[
                                  styles.statValue,
                                  selectedBranchOpenStatus?.tone === 'open' &&
                                    styles.scheduleTodayValueOpen,
                                  selectedBranchOpenStatus?.tone === 'closed' &&
                                    styles.scheduleTodayValueClosed,
                                ]}
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
                                    row.isToday && selectedBranchOpenStatus?.tone === 'open' && styles.scheduleDayRowOpen,
                                    row.isToday && selectedBranchOpenStatus?.tone === 'closed' && styles.scheduleDayRowClosed,
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
                    </View>

                  <View style={[styles.sectionBlock, styles.quickInfoSectionBlock]}>
                    {hasValueText(resolvedContextSpot.address) ? (
                      <Pressable
                        onPress={() => openInMaps(resolvedContextSpot.address)}
                        style={styles.statCard}
                      >
                        <View style={styles.statIconWrap}>
                          <Ionicons name="location-outline" size={18} color={detailUi.text} />
                        </View>
                        <View style={styles.statCopy}>
                          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.statValue}>
                            {normalizeCommercialCenterLabel(resolvedContextSpot.address)}
                          </Text>
                          <Text style={styles.statLabel}>
                            {selectedBranchDistance !== null
                              ? `A ${formatDistance(selectedBranchDistance)} km de ti`
                              : 'Abrir ubicación'}
                          </Text>
                        </View>
                        <Ionicons
                          name="open-outline"
                          size={18}
                          color={detailUi.textSecondary}
                          style={styles.statTrailingIcon}
                        />
                      </Pressable>
                    ) : null}
                    <View style={styles.dualStatsRow}>
                      <View style={[styles.statCard, styles.compactStatCard, styles.compactStatCardWide]}>
                        <View style={styles.statIconWrap}>
                          <Ionicons name="wallet-outline" size={18} color={detailUi.text} />
                        </View>
                        <View style={[styles.statCopy, styles.compactStatCopy]}>
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={[styles.statValue, styles.compactStatValue]}
                          >
                            {getPriceLabel(resolvedContextSpot)}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.statCard, styles.compactStatCard, styles.compactStatCardTight]}>
                        <View style={styles.statIconWrap}>
                          <Ionicons name="people-outline" size={18} color={detailUi.text} />
                        </View>
                        <View style={[styles.statCopy, styles.compactStatCopy]}>
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={[styles.statValue, styles.compactStatValue]}
                          >
                            {`1-${resolvedContextSpot.maxPeople} personas`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                    {showMenu || hasWhatsApp || hasPhone || hasInstagram ? (
                      <View style={[styles.sectionBlock, styles.quickActionsSectionBlock]}>
                        <Text style={styles.sectionEyebrow}>Acciones rápidas</Text>
                        <View style={styles.branchActionRow}>
                          {showMenu ? (
                            <BranchActionButton
                              icon={menuActionLabel === 'Website' ? 'globe-outline' : 'book-outline'}
                              label={menuActionLabel}
                              onPress={() => openExternal(resolvedContextSpot.menuUrl)}
                            />
                          ) : null}
                          {hasWhatsApp ? (
                            <BranchActionButton
                              icon="logo-whatsapp"
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
                          {hasInstagram ? (
                            <BranchActionButton
                              icon="logo-instagram"
                              label="Instagram"
                              onPress={() => openInstagram(resolvedContextSpot.instagram)}
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
              <View style={[styles.sectionBlock, styles.similarSectionBlock]}>
                <Text style={styles.sectionEyebrow}>Lugares similares</Text>
                {similarSpots.length ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
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
        </ScrollView>
      </Animated.View>

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
                  const branchStatus = getOpenStatus(branch.hours)
                  const openTone = branchStatus?.tone
                  return (
                    <Pressable
                      key={branch.id}
                      onPress={() => {
                        setSelectedBranchId(branch.id)
                        setBranchPickerOpen(false)
                      }}
                      style={styles.selectorOption}
                    >
                      <View style={styles.selectorOptionCopy}>
                        <Text
                          style={[
                            styles.selectorOptionText,
                            openTone === 'open'
                              ? styles.selectorOptionTextOpen
                              : openTone === 'closed'
                                ? styles.selectorOptionTextClosed
                                : null,
                          ]}
                        >
                          {getBranchSelectorTitle(branch, otherBranches)}
                        </Text>
                        {branchStatus?.label ? (
                          <View style={styles.selectorOptionStatusRow}>
                            <View
                              style={[
                                styles.branchSelectorDot,
                                openTone === 'open'
                                  ? styles.branchSelectorDotOpen
                                  : openTone === 'closed'
                                    ? styles.branchSelectorDotClosed
                                    : styles.branchSelectorDotNeutral,
                              ]}
                            />
                            <Text
                              style={[
                                styles.selectorOptionMeta,
                                openTone === 'open'
                                  ? styles.selectorOptionMetaOpen
                                  : openTone === 'closed'
                                    ? styles.selectorOptionMetaClosed
                                    : null,
                              ]}
                            >
                              {branchStatus.label}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <SelectorRadio active={active} tone={openTone} />
                    </Pressable>
                  )
                })}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      ) : null}

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
    <Pressable onPress={onPress} style={styles.branchActionButton}>
      <Ionicons name={icon} size={16} color={detailUi.text} />
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
}: {
  hasWhatsApp: boolean
  hasPhone: boolean
  hasMenu: boolean
  hasInstagram: boolean
  spot: Spot
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
      label: getMenuActionLabel(spot.category) === 'Menu' ? 'Ver menu' : 'Ver website',
      onPress: () => openExternal(spot.menuUrl),
    }
  }

  return {
    label: 'Como llegar',
    onPress: () => openInMaps(spot.address),
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

async function openInstagram(handleOrUrl: string) {
  const url = handleOrUrl.startsWith('http')
    ? handleOrUrl
    : `https://instagram.com/${handleOrUrl.replace(/^@/, '')}`
  await openExternal(url)
}

async function openWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, '')
  await openExternal(`https://wa.me/${digits}`)
}

async function openPhone(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '')
  await openExternal(`tel:${digits}`)
}

async function openInMaps(address: string) {
  await openExternal(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
  )
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
  heroBaseWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  heroBaseImage: {
    width: '100%',
    height: '100%',
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
    backgroundColor: 'rgba(12,9,13,0.2)',
  },
  heroBottomShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 0,
    backgroundColor: 'transparent',
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroCopy: {
    gap: 8,
  },
  heroBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
    height: 74,
  },
  sheetScroll: {
    flex: 1,
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
    gap: 8,
    paddingTop: 2,
  },
  scheduleExpandedWrap: {
    overflow: 'hidden',
  },
  scheduleDayRow: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f6f6f8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  scheduleDayRowToday: {
    backgroundColor: '#dfe0e6',
  },
  scheduleDayRowOpen: {
    backgroundColor: '#E2F2E6',
  },
  scheduleDayRowClosed: {
    backgroundColor: '#FAFAFB',
  },
  scheduleDayTextClosed: {
    color: '#9B9BA3',
    fontWeight: '400',
  },
  scheduleDayName: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 14,
    lineHeight: 18,
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
    marginTop: 32,
  },
  quickInfoSectionBlock: {
    marginTop: 12,
  },
  quickActionsSectionBlock: {
    marginTop: 32,
  },
  similarSectionBlock: {
    marginTop: 0,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e7e7eb',
    marginTop: 0,
    marginBottom: 0,
  },
  sectionEyebrow: {
    fontSize: 11,
    lineHeight: 16,
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
    paddingTop: 12,
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
    paddingBottom: 8,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: detailUi.text,
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
    flexWrap: 'wrap',
    gap: 10,
  },
  branchActionButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: detailUi.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  branchActionText: {
    fontSize: 13,
    fontWeight: '500',
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
    paddingRight: 4,
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
