export type SpotType = 'place' | 'event'

export type Spot = {
  id: string
  spotId: number
  branchId: number | null
  placeSlug: string
  branchSlug: string
  feedPriorityRank: number
  manuallyAdjusted: boolean
  editorialBadge?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  likeTargetId: string
  type: SpotType
  name: string
  brandName: string
  branchName: string
  neighborhood: string
  hubName: string
  category: string
  city: string
  likes: string
  image: string
  galleryImages: string[]
  shortDescription: string
  description: string
  interests: string[]
  maxPeople: number
  days: string[]
  distanceKm: number
  minBudget: number
  maxBudget: number
  hours: string
  address: string
  instagram: string
  whatsapp: string
  phone: string
  menuUrl: string
  tags: string[]
  moods: string[]
  latitude?: number
  longitude?: number
  branches?: Spot[]
  branchCount?: number
}

const emptySpots: Spot[] = []

function toFiniteBudget(value: number | undefined, fallback: number | undefined) {
  if (Number.isFinite(value)) {
    return value as number
  }

  if (Number.isFinite(fallback)) {
    return fallback as number
  }

  return 0
}

export function normalizeCommercialCenterLabel(value: string) {
  const cleaned = value
    .replace(/\bCentro Comercial\b/gi, '')
    .replace(/\bParque Comercial\b/gi, '')
    .replace(/\bC\.?\s*C\.?\b/gi, '')
    .replace(/\bMall\b/gi, '')
    .replace(/\bCali\b/gi, '')
    .replace(/[()]/g, ' ')
    .replace(/^[.\-–,:;\s]+/, '')
    .replace(/[.\-–,:;\s]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const normalized = cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (normalized === 'unicentro') {
    return 'Unicentro'
  }

  if (normalized === 'mallplaza') {
    return 'Mallplaza'
  }

  if (normalized === 'pacific' || normalized === 'pacific center' || normalized === 'pacific mall') {
    return 'Pacific Center'
  }

  if (normalized === 'palmas' || normalized === 'palmas mall') {
    return 'Palmas Mall'
  }

  if (normalized === 'carulla pance' || normalized === 'carulla') {
    return 'Carulla Pance'
  }

  if (
    normalized === 'canaveral' ||
    normalized === 'canaveral pance' ||
    normalized === 'cañaveral' ||
    normalized === 'cañaveral pance'
  ) {
    return 'Cañaveral Pance'
  }

  if (normalized === 'lago verde') {
    return 'Lago Verde'
  }

  if (normalized === 'marbella plaza') {
    return 'Marbella Plaza'
  }

  if (normalized === 'alto pance') {
    return 'Alto Pance'
  }

  if (normalized === 'mall la maria' || normalized === 'la maria') {
    return 'Mall La María'
  }

  if (normalized === 'lyrata') {
    return 'Lyrata'
  }

  if (normalized === 'rio') {
    return 'Río'
  }

  if (normalized === 'campanella plaza') {
    return 'Campanella Plaza'
  }

  if (normalized === 'verde arena') {
    return 'Verde Arena'
  }

  if (normalized === 'las velas') {
    return 'Las Velas'
  }

  if (normalized === 'el lago') {
    return 'El Lago'
  }

  if (normalized === 'giardino mall') {
    return 'Giardino Mall'
  }

  if (normalized === 'plaza armonia' || normalized === 'plaza armonía') {
    return 'Plaza Armonía'
  }

  if (normalized === 'solaz' || normalized === 'solaz plaza') {
    return 'Solaz Plaza'
  }

  if (normalized === 'casa del rio' || normalized === 'casa del río') {
    return 'Casa del Río'
  }

  if (normalized === 'natura plaza') {
    return 'Natura Plaza'
  }

  return cleaned
}

export function getSpotByIdFromList(spots: Spot[], id: string) {
  return spots.find((spot) => spot.id === id)
}

export function getSpotsByTypeFromList(spots: Spot[], type: SpotType) {
  return spots.filter((spot) => spot.type === type)
}

export function getBranchDisplayName(
  spot: Pick<Spot, 'branchName' | 'neighborhood'>,
  preferNeighborhood = false,
) {
  if (preferNeighborhood && spot.neighborhood) {
    return spot.neighborhood
  }

  return spot.branchName || spot.neighborhood
}

function hasDuplicateHubName(
  spot: Pick<Spot, 'hubName'>,
  siblingBranches?: Array<Pick<Spot, 'hubName' | 'neighborhood' | 'branchName'>>,
) {
  if (!spot.hubName || !siblingBranches?.length) {
    return false
  }

  const normalizedHub = spot.hubName.trim().toLowerCase()
  return (
    siblingBranches.filter((branch) => branch.hubName.trim().toLowerCase() === normalizedHub).length > 1
  )
}

export function getBranchLocationLabel(
  spot: Pick<Spot, 'branchName' | 'neighborhood' | 'hubName'>,
  siblingBranches?: Array<Pick<Spot, 'branchName' | 'neighborhood' | 'hubName'>>,
) {
  if (spot.hubName) {
    const displayHubName = normalizeCommercialCenterLabel(spot.hubName)

    if (hasDuplicateHubName(spot, siblingBranches) && spot.neighborhood) {
      return `${displayHubName} · ${spot.neighborhood}`
    }

    return displayHubName
  }

  return getBranchDisplayName(spot)
}

export function getSpotFeedSubtitle(spot: Spot) {
  if (spot.type === 'event') {
    return `${spot.brandName} · ${getBranchLocationLabel(spot)}`
  }

  if (spot.branches && spot.branches.length > 1) {
    return `${spot.branches.length} sedes`
  }

  return getBranchLocationLabel(spot)
}

export function aggregatePlaceSpotsFromList(spots: Spot[]) {
  const places = spots.filter((spot) => spot.type === 'place')
  const groups = new Map<string, Spot[]>()

  places.forEach((spot) => {
    const key = spot.brandName.trim().toLowerCase()
    const group = groups.get(key)
    if (group) {
      group.push(spot)
    } else {
      groups.set(key, [spot])
    }
  })

  return Array.from(groups.values()).map((branches) => aggregatePlaceBranches(branches))
}

export function aggregatePlaceBranches(branches: Spot[]) {
  const primary = branches[0]
  if (!primary) {
    throw new Error('No hay sedes para agregar')
  }

  const branchWithCoordinates = branches.find(
    (branch) => typeof branch.latitude === 'number' && typeof branch.longitude === 'number',
  )

  const uniqueInterests = Array.from(new Set(branches.flatMap((branch) => branch.interests)))
  const uniqueDays = Array.from(new Set(branches.flatMap((branch) => branch.days)))
  const uniqueTags = Array.from(new Set(branches.flatMap((branch) => branch.tags)))
  const uniqueMoods = Array.from(new Set(branches.flatMap((branch) => branch.moods)))
  const branchMinBudgets = branches.map((branch) => toFiniteBudget(branch.minBudget, 0))
  const branchMaxBudgets = branches.map((branch) =>
    toFiniteBudget(branch.maxBudget, toFiniteBudget(branch.minBudget, 0)),
  )
  const uniqueGalleryImages = Array.from(
    new Set(
      branches.flatMap((branch) =>
        branch.galleryImages && branch.galleryImages.length > 0
          ? branch.galleryImages
          : [branch.image],
      ),
    ),
  )

  return {
    ...primary,
    branchId: null,
    name: primary.brandName,
    manuallyAdjusted: branches.some((branch) => branch.manuallyAdjusted),
    likes: String(branches.reduce((sum, branch) => sum + parseLikes(branch.likes), 0)),
    galleryImages: uniqueGalleryImages,
    shortDescription: primary.shortDescription,
    description: primary.description,
    interests: uniqueInterests,
    maxPeople: Math.max(...branches.map((branch) => branch.maxPeople)),
    days: uniqueDays,
    distanceKm: Math.min(...branches.map((branch) => branch.distanceKm)),
    minBudget: Math.min(...branchMinBudgets),
    maxBudget: Math.max(...branchMaxBudgets),
    instagram: branches.find((branch) => branch.instagram)?.instagram ?? '',
    whatsapp: branches.find((branch) => branch.whatsapp)?.whatsapp ?? '',
    phone: branches.find((branch) => branch.phone)?.phone ?? '',
    menuUrl: branches.find((branch) => branch.menuUrl)?.menuUrl ?? '',
    tags: uniqueTags,
    moods: uniqueMoods,
    latitude: branchWithCoordinates?.latitude,
    longitude: branchWithCoordinates?.longitude,
    branches,
    branchCount: branches.length,
  } satisfies Spot
}

export function getSimilarSpotsFromList(spots: Spot[], current: Spot) {
  return spots
    .filter((spot) => spot.id !== current.id && spot.type === current.type)
    .filter((spot) => spot.category === current.category || spot.neighborhood === current.neighborhood)
    .slice(0, 6)
}

export function getOtherBranchesFromList(spots: Spot[], current: Spot) {
  return spots.filter(
    (spot) =>
      spot.id !== current.id &&
      spot.brandName.toLowerCase() === current.brandName.toLowerCase(),
  )
}

export function getBrandBranchesFromList(spots: Spot[], current: Spot) {
  return spots.filter(
    (spot) =>
      spot.type === 'place' &&
      spot.brandName.trim().toLowerCase() === current.brandName.trim().toLowerCase(),
  )
}

export function getSpotById(id: string) {
  return getSpotByIdFromList(emptySpots, id)
}

export function getSpotsByType(type: SpotType) {
  return getSpotsByTypeFromList(emptySpots, type)
}

export function getSimilarSpots(current: Spot) {
  return getSimilarSpotsFromList(emptySpots, current)
}

export function getOtherBranches(current: Spot) {
  return getOtherBranchesFromList(emptySpots, current)
}

function parseLikes(value: string) {
  const normalized = value.trim().toUpperCase()
  if (normalized.endsWith('K')) {
    return Math.round(Number(normalized.replace('K', '')) * 1000)
  }

  return Number(normalized) || 0
}
