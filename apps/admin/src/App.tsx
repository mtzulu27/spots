import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import './App.css'
import type {
  AdminHolidayMode,
  AdminScheduleException,
  AdminSpot,
  AdminType,
  AdminWeeklyHour,
} from './seed-spots'
import {
  backendEnabled,
  deleteBranch,
  deleteSpot,
  fetchRemoteSpots,
  supabase,
  upsertEventSpot,
  upsertPlaceGroup,
} from './supabase'
import spotsLogoPng from '../../mobile/assets/logo_spots_rojo.png'
import angleLeftIcon from './assets/admin-angle-left.svg'
import diskIcon from './assets/admin-disk.svg'
import refreshIcon from './assets/admin-refresh.svg'
import trashIcon from './assets/admin-trash.svg'

type StatusFilter = 'all' | 'active' | 'inactive'
type ScreenMode = 'browse' | 'edit' | 'bulk'
type BulkPlaceMode = 'brands' | 'branches'
type BulkSortDirection = 'asc' | 'desc'
type SpotGroup = {
  key: string
  type: AdminType
  lead: AdminSpot
  spots: AdminSpot[]
  activeCount: number
  inactiveCount: number
}

type BulkSummary = {
  imported: number
  created: number
  updated: number
  ignored: number
  message: string
}

type BulkColumn = {
  key: keyof AdminSpot | 'sortOrder'
  label: string
  input: 'text' | 'number' | 'boolean'
}

type BulkDisplayRow = {
  key: string
  spot: AdminSpot
  sortOrder: number
  kind: 'spot' | 'brand' | 'branch'
  branchCount?: number
  sourceIds: string[]
  groupIndex: number
}

const eventsDisabled = true

const emptySpot: AdminSpot = {
  id: '',
  spotId: null,
  branchId: null,
  placeSlug: '',
  branchSlug: '',
  type: 'place',
  name: '',
  brandName: '',
  branchName: '',
  neighborhood: '',
  hubName: '',
  category: 'Restaurantes',
  city: 'Cali',
  imageUrl:
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  galleryUrls: '',
  interests: '',
  minPrice: 0,
  maxPrice: 0,
  schedule: '',
  instagram: '',
  whatsapp: '',
  phone: '',
  menuUrl: 'https://menupp.co',
  tags: '',
  moods: '',
  likeCount: 0,
  distanceKm: 5,
  address: '',
  maxPeople: 6,
  days: '',
  latitude: '',
  longitude: '',
  holidayMode: 'inherit',
  holidayOpenTime: '',
  holidayCloseTime: '',
  holidaySplitOpenTime: '',
  holidaySplitCloseTime: '',
  weeklyHours: [],
  scheduleExceptions: [],
  active: true,
  featured: false,
  description: '',
  shortDescription: '',
}

const weekdayOptions = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
] as const

function getMenuFieldLabel(category: AdminSpot['category']) {
  return category === 'Restaurantes' || category === 'Vida nocturna' ? 'Menú' : 'Website'
}

const categories = [
  'Arte y cultura',
  'Vida nocturna',
  'Cine',
  'Restaurantes',
  'Eventos',
  'Deporte y bienestar',
  'Familiar',
  'Pet friendly',
  'Naturaleza y aire libre',
  'Planes en casa',
]

const SPOTS_MEDIA_BUCKET = 'spots-media'
const ADMIN_AUTH_STORAGE_KEY = 'spots-admin-auth-v1'
const ADMIN_STATIC_USERNAME = 'admin'
const ADMIN_STATIC_PASSWORD = '1234'

const bulkColumns: BulkColumn[] = [
  { key: 'id', label: 'id', input: 'text' },
  { key: 'type', label: 'type', input: 'text' },
  { key: 'name', label: 'name/place_name', input: 'text' },
  { key: 'branchName', label: 'branch_name/barrio', input: 'text' },
  { key: 'neighborhood', label: 'neighborhood', input: 'text' },
  { key: 'hubName', label: 'Mall', input: 'text' },
  { key: 'category', label: 'category', input: 'text' },
  { key: 'city', label: 'city', input: 'text' },
  { key: 'imageUrl', label: 'image_url', input: 'text' },
  { key: 'galleryUrls', label: 'gallery_urls', input: 'text' },
  { key: 'shortDescription', label: 'short_description', input: 'text' },
  { key: 'maxPeople', label: 'max_people', input: 'number' },
  { key: 'minPrice', label: 'min_budget', input: 'number' },
  { key: 'schedule', label: 'hours', input: 'text' },
  { key: 'address', label: 'address', input: 'text' },
  { key: 'instagram', label: 'instagram', input: 'text' },
  { key: 'whatsapp', label: 'whatsapp', input: 'text' },
  { key: 'phone', label: 'phone', input: 'text' },
  { key: 'menuUrl', label: 'menu_url', input: 'text' },
  { key: 'tags', label: 'tags', input: 'text' },
  { key: 'moods', label: 'moods', input: 'text' },
  { key: 'active', label: 'is_active', input: 'boolean' },
  { key: 'featured', label: 'is_featured', input: 'boolean' },
  { key: 'sortOrder', label: 'sort_order', input: 'number' },
]

const bulkBranchScopedFields = new Set<keyof AdminSpot | 'sortOrder'>([
  'branchName',
  'neighborhood',
  'hubName',
  'maxPeople',
  'minPrice',
  'schedule',
  'address',
  'instagram',
  'whatsapp',
  'phone',
  'menuUrl',
  'latitude',
  'longitude',
  'sortOrder',
])

function buildSpotSignature(spot: AdminSpot) {
  return JSON.stringify(spot)
}

function groupSpotsByBrand(spots: AdminSpot[]) {
  const groups = new Map<string, SpotGroup>()

  for (const spot of spots) {
    const key = spot.brandName.trim() || spot.name.trim() || spot.id
    const existing = groups.get(key)

    if (existing) {
      existing.spots.push(spot)
      existing.activeCount += spot.active ? 1 : 0
      existing.inactiveCount += spot.active ? 0 : 1
      continue
    }

    groups.set(key, {
      key,
      type: spot.type,
      lead: spot,
      spots: [spot],
      activeCount: spot.active ? 1 : 0,
      inactiveCount: spot.active ? 0 : 1,
    })
  }

  return Array.from(groups.values()).sort((left, right) =>
    left.key.localeCompare(right.key, 'es'),
  )
}

function buildBulkBrandSpot(group: SpotGroup): AdminSpot {
  const lead = group.lead

  return {
    ...lead,
    id: lead.placeSlug || lead.id,
    branchId: null,
    branchSlug: '',
    branchName: '',
    neighborhood: '',
    hubName: '',
    schedule: '',
    address: '',
    instagram: '',
    whatsapp: '',
    phone: '',
    menuUrl: '',
    latitude: '',
    longitude: '',
    weeklyHours: [],
    scheduleExceptions: [],
  }
}

function isBulkBranchScopedField(key: BulkColumn['key']) {
  return bulkBranchScopedFields.has(key)
}

function getBulkSortValue(row: BulkDisplayRow, key: BulkColumn['key']) {
  if (row.kind === 'brand' && isBulkBranchScopedField(key)) {
    return ''
  }

  if (key === 'sortOrder') {
    return row.sortOrder
  }

  return row.spot[key]
}

function compareBulkRows(
  left: BulkDisplayRow,
  right: BulkDisplayRow,
  key: BulkColumn['key'],
  direction: BulkSortDirection,
) {
  const leftValue = getBulkSortValue(left, key)
  const rightValue = getBulkSortValue(right, key)
  const multiplier = direction === 'asc' ? 1 : -1

  if (typeof leftValue === 'number' || typeof rightValue === 'number') {
    return ((Number(leftValue) || 0) - (Number(rightValue) || 0)) * multiplier
  }

  if (typeof leftValue === 'boolean' || typeof rightValue === 'boolean') {
    return (Number(Boolean(leftValue)) - Number(Boolean(rightValue))) * multiplier
  }

  return String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'es', {
    sensitivity: 'base',
    numeric: true,
  }) * multiplier
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getSpotSlugSource(spot: Pick<AdminSpot, 'type' | 'brandName' | 'name'>) {
  const base =
    spot.type === 'event'
      ? spot.name.trim() || spot.brandName.trim()
      : spot.brandName.trim() || spot.name.trim()

  return base || (spot.type === 'event' ? 'nuevo-parche' : 'nuevo-lugar')
}

function getBranchSlugSource(spot: Pick<AdminSpot, 'brandName' | 'hubName' | 'neighborhood'>) {
  const location = spot.hubName.trim() || spot.neighborhood.trim() || 'sede'
  return `${spot.brandName.trim()} ${location}`.trim()
}

function buildUniqueSpotSlug(
  source: string,
  existingIds: string[],
  excludeId?: string,
) {
  const base = slugify(source) || 'spot'
  const taken = new Set(existingIds.filter((id) => id !== excludeId))

  if (!taken.has(base)) {
    return base
  }

  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1
  }

  return `${base}-${suffix}`
}

function extractCoordinatesFromInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (atMatch) {
    return { latitude: atMatch[1], longitude: atMatch[2] }
  }

  const pairMatch = trimmed.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (pairMatch) {
    return { latitude: pairMatch[1], longitude: pairMatch[2] }
  }

  try {
    const url = new URL(trimmed)
    const query = url.searchParams.get('q') ?? url.searchParams.get('query') ?? ''
    const queryMatch = query.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
    if (queryMatch) {
      return { latitude: queryMatch[1], longitude: queryMatch[2] }
    }
  } catch {
    return null
  }

  return null
}

async function geocodeAddress(address: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error('No pudimos geocodificar la direccion')
  }

  const results = (await response.json()) as Array<{ lat: string; lon: string }>
  if (!results.length) {
    return null
  }

  return { latitude: results[0].lat, longitude: results[0].lon }
}

async function compressImageFile(file: File) {
  const imageUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('No pudimos leer la imagen'))
      element.src = imageUrl
    })

    const maxDimension = 1600
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('No pudimos preparar la imagen')
    }

    context.drawImage(image, 0, 0, width, height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => {
          if (!nextBlob) {
            reject(new Error('No pudimos comprimir la imagen'))
            return
          }

          resolve(nextBlob)
        },
        'image/jpeg',
        0.82,
      )
    })

    return blob
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

function buildStorageAssetPath(base: string, kind: 'cover' | 'gallery', fileName: string) {
  const folder = slugify(base) || 'spot'
  const safeName = slugify(fileName.replace(/\.[^.]+$/, '')) || kind
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `${folder}/${kind}/${safeName}-${suffix}.jpg`
}

async function uploadImageToStorage({
  file,
  base,
  kind,
}: {
  file: File
  base: string
  kind: 'cover' | 'gallery'
}) {
  if (!supabase) {
    throw new Error('Supabase no está configurado en este admin')
  }

  const compressed = await compressImageFile(file)
  const assetPath = buildStorageAssetPath(base, kind, file.name)
  const { error } = await supabase.storage
    .from(SPOTS_MEDIA_BUCKET)
    .upload(assetPath, compressed, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from(SPOTS_MEDIA_BUCKET).getPublicUrl(assetPath)
  return data.publicUrl
}

function splitGalleryUrls(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let currentCell = ''
  let currentRow: string[] = []
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }
      currentRow.push(currentCell)
      if (currentRow.some((cell) => cell.trim().length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentCell = ''
      continue
    }

    currentCell += char
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell)
    if (currentRow.some((cell) => cell.trim().length > 0)) {
      rows.push(currentRow)
    }
  }

  return rows
}

function parseBoolean(value: string, fallback = false) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return fallback
  return normalized === 'true' || normalized === '1' || normalized === 'si' || normalized === 'sí'
}

function parseNumberValue(value: string, fallback = 0) {
  const normalized = value.trim()
  if (!normalized) return fallback
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildDefaultWeeklyHours(): AdminWeeklyHour[] {
  return weekdayOptions.map((day) => ({
    id: `weekday-${day.value}`,
    dayOfWeek: day.value,
    isClosed: false,
    openTime: '',
    closeTime: '',
    splitOpenTime: '',
    splitCloseTime: '',
  }))
}

function normalizeWeeklyHours(rows: AdminWeeklyHour[]) {
  const byDay = new Map(rows.map((row) => [row.dayOfWeek, row]))

  return weekdayOptions.map((day) => {
    const row = byDay.get(day.value)
    if (row) {
      return {
        ...row,
        id: row.id || `weekday-${day.value}`,
        dayOfWeek: day.value,
      }
    }

    return {
      id: `weekday-${day.value}`,
      dayOfWeek: day.value,
      isClosed: false,
      openTime: '',
      closeTime: '',
      splitOpenTime: '',
      splitCloseTime: '',
    }
  })
}

function buildScheduleSummary(
  weeklyHours: AdminWeeklyHour[],
  holidayConfig: Pick<
    AdminSpot,
    | 'holidayMode'
    | 'holidayOpenTime'
    | 'holidayCloseTime'
    | 'holidaySplitOpenTime'
    | 'holidaySplitCloseTime'
  >,
  scheduleExceptions: AdminScheduleException[],
  fallback = '',
) {
  const normalized = normalizeWeeklyHours(weeklyHours)
  const holidaySummary = buildHolidaySummary(holidayConfig)
  const hasStructuredHours = normalized.some(
    (row) => row.isClosed || row.openTime || row.closeTime || row.splitOpenTime || row.splitCloseTime,
  )

  if (!hasStructuredHours && !holidaySummary && scheduleExceptions.length === 0) {
    return fallback
  }

  const weeklySummary = buildGroupedWeeklySummary(normalized)

  const parts = [weeklySummary, holidaySummary].filter(Boolean)

  if (scheduleExceptions.length) {
    parts.push(
      `${scheduleExceptions.length} excepción${scheduleExceptions.length === 1 ? '' : 'es'}`,
    )
  }

  return parts.join(' · ')
}

function buildGroupedWeeklySummary(weeklyHours: AdminWeeklyHour[]) {
  const groups: Array<{ dayIndexes: number[]; label: string }> = []

  weeklyHours.forEach((row, index) => {
    const label = buildDailyScheduleLabel(row)
    if (!label) {
      return
    }

    const previous = groups[groups.length - 1]
    if (
      previous &&
      previous.label === label &&
      previous.dayIndexes[previous.dayIndexes.length - 1] === index - 1
    ) {
      previous.dayIndexes.push(index)
      return
    }

    groups.push({
      dayIndexes: [index],
      label,
    })
  })

  return groups
    .map((group) => `${formatDayIndexRange(group.dayIndexes)} ${group.label}`.trim())
    .join(' · ')
}

function buildHolidaySummary(
  holidayConfig: Pick<
    AdminSpot,
    | 'holidayMode'
    | 'holidayOpenTime'
    | 'holidayCloseTime'
    | 'holidaySplitOpenTime'
    | 'holidaySplitCloseTime'
  >,
) {
  if (holidayConfig.holidayMode === 'closed') {
    return 'Festivos cerrado'
  }

  if (holidayConfig.holidayMode === 'same_as_sunday') {
    return 'Festivos como domingo'
  }

  if (holidayConfig.holidayMode !== 'custom') {
    return 'Festivos cerrado'
  }

  const label = buildHolidayScheduleLabel(holidayConfig)
  return label ? `Festivos ${label}` : 'Festivos horario especial'
}

function buildDailyScheduleLabel(row: AdminWeeklyHour) {
  if (row.isClosed) {
    return 'Cerrado'
  }

  if (!row.openTime || !row.closeTime) {
    return ''
  }

  return `${row.openTime}-${row.closeTime}${buildSplitLabel(row.splitOpenTime, row.splitCloseTime)}`
}

function buildHolidayScheduleLabel(
  holidayConfig: Pick<
    AdminSpot,
    | 'holidayOpenTime'
    | 'holidayCloseTime'
    | 'holidaySplitOpenTime'
    | 'holidaySplitCloseTime'
  >,
) {
  if (!holidayConfig.holidayOpenTime || !holidayConfig.holidayCloseTime) {
    return ''
  }

  return `${holidayConfig.holidayOpenTime}-${holidayConfig.holidayCloseTime}${buildSplitLabel(
    holidayConfig.holidaySplitOpenTime,
    holidayConfig.holidaySplitCloseTime,
  )}`
}

function buildSplitLabel(openTime: string, closeTime: string) {
  return openTime && closeTime ? ` / ${openTime}-${closeTime}` : ''
}

function formatDayIndexRange(dayIndexes: number[]) {
  const labels = dayIndexes
    .map((index) => weekdayOptions[index]?.label ?? '')
    .map((label) => label.slice(0, 3).replace('Mié', 'Mie').replace('Sáb', 'Sab'))
    .filter(Boolean)

  if (labels.length === 0) {
    return ''
  }

  if (labels.length === 1) {
    return labels[0]
  }

  return `${labels[0]}-${labels[labels.length - 1]}`
}

function resolveBranchName(branchName: string, neighborhood: string) {
  return branchName.trim() || neighborhood.trim()
}

function normalizeAdminSpot(spot: AdminSpot): AdminSpot {
  if (spot.type !== 'place') {
    return {
      ...spot,
      weeklyHours: normalizeWeeklyHours(spot.weeklyHours),
      schedule: buildScheduleSummary(spot.weeklyHours, spot, spot.scheduleExceptions, spot.schedule),
      description: spot.description || spot.shortDescription,
    }
  }

  const sharedName = spot.name.trim() || spot.brandName.trim()
  const neighborhood = spot.neighborhood.trim()

  return {
    ...spot,
    name: sharedName,
    brandName: sharedName,
    branchName: neighborhood || spot.branchName.trim(),
    weeklyHours: normalizeWeeklyHours(spot.weeklyHours),
    schedule: buildScheduleSummary(spot.weeklyHours, spot, spot.scheduleExceptions, spot.schedule),
    description: spot.description || spot.shortDescription,
  }
}

function updateAdminSpotField<K extends keyof AdminSpot>(
  spot: AdminSpot,
  field: K,
  value: AdminSpot[K],
) {
  const nextSpot = {
    ...spot,
    [field]: value,
  }

  if (field === 'neighborhood') {
    nextSpot.branchName = String(value).trim()
  }

  if (
    field === 'shortDescription' &&
    (spot.description.trim() === '' || spot.description.trim() === spot.shortDescription.trim())
  ) {
    nextSpot.description = String(value)
  }

  if (
    field === 'weeklyHours' ||
    field === 'scheduleExceptions' ||
    field === 'holidayMode' ||
    field === 'holidayOpenTime' ||
    field === 'holidayCloseTime' ||
    field === 'holidaySplitOpenTime' ||
    field === 'holidaySplitCloseTime'
  ) {
    nextSpot.schedule = buildScheduleSummary(
      nextSpot.weeklyHours,
      nextSpot,
      nextSpot.scheduleExceptions,
      nextSpot.schedule,
    )
  }

  return normalizeAdminSpot(nextSpot)
}

function mapCsvRowToAdminSpot(row: Record<string, string>, fallbackType: AdminType): AdminSpot {
  const nextType = row.type?.trim() === 'event' ? 'event' : row.type?.trim() === 'place' ? 'place' : fallbackType
  const brandName = row.brand_name?.trim() || row.name?.trim() || ''
  const neighborhood = row.neighborhood?.trim() || ''
  const branchName = resolveBranchName(row.branch_name?.trim() || '', neighborhood)

  return normalizeAdminSpot({
    ...emptySpot,
    id: row.id?.trim() || '',
    type: nextType,
    name: row.name?.trim() || brandName,
    brandName,
    branchName,
    neighborhood,
    hubName: row.zone?.trim() || '',
    category: row.category?.trim() || (nextType === 'event' ? 'Eventos' : 'Restaurantes'),
    city: row.city?.trim() || 'Cali',
    imageUrl: row.image_url?.trim() || emptySpot.imageUrl,
    galleryUrls: row.gallery_urls?.trim() || '',
    shortDescription: row.short_description?.trim() || '',
    description: row.description?.trim() || '',
    interests: row.interests?.trim() || '',
    maxPeople: parseNumberValue(row.max_people, emptySpot.maxPeople),
    days: row.days?.trim() || '',
    minPrice: parseNumberValue(row.min_budget || row.max_budget, emptySpot.minPrice),
    maxPrice: parseNumberValue(row.min_budget || row.max_budget, emptySpot.maxPrice),
    schedule: row.hours?.trim() || '',
    address: row.address?.trim() || '',
    instagram: row.instagram?.trim() || '',
    whatsapp: row.whatsapp?.trim() || '',
    phone: row.phone?.trim() || '',
    menuUrl: row.menu_url?.trim() || '',
    tags: row.tags?.trim() || '',
    moods: row.moods?.trim() || '',
    latitude: row.latitude?.trim() || '',
    longitude: row.longitude?.trim() || '',
    active: parseBoolean(row.is_active, true),
    featured: parseBoolean(row.is_featured, false),
  })
}

function App() {
  const [authReady, setAuthReady] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [spots, setSpots] = useState<AdminSpot[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [view, setView] = useState<AdminType>('place')
  const [screen, setScreen] = useState<ScreenMode>('browse')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedBranchIds, setExpandedBranchIds] = useState<string[]>([])
  const [syncLabel, setSyncLabel] = useState(
    backendEnabled ? 'Conectando con base de datos...' : 'Configura Supabase para usar el admin',
  )
  const [geocoding, setGeocoding] = useState(false)
  const [savingNow, setSavingNow] = useState(false)
  const [refreshingNow, setRefreshingNow] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(true)
  const [bulkSummary, setBulkSummary] = useState<BulkSummary | null>(null)
  const [bulkError, setBulkError] = useState('')
  const [bulkPlaceMode, setBulkPlaceMode] = useState<BulkPlaceMode>('brands')
  const [bulkSearch, setBulkSearch] = useState('')
  const [bulkSort, setBulkSort] = useState<{ key: BulkColumn['key']; direction: BulkSortDirection } | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)
  const readyToSyncRef = useRef(false)
  const lastSyncedSignaturesRef = useRef<Record<string, string>>({})
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null)
  const screenRef = useRef<ScreenMode>('browse')
  const pendingRemoteRefreshRef = useRef(false)
  const remoteRefreshTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    try {
      setIsAuthenticated(window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'ok')
    } catch {
      setIsAuthenticated(false)
    } finally {
      setAuthReady(true)
    }
  }, [])

  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  useEffect(() => {
    if (eventsDisabled && view !== 'place') {
      setView('place')
      setScreen('browse')
    }
  }, [view])

  const visibleSpots = useMemo(() => {
    return spots.filter((spot) => {
      const matchesType = spot.type === view
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
            ? spot.active
            : !spot.active
      const matchesSearch = [
        spot.name,
        spot.brandName,
        spot.branchName,
        spot.neighborhood,
        spot.hubName,
        spot.category,
        spot.tags,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search.trim().toLowerCase())

      return matchesType && matchesStatus && matchesSearch
    })
  }, [search, spots, statusFilter, view])

  const selectedSpot = spots.find((spot) => spot.id === selectedId) ?? null
  const selectedPlaceSpots = useMemo(() => {
    if (view !== 'place' || !selectedSpot) {
      return []
    }

    return spots.filter(
      (spot) => spot.type === 'place' && spot.brandName === selectedSpot.brandName,
    )
  }, [selectedSpot, spots, view])
  const selectedPlaceLead = selectedPlaceSpots[0] ?? selectedSpot
  const placeCount = useMemo(
    () => groupSpotsByBrand(spots.filter((spot) => spot.type === 'place')).length,
    [spots],
  )
  const eventCount = useMemo(
    () => spots.filter((spot) => spot.type === 'event').length,
    [spots],
  )
  const currentViewSpots = useMemo(
    () => spots.filter((spot) => spot.type === view),
    [spots, view],
  )
  const currentViewGroups = useMemo(
    () => (view === 'place' ? groupSpotsByBrand(currentViewSpots) : []),
    [currentViewSpots, view],
  )
  const activeCount = useMemo(
    () =>
      view === 'place'
        ? currentViewGroups.filter((group) => group.activeCount > 0).length
        : currentViewSpots.filter((spot) => spot.active).length,
    [currentViewGroups, currentViewSpots, view],
  )
  const inactiveCount = useMemo(
    () =>
      view === 'place'
        ? currentViewGroups.filter((group) => group.activeCount === 0).length
        : currentViewSpots.filter((spot) => !spot.active).length,
    [currentViewGroups, currentViewSpots, view],
  )
  const visiblePlaceGroups = useMemo(
    () => (view === 'place' ? groupSpotsByBrand(visibleSpots) : []),
    [view, visibleSpots],
  )
  const tagSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          spots
            .flatMap((spot) => spot.tags.split(','))
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right, 'es')),
    [spots],
  )
  const moodSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          spots
            .flatMap((spot) => spot.moods.split(','))
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right, 'es')),
    [spots],
  )
  const bulkRows = useMemo(
    () =>
      spots.filter((spot) => {
        if (spot.type !== view) {
          return false
        }

        const query = bulkSearch.trim().toLowerCase()
        if (!query) {
          return true
        }

        return [spot.name, spot.brandName, spot.branchName].join(' ').toLowerCase().includes(query)
      }),
    [bulkSearch, spots, view],
  )
  const bulkBaseRows = useMemo(() => {
    if (view !== 'place') {
      return bulkRows.map((spot, index) => ({
        key: spot.id,
        spot,
        sortOrder: index * 10 + 10,
        kind: 'spot' as const,
        sourceIds: [spot.id],
        groupIndex: index,
      }))
    }

    const groups = groupSpotsByBrand(bulkRows)

    if (bulkPlaceMode === 'brands') {
      return groups.map((group, index) => ({
        key: `brand-${group.lead.placeSlug || group.lead.id}`,
        spot: buildBulkBrandSpot(group),
        sortOrder: index * 10 + 10,
        kind: 'brand' as const,
        branchCount: group.spots.length,
        sourceIds: group.spots.map((spot) => spot.id),
        groupIndex: index,
      }))
    }

    let sortOrder = 10
    return groups.flatMap((group, groupIndex) => {
      const brandSpot = buildBulkBrandSpot(group)
      const brandRow: BulkDisplayRow = {
        key: `${brandSpot.id}-brand`,
        spot: brandSpot,
        sortOrder,
        kind: 'brand',
        branchCount: group.spots.length,
        sourceIds: group.spots.map((spot) => spot.id),
        groupIndex,
      }
      sortOrder += 10

      const branchRows = group.spots.map((spot) => {
        const row: BulkDisplayRow = {
          key: `${spot.id}-branch`,
          spot,
          sortOrder,
          kind: 'branch',
          sourceIds: [spot.id],
          groupIndex,
        }
        sortOrder += 10
        return row
      })

      return [brandRow, ...branchRows]
    })
  }, [bulkPlaceMode, bulkRows, view])

  const bulkDisplayRows = useMemo(() => {
    if (!bulkSort) {
      return bulkBaseRows
    }

    if (view !== 'place' || bulkPlaceMode === 'brands') {
      return [...bulkBaseRows].sort((left, right) =>
        compareBulkRows(left, right, bulkSort.key, bulkSort.direction),
      )
    }

    const groups: Array<{ brand: BulkDisplayRow; branches: BulkDisplayRow[] }> = []
    let currentGroup: { brand: BulkDisplayRow; branches: BulkDisplayRow[] } | null = null

    for (const row of bulkBaseRows) {
      if (row.kind === 'brand') {
        currentGroup = { brand: row, branches: [] }
        groups.push(currentGroup)
        continue
      }

      currentGroup?.branches.push(row)
    }

    if (isBulkBranchScopedField(bulkSort.key)) {
      return groups.flatMap((group) => [
        group.brand,
        ...[...group.branches].sort((left, right) =>
          compareBulkRows(left, right, bulkSort.key, bulkSort.direction),
        ),
      ])
    }

    return [...groups]
      .sort((left, right) =>
        compareBulkRows(left.brand, right.brand, bulkSort.key, bulkSort.direction),
      )
      .flatMap((group) => [group.brand, ...group.branches])
  }, [bulkBaseRows, bulkPlaceMode, bulkSort, view])

  const loadRemote = useCallback(async () => {
    if (!backendEnabled || !supabase) {
      return
    }

    const client = supabase

    const remoteSpots = await fetchRemoteSpots(client)
    lastSyncedSignaturesRef.current = Object.fromEntries(
      remoteSpots.map((spot) => [spot.id, buildSpotSignature(spot)]),
    )
    setSpots(remoteSpots)
    setSelectedId((current) => {
      if (remoteSpots.some((spot) => spot.id === current)) {
        return current
      }

      return remoteSpots[0]?.id ?? ''
    })
    setSyncLabel('Sincronizado con Supabase')
    readyToSyncRef.current = true
  }, [])

  useEffect(() => {
    if (!backendEnabled || !supabase) {
      return
    }

    const client = supabase
    let active = true

    async function loadRemoteInitial() {
      try {
        await loadRemote()
      } catch {
        if (active) {
          setSyncLabel('Fallback local: revisa credenciales o tabla spots')
          readyToSyncRef.current = true
        }
      }
    }

    loadRemoteInitial()

	    const handleRealtimeRefresh = async () => {
	      if (!active) {
	        return
	      }

	      if (screenRef.current === 'edit') {
	        pendingRemoteRefreshRef.current = true
	        return
	      }

	      if (remoteRefreshTimeoutRef.current) {
	        window.clearTimeout(remoteRefreshTimeoutRef.current)
	      }

	      remoteRefreshTimeoutRef.current = window.setTimeout(() => {
	        remoteRefreshTimeoutRef.current = null
	        void loadRemote().catch(() => {
	          // Keep current local state if remote refresh fails.
	        })
	      }, 350)
	    }

    const channel = client
      .channel('spots-admin-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spots' },
        async () => {
          try {
            await handleRealtimeRefresh()
          } catch {
            // Keep current local state if remote refresh fails.
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spot_branches' },
        async () => {
          try {
            await handleRealtimeRefresh()
          } catch {
            // Keep current local state if remote refresh fails.
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spot_branch_hours' },
        async () => {
          try {
            await handleRealtimeRefresh()
          } catch {
            // Keep current local state if remote refresh fails.
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spot_branch_schedule_exceptions' },
        async () => {
          try {
            await handleRealtimeRefresh()
          } catch {
            // Keep current local state if remote refresh fails.
          }
        },
      )
      .subscribe()

    return () => {
      active = false
	      if (saveTimeoutRef.current) {
	        window.clearTimeout(saveTimeoutRef.current)
	      }
	      if (remoteRefreshTimeoutRef.current) {
	        window.clearTimeout(remoteRefreshTimeoutRef.current)
	      }
	      client.removeChannel(channel)
	    }
	  }, [loadRemote])

  useEffect(() => {
    if (!backendEnabled || !supabase) {
      return
    }

    if (screen !== 'edit' && pendingRemoteRefreshRef.current) {
      pendingRemoteRefreshRef.current = false
      void loadRemote().catch(() => {
        // Keep local state if deferred refresh fails.
      })
    }
  }, [loadRemote, screen])

  useEffect(() => {
    if (!backendEnabled || !supabase || !readyToSyncRef.current) {
      return
    }

    if (screen === 'edit') {
      return
    }

    const client = supabase
    if (!selectedSpot?.id) {
      return
    }

    const nextSignature = buildSpotSignature(selectedSpot)
    const lastSyncedSignature = lastSyncedSignaturesRef.current[selectedSpot.id]

    if (nextSignature === lastSyncedSignature) {
      if (syncLabel === 'Guardando cambios...') {
        setSyncLabel('Guardado en Supabase')
      }
      return
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    setSyncLabel('Guardando cambios...')

    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await upsertEventSpot(client, selectedSpot)
        lastSyncedSignaturesRef.current[selectedSpot.id] = nextSignature
        setSyncLabel('Guardado en Supabase')
      } catch {
        setSyncLabel('No pudimos guardar; seguimos en local')
      }
    }, 700)

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [selectedSpot, spots, syncLabel])

  function handleFieldChange<K extends keyof AdminSpot>(
    field: K,
    value: AdminSpot[K],
  ) {
    if (!selectedSpot) return

    setSpots((current) =>
      current.map((spot) =>
        spot.id === selectedSpot.id
          ? updateAdminSpotField(spot, field, value)
          : spot,
      ),
    )
  }

  function handlePlaceSlugChange(value: string) {
    if (view !== 'place' || !selectedPlaceLead) return

    const normalizedInput = slugify(value)
    const nextSlug = buildUniqueSpotSlug(
      normalizedInput || getSpotSlugSource(selectedPlaceLead),
      Array.from(new Set(spots.map((spot) => spot.placeSlug || spot.id))),
      selectedPlaceLead.placeSlug,
    )

    setSpots((current) =>
      current.map((spot) =>
        spot.type === 'place' && spot.brandName === selectedPlaceLead.brandName
          ? { ...spot, placeSlug: nextSlug }
          : spot,
      ),
    )
  }

  function handleBranchSlugChange(id: string, value: string) {
    const branch = spots.find((spot) => spot.id === id)
    if (!branch) return

    const normalizedInput = slugify(value)
    const nextSlug = buildUniqueSpotSlug(
      normalizedInput ||
        getBranchSlugSource({
          brandName: branch.brandName,
          hubName: branch.hubName,
          neighborhood: branch.neighborhood,
        }),
      spots.map((spot) => spot.id),
      branch.id,
    )

    setSelectedId(nextSlug)
    setSpots((current) =>
      current.map((spot) =>
        spot.id === branch.id ? { ...spot, id: nextSlug, branchSlug: nextSlug } : spot,
      ),
    )
  }

  function handleSlugChange(value: string) {
    if (!selectedSpot) return

    const normalizedInput = slugify(value)
    const nextId = buildUniqueSpotSlug(
      normalizedInput || getSpotSlugSource(selectedSpot),
      spots.map((spot) => spot.id),
      selectedSpot.id,
    )

    if (nextId === selectedSpot.id) {
      return
    }

    setSelectedId(nextId)
    setSpots((current) =>
      current.map((spot) =>
        spot.id === selectedSpot.id
          ? { ...spot, id: nextId, placeSlug: nextId, branchSlug: nextId }
          : spot,
      ),
    )
  }

  function handlePlaceFieldChange<K extends keyof AdminSpot>(
    field: K,
    value: AdminSpot[K],
  ) {
    if (view !== 'place' || !selectedPlaceLead) return

    setSpots((current) =>
      current.map((spot) =>
        spot.type === 'place' && spot.brandName === selectedPlaceLead.brandName
          ? updateAdminSpotField(spot, field, value)
          : spot,
      ),
    )
  }

  function handlePlaceBrandChange(value: string) {
    if (view !== 'place' || !selectedPlaceLead) return

    setSpots((current) =>
      current.map((spot) =>
        spot.type === 'place' && spot.brandName === selectedPlaceLead.brandName
          ? normalizeAdminSpot({ ...spot, brandName: value, name: value })
          : spot,
      ),
    )
  }

  function handleBranchFieldChange<K extends keyof AdminSpot>(
    id: string,
    field: K,
    value: AdminSpot[K],
  ) {
    setSpots((current) =>
      current.map((spot) =>
        spot.id === id
          ? updateAdminSpotField(spot, field, value)
          : spot,
      ),
    )
  }

  function handleBranchWeeklyHoursChange(id: string, nextWeeklyHours: AdminWeeklyHour[]) {
    handleBranchFieldChange(id, 'weeklyHours', normalizeWeeklyHours(nextWeeklyHours))
  }

  function handleBranchScheduleExceptionsChange(
    id: string,
    nextScheduleExceptions: AdminScheduleException[],
  ) {
    handleBranchFieldChange(id, 'scheduleExceptions', nextScheduleExceptions)
  }

  function handleSpotWeeklyHoursChange(nextWeeklyHours: AdminWeeklyHour[]) {
    handleFieldChange('weeklyHours', normalizeWeeklyHours(nextWeeklyHours))
  }

  function handleSpotScheduleExceptionsChange(
    nextScheduleExceptions: AdminScheduleException[],
  ) {
    handleFieldChange('scheduleExceptions', nextScheduleExceptions)
  }

  function handleCreateBranch() {
    if (view !== 'place' || !selectedPlaceLead) return

    const newBranch = {
      ...selectedPlaceLead,
      id: `draft-${buildUniqueSpotSlug(
        getBranchSlugSource({
          brandName: selectedPlaceLead.brandName,
          hubName: '',
          neighborhood: '',
        }),
        spots.map((spot) => spot.id),
      )}`,
      branchId: null,
      branchName: '',
      neighborhood: '',
      hubName: '',
      address: '',
      latitude: '',
      longitude: '',
      schedule: '',
      weeklyHours: buildDefaultWeeklyHours(),
      scheduleExceptions: [],
      whatsapp: '',
      phone: '',
      menuUrl: '',
      shortDescription: '',
      description: '',
      active: true,
      featured: false,
    }
    newBranch.branchSlug = newBranch.id

    setSpots((current) => [newBranch, ...current])
    setSelectedId(newBranch.id)
    setExpandedBranchIds((current) => Array.from(new Set([...current, newBranch.id])))
    setSyncLabel('Nueva sede lista para editar')
  }

  function toggleBranchExpanded(id: string) {
    setExpandedBranchIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function handleDeleteBranch(id: string) {
    const branch = spots.find((spot) => spot.id === id)
    if (!branch) return

    const confirmed = window.confirm(`¿Quieres eliminar la sede "${branch.branchName}"?`)
    if (!confirmed) return

    const sameBrandRemaining = spots.filter(
      (spot) =>
        spot.id !== id &&
        spot.type === branch.type &&
        spot.brandName === branch.brandName,
    )
    const nextSelected =
      sameBrandRemaining[0]?.id ??
      spots.find((spot) => spot.id !== id && spot.type === view)?.id ??
      ''

    setSpots((current) => current.filter((spot) => spot.id !== id))
    setSelectedId(nextSelected)

    if (!backendEnabled || !supabase) {
      setSyncLabel('Sede eliminada en modo local')
      return
    }

    try {
      if (branch.branchId != null) {
        await deleteBranch(supabase, branch.branchId)
      }
      setSyncLabel('Sede eliminada en Supabase')
    } catch {
      setSyncLabel('No pudimos eliminar la sede en Supabase')
    }
  }

  async function handleDeletePlaceGroup() {
    if (view !== 'place' || selectedPlaceSpots.length === 0) {
      return
    }

    const brand = selectedPlaceLead?.brandName || 'este lugar'
    const confirmed = window.confirm(`¿Quieres eliminar la marca "${brand}" y todas sus sedes?`)
    if (!confirmed) return

    const idsToDelete = new Set(selectedPlaceSpots.map((spot) => spot.id))
    const nextSpots = spots.filter((spot) => !idsToDelete.has(spot.id))
    const nextSelectedId = nextSpots.find((spot) => spot.type === view)?.id ?? nextSpots[0]?.id ?? ''

    setSpots(nextSpots)
    setSelectedId(nextSelectedId)
    setScreen('browse')

    if (!backendEnabled || !supabase) {
      setSyncLabel('Marca eliminada en modo local')
      return
    }

    try {
      if (selectedPlaceLead?.spotId != null) {
        await deleteSpot(supabase, selectedPlaceLead.spotId)
      }
      setSyncLabel('Marca eliminada en Supabase')
    } catch {
      setSyncLabel('No pudimos eliminar la marca completa')
    }
  }

  async function handleDeletePlaceGroupByBrand(brandName: string) {
    const branches = spots.filter((spot) => spot.type === 'place' && spot.brandName === brandName)
    if (branches.length === 0) return

    const confirmed = window.confirm(`¿Quieres eliminar la marca "${brandName}" y todas sus sedes?`)
    if (!confirmed) return

    const idsToDelete = new Set(branches.map((spot) => spot.id))
    const nextSpots = spots.filter((spot) => !idsToDelete.has(spot.id))
    const nextSelectedId = nextSpots.find((spot) => spot.type === view)?.id ?? nextSpots[0]?.id ?? ''

    setSpots(nextSpots)
    setSelectedId(nextSelectedId)

    if (!backendEnabled || !supabase) {
      setSyncLabel('Marca eliminada en modo local')
      return
    }

    try {
      if (branches[0]?.spotId != null) {
        await deleteSpot(supabase, branches[0].spotId)
      }
      setSyncLabel('Marca eliminada en Supabase')
    } catch {
      setSyncLabel('No pudimos eliminar la marca completa')
    }
  }

  function handleOpenEditor(id: string) {
    setSelectedId(id)
    setScreen('edit')
  }

  function handleCreateNew() {
    const seedSpot = {
      ...emptySpot,
      name: 'Nuevo lugar',
      brandName: 'Nueva marca',
      branchName: 'Sector',
      neighborhood: 'Sector',
      hubName: '',
      category: 'Restaurantes',
      type: 'place' as const,
    }
    const newId = `draft-${buildUniqueSpotSlug(
      getSpotSlugSource(seedSpot),
      spots.map((spot) => spot.id),
    )}`
    const newSpot = {
      ...seedSpot,
      id: newId,
      weeklyHours: buildDefaultWeeklyHours(),
      scheduleExceptions: [],
    }

    setSpots((current) => [newSpot, ...current])
    setSelectedId(newSpot.id)
    setScreen('edit')
    setSyncLabel('Borrador listo para editar')
  }

  function handleOpenBulk() {
    setScreen('bulk')
    setBulkSummary(null)
    setBulkError('')
  }

  function handleBulkCellChange<K extends keyof AdminSpot>(
    row: BulkDisplayRow,
    field: K,
    value: AdminSpot[K],
  ) {
    if (row.kind === 'brand' && view === 'place') {
      if (bulkBranchScopedFields.has(field)) {
        return
      }

      const sourceIds = new Set(row.sourceIds)
      setSpots((current) =>
        current.map((spot) =>
          sourceIds.has(spot.id) ? updateAdminSpotField(spot, field, value) : spot,
        ),
      )
      return
    }

    const sourceId = row.sourceIds[0]
    setSpots((current) =>
      current.map((spot) =>
        spot.id === sourceId ? updateAdminSpotField(spot, field, value) : spot,
      ),
    )
  }

  function handleBulkSort(key: BulkColumn['key']) {
    setBulkSort((current) => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' }
      }

      return {
        key,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      }
    })
  }

  function handleBulkImportedRows(rows: string[][]) {
    if (rows.length < 2) {
      setBulkSummary({
        imported: 0,
        created: 0,
        updated: 0,
        ignored: 0,
        message: 'El archivo no trae filas para importar.',
      })
      return
    }

    const [headerRow, ...dataRows] = rows
    const normalizedHeaders = headerRow.map((header) => header.trim())
    const importedEntries = dataRows
      .map((cells) => {
        const row = Object.fromEntries(
          normalizedHeaders.map((header, index) => [header, cells[index] ?? '']),
        )
        return {
          spot: mapCsvRowToAdminSpot(row, view),
          sortOrder: parseNumberValue(row.sort_order ?? '', Number.MAX_SAFE_INTEGER),
        }
      })
      .filter((entry) => entry.spot.id && entry.spot.type === view)
      .sort((left, right) => left.sortOrder - right.sortOrder)

    if (!importedEntries.length) {
      setBulkSummary({
        imported: 0,
        created: 0,
        updated: 0,
        ignored: dataRows.length,
        message: `No encontramos filas compatibles con ${view === 'place' ? 'lugares' : 'parches'}.`,
      })
      return
    }

    const importedIds = new Set(importedEntries.map((entry) => entry.spot.id))
    const currentById = new Map(spots.map((spot) => [spot.id, spot]))
    let created = 0
    let updated = 0

    const nextCurrentView = importedEntries.map(({ spot }) => {
      const existing = currentById.get(spot.id)
      if (existing) {
        updated += 1
        return { ...existing, ...spot }
      }
      created += 1
      return spot
    })

    const untouchedCurrentView = spots.filter(
      (spot) => spot.type === view && !importedIds.has(spot.id),
    )
    const untouchedOtherView = spots.filter((spot) => spot.type !== view)
    const nextSpots = [...nextCurrentView, ...untouchedCurrentView, ...untouchedOtherView]

    setSpots(nextSpots)
    setSelectedId(nextCurrentView[0]?.id ?? untouchedCurrentView[0]?.id ?? selectedId)
    setBulkSummary({
      imported: importedEntries.length,
      created,
      updated,
      ignored: dataRows.length - importedEntries.length,
      message: 'CSV cargado al borrador del admin.',
    })
    setBulkError('')
    setSyncLabel('CSV cargado en modo bulk')
  }

  async function handleBulkFileSelected(file: File | null) {
    if (!file) return

    try {
      const text = await file.text()
      handleBulkImportedRows(parseCsv(text))
    } catch {
      setBulkError('No pudimos leer el CSV.')
      setBulkSummary({
        imported: 0,
        created: 0,
        updated: 0,
        ignored: 0,
        message: 'No pudimos leer el CSV.',
      })
    }
  }

  function toggleBoolean(field: 'active' | 'featured') {
    if (!selectedSpot) return
    handleFieldChange(field, !selectedSpot[field])
  }

  async function handleDeleteSelected() {
    if (!selectedSpot?.id) {
      return
    }

    const confirmed = window.confirm(
      `¿Quieres eliminar "${selectedSpot.brandName || selectedSpot.name}"?`,
    )

    if (!confirmed) {
      return
    }

    const nextSpots = spots.filter((spot) => spot.id !== selectedSpot.id)
    const nextSelectedId =
      nextSpots.find((spot) => spot.type === view)?.id ?? nextSpots[0]?.id ?? ''

    setSpots(nextSpots)
    setSelectedId(nextSelectedId)
    setScreen('browse')

    if (!backendEnabled || !supabase) {
      setSyncLabel('Lugar eliminado en modo local')
      return
    }

    try {
      if (selectedSpot.spotId != null) {
        await deleteSpot(supabase, selectedSpot.spotId)
      }
      setSyncLabel('Lugar eliminado en Supabase')
    } catch {
      setSyncLabel('No pudimos eliminar en Supabase')
    }
  }

  async function handlePushAllToRemote() {
    if (!backendEnabled || !supabase) {
      setSyncLabel('Agrega credenciales de Supabase para publicar el seed')
      return
    }

    const client = supabase
    setSyncLabel('Publicando seed completo...')

    try {
      for (const group of groupSpotsByBrand(spots.filter((spot) => spot.type === 'place'))) {
        await upsertPlaceGroup(client, group.lead, group.spots)
      }

      for (const spot of spots.filter((spot) => spot.type === 'event')) {
        await upsertEventSpot(client, spot)
      }

      setSyncLabel('Seed publicado en Supabase')
    } catch {
      setSyncLabel('No pudimos publicar el seed completo')
    }
  }

  async function handlePushCurrentViewToRemote() {
    if (!backendEnabled || !supabase) {
      setSyncLabel('Agrega credenciales de Supabase para publicar estos cambios')
      return
    }

    const currentViewDrafts = spots.filter((spot) => spot.type === view)
    setSyncLabel(`Publicando ${view === 'place' ? 'lugares' : 'parches'} en bulk...`)
    setBulkError('')

    try {
      if (view === 'place') {
        for (const group of groupSpotsByBrand(currentViewDrafts)) {
          await upsertPlaceGroup(supabase, group.lead, group.spots)
          group.spots.forEach((spot) => {
            lastSyncedSignaturesRef.current[spot.id] = buildSpotSignature(spot)
          })
        }
      } else {
        for (const spot of currentViewDrafts) {
          await upsertEventSpot(supabase, spot)
          lastSyncedSignaturesRef.current[spot.id] = buildSpotSignature(spot)
        }
      }

      await loadRemote()
      setSyncLabel('Bulk guardado en Supabase')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos guardar el bulk edit'
      setBulkError(message)
      setSyncLabel('No pudimos guardar el bulk edit')
    }
  }

  async function handleSaveOnly() {
    if (!selectedSpot) {
      return
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    if (!backendEnabled || !supabase) {
      setSyncLabel('Cambios guardados en local')
      return
    }

    setSavingNow(true)
    setSyncLabel('Guardando cambios...')

    try {
      if (view === 'place' && selectedPlaceSpots.length > 0) {
        await upsertPlaceGroup(supabase, selectedPlaceLead, selectedPlaceSpots)
        selectedPlaceSpots.forEach((spot) => {
          lastSyncedSignaturesRef.current[spot.id] = buildSpotSignature(spot)
        })
      } else {
        await upsertEventSpot(supabase, selectedSpot)
        lastSyncedSignaturesRef.current[selectedSpot.id] = buildSpotSignature(selectedSpot)
      }

      setSyncLabel('Guardado en Supabase')
    } catch {
      setSyncLabel('No pudimos guardar; seguimos en local')
    } finally {
      setSavingNow(false)
    }
  }

  async function handleAutofillCoordinates() {
    if (!selectedSpot) return

    const source = selectedSpot.address.trim()
    if (!source) {
      setSyncLabel('Ingresa una direccion o link de Google Maps primero')
      return
    }

    setGeocoding(true)

    try {
      const directCoordinates = extractCoordinatesFromInput(source)
      const coordinates = directCoordinates ?? (await geocodeAddress(source))

      if (!coordinates) {
        setSyncLabel('No encontramos coordenadas para esa direccion')
        return
      }

      setSpots((current) =>
        current.map((spot) =>
          spot.id === selectedSpot.id
            ? {
                ...spot,
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
              }
            : spot,
        ),
      )
      setSyncLabel('Coordenadas autocompletadas')
    } catch {
      setSyncLabel('No pudimos autocompletar las coordenadas')
    } finally {
      setGeocoding(false)
    }
  }

  async function handleRefreshEditor() {
    if (!backendEnabled || !supabase) {
      setSyncLabel('Modo local: no hay nada que refrescar')
      return
    }

    try {
      setRefreshingNow(true)
      setSyncLabel('Refrescando desde Supabase...')
      await loadRemote()
    } catch {
      setSyncLabel('No pudimos refrescar desde Supabase')
    } finally {
      setRefreshingNow(false)
    }
  }

  const browseTitle = 'Lugares'
  const browseDescription =
    'Administra marcas y sus sedes, con la misma lógica en que se ve la app.'

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const username = loginUsername.trim()
    const password = loginPassword

    if (username === ADMIN_STATIC_USERNAME && password === ADMIN_STATIC_PASSWORD) {
      try {
        window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'ok')
      } catch {
        // Ignore storage issues and still allow current session.
      }

      setIsAuthenticated(true)
      setLoginError('')
      return
    }

    setLoginError('Usuario o contraseña incorrectos')
  }

  function handleLogout() {
    try {
      window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY)
    } catch {
      // Ignore storage issues.
    }

    setIsAuthenticated(false)
    setLoginPassword('')
    setLoginError('')
  }

  if (!authReady) {
    return <main className="auth-loading-shell" />
  }

  if (!isAuthenticated) {
    return (
      <main className="admin-auth-shell">
        <section className="admin-auth-card">
          <div className="admin-auth-brand">
            <img className="admin-auth-logo" src={spotsLogoPng} alt="Spots" />
            <p className="eyebrow">Admin</p>
            <h1>Entrar al panel</h1>
            <p className="admin-auth-copy">
              Acceso privado para administrar marcas, sedes y contenidos de Spots.
            </p>
          </div>

          <form className="admin-auth-form" onSubmit={handleLoginSubmit}>
            <label className="field">
              <span>Usuario</span>
              <input
                className="input"
                autoComplete="username"
                value={loginUsername}
                onChange={(event) => {
                  setLoginUsername(event.target.value)
                  if (loginError) setLoginError('')
                }}
              />
            </label>

            <label className="field">
              <span>Contraseña</span>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(event) => {
                  setLoginPassword(event.target.value)
                  if (loginError) setLoginError('')
                }}
              />
            </label>

            {loginError ? <p className="admin-auth-error">{loginError}</p> : null}

            <button className="primary-button admin-auth-submit" type="submit">
              Entrar
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="shell">
      <header className="mobile-admin-header">
        <div className="mobile-admin-brand">
          <img className="mobile-admin-logo" src={spotsLogoPng} alt="Spots" />
          <div className="mobile-admin-copy">
            <p className="eyebrow">Spots Admin</p>
            <strong>
              {screen === 'edit' ? 'Editar lugar' : screen === 'bulk' ? 'Bulk edit' : 'Lugares'}
            </strong>
            <span>{syncLabel}</span>
          </div>
        </div>
        <div className="mobile-admin-header-actions">
          <button
            className="icon-button"
            onClick={handleLogout}
            type="button"
            title="Cerrar sesión"
          >
            <LogoutIcon />
          </button>
        </div>
      </header>

      <div className="mobile-admin-switcher">
        <button
          className={
            screen === 'browse' && view === 'place'
              ? 'mobile-switch-pill active'
              : 'mobile-switch-pill'
          }
          onClick={() => {
            setView('place')
            setScreen('browse')
          }}
          type="button"
        >
          Lugares
        </button>
        <button
          className={screen === 'bulk' ? 'mobile-switch-pill active' : 'mobile-switch-pill'}
          onClick={handleOpenBulk}
          type="button"
        >
          Tabla
        </button>
        <button className="mobile-switch-pill mobile-switch-pill-primary" onClick={handleCreateNew} type="button">
          + Nuevo
        </button>
      </div>

      <section
        className={
          screen === 'edit'
            ? `workspace workspace-edit${previewVisible ? ' workspace-edit-preview' : ''}`
            : 'workspace'
        }
      >
        <aside className={sidebarCollapsed ? 'sidebar-panel collapsed' : 'sidebar-panel'}>
            <div className="sidebar-top">
            <div className="sidebar-brand">
              <img className="sidebar-logo-image" src={spotsLogoPng} alt="Spots" />
            </div>
            <div className="sidebar-top-actions">
              <button
                className="icon-button"
                onClick={() => setSidebarCollapsed((current) => !current)}
                type="button"
                title={sidebarCollapsed ? 'Expandir panel' : 'Colapsar panel'}
              >
                <CollapseIcon collapsed={sidebarCollapsed} />
              </button>
              {!sidebarCollapsed ? (
                <button
                  className="icon-button"
                  onClick={handleLogout}
                  type="button"
                  title="Cerrar sesión"
                >
                  <LogoutIcon />
                </button>
              ) : null}
            </div>
          </div>

          {!sidebarCollapsed ? (
            <label className="field sidebar-search">
              <span>Búsqueda por texto</span>
              <input
                className="input"
                placeholder="Nombre, zona, categoría o moods"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          ) : null}

          <nav className="sidebar-nav">
            <button
              className={view === 'place' ? 'sidebar-link active' : 'sidebar-link'}
              onClick={() => {
                setView('place')
                setScreen('browse')
              }}
              type="button"
              title="Lugares"
            >
              <span className="sidebar-link-main">
                <span className="sidebar-link-icon">⌂</span>
                <span className="sidebar-link-text">Lugares</span>
              </span>
              <span className="sidebar-link-count">({placeCount})</span>
            </button>
            {eventsDisabled ? null : (
              <button
                className={view === 'event' ? 'sidebar-link active' : 'sidebar-link'}
                onClick={() => {
                  setView('event')
                  setScreen('browse')
                }}
                type="button"
                title="Parches"
              >
                <span className="sidebar-link-main">
                  <span className="sidebar-link-icon">✦</span>
                  <span className="sidebar-link-text">Parches</span>
                </span>
                <span className="sidebar-link-count">({eventCount})</span>
              </button>
            )}
          </nav>
        </aside>

        {screen === 'browse' ? (
          <section className="content-panel">
            <div className="panel-header browse-header">
              <div>
                <p className="eyebrow">{browseTitle}</p>
                <h2>{view === 'place' ? 'Marcas y sedes' : browseTitle}</h2>
                <p className="lede">{browseDescription}</p>
              </div>
              <div className="browse-actions">
                <button className="soft-button" onClick={handleOpenBulk} type="button">
                  Bulk edit
                </button>
                <button className="soft-button sidebar-publish" onClick={handlePushAllToRemote} type="button">
                  Publicar seed
                </button>
                <button className="primary-button" onClick={handleCreateNew} type="button">
                  + Nuevo
                </button>
              </div>
            </div>

            <label className="field mobile-browse-search">
              <span>Búsqueda por texto</span>
              <input
                className="input"
                placeholder="Nombre, zona, categoría o moods"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="stats-row">
              <article className="stat-card">
                <span>{view === 'place' ? 'Marcas' : browseTitle}</span>
                <strong>{view === 'place' ? currentViewGroups.length : currentViewSpots.length}</strong>
              </article>
              <article className="stat-card">
                  <span>{view === 'place' ? 'Marcas activas' : 'Activos'}</span>
                  <strong>{activeCount}</strong>
              </article>
              <article className="stat-card">
                <span>{view === 'place' ? 'Marcas apagadas' : 'Apagados'}</span>
                <strong>{inactiveCount}</strong>
              </article>
            </div>

            <div className="list-toolbar">
              <div className="segmented segmented-soft">
                <button
                  className={statusFilter === 'all' ? 'segment soft active' : 'segment soft'}
                  onClick={() => setStatusFilter('all')}
                  type="button"
                >
                  Todos
                </button>
                <button
                  className={statusFilter === 'active' ? 'segment soft active' : 'segment soft'}
                  onClick={() => setStatusFilter('active')}
                  type="button"
                >
                  Activos
                </button>
                <button
                  className={statusFilter === 'inactive' ? 'segment soft active' : 'segment soft'}
                  onClick={() => setStatusFilter('inactive')}
                  type="button"
                >
                  Inactivos
                </button>
              </div>
              <p className="sidebar-sync">{syncLabel}</p>
            </div>

            <div className="spot-grid">
              {(view === 'place' ? visiblePlaceGroups.length : visibleSpots.length) ? (
                view === 'place' ? (
                  visiblePlaceGroups.map((group) => (
                    <article
                      key={group.key}
                      className="spot-card spot-card-clickable"
                      onClick={() => handleOpenEditor(group.lead.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleOpenEditor(group.lead.id)
                        }
                      }}
                    >
                      <button
                        className="spot-card-trash"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleDeletePlaceGroupByBrand(group.lead.brandName)
                        }}
                        type="button"
                        aria-label={`Eliminar ${group.lead.brandName}`}
                        title="Eliminar marca"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v8H7V9Zm4 0h2v8h-2V9Zm4 0h2v8h-2V9ZM6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                      <div
                        className="spot-card-image"
                        style={{ backgroundImage: `url(${group.lead.imageUrl})` }}
                      />
                      <div className="spot-card-body">
                        <div className="spot-card-top">
                          <span className="spot-item-type">Lugar</span>
                          <span
                            className={group.activeCount > 0 ? 'status-dot' : 'status-dot inactive'}
                          />
                        </div>
                        <strong className="spot-card-title">{group.key}</strong>
                        <div className="spot-card-meta-row">
                          <span className="spot-card-pill">{group.lead.category}</span>
                          <span className="spot-card-stat">
                            {group.spots.length} sede{group.spots.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <p className="spot-card-copy spot-card-zones">
                          {group.spots
                            .map((spot) =>
                              spot.hubName
                                ? `${spot.hubName} · ${spot.neighborhood}`
                                : spot.neighborhood,
                            )
                            .join(', ')}
                        </p>
                        <p className="spot-card-copy spot-card-muted">
                          {group.activeCount} activa{group.activeCount === 1 ? '' : 's'}
                          {group.inactiveCount
                            ? ` · ${group.inactiveCount} apagada${group.inactiveCount === 1 ? '' : 's'}`
                            : ''}
                        </p>
                      </div>
                    </article>
                  ))
                ) : (
                  visibleSpots.map((spot) => (
                    <article
                      key={spot.id}
                      className="spot-card spot-card-clickable"
                      onClick={() => handleOpenEditor(spot.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleOpenEditor(spot.id)
                        }
                      }}
                    >
                      <div
                        className="spot-card-image"
                        style={{ backgroundImage: `url(${spot.imageUrl})` }}
                      />
                      <div className="spot-card-body">
                        <div className="spot-card-top">
                          <span className="spot-item-type">
                            {spot.type === 'place' ? 'Lugar' : 'Parche'}
                          </span>
                          <span className={spot.active ? 'status-dot' : 'status-dot inactive'} />
                        </div>
                        <strong className="spot-card-title">{spot.brandName}</strong>
                        <p className="spot-card-copy">{spot.branchName}</p>
                        <p className="spot-card-copy">{spot.category}</p>
                        <p className="spot-card-copy">
                          {spot.hubName
                            ? `${spot.neighborhood} · ${spot.hubName}`
                            : spot.neighborhood}{' '}
                          · {formatBudgetLabel(spot.minPrice)}
                        </p>
                      </div>
                    </article>
                  ))
                )
              ) : (
                <div className="empty-library content-empty">
                  <strong>Sin resultados</strong>
                  <span>Prueba con otra búsqueda o crea un nuevo {view === 'place' ? 'lugar o marca' : 'parche'}.</span>
                </div>
              )}
            </div>
          </section>
        ) : screen === 'bulk' ? (
          <section className="content-panel bulk-panel">
            <div className="panel-header browse-header">
              <div>
                <p className="eyebrow">Bulk edit</p>
                <h2>{browseTitle} en tabla</h2>
                <p className="lede">
                  Carga el CSV maestro, mezcla por <strong>id</strong> y edita filas y columnas como una hoja.
                </p>
              </div>
              <div className="browse-actions">
                <button className="soft-button" onClick={() => setScreen('browse')} type="button">
                  Volver
                </button>
                <button
                  className="soft-button"
                  onClick={() => bulkFileInputRef.current?.click()}
                  type="button"
                >
                  Cargar CSV
                </button>
                <button className="primary-button" onClick={() => void handlePushCurrentViewToRemote()} type="button">
                  Guardar bulk
                </button>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only-input"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    void handleBulkFileSelected(file)
                    event.currentTarget.value = ''
                  }}
                />
              </div>
            </div>

            <div className="bulk-toolbar">
              <div className="bulk-toolbar-main">
                <label className="bulk-search">
                  <span>Buscar en tabla</span>
                  <input
                    className="input"
                    placeholder={view === 'place' ? 'Nombre o marca' : 'Nombre del parche'}
                    value={bulkSearch}
                    onChange={(event) => setBulkSearch(event.target.value)}
                  />
                </label>
                {view === 'place' ? (
                  <label className="bulk-toggle">
                    <span>Mostrar sedes</span>
                    <button
                      className={bulkPlaceMode === 'branches' ? 'toggle bulk-toggle-button active' : 'toggle bulk-toggle-button'}
                      onClick={() =>
                        setBulkPlaceMode((current) => (current === 'branches' ? 'brands' : 'branches'))
                      }
                      type="button"
                    >
                      <span>{bulkPlaceMode === 'branches' ? 'Con sedes' : 'Solo marcas'}</span>
                      <span className={bulkPlaceMode === 'branches' ? 'toggle-track active' : 'toggle-track'}>
                        <span className="toggle-thumb" />
                      </span>
                    </button>
                  </label>
                ) : null}
              </div>
              {bulkSummary ? (
                <div className="bulk-summary">
                  <strong>{bulkSummary.message}</strong>
                  <span>
                    {bulkSummary.imported} filas · {bulkSummary.created} nuevas · {bulkSummary.updated} actualizadas
                    {bulkSummary.ignored ? ` · ${bulkSummary.ignored} ignoradas` : ''}
                  </span>
                </div>
              ) : (
                <p className="bulk-hint">
                  Funciona directo con la plantilla CSV real, incluyendo `gallery_urls` y sedes por fila.
                </p>
              )}
            </div>

            <p className="sidebar-sync bulk-sync-line">{syncLabel}</p>

            {bulkError ? <div className="bulk-error">{bulkError}</div> : null}

            <div className="bulk-grid-shell">
              <table className="bulk-grid">
                <thead>
                  <tr>
                    {bulkColumns.map((column) => (
                      <th key={column.label}>
                        <button
                          className="bulk-sort-button"
                          onClick={() => handleBulkSort(column.key)}
                          type="button"
                        >
                          <span>{column.label}</span>
                          <span
                            className={
                              bulkSort?.key === column.key
                                ? 'bulk-sort-indicator active'
                                : 'bulk-sort-indicator'
                            }
                          >
                            {bulkSort?.key === column.key
                              ? bulkSort.direction === 'asc'
                                ? 'A-Z'
                                : 'Z-A'
                              : '↕'}
                          </span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulkDisplayRows.map((row) => (
                    <tr
                      key={row.key}
                      className={
                        [
                          'bulk-row',
                          row.kind === 'branch'
                            ? 'bulk-row-branch'
                            : row.kind === 'brand'
                              ? 'bulk-row-brand'
                              : '',
                          row.groupIndex % 2 === 0 ? 'bulk-row-group-even' : 'bulk-row-group-odd',
                        ]
                          .filter(Boolean)
                          .join(' ')
                      }
                    >
                      {bulkColumns.map((column) => (
                        (() => {
                          const field = column.key === 'sortOrder' ? 'sortOrder' : (column.key as keyof AdminSpot)
                          const brandFieldDisabled =
                            view === 'place' &&
                            row.kind === 'brand' &&
                            bulkBranchScopedFields.has(field)

                          return (
                        <td
                          key={`${row.key}-${column.label}`}
                          className={[
                            column.input === 'boolean' ? 'bulk-boolean-cell' : '',
                            row.kind === 'brand' ? 'bulk-brand-cell' : '',
                            row.kind === 'branch' ? 'bulk-branch-cell' : '',
                            column.key === 'id' && row.kind === 'branch' ? 'bulk-branch-id-cell' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {column.key === 'sortOrder' ? (
                            <input
                              className="bulk-input"
                              value={brandFieldDisabled ? '' : String(row.sortOrder)}
                              readOnly
                            />
                          ) : column.input === 'boolean' ? (
                            (() => {
                              const field = column.key as keyof AdminSpot
                              return (
                            <input
                              type="checkbox"
                              checked={Boolean(row.spot[field])}
                              disabled={brandFieldDisabled}
                              onChange={(event) =>
                                handleBulkCellChange(
                                  row,
                                  field,
                                  event.target.checked as AdminSpot[typeof field],
                                )
                              }
                            />
                              )
                            })()
                          ) : (
                            (() => {
                              const field = column.key as keyof AdminSpot
                              return (
                            <input
                              className="bulk-input"
                              value={
                                field === 'type' && view === 'place'
                                  ? row.kind
                                  : brandFieldDisabled
                                    ? ''
                                    : String(row.spot[field] ?? '')
                              }
                              disabled={brandFieldDisabled}
                              onChange={(event) =>
                                handleBulkCellChange(
                                  row,
                                  field,
                                  (column.input === 'number'
                                    ? Number(event.target.value) || 0
                                    : event.target.value) as AdminSpot[typeof field],
                                )
                              }
                            />
                              )
                            })()
                          )}
                        </td>
                          )
                        })()
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <>
            <section className="editor-panel">
              <div className="panel-header">
                <div className="panel-header-main">
                  <button
                    className="editor-icon-button soft"
                    onClick={() => setScreen('browse')}
                    type="button"
                    aria-label="Volver al feed"
                    title="Volver al feed"
                    data-tooltip="Volver"
                  >
                    <img className="editor-icon-image" src={angleLeftIcon} alt="" aria-hidden="true" />
                  </button>
                  <div>
                    <p className="eyebrow">Edición</p>
                    <h2>{selectedSpot?.brandName || selectedSpot?.name || 'Selecciona un item'}</h2>
                  </div>
                </div>
                {selectedSpot ? (
                  <div className="editor-actions">
                    <button
                      className="editor-icon-button soft"
                      onClick={() => void handleRefreshEditor()}
                      type="button"
                      aria-label={refreshingNow ? 'Refrescando' : 'Refrescar'}
                      title={refreshingNow ? 'Refrescando' : 'Refrescar'}
                      data-tooltip={refreshingNow ? 'Refrescando...' : 'Refrescar'}
                      disabled={refreshingNow}
                    >
                      <img
                        className={refreshingNow ? 'editor-icon-image spinning' : 'editor-icon-image'}
                        src={refreshIcon}
                        alt=""
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      className="editor-icon-button soft"
                      onClick={() => void handleSaveOnly()}
                      type="button"
                      disabled={savingNow}
                      aria-label={savingNow ? 'Guardando' : 'Guardar'}
                      title={savingNow ? 'Guardando' : 'Guardar'}
                      data-tooltip={savingNow ? 'Guardando...' : 'Guardar'}
                    >
                      {savingNow ? (
                        <span className="editor-icon-spinner" aria-hidden="true" />
                      ) : (
                        <img className="editor-icon-image" src={diskIcon} alt="" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      className="editor-icon-button danger"
                      onClick={() => void (view === 'place' ? handleDeletePlaceGroup() : handleDeleteSelected())}
                      type="button"
                      aria-label="Borrar"
                      title="Borrar"
                      data-tooltip="Borrar"
                    >
                      <img className="editor-icon-image" src={trashIcon} alt="" aria-hidden="true" />
                    </button>
                    <button
                      className="editor-icon-button primary"
                      onClick={() => setPreviewVisible((current) => !current)}
                      type="button"
                      aria-label={previewVisible ? 'Ocultar vista en app' : 'Ver en app'}
                      title={previewVisible ? 'Ocultar vista en app' : 'Ver en app'}
                      data-tooltip={previewVisible ? 'Ocultar vista en app' : 'Ver en app'}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M12 5c5.23 0 9.27 3.17 11 7-1.73 3.83-5.77 7-11 7S2.73 15.83 1 12c1.73-3.83 5.77-7 11-7Zm0 2C8.13 7 4.96 9.06 3.24 12 4.96 14.94 8.13 17 12 17s7.04-2.06 8.76-5C19.04 9.06 15.87 7 12 7Zm0 2.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </div>
                ) : null}
              </div>

              {selectedSpot ? (
                <div className="mobile-editor-actions">
                  <button className="soft-button" onClick={() => setScreen('browse')} type="button">
                    Volver
                  </button>
                  <button
                    className="soft-button"
                    onClick={() => setPreviewVisible((current) => !current)}
                    type="button"
                  >
                    {previewVisible ? 'Ocultar preview' : 'Ver preview'}
                  </button>
                  <button className="primary-button" onClick={() => void handleSaveOnly()} type="button">
                    Guardar
                  </button>
                </div>
              ) : null}

              {selectedSpot ? (
                view === 'place' && selectedPlaceLead ? (
                  <div className="editor-sections">
                    <section className="editor-card">
                      <SectionTitle
                        icon="✦"
                        title="Lugar"
                        description="Información principal del lugar, coherente con cómo se ve en la app."
                      />
                      <div className="item-state-row">
                        <Toggle
                          label="Lugar activo"
                          checked={selectedPlaceLead.active}
                          onToggle={() => handlePlaceFieldChange('active', !selectedPlaceLead.active)}
                        />
                        <Toggle
                          label="Lugar destacado"
                          checked={selectedPlaceLead.featured}
                          onToggle={() => handlePlaceFieldChange('featured', !selectedPlaceLead.featured)}
                        />
                      </div>
                      <div className="form-grid">
                        <label className="field">
                          <span>Tipo</span>
                          <select
                            className="input"
                            value={selectedPlaceLead.type}
                            onChange={(event) => handlePlaceFieldChange('type', event.target.value as AdminType)}
                          >
                            <option value="place">Lugar</option>
                            {eventsDisabled ? null : <option value="event">Evento</option>}
                          </select>
                        </label>
                        <Field
                          label="Slug"
                          value={selectedPlaceLead.placeSlug}
                          onChange={handlePlaceSlugChange}
                        />
                        <Field
                          label="Nombre / lugar"
                          value={selectedPlaceLead.brandName}
                          onChange={handlePlaceBrandChange}
                        />
                        <div className="field">
                          <span>Tiene sedes</span>
                          <div className="field-helper-value">
                            {selectedPlaceSpots.length > 1 ? 'Sí' : 'No'}
                          </div>
                        </div>
                        <ImageField
                          label="Foto cover"
                          value={selectedPlaceLead.imageUrl}
                          onChange={(value) => handlePlaceFieldChange('imageUrl', value)}
                          storageBase={selectedPlaceLead.placeSlug || selectedPlaceLead.brandName}
                        />
                        <GalleryField
                          label="Fotos galería"
                          value={selectedPlaceLead.galleryUrls}
                          onChange={(value) => handlePlaceFieldChange('galleryUrls', value)}
                          storageBase={selectedPlaceLead.placeSlug || selectedPlaceLead.brandName}
                        />
                        <Field
                          label="Descripción corta"
                          value={selectedPlaceLead.shortDescription}
                          onChange={(value) => handlePlaceFieldChange('shortDescription', value)}
                        />
                        <label className="field">
                          <span>Categoría</span>
                          <select
                            className="input"
                            value={selectedPlaceLead.category}
                            onChange={(event) => handlePlaceFieldChange('category', event.target.value)}
                          >
                            {categories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Field
                          label="Ciudad"
                          value={selectedPlaceLead.city}
                          onChange={(value) => handlePlaceFieldChange('city', value)}
                        />
                        <Field
                          label="Tags"
                          value={selectedPlaceLead.tags}
                          onChange={(value) => handlePlaceFieldChange('tags', value)}
                          suggestions={tagSuggestions}
                          listId="place-tags-suggestions"
                        />
                        <Field
                          label="Moods"
                          value={selectedPlaceLead.moods}
                          onChange={(value) => handlePlaceFieldChange('moods', value)}
                          suggestions={moodSuggestions}
                          listId="place-moods-suggestions"
                        />
                        <Field
                          label="Likes"
                          value={String(selectedPlaceLead.likeCount)}
                          onChange={(value) => handlePlaceFieldChange('likeCount', Number(value) || 0)}
                        />
                      </div>
                    </section>

                    <section className="editor-card">
                      <div className="branch-section-header">
                        <SectionTitle
                          icon="⌂"
                          title="Sedes"
                          description="Datos operativos de cada sede: barrio, mall, horario, dirección, precios y links."
                        />
                        <button className="primary-button" onClick={handleCreateBranch} type="button">
                          + Nueva sede
                        </button>
                      </div>

                      <div className="branches-stack">
                        {selectedPlaceSpots.map((branch) => (
                          <article
                            key={branch.id}
                            className={
                              expandedBranchIds.includes(branch.id)
                                ? 'branch-editor-card expanded'
                                : 'branch-editor-card'
                            }
                          >
                            <button
                              className="branch-editor-header branch-editor-toggle"
                              onClick={() => toggleBranchExpanded(branch.id)}
                              type="button"
                            >
                              <div>
                                <strong>{branch.branchName || 'Nueva sede'}</strong>
                                <p className="branch-meta-line">
                                  {branch.hubName
                                    ? `${branch.hubName} · ${branch.neighborhood || 'Sector pendiente'}`
                                    : branch.neighborhood || 'Sector pendiente'}
                                </p>
                              </div>
                              <div className="branch-editor-actions">
                                <span
                                  className={branch.active ? 'status-dot' : 'status-dot inactive'}
                                />
                                <span className="branch-chevron" aria-hidden="true">
                                  {expandedBranchIds.includes(branch.id) ? '⌃' : '⌄'}
                                </span>
                              </div>
                            </button>

                            {expandedBranchIds.includes(branch.id) ? (
                              <div className="branch-editor-body">
                                <div className="branch-toolbar">
                                  <Toggle
                                    label="Activa"
                                    checked={branch.active}
                                    onToggle={() => handleBranchFieldChange(branch.id, 'active', !branch.active)}
                                  />
                                  <button
                                    className="danger-button"
                                    onClick={() => void handleDeleteBranch(branch.id)}
                                    type="button"
                                  >
                                    Eliminar sede
                                  </button>
                                </div>

                                <div className="form-grid">
                              <Field
                                label="Slug sede"
                                value={branch.branchSlug}
                                onChange={(value) => {
                                  if (selectedId !== branch.id) setSelectedId(branch.id)
                                  handleBranchSlugChange(branch.id, value)
                                }}
                              />
                              <Field
                                label="Sector"
                                value={branch.neighborhood}
                                onChange={(value) => handleBranchFieldChange(branch.id, 'neighborhood', value)}
                              />
                              <Field
                                label="Mall"
                                value={branch.hubName}
                                onChange={(value) => handleBranchFieldChange(branch.id, 'hubName', value)}
                              />
                              <div className="field field-span">
                                <span>Horario semanal y excepciones</span>
                                <ScheduleEditor
                                  weeklyHours={branch.weeklyHours}
                                  holidayMode={branch.holidayMode}
                                  holidayOpenTime={branch.holidayOpenTime}
                                  holidayCloseTime={branch.holidayCloseTime}
                                  holidaySplitOpenTime={branch.holidaySplitOpenTime}
                                  holidaySplitCloseTime={branch.holidaySplitCloseTime}
                                  scheduleExceptions={branch.scheduleExceptions}
                                  onWeeklyHoursChange={(value) => handleBranchWeeklyHoursChange(branch.id, value)}
                                  onHolidayChange={(value) => {
                                    handleBranchFieldChange(branch.id, 'holidayMode', value.holidayMode)
                                    handleBranchFieldChange(branch.id, 'holidayOpenTime', value.holidayOpenTime)
                                    handleBranchFieldChange(branch.id, 'holidayCloseTime', value.holidayCloseTime)
                                    handleBranchFieldChange(
                                      branch.id,
                                      'holidaySplitOpenTime',
                                      value.holidaySplitOpenTime,
                                    )
                                    handleBranchFieldChange(
                                      branch.id,
                                      'holidaySplitCloseTime',
                                      value.holidaySplitCloseTime,
                                    )
                                  }}
                                  onScheduleExceptionsChange={(value) =>
                                    handleBranchScheduleExceptionsChange(branch.id, value)
                                  }
                                />
                              </div>
                              <Field
                                label="Dirección"
                                value={branch.address}
                                onChange={(value) => handleBranchFieldChange(branch.id, 'address', value)}
                              />
                              <Field
                                label="Personas"
                                value={String(branch.maxPeople)}
                                onChange={(value) =>
                                  handleBranchFieldChange(branch.id, 'maxPeople', Number(value) || 0)
                                }
                              />
                              <div className="field">
                                <span>Presupuesto</span>
                                <div className="slider-wrap">
                                  <input
                                    className="slider"
                                    type="range"
                                    min="0"
                                    max="100000"
                                    step="5000"
                                    value={branch.minPrice}
                                    onChange={(event) =>
                                      handleBranchFieldChange(
                                        branch.id,
                                        'minPrice',
                                        Number(event.target.value),
                                      )
                                    }
                                  />
                                  <strong>{formatMoney(branch.minPrice)}</strong>
                                </div>
                              </div>
                              <div className="field field-span">
                                <span>Coordenadas</span>
                                <button
                                  className="primary-button inline-button"
                                  onClick={() => {
                                    if (selectedId !== branch.id) {
                                      setSelectedId(branch.id)
                                    }
                                    void handleAutofillCoordinates()
                                  }}
                                  type="button"
                                  disabled={geocoding}
                                >
                                  {geocoding ? 'Buscando coordenadas...' : 'Autocompletar coords'}
                                </button>
                              </div>
                              <Field
                                label="Instagram"
                                value={branch.instagram}
                                onChange={(value) => handleBranchFieldChange(branch.id, 'instagram', value)}
                              />
                              <Field
                                label="WhatsApp"
                                value={branch.whatsapp}
                                onChange={(value) => handleBranchFieldChange(branch.id, 'whatsapp', value)}
                              />
                              <Field
                                label="Teléfono"
                                value={branch.phone}
                                onChange={(value) => handleBranchFieldChange(branch.id, 'phone', value)}
                              />
                              <Field
                                label={getMenuFieldLabel(selectedSpot.category)}
                                value={branch.menuUrl}
                                onChange={(value) => handleBranchFieldChange(branch.id, 'menuUrl', value)}
                              />
                                </div>
                              </div>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="editor-sections">
                    <section className="editor-card">
                      <div className="item-state-row">
                        <Toggle
                          label="Activo"
                          checked={selectedSpot.active}
                          onToggle={() => toggleBoolean('active')}
                        />
                        <Toggle
                          label="Destacado"
                          checked={selectedSpot.featured}
                          onToggle={() => toggleBoolean('featured')}
                        />
                        <button className="danger-button" onClick={handleDeleteSelected} type="button">
                          Eliminar
                        </button>
                      </div>
                    </section>

                    <section className="editor-card">
                      <SectionTitle
                        icon="✦"
                        title="Presentación"
                        description="Información principal del lugar o parche."
                      />
                      <div className="form-grid">
                        <label className="field">
                          <span>Tipo</span>
                          <select
                            className="input"
                            value={selectedSpot.type}
                            onChange={(event) =>
                              handleFieldChange('type', event.target.value as AdminType)
                            }
                          >
                            <option value="place">Lugar</option>
                            {eventsDisabled ? null : <option value="event">Evento</option>}
                          </select>
                        </label>
                        <Field
                          label="Nombre / lugar"
                          value={selectedSpot.brandName}
                          onChange={(value) => {
                            handleFieldChange('brandName', value)
                            handleFieldChange('name', value)
                          }}
                        />
                        <Field
                          label="Slug"
                          value={selectedSpot.placeSlug}
                          onChange={handleSlugChange}
                        />
                        <ImageField
                          label="Foto cover"
                          value={selectedSpot.imageUrl}
                          onChange={(value) => handleFieldChange('imageUrl', value)}
                          storageBase={selectedSpot.placeSlug || selectedSpot.brandName}
                        />
                        <GalleryField
                          label="Fotos galería"
                          value={selectedSpot.galleryUrls}
                          onChange={(value) => handleFieldChange('galleryUrls', value)}
                          storageBase={selectedSpot.placeSlug || selectedSpot.brandName}
                        />
                        <Field
                          label="Descripción corta"
                          value={selectedSpot.shortDescription}
                          onChange={(value) => handleFieldChange('shortDescription', value)}
                        />
                        <Field
                          label="Likes"
                          value={String(selectedSpot.likeCount)}
                          onChange={(value) => handleFieldChange('likeCount', Number(value) || 0)}
                        />
                      </div>
                    </section>

                    <section className="editor-card">
                      <SectionTitle
                        icon="⌘"
                        title="Clasificación"
                        description="Categoría, tags y moods para discovery."
                      />
                      <div className="form-grid">
                        <label className="field">
                          <span>Categoría</span>
                          <select
                            className="input"
                            value={selectedSpot.category}
                            onChange={(event) =>
                              handleFieldChange('category', event.target.value)
                            }
                          >
                            {categories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Field
                          label="Ciudad"
                          value={selectedSpot.city}
                          onChange={(value) => handleFieldChange('city', value)}
                        />

                        <Field
                          label="Tags"
                          value={selectedSpot.tags}
                          onChange={(value) => handleFieldChange('tags', value)}
                          suggestions={tagSuggestions}
                          listId="single-tags-suggestions"
                        />
                        <Field
                          label="Moods"
                          value={selectedSpot.moods}
                          onChange={(value) => handleFieldChange('moods', value)}
                          suggestions={moodSuggestions}
                          listId="single-moods-suggestions"
                        />
                      </div>
                    </section>

                    <section className="editor-card">
                      <SectionTitle
                        icon="⌂"
                        title="Operación"
                        description="Ubicación, horarios, dirección, precios, personas y coordenadas automáticas."
                      />
                      <div className="form-grid">
                        <Field
                          label="Sector"
                          value={selectedSpot.neighborhood}
                          onChange={(value) => handleFieldChange('neighborhood', value)}
                        />
                        <Field
                          label="Mall"
                          value={selectedSpot.hubName}
                          onChange={(value) => handleFieldChange('hubName', value)}
                        />
                        <div className="field field-span">
                          <span>Horario semanal y excepciones</span>
                          <ScheduleEditor
                            weeklyHours={selectedSpot.weeklyHours}
                            holidayMode={selectedSpot.holidayMode}
                            holidayOpenTime={selectedSpot.holidayOpenTime}
                            holidayCloseTime={selectedSpot.holidayCloseTime}
                            holidaySplitOpenTime={selectedSpot.holidaySplitOpenTime}
                            holidaySplitCloseTime={selectedSpot.holidaySplitCloseTime}
                            scheduleExceptions={selectedSpot.scheduleExceptions}
                            onWeeklyHoursChange={handleSpotWeeklyHoursChange}
                            onHolidayChange={(value) => {
                              handleFieldChange('holidayMode', value.holidayMode)
                              handleFieldChange('holidayOpenTime', value.holidayOpenTime)
                              handleFieldChange('holidayCloseTime', value.holidayCloseTime)
                              handleFieldChange('holidaySplitOpenTime', value.holidaySplitOpenTime)
                              handleFieldChange('holidaySplitCloseTime', value.holidaySplitCloseTime)
                            }}
                            onScheduleExceptionsChange={handleSpotScheduleExceptionsChange}
                          />
                        </div>
                        <Field
                          label="Dirección"
                          value={selectedSpot.address}
                          onChange={(value) => handleFieldChange('address', value)}
                        />
                        <div className="field field-span">
                          <span>Coordenadas</span>
                          <button
                            className="primary-button inline-button"
                            onClick={handleAutofillCoordinates}
                            type="button"
                            disabled={geocoding}
                          >
                            {geocoding ? 'Buscando coordenadas...' : 'Autocompletar coords'}
                          </button>
                        </div>
                        <Field
                          label="Personas"
                          value={String(selectedSpot.maxPeople)}
                          onChange={(value) => handleFieldChange('maxPeople', Number(value) || 0)}
                        />
                        <div className="field">
                          <span>Presupuesto</span>
                          <div className="slider-wrap">
                            <input
                              className="slider"
                              type="range"
                              min="0"
                              max="100000"
                              step="5000"
                              value={selectedSpot.minPrice}
                              onChange={(event) =>
                                handleFieldChange('minPrice', Number(event.target.value))
                              }
                            />
                            <strong>{formatMoney(selectedSpot.minPrice)}</strong>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="editor-card">
                      <SectionTitle
                        icon="↗"
                        title="Canales"
                        description="Links y canales que se muestran al usuario."
                      />
                      <div className="form-grid">
                        <Field
                          label="Instagram"
                          value={selectedSpot.instagram}
                          onChange={(value) => handleFieldChange('instagram', value)}
                        />
                        <Field
                          label="WhatsApp"
                          value={selectedSpot.whatsapp}
                          onChange={(value) => handleFieldChange('whatsapp', value)}
                        />
                        <Field
                          label="Teléfono"
                          value={selectedSpot.phone}
                          onChange={(value) => handleFieldChange('phone', value)}
                        />
                        <Field
                          label={getMenuFieldLabel(selectedSpot.category)}
                          value={selectedSpot.menuUrl}
                          onChange={(value) => handleFieldChange('menuUrl', value)}
                        />
                      </div>
                    </section>
                  </div>
                )
              ) : (
                <div className="editor-empty">
                  <p className="eyebrow">Editor vacío</p>
                  <h2>No hay contenido para editar</h2>
                  <p className="lede">
                    Usa el botón <strong>+ Nuevo</strong> cuando quieras crear el primer item.
                  </p>
                </div>
              )}
            </section>

            {previewVisible ? <aside className="preview-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Preview</p>
                  <h2>Vista en app</h2>
                </div>
              </div>
              <AppDetailPreview
                spots={spots}
                view={view}
                selectedSpot={selectedSpot}
                selectedPlaceLead={selectedPlaceLead}
                selectedPlaceSpots={selectedPlaceSpots}
              />
            </aside> : null}
          </>
        )}
      </section>
    </main>
  )
}

function ScheduleEditor({
  weeklyHours,
  holidayMode,
  holidayOpenTime,
  holidayCloseTime,
  holidaySplitOpenTime,
  holidaySplitCloseTime,
  scheduleExceptions,
  onWeeklyHoursChange,
  onHolidayChange,
  onScheduleExceptionsChange,
}: {
  weeklyHours: AdminWeeklyHour[]
  holidayMode: AdminHolidayMode
  holidayOpenTime: string
  holidayCloseTime: string
  holidaySplitOpenTime: string
  holidaySplitCloseTime: string
  scheduleExceptions: AdminScheduleException[]
  onWeeklyHoursChange: (value: AdminWeeklyHour[]) => void
  onHolidayChange: (
    value: Pick<
      AdminSpot,
      | 'holidayMode'
      | 'holidayOpenTime'
      | 'holidayCloseTime'
      | 'holidaySplitOpenTime'
      | 'holidaySplitCloseTime'
    >,
  ) => void
  onScheduleExceptionsChange: (value: AdminScheduleException[]) => void
}) {
  const normalizedWeeklyHours = normalizeWeeklyHours(weeklyHours)
  const [expandedDays, setExpandedDays] = useState<number[]>([])
  const hasHolidaySplit = Boolean(holidaySplitOpenTime || holidaySplitCloseTime)

  function updateWeeklyHour(dayOfWeek: number, patch: Partial<AdminWeeklyHour>) {
    onWeeklyHoursChange(
      normalizedWeeklyHours.map((row) =>
        row.dayOfWeek === dayOfWeek
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    )
  }

  function copyMondayToAll() {
    const monday = normalizedWeeklyHours.find((row) => row.dayOfWeek === 1) ?? normalizedWeeklyHours[0]
    onWeeklyHoursChange(
      normalizedWeeklyHours.map((row) => ({
        ...row,
        isClosed: monday.isClosed,
        openTime: monday.openTime,
        closeTime: monday.closeTime,
        splitOpenTime: monday.splitOpenTime,
        splitCloseTime: monday.splitCloseTime,
      })),
    )
  }

  function clearWeeklyHours() {
    onWeeklyHoursChange(buildDefaultWeeklyHours())
  }

  function toggleDayExpanded(dayOfWeek: number) {
    setExpandedDays((current) =>
      current.includes(dayOfWeek)
        ? current.filter((value) => value !== dayOfWeek)
        : [...current, dayOfWeek],
    )
  }

  function updateException(exceptionId: string, patch: Partial<AdminScheduleException>) {
    onScheduleExceptionsChange(
      scheduleExceptions.map((row) =>
        row.id === exceptionId
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    )
  }

  function addException() {
    onScheduleExceptionsChange([
      ...scheduleExceptions,
      {
        id: `exception-${Date.now()}`,
        date: '',
        isClosed: false,
        openTime: '',
        closeTime: '',
        splitOpenTime: '',
        splitCloseTime: '',
        label: '',
      },
    ])
  }

  function removeException(exceptionId: string) {
    onScheduleExceptionsChange(scheduleExceptions.filter((row) => row.id !== exceptionId))
  }

  return (
    <div className="schedule-editor">
      <div className="schedule-editor-actions">
        <button className="soft-button small-button" onClick={copyMondayToAll} type="button">
          Copiar lunes a todos
        </button>
        <button className="soft-button small-button" onClick={clearWeeklyHours} type="button">
          Limpiar semana
        </button>
      </div>

      <div className="schedule-holiday-block">
        <strong>Regla general para festivos Colombia</strong>
        <p className="schedule-empty-copy">
          La app detecta si hoy es festivo en Colombia y aplica esta regla a la sede.
        </p>
        <div className="schedule-day-actions">
          <label className="field">
            <span>Festivos</span>
            <select
              className="input"
              value={holidayMode}
              onChange={(event) =>
                onHolidayChange({
                  holidayMode: event.target.value as AdminHolidayMode,
                  holidayOpenTime,
                  holidayCloseTime,
                  holidaySplitOpenTime,
                  holidaySplitCloseTime,
                })
              }
            >
              <option value="inherit">Sin regla especial</option>
              <option value="same_as_sunday">Como domingo</option>
              <option value="closed">Cerrado</option>
              <option value="custom">Horario propio</option>
            </select>
          </label>
        </div>

        {holidayMode === 'custom' ? (
          <>
            <div className="schedule-time-row">
              <label className="field">
                <span>Abre festivo</span>
                <input
                  className="input"
                  type="time"
                  value={holidayOpenTime}
                  onChange={(event) =>
                    onHolidayChange({
                      holidayMode,
                      holidayOpenTime: event.target.value,
                      holidayCloseTime,
                      holidaySplitOpenTime,
                      holidaySplitCloseTime,
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Cierra festivo</span>
                <input
                  className="input"
                  type="time"
                  value={holidayCloseTime}
                  onChange={(event) =>
                    onHolidayChange({
                      holidayMode,
                      holidayOpenTime,
                      holidayCloseTime: event.target.value,
                      holidaySplitOpenTime,
                      holidaySplitCloseTime,
                    })
                  }
                />
              </label>
            </div>

            {hasHolidaySplit ? (
              <div className="schedule-time-row">
                <label className="field">
                  <span>Reabre festivo</span>
                  <input
                    className="input"
                    type="time"
                    value={holidaySplitOpenTime}
                    onChange={(event) =>
                      onHolidayChange({
                        holidayMode,
                        holidayOpenTime,
                        holidayCloseTime,
                        holidaySplitOpenTime: event.target.value,
                        holidaySplitCloseTime,
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Cierre final festivo</span>
                  <input
                    className="input"
                    type="time"
                    value={holidaySplitCloseTime}
                    onChange={(event) =>
                      onHolidayChange({
                        holidayMode,
                        holidayOpenTime,
                        holidayCloseTime,
                        holidaySplitOpenTime,
                        holidaySplitCloseTime: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            ) : null}

            <button
              className="soft-button small-button"
              onClick={() =>
                onHolidayChange({
                  holidayMode,
                  holidayOpenTime,
                  holidayCloseTime,
                  holidaySplitOpenTime: hasHolidaySplit ? '' : holidayOpenTime,
                  holidaySplitCloseTime: hasHolidaySplit ? '' : holidayCloseTime,
                })
              }
              type="button"
            >
              {hasHolidaySplit ? 'Quitar pausa festiva' : 'Agregar pausa festiva'}
            </button>
          </>
        ) : null}
      </div>

      <div className="schedule-week-grid">
        {normalizedWeeklyHours.map((row) => {
          const label = weekdayOptions.find((day) => day.value === row.dayOfWeek)?.label ?? ''
          const hasSplit = Boolean(row.splitOpenTime || row.splitCloseTime)
          const expanded = expandedDays.includes(row.dayOfWeek)
          const summary = row.isClosed
            ? 'Cerrado'
            : row.openTime && row.closeTime
              ? `${row.openTime}-${row.closeTime}${hasSplit ? ` / ${row.splitOpenTime}-${row.splitCloseTime}` : ''}`
              : 'Horario pendiente'

          return (
            <article
              key={row.dayOfWeek}
              className={expanded ? 'schedule-day-card expanded' : 'schedule-day-card'}
            >
              <button
                className="schedule-day-toggle"
                onClick={() => toggleDayExpanded(row.dayOfWeek)}
                type="button"
              >
                <div className="schedule-day-title">
                  <strong>{label}</strong>
                  <span className="schedule-day-summary">{summary}</span>
                </div>
                <div className="schedule-day-toggle-right">
                  <span className={row.isClosed ? 'status-pill inactive' : 'status-pill'}>
                    {row.isClosed ? 'Cerrado' : 'Abierto'}
                  </span>
                  <span className="schedule-chevron" aria-hidden="true">
                    {expanded ? '⌃' : '⌄'}
                  </span>
                </div>
              </button>

              {expanded ? (
                <>
                  <div className="schedule-day-header">
                    <Toggle
                      label={row.isClosed ? 'Cerrado' : 'Abierto'}
                      checked={!row.isClosed}
                      onToggle={() =>
                        updateWeeklyHour(row.dayOfWeek, {
                          isClosed: !row.isClosed,
                        })
                      }
                    />
                  </div>

                  {!row.isClosed ? (
                    <>
                      <div className="schedule-time-row">
                        <label className="field">
                          <span>Abre</span>
                          <input
                            className="input"
                            type="time"
                            value={row.openTime}
                            onChange={(event) =>
                              updateWeeklyHour(row.dayOfWeek, { openTime: event.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Cierra</span>
                          <input
                            className="input"
                            type="time"
                            value={row.closeTime}
                            onChange={(event) =>
                              updateWeeklyHour(row.dayOfWeek, { closeTime: event.target.value })
                            }
                          />
                        </label>
                      </div>

                      {hasSplit ? (
                        <div className="schedule-time-row">
                          <label className="field">
                            <span>Reabre</span>
                            <input
                              className="input"
                              type="time"
                              value={row.splitOpenTime}
                              onChange={(event) =>
                                updateWeeklyHour(row.dayOfWeek, { splitOpenTime: event.target.value })
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Cierre final</span>
                            <input
                              className="input"
                              type="time"
                              value={row.splitCloseTime}
                              onChange={(event) =>
                                updateWeeklyHour(row.dayOfWeek, { splitCloseTime: event.target.value })
                              }
                            />
                          </label>
                        </div>
                      ) : null}

                      <div className="schedule-day-actions">
                        <button
                          className="soft-button small-button"
                          onClick={() =>
                            updateWeeklyHour(row.dayOfWeek, {
                              splitOpenTime: hasSplit ? '' : row.openTime,
                              splitCloseTime: hasSplit ? '' : row.closeTime,
                            })
                          }
                          type="button"
                        >
                          {hasSplit ? 'Quitar pausa' : 'Agregar pausa'}
                        </button>
                      </div>
                    </>
                  ) : null}
                </>
              ) : null}
            </article>
          )
        })}
      </div>

      <div className="schedule-exceptions">
        <div className="schedule-exceptions-header">
          <strong>Excepciones por fecha</strong>
          <button className="primary-button small-button" onClick={addException} type="button">
            + Excepción
          </button>
        </div>

        {scheduleExceptions.length ? (
          <div className="schedule-exceptions-list">
            {scheduleExceptions.map((row) => {
              const hasSplit = Boolean(row.splitOpenTime || row.splitCloseTime)

              return (
                <article key={row.id} className="schedule-exception-card">
                  <div className="schedule-exception-header">
                    <label className="field">
                      <span>Fecha</span>
                      <input
                        className="input"
                        type="date"
                        value={row.date}
                        onChange={(event) => updateException(row.id, { date: event.target.value })}
                      />
                    </label>
                    <Toggle
                      label={row.isClosed ? 'Cerrado' : 'Abierto'}
                      checked={!row.isClosed}
                      onToggle={() => updateException(row.id, { isClosed: !row.isClosed })}
                    />
                    <button
                      className="danger-button small-button"
                      onClick={() => removeException(row.id)}
                      type="button"
                    >
                      Eliminar
                    </button>
                  </div>

                  <Field
                    label="Nota"
                    value={row.label}
                    onChange={(value) => updateException(row.id, { label: value })}
                  />

                  {!row.isClosed ? (
                    <>
                      <div className="schedule-time-row">
                        <label className="field">
                          <span>Abre</span>
                          <input
                            className="input"
                            type="time"
                            value={row.openTime}
                            onChange={(event) => updateException(row.id, { openTime: event.target.value })}
                          />
                        </label>
                        <label className="field">
                          <span>Cierra</span>
                          <input
                            className="input"
                            type="time"
                            value={row.closeTime}
                            onChange={(event) => updateException(row.id, { closeTime: event.target.value })}
                          />
                        </label>
                      </div>
                      {hasSplit ? (
                        <div className="schedule-time-row">
                          <label className="field">
                            <span>Reabre</span>
                            <input
                              className="input"
                              type="time"
                              value={row.splitOpenTime}
                              onChange={(event) =>
                                updateException(row.id, { splitOpenTime: event.target.value })
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Cierre final</span>
                            <input
                              className="input"
                              type="time"
                              value={row.splitCloseTime}
                              onChange={(event) =>
                                updateException(row.id, { splitCloseTime: event.target.value })
                              }
                            />
                          </label>
                        </div>
                      ) : null}
                      <button
                        className="soft-button small-button"
                        onClick={() =>
                          updateException(row.id, {
                            splitOpenTime: hasSplit ? '' : row.openTime,
                            splitCloseTime: hasSplit ? '' : row.closeTime,
                          })
                        }
                        type="button"
                      >
                        {hasSplit ? 'Quitar pausa' : 'Agregar pausa'}
                      </button>
                    </>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : (
          <p className="schedule-empty-copy">No hay excepciones cargadas para esta sede.</p>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  suggestions,
  listId,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  suggestions?: string[]
  listId?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="input"
        value={value}
        list={suggestions?.length && listId ? listId : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {suggestions?.length && listId ? (
        <datalist id={listId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      ) : null}
    </label>
  )
}

function ImageField({
  label,
  value,
  onChange,
  storageBase,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  storageBase: string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File | null) {
    if (!file) return

    try {
      setUploading(true)
      const uploadedUrl = await uploadImageToStorage({
        file,
        base: storageBase,
        kind: 'cover',
      })
      onChange(uploadedUrl)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No pudimos subir la imagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="field field-span">
      <span>{label}</span>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
      {value ? (
        <div className="media-preview-single">
          <img src={value} alt={label} className="media-preview-image cover" />
          <button className="soft-button small-button" onClick={() => onChange('')} type="button">
            Quitar cover
          </button>
        </div>
      ) : null}
      <div
        className={uploading ? 'image-dropzone uploading' : 'image-dropzone'}
        onClick={() => {
          if (!uploading) {
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDrop={(event) => {
          event.preventDefault()
          if (uploading) return
          const file = event.dataTransfer.files?.[0] ?? null
          void handleFile(file)
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        <strong>{uploading ? 'Subiendo cover...' : 'Arrastra una imagen aquí'}</strong>
        <span>
          {uploading
            ? 'Estamos subiendo la imagen a Supabase Storage.'
            : 'o haz click para escoger un archivo. La comprimimos y guardamos su URL real.'}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only-input"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          void handleFile(file)
          event.currentTarget.value = ''
        }}
      />
    </div>
  )
}

function GalleryField({
  label,
  value,
  onChange,
  storageBase,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  storageBase: string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const galleryItems = useMemo(() => splitGalleryUrls(value), [value])

  async function handleFiles(fileList: FileList | File[] | null) {
    if (!fileList?.length) return

    try {
      setUploading(true)
      const nextUrls: string[] = []
      for (const file of Array.from(fileList)) {
        const uploadedUrl = await uploadImageToStorage({
          file,
          base: storageBase,
          kind: 'gallery',
        })
        nextUrls.push(uploadedUrl)
      }

      onChange([...galleryItems, ...nextUrls].join(', '))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No pudimos subir la galería')
    } finally {
      setUploading(false)
    }
  }

  function removeGalleryItem(targetUrl: string) {
    onChange(galleryItems.filter((item) => item !== targetUrl).join(', '))
  }

  return (
    <div className="field field-span">
      <span>{label}</span>
      {galleryItems.length ? (
        <div className="gallery-preview-grid">
          {galleryItems.map((item, index) => (
            <article key={`${item}-${index}`} className="gallery-preview-card">
              <img src={item} alt={`Galería ${index + 1}`} className="media-preview-image" />
              <button
                className="gallery-remove-button"
                onClick={() => removeGalleryItem(item)}
                type="button"
              >
                Quitar
              </button>
            </article>
          ))}
        </div>
      ) : null}
      <div
        className={uploading ? 'image-dropzone uploading' : 'image-dropzone'}
        onClick={() => {
          if (!uploading) {
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDrop={(event) => {
          event.preventDefault()
          if (uploading) return
          void handleFiles(event.dataTransfer.files)
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (!uploading) {
              inputRef.current?.click()
            }
          }
        }}
      >
        <strong>{uploading ? 'Subiendo galería...' : 'Arrastra varias imágenes aquí'}</strong>
        <span>
          {uploading
            ? 'Estamos subiendo los archivos a Supabase Storage.'
            : 'o haz click para escoger varias. Guardaremos sus URLs reales en gallery_urls.'}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only-input"
        onChange={(event) => {
          void handleFiles(event.target.files)
          event.currentTarget.value = ''
        }}
      />
      <textarea
        className="input textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="También puedes pegar una o varias URLs separadas por comas"
      />
    </div>
  )
}

function Toggle({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button className="toggle" onClick={onToggle} type="button">
      <span>{label}</span>
      <span className={checked ? 'toggle-track active' : 'toggle-track'}>
        <span className="toggle-thumb" />
      </span>
    </button>
  )
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="section-title">
      <div className="section-title-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  )
}

function AppDetailPreview({
  spots,
  view,
  selectedSpot,
  selectedPlaceLead,
  selectedPlaceSpots,
}: {
  spots: AdminSpot[]
  view: AdminType
  selectedSpot: AdminSpot | null
  selectedPlaceLead: AdminSpot | null
  selectedPlaceSpots: AdminSpot[]
}) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [branchPickerOpen, setBranchPickerOpen] = useState(false)

  const isPlace = view === 'place' && !!selectedPlaceLead
  const detailSpot = (isPlace ? selectedPlaceLead : selectedSpot) ?? emptySpot
  const brandBranches = isPlace ? selectedPlaceSpots : []

  useEffect(() => {
    if (!isPlace || !brandBranches.length) {
      setSelectedBranchId(null)
      return
    }

    setSelectedBranchId((current) =>
      current && brandBranches.some((branch) => branch.id === current)
        ? current
        : brandBranches[0]?.id ?? null,
    )
  }, [brandBranches, isPlace])

  const selectedBranch = useMemo(
    () => (isPlace ? brandBranches.find((branch) => branch.id === selectedBranchId) ?? brandBranches[0] : null),
    [brandBranches, isPlace, selectedBranchId],
  )

  const contextSpot = (isPlace ? selectedBranch : detailSpot) ?? detailSpot
  const openStatus = getPreviewOpenStatus(contextSpot.schedule)
  const similarSpots = useMemo(() => {
    return spots
      .filter((spot) => spot.type === detailSpot.type && spot.category === detailSpot.category)
      .filter((spot) =>
        isPlace
          ? spot.brandName !== detailSpot.brandName
          : spot.id !== detailSpot.id && spot.brandName !== detailSpot.brandName,
      )
      .slice(0, 3)
  }, [detailSpot.brandName, detailSpot.category, detailSpot.id, detailSpot.type, isPlace, spots])

  const hasMenu = Boolean(contextSpot.menuUrl)
  const hasWhatsApp = Boolean(contextSpot.whatsapp)
  const hasPhone = Boolean(contextSpot.phone)
  const hasInstagram = Boolean(contextSpot.instagram)
  const primaryActionLabel = hasWhatsApp
    ? detailSpot.category === 'Restaurantes'
      ? 'Escribir'
      : 'Saber más'
    : hasInstagram
      ? 'Ver Instagram'
      : hasPhone
        ? 'Llamar'
        : 'Cómo llegar'

  return (
    <div className="phone-frame detail-preview-frame">
      <div className="phone-notch" />
      <div className="app-preview-shell">
        <section
          className="app-preview-hero"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(22,14,23,0.12), rgba(22,14,23,0.58)), url(${detailSpot.imageUrl})` }}
        >
          <div className="app-preview-top-actions">
            <button className="app-preview-icon-circle" type="button" aria-label="Volver">
              <img className="preview-icon-asset" src={angleLeftIcon} alt="" aria-hidden="true" />
            </button>
            <div className="app-preview-top-row">
              <button className="app-preview-icon-circle" type="button" aria-label="Like">
                ♡
              </button>
              <button className="app-preview-icon-circle" type="button" aria-label="Compartir">
                ↗
              </button>
            </div>
          </div>

          <div className="app-preview-hero-copy">
            <div className="app-preview-category-chip">{detailSpot.category}</div>
            <h3 className="app-preview-hero-title">{isPlace ? detailSpot.brandName : detailSpot.name}</h3>
            {isPlace && brandBranches.length > 1 ? (
              <div className="app-preview-hero-meta-inline">
                <span>{`${brandBranches.length} sedes:`}</span>
                <span className="app-preview-hero-location-row">
                  <span>⌖</span>
                  <span>{getPreviewPlaceLocationSummary(brandBranches)}</span>
                </span>
              </div>
            ) : (
              <p className="app-preview-hero-subtitle">{getPreviewLocationLabel(detailSpot)}</p>
            )}
          </div>
        </section>

        <section className="app-preview-panel">
          <div className="app-preview-section-stack">
            {isPlace && brandBranches.length ? (
              <section className="app-preview-section-block">
                <button
                  type="button"
                  className="app-preview-branch-selector-card"
                  onClick={() => {
                    if (brandBranches.length > 1) {
                      setBranchPickerOpen(true)
                    }
                  }}
                >
                  <div className="app-preview-branch-selector-main">
                    <strong>{selectedBranch ? getPreviewBranchSelectorTitle(selectedBranch) : 'Escoge una sede'}</strong>
                    <div className="app-preview-branch-status-row">
                      <span>{openStatus?.label ?? 'Horario pendiente'}</span>
                      <span
                        className={
                          openStatus?.tone === 'open'
                            ? 'app-preview-status-dot open'
                            : openStatus?.tone === 'closed'
                              ? 'app-preview-status-dot closed'
                              : 'app-preview-status-dot neutral'
                        }
                      />
                    </div>
                  </div>
                  {brandBranches.length > 1 ? (
                    <div className="app-preview-branch-selector-action">
                      <span>Cambiar sede</span>
                      <span>›</span>
                    </div>
                  ) : null}
                </button>
              </section>
            ) : null}

            <section className="app-preview-section-block">
              <p className="app-preview-body-text">
                {contextSpot.description || 'Agrega una descripción para ver cómo se verá esta sección.'}
              </p>
            </section>

            <section className="app-preview-section-block app-preview-info-block">
              <p className="app-preview-section-eyebrow">Información</p>

              <button type="button" className="app-preview-stat-card clickable app-preview-address-card">
                <div className="app-preview-stat-icon">⌖</div>
                <div className="app-preview-address-copy">
                  <strong>{contextSpot.address || 'Dirección pendiente'}</strong>
                  <span>A {Math.max(0, contextSpot.distanceKm || 0)} km de ti</span>
                </div>
                <span className="app-preview-trailing-icon">↗</span>
              </button>

              <div className="app-preview-schedule-card">
                <div className="app-preview-stat-icon">◷</div>
                <div className="app-preview-schedule-copy">
                  <div className="app-preview-schedule-inline">
                    <span className="app-preview-schedule-label">Hoy</span>
                    <span className="app-preview-schedule-separator">·</span>
                    <strong
                      className={
                        openStatus?.tone === 'open'
                          ? 'app-preview-schedule-value open'
                          : openStatus?.tone === 'closed'
                            ? 'app-preview-schedule-value closed'
                            : 'app-preview-schedule-value'
                      }
                    >
                      {contextSpot.schedule || 'Horario pendiente'}
                    </strong>
                  </div>
                  <span className="app-preview-chevron">⌄</span>
                </div>
              </div>

              <div className="app-preview-compact-stats-row">
                <div className="app-preview-compact-stat">
                  <div className="app-preview-stat-icon">$</div>
                  <strong>{formatBudgetLabel(contextSpot.minPrice)}</strong>
                </div>
                <div className="app-preview-compact-stat app-preview-compact-stat-tight">
                  <div className="app-preview-stat-icon">◉</div>
                  <strong>{contextSpot.maxPeople ? `1-${contextSpot.maxPeople} personas` : 'Pendiente'}</strong>
                </div>
              </div>
            </section>

            {(hasMenu || hasWhatsApp || hasPhone || hasInstagram) ? (
              <section className="app-preview-section-block app-preview-actions-block">
                <p className="app-preview-section-eyebrow">Acciones rápidas</p>
                <div className="app-preview-link-row">
                  {hasMenu ? <button type="button" className="app-preview-link-pill">{getMenuFieldLabel(contextSpot.category)}</button> : null}
                  {hasWhatsApp ? <button type="button" className="app-preview-link-pill">Escribir</button> : null}
                  {hasInstagram ? <button type="button" className="app-preview-link-pill">Instagram</button> : null}
                  {hasPhone ? <button type="button" className="app-preview-link-pill">Llamar</button> : null}
                </div>
              </section>
            ) : null}

            <section className="app-preview-section-block app-preview-similar-section">
              <p className="app-preview-section-eyebrow">Lugares similares</p>
              {similarSpots.length ? (
                <div className="app-preview-similar-row">
                  {similarSpots.map((item) => (
                    <article key={item.id} className="app-preview-similar-card">
                      <div
                        className="app-preview-similar-image"
                        style={{ backgroundImage: `linear-gradient(180deg, rgba(22,14,23,0.12), rgba(22,14,23,0.34)), url(${item.imageUrl})` }}
                      >
                        <div className="app-preview-similar-image-meta">
                          <span className="app-preview-similar-chip">{item.category}</span>
                        </div>
                      </div>
                      <div className="app-preview-similar-body">
                        <strong>{item.brandName || item.name}</strong>
                        <span>{getPreviewLocationLabel(item)}</span>
                        <span>{formatBudgetLabel(item.minPrice)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="app-preview-empty">No encontramos similares por ahora</p>
              )}
            </section>
          </div>
        </section>

        <div className="app-preview-bottom-bar">
          <button type="button" className="app-preview-primary-cta">
            {primaryActionLabel}
          </button>
        </div>

        {branchPickerOpen && isPlace ? (
          <div className="app-preview-selector-overlay">
            <button
              type="button"
              className="app-preview-selector-scrim"
              onClick={() => setBranchPickerOpen(false)}
              aria-label="Cerrar selector"
            />
            <div className="app-preview-selector-sheet">
              <div className="app-preview-selector-handle" />
              <strong className="app-preview-selector-title">Selecciona una sede</strong>
              <div className="app-preview-selector-list">
                {brandBranches.map((branch) => {
                  const branchStatus = getPreviewOpenStatus(branch.schedule)
                  const active = branch.id === selectedBranch?.id
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      className="app-preview-selector-option"
                      onClick={() => {
                        setSelectedBranchId(branch.id)
                        setBranchPickerOpen(false)
                      }}
                    >
                      <div className="app-preview-selector-option-copy">
                        <strong>{getPreviewBranchSelectorTitle(branch)}</strong>
                        <div className="app-preview-selector-option-status">
                          <span>{branchStatus?.label ?? 'Horario pendiente'}</span>
                          <span
                            className={
                              branchStatus?.tone === 'open'
                                ? 'app-preview-status-dot open'
                                : branchStatus?.tone === 'closed'
                                  ? 'app-preview-status-dot closed'
                                  : 'app-preview-status-dot neutral'
                            }
                          />
                        </div>
                      </div>
                      <span className={active ? 'app-preview-radio active' : 'app-preview-radio'} />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4.5" y="5" width="2" height="14" rx="1" fill="currentColor" stroke="none" />
      {collapsed ? (
        <>
          <path d="M11 8.5l3.5 3.5-3.5 3.5" />
          <path d="M15 8.5l3.5 3.5-3.5 3.5" />
        </>
      ) : (
        <>
          <path d="M18.5 8.5L15 12l3.5 3.5" />
          <path d="M14.5 8.5L11 12l3.5 3.5" />
        </>
      )}
    </svg>
  )
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatBudgetLabel(min: number) {
  if (min <= 0) {
    return 'Por definir'
  }

  return `Desde ${formatMoney(min)}`
}

function getPreviewLocationLabel(spot: AdminSpot) {
  return spot.hubName ? `${spot.hubName} · ${spot.neighborhood}` : spot.neighborhood || spot.branchName || 'Cali'
}

function getPreviewPlaceLocationSummary(branches: AdminSpot[]) {
  const labels = Array.from(
    new Set(branches.map((branch) => branch.neighborhood || branch.branchName).filter(Boolean)),
  )

  if (!labels.length) return 'Cali'
  if (labels.length <= 2) return labels.join(', ')
  return `${labels.slice(0, 2).join(', ')} y ${labels.length - 2} más`
}

function getPreviewBranchSelectorTitle(branch: AdminSpot) {
  const titleLabel = branch.neighborhood || branch.branchName || 'Sede'
  return branch.hubName ? `${branch.hubName} - ${titleLabel}` : titleLabel
}

function getPreviewOpenStatus(schedule: string) {
  const currentDay = dayIndexToCode(new Date().getDay())
  const currentMinutes = getCurrentMinutes()
  const segments = schedule
    .replace(/\s*·\s*Horario por confirmar/gi, '')
    .split('·')
    .map((segment) => segment.trim())
    .filter(Boolean)

  let matchedDay = false

  for (const segment of segments) {
    const normalized = segment.replace(/\s+/g, ' ').trim()
    const closedMatch = normalized.match(/^([A-Za-zÁÉÍÓÚáéíóú-]+)\s+Cerrado$/i)
    if (closedMatch) {
      const days = expandDayToken(closedMatch[1])
      if (days.includes(currentDay)) {
        matchedDay = true
        return { label: 'Cerrado ahora', tone: 'closed' as const }
      }
      continue
    }

    const openMatch = normalized.match(
      /^([A-Za-zÁÉÍÓÚáéíóú-]+)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/i,
    )

    if (!openMatch) continue

    const days = expandDayToken(openMatch[1])
    if (!days.includes(currentDay)) continue

    matchedDay = true
    const start = parseTimeToMinutes(openMatch[2])
    const end = parseTimeToMinutes(openMatch[3])
    if (currentMinutes >= start && currentMinutes <= end) {
      return { label: 'Abierto ahora', tone: 'open' as const }
    }
  }

  if (matchedDay) {
    return { label: 'Cerrado ahora', tone: 'closed' as const }
  }

  return null
}

function dayIndexToCode(index: number) {
  return ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'][index] ?? 'Lun'
}

function getCurrentMinutes() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function expandDayToken(token: string) {
  const normalized = token
    .replace(/Mié/gi, 'Mie')
    .replace(/Sáb/gi, 'Sab')
    .replace(/\s/g, '')
  const allDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

  if (normalized.includes('-')) {
    const [start, end] = normalized.split('-')
    const startIndex = allDays.indexOf(start)
    const endIndex = allDays.indexOf(end)
    if (startIndex === -1 || endIndex === -1) return []
    if (startIndex <= endIndex) return allDays.slice(startIndex, endIndex + 1)
    return [...allDays.slice(startIndex), ...allDays.slice(0, endIndex + 1)]
  }

  return allDays.includes(normalized) ? [normalized] : []
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3v-2H7V6h3V4Zm5.59 4.59L17 10l-2 2H9v2h6l2 2-1.41 1.41L11.17 13H9v-2h2.17l4.42-4.41Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default App
