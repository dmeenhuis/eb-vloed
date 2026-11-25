import type { ISODate } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today(): ISODate {
  return toISO(new Date())
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

/** Whole calendar days from a to b (b - a). DST-safe. */
export function diffDays(a: ISODate, b: ISODate): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

export function isValidISO(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && toISO(fromISO(iso)) === iso
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('nl-NL', opts)
const weekdayLong = fmt({ weekday: 'long' })
const dayMonth = fmt({ day: 'numeric', month: 'long' })
const dayMonthShort = fmt({ day: 'numeric', month: 'short' })
const dayMonthYear = fmt({ day: 'numeric', month: 'long', year: 'numeric' })
const monthYear = fmt({ month: 'long', year: 'numeric' })
const weekdayShort = fmt({ weekday: 'short' })

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const formatWeekday = (iso: ISODate) => cap(weekdayLong.format(fromISO(iso)))
export const formatWeekdayShort = (iso: ISODate) => weekdayShort.format(fromISO(iso)).replace('.', '')
export const formatDayMonth = (iso: ISODate) => dayMonth.format(fromISO(iso))
export const formatDayMonthShort = (iso: ISODate) => dayMonthShort.format(fromISO(iso)).replace('.', '')
export const formatDayMonthYear = (iso: ISODate) => dayMonthYear.format(fromISO(iso))
export const formatMonthYear = (d: Date) => cap(monthYear.format(d))

export function relativeDayLabel(iso: ISODate, ref: ISODate = today()): string | undefined {
  const d = diffDays(ref, iso)
  if (d === 0) return 'Vandaag'
  if (d === -1) return 'Gisteren'
  if (d === -2) return 'Eergisteren'
  return undefined
}

/** Days of the calendar grid for a month, weeks starting on Monday. */
export function monthGrid(year: number, month: number): ISODate[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const start = toISO(new Date(year, month, 1 - offset))
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7
  return Array.from({ length: cells }, (_, i) => addDays(start, i))
}
