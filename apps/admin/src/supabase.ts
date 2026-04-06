import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AdminScheduleException, AdminSpot, AdminWeeklyHour } from './seed-spots'

type SpotRow = {
  id: number
  type: 'place' | 'event'
  slug: string
  name: string
  short_description: string
  cover_image_url: string
  gallery_urls: string[] | null
  category: string
  city: string
  likes: string
  tags: string[] | null
  moods: string[] | null
  is_active: boolean | null
  is_featured: boolean | null
}

type BranchRow = {
  id: number
  spot_id: number
  slug: string
  neighborhood: string
  mall: string
  hours: string
  holiday_mode: 'inherit' | 'same_as_sunday' | 'closed' | 'custom'
  holiday_open_time: string | null
  holiday_close_time: string | null
  holiday_split_open_time: string | null
  holiday_split_close_time: string | null
  address: string
  min_budget: number
  max_budget?: number
  max_people: number
  menu_url: string
  whatsapp: string
  phone: string
  instagram: string
  latitude: number | null
  longitude: number | null
  is_active: boolean | null
  sort_order: number | null
}

type BranchHourRow = {
  id: number
  branch_id: number
  day_of_week: number
  is_closed: boolean
  open_time: string | null
  close_time: string | null
  split_open_time: string | null
  split_close_time: string | null
  sort_order: number | null
}

type BranchScheduleExceptionRow = {
  id: number
  branch_id: number
  exception_date: string
  is_closed: boolean
  open_time: string | null
  close_time: string | null
  split_open_time: string | null
  split_close_time: string | null
  label: string
}

const spotSelectColumns =
  'id,type,slug,name,short_description,cover_image_url,gallery_urls,category,city,likes,tags,moods,is_active,is_featured'
const branchSelectColumns =
  'id,spot_id,slug,neighborhood,mall,hours,holiday_mode,holiday_open_time,holiday_close_time,holiday_split_open_time,holiday_split_close_time,address,min_budget,max_budget,max_people,menu_url,whatsapp,phone,instagram,latitude,longitude,is_active,sort_order'
const branchHourSelectColumns =
  'id,branch_id,day_of_week,is_closed,open_time,close_time,split_open_time,split_close_time,sort_order'
const branchScheduleExceptionSelectColumns =
  'id,branch_id,exception_date,is_closed,open_time,close_time,split_open_time,split_close_time,label'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const backendEnabled = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = backendEnabled
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

function getPrimarySpotImage(
  coverImageUrl: string,
  galleryUrls: string[] | null,
) {
  const firstGalleryImage = galleryUrls?.find(
    (url) => typeof url === 'string' && url.trim().length > 0,
  )?.trim()

  return firstGalleryImage || coverImageUrl || ''
}

export function mapRowsToAdminSpots(
  spots: SpotRow[],
  branches: BranchRow[],
  branchHours: BranchHourRow[],
  branchScheduleExceptions: BranchScheduleExceptionRow[],
): AdminSpot[] {
  const branchesBySpot = new Map<number, BranchRow[]>()
  const branchHoursByBranch = new Map<number, BranchHourRow[]>()
  const exceptionsByBranch = new Map<number, BranchScheduleExceptionRow[]>()
  const adminSpots: AdminSpot[] = []

  branches.forEach((branch) => {
    const current = branchesBySpot.get(branch.spot_id)
    if (current) {
      current.push(branch)
    } else {
      branchesBySpot.set(branch.spot_id, [branch])
    }
  })

  branchHours.forEach((row) => {
    const current = branchHoursByBranch.get(row.branch_id)
    if (current) {
      current.push(row)
    } else {
      branchHoursByBranch.set(row.branch_id, [row])
    }
  })

  branchScheduleExceptions.forEach((row) => {
    const current = exceptionsByBranch.get(row.branch_id)
    if (current) {
      current.push(row)
    } else {
      exceptionsByBranch.set(row.branch_id, [row])
    }
  })

  spots.forEach((spot) => {
    const spotBranches = (branchesBySpot.get(spot.id) ?? []).sort(
      (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0),
    )

    if (!spotBranches.length) {
      adminSpots.push({
          id: spot.slug,
          spotId: spot.id,
          branchId: null,
          placeSlug: spot.slug,
          branchSlug: '',
          type: spot.type,
          name: spot.name,
          brandName: spot.name,
          branchName: '',
          neighborhood: '',
          hubName: '',
          category: spot.category,
          city: spot.city,
          imageUrl: getPrimarySpotImage(spot.cover_image_url, spot.gallery_urls),
          galleryUrls: (spot.gallery_urls ?? []).join(','),
          interests: '',
          minPrice: 0,
          maxPrice: 0,
          schedule: '',
          instagram: '',
          whatsapp: '',
          phone: '',
          menuUrl: '',
          tags: (spot.tags ?? []).join(','),
          moods: (spot.moods ?? []).join(','),
          likeCount: parseLikes(spot.likes),
          distanceKm: 0,
          active: spot.is_active ?? true,
          featured: spot.is_featured ?? false,
          description: spot.short_description,
          shortDescription: spot.short_description,
          address: '',
          maxPeople: 1,
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
        })
      return
    }

    spotBranches.forEach((branch) => {
      const weeklyHours = ((branchHoursByBranch.get(branch.id) ?? []).sort(
        (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0),
      )).map(mapBranchHourRow)
      const scheduleExceptions = ((exceptionsByBranch.get(branch.id) ?? []).sort(
        (left, right) => left.exception_date.localeCompare(right.exception_date, 'es'),
      )).map(mapBranchScheduleExceptionRow)

      adminSpots.push({
        id: branch.slug,
        spotId: spot.id,
        branchId: branch.id,
        placeSlug: spot.slug,
        branchSlug: branch.slug,
        type: spot.type,
        name: spot.name,
        brandName: spot.name,
        branchName: branch.neighborhood,
        neighborhood: branch.neighborhood,
        hubName: branch.mall,
        category: spot.category,
        city: spot.city,
        imageUrl: getPrimarySpotImage(spot.cover_image_url, spot.gallery_urls),
        galleryUrls: (spot.gallery_urls ?? []).join(','),
        interests: '',
        minPrice: branch.min_budget,
        maxPrice: branch.max_budget ?? branch.min_budget,
        schedule: branch.hours,
        holidayMode: branch.holiday_mode ?? 'inherit',
        holidayOpenTime: branch.holiday_open_time ?? '',
        holidayCloseTime: branch.holiday_close_time ?? '',
        holidaySplitOpenTime: branch.holiday_split_open_time ?? '',
        holidaySplitCloseTime: branch.holiday_split_close_time ?? '',
        instagram: branch.instagram,
        whatsapp: branch.whatsapp,
        phone: branch.phone,
        menuUrl: branch.menu_url,
        tags: (spot.tags ?? []).join(','),
        moods: (spot.moods ?? []).join(','),
        likeCount: parseLikes(spot.likes),
        distanceKm: 0,
        active: branch.is_active ?? true,
        featured: spot.is_featured ?? false,
        description: spot.short_description,
        shortDescription: spot.short_description,
        address: branch.address,
        maxPeople: branch.max_people,
        days: '',
        latitude: branch.latitude != null ? String(branch.latitude) : '',
        longitude: branch.longitude != null ? String(branch.longitude) : '',
        weeklyHours,
        scheduleExceptions,
      })
    })
  })

  return adminSpots
}

export async function fetchRemoteSpots(client: SupabaseClient): Promise<AdminSpot[]> {
  const [
    { data: spots, error: spotsError },
    { data: branches, error: branchesError },
    { data: branchHours, error: branchHoursError },
    { data: branchScheduleExceptions, error: branchScheduleExceptionsError },
  ] =
    await Promise.all([
      client.from('spots').select(spotSelectColumns).order('id', { ascending: true }),
      client.from('spot_branches').select(branchSelectColumns).order('sort_order', { ascending: true }),
      client
        .from('spot_branch_hours')
        .select(branchHourSelectColumns)
        .order('sort_order', { ascending: true }),
      client
        .from('spot_branch_schedule_exceptions')
        .select(branchScheduleExceptionSelectColumns)
        .order('exception_date', { ascending: true }),
    ])

  if (spotsError) {
    throw spotsError
  }

  if (branchesError) {
    throw branchesError
  }

  if (branchHoursError) {
    throw branchHoursError
  }

  if (branchScheduleExceptionsError) {
    throw branchScheduleExceptionsError
  }

  return mapRowsToAdminSpots(
    (spots as SpotRow[]) ?? [],
    (branches as BranchRow[]) ?? [],
    (branchHours as BranchHourRow[]) ?? [],
    (branchScheduleExceptions as BranchScheduleExceptionRow[]) ?? [],
  )
}

export async function upsertPlaceGroup(
  client: SupabaseClient,
  lead: AdminSpot,
  branches: AdminSpot[],
) {
  const spotPayload = {
    id: lead.spotId ?? undefined,
    type: lead.type,
    slug: lead.placeSlug || lead.id,
    name: lead.name || lead.brandName,
    short_description: lead.shortDescription,
    cover_image_url: lead.imageUrl,
    gallery_urls: splitCsvField(lead.galleryUrls),
    category: lead.category,
    city: lead.city,
    likes: formatCompactLikes(lead.likeCount),
    tags: splitCsvField(lead.tags),
    moods: splitCsvField(lead.moods),
    is_active: lead.active,
    is_featured: lead.featured,
  }

  const { data: savedSpot, error: spotError } = await client
    .from('spots')
    .upsert(spotPayload, { onConflict: 'slug' })
    .select('id, slug')
    .single()

  if (spotError || !savedSpot) {
    throw new Error(`${lead.placeSlug || lead.id}: ${spotError?.message ?? 'No pudimos guardar el lugar'}`)
  }

  for (const [index, branch] of branches.entries()) {
    const branchPayload = {
      id: branch.branchId ?? undefined,
      spot_id: savedSpot.id,
      slug: branch.branchSlug || branch.id,
      neighborhood: branch.neighborhood,
      mall: branch.hubName,
      hours: branch.schedule,
      holiday_mode: branch.holidayMode,
      holiday_open_time: branch.holidayOpenTime || null,
      holiday_close_time: branch.holidayCloseTime || null,
      holiday_split_open_time: branch.holidaySplitOpenTime || null,
      holiday_split_close_time: branch.holidaySplitCloseTime || null,
      address: branch.address,
      min_budget: branch.minPrice,
      max_people: branch.maxPeople,
      menu_url: branch.menuUrl,
      whatsapp: branch.whatsapp,
      phone: branch.phone,
      instagram: branch.instagram,
      latitude: parseNullableNumber(branch.latitude),
      longitude: parseNullableNumber(branch.longitude),
      is_active: branch.active,
      sort_order: index,
    }

    const { data: savedBranch, error } = await client
      .from('spot_branches')
      .upsert(branchPayload, { onConflict: 'slug' })
      .select('id')
      .single()

    if (error || !savedBranch) {
      throw new Error(`${branch.branchSlug || branch.id}: ${error.message}`)
    }

    await replaceBranchSchedules(client, savedBranch.id, branch.weeklyHours, branch.scheduleExceptions)
  }
}

export async function upsertEventSpot(client: SupabaseClient, spot: AdminSpot) {
  const spotPayload = {
    id: spot.spotId ?? undefined,
    type: spot.type,
    slug: spot.placeSlug || spot.id,
    name: spot.name || spot.brandName,
    short_description: spot.shortDescription,
    cover_image_url: spot.imageUrl,
    gallery_urls: splitCsvField(spot.galleryUrls),
    category: spot.category,
    city: spot.city,
    likes: formatCompactLikes(spot.likeCount),
    tags: splitCsvField(spot.tags),
    moods: splitCsvField(spot.moods),
    is_active: spot.active,
    is_featured: spot.featured,
  }

  const { data: savedSpot, error: spotError } = await client
    .from('spots')
    .upsert(spotPayload, { onConflict: 'slug' })
    .select('id, slug')
    .single()

  if (spotError || !savedSpot) {
    throw new Error(`${spot.placeSlug || spot.id}: ${spotError?.message ?? 'No pudimos guardar el parche'}`)
  }

  const branchPayload = {
    id: spot.branchId ?? undefined,
    spot_id: savedSpot.id,
    slug: spot.branchSlug || spot.placeSlug || spot.id,
    neighborhood: spot.neighborhood,
    mall: spot.hubName,
    hours: spot.schedule,
    holiday_mode: spot.holidayMode,
    holiday_open_time: spot.holidayOpenTime || null,
    holiday_close_time: spot.holidayCloseTime || null,
    holiday_split_open_time: spot.holidaySplitOpenTime || null,
    holiday_split_close_time: spot.holidaySplitCloseTime || null,
    address: spot.address,
    min_budget: spot.minPrice,
    max_people: spot.maxPeople,
    menu_url: spot.menuUrl,
    whatsapp: spot.whatsapp,
    phone: spot.phone,
    instagram: spot.instagram,
    latitude: parseNullableNumber(spot.latitude),
    longitude: parseNullableNumber(spot.longitude),
    is_active: spot.active,
    sort_order: 0,
  }

  const { data: savedBranch, error: branchError } = await client
    .from('spot_branches')
    .upsert(branchPayload, { onConflict: 'slug' })
    .select('id')
    .single()

  if (branchError || !savedBranch) {
    throw new Error(`${spot.branchSlug || spot.id}: ${branchError.message}`)
  }

  await replaceBranchSchedules(client, savedBranch.id, spot.weeklyHours, spot.scheduleExceptions)
}

export async function deleteSpot(client: SupabaseClient, spotId: number) {
  const { error } = await client.from('spots').delete().eq('id', spotId)

  if (error) {
    throw error
  }
}

export async function deleteBranch(client: SupabaseClient, branchId: number) {
  const { error } = await client.from('spot_branches').delete().eq('id', branchId)

  if (error) {
    throw error
  }
}

function splitCsvField(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseNullableNumber(value: string) {
  const normalized = value.trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function mapBranchHourRow(row: BranchHourRow): AdminWeeklyHour {
  return {
    id: String(row.id),
    dayOfWeek: row.day_of_week,
    isClosed: row.is_closed,
    openTime: row.open_time ?? '',
    closeTime: row.close_time ?? '',
    splitOpenTime: row.split_open_time ?? '',
    splitCloseTime: row.split_close_time ?? '',
  }
}

function mapBranchScheduleExceptionRow(row: BranchScheduleExceptionRow): AdminScheduleException {
  return {
    id: String(row.id),
    date: row.exception_date,
    isClosed: row.is_closed,
    openTime: row.open_time ?? '',
    closeTime: row.close_time ?? '',
    splitOpenTime: row.split_open_time ?? '',
    splitCloseTime: row.split_close_time ?? '',
    label: row.label,
  }
}

async function replaceBranchSchedules(
  client: SupabaseClient,
  branchId: number,
  weeklyHours: AdminWeeklyHour[],
  scheduleExceptions: AdminScheduleException[],
) {
  const { error: deleteHoursError } = await client
    .from('spot_branch_hours')
    .delete()
    .eq('branch_id', branchId)

  if (deleteHoursError) {
    throw deleteHoursError
  }

  const activeWeeklyHours = weeklyHours.filter(
    (row) =>
      row.isClosed || row.openTime || row.closeTime || row.splitOpenTime || row.splitCloseTime,
  )

  if (activeWeeklyHours.length > 0) {
    const { error: insertHoursError } = await client.from('spot_branch_hours').insert(
      activeWeeklyHours.map((row, index) => ({
        branch_id: branchId,
        day_of_week: row.dayOfWeek,
        is_closed: row.isClosed,
        open_time: row.openTime || null,
        close_time: row.closeTime || null,
        split_open_time: row.splitOpenTime || null,
        split_close_time: row.splitCloseTime || null,
        sort_order: index,
      })),
    )

    if (insertHoursError) {
      throw insertHoursError
    }
  }

  const { error: deleteExceptionsError } = await client
    .from('spot_branch_schedule_exceptions')
    .delete()
    .eq('branch_id', branchId)

  if (deleteExceptionsError) {
    throw deleteExceptionsError
  }

  const activeExceptions = scheduleExceptions.filter(
    (row) =>
      row.date &&
      (row.isClosed || row.openTime || row.closeTime || row.splitOpenTime || row.splitCloseTime || row.label),
  )

  if (activeExceptions.length > 0) {
    const { error: insertExceptionsError } = await client
      .from('spot_branch_schedule_exceptions')
      .insert(
        activeExceptions.map((row) => ({
          branch_id: branchId,
          exception_date: row.date,
          is_closed: row.isClosed,
          open_time: row.openTime || null,
          close_time: row.closeTime || null,
          split_open_time: row.splitOpenTime || null,
          split_close_time: row.splitCloseTime || null,
          label: row.label,
        })),
      )

    if (insertExceptionsError) {
      throw insertExceptionsError
    }
  }
}

function parseLikes(value: string) {
  const normalized = value.trim().toUpperCase()
  if (normalized.endsWith('K')) {
    return Math.round(Number(normalized.replace('K', '')) * 1000)
  }

  return Number(normalized) || 0
}

function formatCompactLikes(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`
  }

  return String(value)
}
