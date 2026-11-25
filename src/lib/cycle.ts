import { addDays, diffDays } from './date'
import { isBleeding } from './fields'
import type { DayEntry, ISODate, Phase, Settings } from './types'

export interface Cycle {
  start: ISODate
  /** Last day of the cycle; undefined for the current (open) cycle. */
  end?: ISODate
  /** Length in days, only for completed cycles. */
  length?: number
  /** Consecutive days of real bleeding starting at day 1, if logged. */
  periodDays?: number
}

export interface CycleStats {
  avgCycleLength: number
  cycleLengthFromData: boolean
  sampleSize: number
  minLength?: number
  maxLength?: number
  avgPeriodLength?: number
  lastStart?: ISODate
  nextPeriod?: ISODate
}

export interface DayCycleInfo {
  cycleDay: number
  cycleStart: ISODate
  /** Actual length for completed cycles, expected length otherwise. */
  length: number
  ovulationDay: number
  menstruationDays: number
  phase: Phase
  /** Date lies in the future: everything is a prediction. */
  predicted: boolean
  /** The current cycle is already longer than expected. */
  overdue: boolean
}

export interface CycleModel {
  cycles: Cycle[]
  stats: CycleStats
  infoFor(date: ISODate): DayCycleInfo | null
  /** Expected (future) period day, for calendar hints. */
  isPredictedPeriod(date: ISODate): boolean
}

const MAX_SAMPLE = 6
const MIN_VALID = 15
const MAX_VALID = 60

export function periodStarts(entries: Iterable<DayEntry>): ISODate[] {
  const starts: ISODate[] = []
  for (const e of entries) if (e.periodStart) starts.push(e.date)
  return starts.sort()
}

function countPeriodDays(start: ISODate, end: ISODate | undefined, byDate: Map<ISODate, DayEntry>): number | undefined {
  if (!byDate.get(start)?.bleeding) return undefined
  let n = 0
  let d = start
  while ((!end || d <= end) && isBleeding(byDate.get(d)?.bleeding)) {
    n++
    d = addDays(d, 1)
  }
  return Math.max(n, 1)
}

export function phaseFor(cycleDay: number, length: number, menstruationDays: number, lutealDays: number): { phase: Phase; ovulationDay: number } {
  const ovulationDay = Math.max(length - lutealDays, menstruationDays + 1)
  let phase: Phase
  if (cycleDay <= menstruationDays) phase = 'menstruatie'
  else if (cycleDay < ovulationDay) phase = 'folliculair'
  else if (cycleDay === ovulationDay) phase = 'ovulatie'
  else phase = 'luteaal'
  return { phase, ovulationDay }
}

export function buildCycleModel(byDate: Map<ISODate, DayEntry>, settings: Settings, todayISO: ISODate): CycleModel {
  const starts = periodStarts(byDate.values())

  const cycles: Cycle[] = starts.map((start, i) => {
    const next = starts[i + 1]
    const end = next ? addDays(next, -1) : undefined
    return {
      start,
      end,
      length: next ? diffDays(start, next) : undefined,
      periodDays: countPeriodDays(start, end, byDate),
    }
  })

  const lengths = cycles
    .map((c) => c.length)
    .filter((l): l is number => l !== undefined && l >= MIN_VALID && l <= MAX_VALID)
    .slice(-MAX_SAMPLE)
  const periodLengths = cycles.map((c) => c.periodDays).filter((l): l is number => l !== undefined).slice(-MAX_SAMPLE)

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const avgCycleLength = lengths.length ? Math.round(avg(lengths)) : settings.defaultCycleLength
  const lastStart = starts.at(-1)

  let nextPeriod: ISODate | undefined
  if (lastStart) {
    nextPeriod = addDays(lastStart, avgCycleLength)
    if (nextPeriod <= todayISO) nextPeriod = addDays(todayISO, 1)
  }

  const stats: CycleStats = {
    avgCycleLength,
    cycleLengthFromData: lengths.length > 0,
    sampleSize: lengths.length,
    minLength: lengths.length ? Math.min(...lengths) : undefined,
    maxLength: lengths.length ? Math.max(...lengths) : undefined,
    avgPeriodLength: periodLengths.length ? Math.round(avg(periodLengths) * 10) / 10 : undefined,
    lastStart,
    nextPeriod,
  }

  const cycleByStart = new Map(cycles.map((c) => [c.start, c]))

  function describe(cycleStart: ISODate, cycleDay: number, length: number, predicted: boolean, periodDays?: number): DayCycleInfo {
    const menstruationDays = Math.max(settings.menstruationPhaseDays, periodDays ?? 0)
    const { phase, ovulationDay } = phaseFor(cycleDay, length, menstruationDays, settings.lutealPhaseDays)
    return { cycleDay, cycleStart, length, ovulationDay, menstruationDays, phase, predicted, overdue: !predicted && cycleDay > length }
  }

  function infoFor(date: ISODate): DayCycleInfo | null {
    if (!lastStart || date < starts[0]) return null

    // Index of the last start on or before date.
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid] <= date) lo = mid
      else hi = mid - 1
    }
    const start = starts[lo]
    const cycle = cycleByStart.get(start)!
    const cycleDay = diffDays(start, date) + 1

    if (cycle.length !== undefined) return describe(start, cycleDay, cycle.length, false, cycle.periodDays)

    // Current, open cycle.
    if (date <= todayISO) return describe(start, cycleDay, avgCycleLength, false, cycle.periodDays)

    const next = nextPeriod!
    if (date < next) return describe(start, cycleDay, diffDays(start, next), true, cycle.periodDays)
    const k = diffDays(next, date)
    const projectedStart = addDays(next, Math.floor(k / avgCycleLength) * avgCycleLength)
    return describe(projectedStart, (k % avgCycleLength) + 1, avgCycleLength, true)
  }

  const predictedPeriodDays = Math.round(stats.avgPeriodLength ?? 3)

  function isPredictedPeriod(date: ISODate): boolean {
    if (date <= todayISO) return false
    const info = infoFor(date)
    return !!info && info.predicted && info.cycleStart !== lastStart && info.cycleDay <= predictedPeriodDays
  }

  return { cycles, stats, infoFor, isPredictedPeriod }
}
