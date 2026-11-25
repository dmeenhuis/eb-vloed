import { diffDays } from './date'
import type { DayEntry, ISODate, MedId, MedSchedule } from './types'

export interface MedStatus {
  scheduled: boolean
  /** e.g. "Kuurdag 3/14" or "Stopperiode" */
  hint?: string
  /** Days until the next change (start or stop) of a cyclic schedule. */
  daysUntilChange?: number
}

export function medStatus(med: MedSchedule, date: ISODate): MedStatus {
  if (!med.enabled) return { scheduled: false }
  if (med.type === 'daily') return { scheduled: true }
  const period = med.daysOn + med.daysOff
  const diff = diffDays(med.startDate, date)
  if (diff < 0 || period <= 0) return { scheduled: false, hint: 'Nog niet gestart' }
  const pos = diff % period
  if (pos < med.daysOn) {
    return { scheduled: true, hint: `Kuurdag ${pos + 1}/${med.daysOn}`, daysUntilChange: med.daysOn - pos }
  }
  return { scheduled: false, hint: `Stopdag ${pos - med.daysOn + 1}/${med.daysOff}`, daysUntilChange: period - pos }
}

/** What was (or should be) taken: explicit value if logged, otherwise the schedule. */
export function medTaken(med: MedSchedule, date: ISODate, entry?: DayEntry): boolean {
  return entry?.meds?.[med.id] ?? medStatus(med, date).scheduled
}

export function scheduledMeds(meds: MedSchedule[], date: ISODate): Partial<Record<MedId, boolean>> {
  return Object.fromEntries(meds.filter((m) => m.enabled).map((m) => [m.id, medStatus(m, date).scheduled]))
}
