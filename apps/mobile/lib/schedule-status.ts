export type ScheduleStatus = {
  label: 'Abierto ahora' | 'Cerrado ahora' | 'Cerrado temporalmente' | 'Cerrado permanentemente'
  tone: 'open' | 'closed'
}

export type ScheduleDayRow = {
  code: string
  label: string
  value: string
  valueLines: string[]
  isToday: boolean
}

const dayOrder = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'] as const

type RegularDirective =
  | { kind: 'closed'; days: string[] }
  | { kind: 'hours'; days: string[]; ranges: Array<{ start: number; end: number }> }

type HolidayDirective =
  | { kind: 'closed' }
  | { kind: 'same_as_sunday' }
  | { kind: 'hours'; ranges: Array<{ start: number; end: number }> }

const mondayHolidayRestPattern = /^Si el lunes es festivo,\s*descanso\s+([A-Za-zÁÉÍÓÚáéíóú-]+)$/i

export function getScheduleExceptionSegments(schedule: string) {
  return schedule.split('·').map(segment => segment.trim()).filter(segment => mondayHolidayRestPattern.test(segment))
}

function getMondayHolidayRestDays(schedule: string, referenceDate?: Date) {
  if (!referenceDate) return []
  const rules = getScheduleExceptionSegments(schedule)
  if (!rules.length) return []
  const monday = addDays(referenceDate, -((referenceDate.getDay() + 6) % 7))
  if (!isColombianHoliday(monday)) return []
  return rules.flatMap(rule => expandDayToken(rule.match(mondayHolidayRestPattern)![1]))
}

export function getScheduleLabel(schedule: string) {
  return schedule.replace(/\s*·\s*Horario por confirmar/gi, '').trim()
}

export function getScheduleDisplayLabel(schedule: string) {
  return getScheduleLabel(schedule).replace(/\b(\d{1,2}:\d{2})\b/g, (_, value: string) =>
    formatTimeForDisplay(value),
  )
}

export function getOpenStatusFromSchedule(schedule: string, now = new Date(), businessStatus?: string): ScheduleStatus | null {
  if (businessStatus === 'temporarily_closed') return { label: 'Cerrado temporalmente', tone: 'closed' }
  if (businessStatus === 'permanently_closed') return { label: 'Cerrado permanentemente', tone: 'closed' }
  const cleaned = getScheduleLabel(schedule)
  if (!cleaned) {
    return null
  }

  const currentDay = dayIndexToCode(now.getDay())
  const currentMinutes = getCurrentMinutes(now)
  const holidayDirective = getHolidayDirective(cleaned)

  if (getMondayHolidayRestDays(cleaned, now).includes(currentDay)) {
    return { label: 'Cerrado ahora', tone: 'closed' }
  }

  if (isColombianHoliday(now)) {
    if (!holidayDirective) return null
    if (holidayDirective.kind === 'closed') {
      return { label: 'Cerrado ahora', tone: 'closed' }
    }

    if (holidayDirective.kind === 'hours') {
      return isWithinRanges(currentMinutes, holidayDirective.ranges)
        ? { label: 'Abierto ahora', tone: 'open' }
        : { label: 'Cerrado ahora', tone: 'closed' }
    }

    return getStatusForDay(cleaned, 'Dom', currentMinutes, now)
  }

  return getStatusForDay(cleaned, currentDay, currentMinutes, now)
}

export function isScheduleOpenNow(schedule: string, now = new Date()) {
  return getOpenStatusFromSchedule(schedule, now)?.tone === 'open'
}

export function matchesScheduleForDayTime(schedule: string, dayCode: string, targetMinutes: number, referenceDate = new Date()) {
  const cleaned = getScheduleLabel(schedule)
  if (!cleaned) {
    return false
  }

  const directives = getRegularDirectives(cleaned, referenceDate)
  if (isWithinPreviousDayCarryover(cleaned, dayCode, targetMinutes, referenceDate)) return true
  let matchedDay = false

  for (const directive of directives) {
    if (!directive.days.includes(dayCode)) {
      continue
    }

    matchedDay = true

    if (directive.kind === 'closed') {
      return false
    }

    if (isWithinRanges(targetMinutes, directive.ranges)) {
      return true
    }
  }

  return matchedDay ? false : false
}

export function matchesScheduleForHolidayTime(schedule: string, targetMinutes: number) {
  const cleaned = getScheduleLabel(schedule)
  if (!cleaned) {
    return false
  }

  const holidayDirective = getHolidayDirective(cleaned)
  if (!holidayDirective) {
    return false
  }

  if (holidayDirective.kind === 'closed') {
    return false
  }

  if (holidayDirective.kind === 'same_as_sunday') {
    return matchesScheduleForDayTime(cleaned, 'Dom', targetMinutes)
  }

  return isWithinRanges(targetMinutes, holidayDirective.ranges)
}

export function hasScheduleAvailabilityForDay(schedule: string, dayCode: string, referenceDate = new Date()) {
  const cleaned = getScheduleLabel(schedule)
  if (!cleaned) {
    return false
  }

  if (dayCode === 'Festivos') {
    const holidayDirective = getHolidayDirective(cleaned)
    if (!holidayDirective) {
      return false
    }

    if (holidayDirective.kind === 'closed') {
      return false
    }

    if (holidayDirective.kind === 'same_as_sunday') {
      return hasScheduleAvailabilityForDay(cleaned, 'Dom', referenceDate)
    }

    return holidayDirective.ranges.length > 0
  }

  const directives = getRegularDirectives(cleaned, referenceDate)

  for (const directive of directives) {
    if (!directive.days.includes(dayCode)) {
      continue
    }

    if (directive.kind === 'closed') {
      return false
    }

    return directive.ranges.length > 0
  }

  return false
}

function getDisplayedScheduleDate(schedule: string, now: Date) {
  const date = new Date(now)
  // Highlight the opening day of an ongoing shift, not just the calendar day.
  if (!isColombianHoliday(now) && isWithinPreviousDayCarryover(schedule, dayIndexToCode(now.getDay()), getCurrentMinutes(now), now)) {
    date.setDate(date.getDate() - 1)
  }
  return date
}

export function getScheduleDayRows(schedule: string, now = new Date()): ScheduleDayRow[] {
  const cleaned = getScheduleLabel(schedule)
  const displayDate = getDisplayedScheduleDate(cleaned, now)
  const todayCode = dayIndexToCode(displayDate.getDay())
  const festiveToday = isColombianHoliday(displayDate)
  const holidayDirective = festiveToday ? getHolidayDirective(cleaned) : null
  const todayLabel = getTodayScheduleLabel(schedule, now)

  return [
    { code: 'Lun', label: 'Lunes' },
    { code: 'Mar', label: 'Martes' },
    { code: 'Mie', label: 'Miércoles' },
    { code: 'Jue', label: 'Jueves' },
    { code: 'Vie', label: 'Viernes' },
    { code: 'Sab', label: 'Sábado' },
    { code: 'Dom', label: 'Domingo' },
  ].map((day) => ({
    code: day.code,
    label: day.label,
    value: day.code === todayCode
      ? todayLabel || (festiveToday ? getHolidayLabelForToday(cleaned, holidayDirective) : '')
      : getScheduleLabelForDay(cleaned, day.code, displayDate),
    valueLines: splitScheduleValueLines(
      day.code === todayCode
        ? todayLabel || (festiveToday ? getHolidayLabelForToday(cleaned, holidayDirective) : '')
        : getScheduleLabelForDay(cleaned, day.code, displayDate),
    ),
    isToday: day.code === todayCode,
  }))
}

export function getHolidayScheduleRow(schedule: string): ScheduleDayRow {
  const cleaned = getScheduleLabel(schedule)
  // Missing holiday information is not an explicit closure.
  const directive = getHolidayDirective(cleaned)
  let value = 'Por definir'
  if (directive?.kind === 'closed') value = 'No abre'
  if (directive?.kind === 'hours') value = formatRanges(directive.ranges)
  if (directive?.kind === 'same_as_sunday') {
    const sunday = getScheduleLabelForDay(cleaned, 'Dom')
    value = sunday === 'Cerrado' ? 'No abre' : !sunday || sunday === 'Horario por confirmar' ? 'Por definir' : sunday
  }
  return { code: 'Festivos', label: 'Festivos', value, valueLines: splitScheduleValueLines(value), isToday: false }
}

function splitScheduleValueLines(value: string) {
  if (!value) {
    return ['']
  }

  if (!value.includes(' / ')) {
    return [value]
  }

  return value
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function getTodayScheduleLabel(schedule: string, now = new Date()) {
  const cleaned = getScheduleLabel(schedule)
  if (!cleaned) {
    return ''
  }

  const displayDate = getDisplayedScheduleDate(cleaned, now)
  const todayCode = dayIndexToCode(displayDate.getDay())
  if (getMondayHolidayRestDays(cleaned, displayDate).includes(todayCode)) return 'Cerrado · Descanso por lunes festivo'
  const holidayDirective = isColombianHoliday(displayDate) ? getHolidayDirective(cleaned) : null
  if (isColombianHoliday(displayDate) && !holidayDirective) return 'Festivo · Por definir'
  return getHolidayLabelForToday(cleaned, holidayDirective) || getScheduleLabelForDay(cleaned, todayCode, displayDate)
}

function getStatusForDay(schedule: string, dayCode: string, currentMinutes: number, referenceDate?: Date): ScheduleStatus | null {
  const directives = getRegularDirectives(schedule, referenceDate)
  // A closed day can still contain the end of yesterday's overnight shift.
  if (isWithinPreviousDayCarryover(schedule, dayCode, currentMinutes, referenceDate)) {
    return { label: 'Abierto ahora', tone: 'open' }
  }
  let matchedDay = false

  for (const directive of directives) {
    if (!directive.days.includes(dayCode)) {
      continue
    }

    matchedDay = true

    if (directive.kind === 'closed') {
      return { label: 'Cerrado ahora', tone: 'closed' }
    }

    if (isWithinRanges(currentMinutes, directive.ranges)) {
      return { label: 'Abierto ahora', tone: 'open' }
    }
  }

  if (isWithinPreviousDayCarryover(schedule, dayCode, currentMinutes, referenceDate)) {
    return { label: 'Abierto ahora', tone: 'open' }
  }

  return matchedDay ? { label: 'Cerrado ahora', tone: 'closed' } : null
}

function getScheduleLabelForDay(schedule: string, dayCode: string, referenceDate?: Date) {
  const directives = getRegularDirectives(schedule, referenceDate)

  for (const directive of directives) {
    if (!directive.days.includes(dayCode)) {
      continue
    }

    if (directive.kind === 'closed') {
      return 'Cerrado'
    }

    return formatRanges(directive.ranges)
  }

  return 'Horario por confirmar'
}

function getHolidayLabelForToday(schedule: string, holidayDirective: HolidayDirective | null) {
  if (!holidayDirective) {
    return ''
  }

  if (holidayDirective.kind === 'closed') {
    return 'Festivo · Cerrado'
  }

  if (holidayDirective.kind === 'same_as_sunday') {
    const sundayLabel = getScheduleLabelForDay(schedule, 'Dom')
    return sundayLabel ? `Festivo · ${sundayLabel}` : 'Festivo · Como domingo'
  }

  return `Festivo · ${formatRanges(holidayDirective.ranges)}`
}

function getRegularDirectives(schedule: string, referenceDate?: Date): RegularDirective[] {
  const restDays = getMondayHolidayRestDays(schedule, referenceDate)
  const directives = schedule
    .split('·')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map(parseRegularSegment)
    .filter((directive): directive is RegularDirective => directive !== null)
  if (!restDays.length) return directives
  // Remove overridden days as well as closing them, so overnight carryover cannot reopen them.
  return [
    { kind: 'closed', days: restDays },
    ...directives.map(directive => ({ ...directive, days: directive.days.filter(day => !restDays.includes(day)) })),
  ]
}

function parseRegularSegment(segment: string): RegularDirective | null {
  const normalized = segment.replace(/\s+/g, ' ').trim()
  if (!normalized || /^festivos\b/i.test(normalized)) {
    return null
  }

  const closedMatch = normalized.match(/^([A-Za-zÁÉÍÓÚáéíóú-]+)\s+Cerrado$/i)
  if (closedMatch) {
    return {
      kind: 'closed',
      days: expandDayToken(closedMatch[1]),
    }
  }

  const openMatch = normalized.match(/^([A-Za-zÁÉÍÓÚáéíóú-]+)\s+(.+)$/i)
  if (!openMatch) {
    return null
  }

  const ranges = parseTimeRanges(openMatch[2])
  if (!ranges.length) {
    return null
  }

  return {
    kind: 'hours',
    days: expandDayToken(openMatch[1]),
    ranges,
  }
}

function getHolidayDirective(schedule: string): HolidayDirective | null {
  const festiveSegment = schedule
    .split('·')
    .map((segment) => segment.trim())
    .find((segment) => !mondayHolidayRestPattern.test(segment) && /\b(?:festivos?|fest)\b/i.test(segment))

  if (!festiveSegment) {
    return null
  }

  const normalized = festiveSegment.replace(/\s+/g, ' ').trim()
  const directive = normalized.replace(/^.*?\b(?:festivos?|fest)\b\s*/i, '').trim()

  if (/^cerrado$/i.test(directive)) {
    return { kind: 'closed' }
  }

  if (/^como domingo$/i.test(directive)) {
    return { kind: 'same_as_sunday' }
  }

  const ranges = parseTimeRanges(directive)
  if (!ranges.length) {
    return null
  }

  return { kind: 'hours', ranges }
}

function parseTimeRanges(value: string) {
  return value
    .split('/')
    .map((part) => part.trim())
    .map((part) => {
      const match = part.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/)
      if (!match) {
        return null
      }

      return {
        start: parseTimeToMinutes(match[1]),
        end: parseTimeToMinutes(match[2]),
      }
    })
    .filter((range): range is { start: number; end: number } => range !== null)
}

function isWithinRanges(value: number, ranges: Array<{ start: number; end: number }>) {
  return ranges.some((range) => {
    if (range.end >= range.start) {
      return value >= range.start && value < range.end
    }

    // The after-midnight portion belongs to the following calendar day.
    return value >= range.start
  })
}

function isWithinPreviousDayCarryover(schedule: string, dayCode: string, currentMinutes: number, referenceDate?: Date) {
  const directives = getRegularDirectives(schedule, referenceDate)
  const previousDayCode = getPreviousDayCode(dayCode)

  for (const directive of directives) {
    if (directive.kind !== 'hours' || !directive.days.includes(previousDayCode)) {
      continue
    }

    const hasCarryover = directive.ranges.some(
      (range) => range.end < range.start && currentMinutes < range.end,
    )
    if (hasCarryover) {
      return true
    }
  }

  return false
}

function formatRanges(ranges: Array<{ start: number; end: number }>) {
  return ranges
    .map((range) => `${formatMinutes(range.start)}-${formatMinutes(range.end)}`)
    .join(' / ')
}

function formatMinutes(value: number) {
  const hours = String(Math.floor(value / 60)).padStart(2, '0')
  const minutes = String(value % 60).padStart(2, '0')
  return formatTimeForDisplay(`${hours}:${minutes}`)
}

function formatTimeForDisplay(value: string) {
  const [rawHours, rawMinutes] = value.split(':').map(Number)
  if (!Number.isFinite(rawHours) || !Number.isFinite(rawMinutes)) {
    return value
  }

  const period = rawHours >= 12 ? 'p. m.' : 'a. m.'
  const normalizedHours = rawHours % 12 === 0 ? 12 : rawHours % 12
  return `${normalizedHours}:${String(rawMinutes).padStart(2, '0')} ${period}`
}

function dayIndexToCode(dayIndex: number) {
  return dayOrder[dayIndex] ?? 'Lun'
}

function getPreviousDayCode(dayCode: string) {
  const dayIndex = dayOrder.indexOf(dayCode as (typeof dayOrder)[number])
  if (dayIndex === -1) {
    return 'Dom'
  }

  return dayOrder[(dayIndex + dayOrder.length - 1) % dayOrder.length]
}

function expandDayToken(token: string) {
  const normalized = normalizeDayToken(token)
  if (!normalized.includes('-')) {
    return [normalized]
  }

  const [start, end] = normalized.split('-')
  const startIndex = dayOrder.indexOf(start as (typeof dayOrder)[number])
  const endIndex = dayOrder.indexOf(end as (typeof dayOrder)[number])

  if (startIndex === -1 || endIndex === -1) {
    return [normalized]
  }

  if (startIndex <= endIndex) {
    return dayOrder.slice(startIndex, endIndex + 1)
  }

  return [...dayOrder.slice(startIndex), ...dayOrder.slice(0, endIndex + 1)]
}

function normalizeDayToken(value: string) {
  return value
    .replace(/\./g, '')
    .replace(/Mié/gi, 'Mie')
    .replace(/Sáb/gi, 'Sab')
    .replace(/á/gi, 'a')
    .replace(/é/gi, 'e')
    .replace(/í/gi, 'i')
    .replace(/ó/gi, 'o')
    .replace(/ú/gi, 'u')
    .trim()
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function getCurrentMinutes(now: Date) {
  return now.getHours() * 60 + now.getMinutes()
}

function isColombianHoliday(date: Date) {
  const year = date.getFullYear()
  const targetKey = toDateKey(date)
  const easterSunday = getEasterSunday(year)

  const holidays = new Set<string>([
    `${year}-01-01`,
    `${year}-05-01`,
    `${year}-07-20`,
    `${year}-08-07`,
    `${year}-12-08`,
    `${year}-12-25`,
    toDateKey(moveToNextMonday(new Date(year, 0, 6))),
    toDateKey(moveToNextMonday(new Date(year, 2, 19))),
    toDateKey(addDays(easterSunday, -3)),
    toDateKey(addDays(easterSunday, -2)),
    toDateKey(moveToNextMonday(addDays(easterSunday, 39))),
    toDateKey(moveToNextMonday(addDays(easterSunday, 60))),
    toDateKey(moveToNextMonday(addDays(easterSunday, 68))),
    toDateKey(moveToNextMonday(new Date(year, 5, 29))),
    toDateKey(moveToNextMonday(new Date(year, 7, 15))),
    toDateKey(moveToNextMonday(new Date(year, 9, 12))),
    toDateKey(moveToNextMonday(new Date(year, 10, 1))),
    toDateKey(moveToNextMonday(new Date(year, 10, 11))),
  ])

  return holidays.has(targetKey)
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function moveToNextMonday(date: Date) {
  const result = new Date(date)
  while (result.getDay() !== 1) {
    result.setDate(result.getDate() + 1)
  }
  return result
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getEasterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}
