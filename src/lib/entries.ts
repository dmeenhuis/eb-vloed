import { scheduledMeds } from './meds'
import type { DayEntry, MedSchedule, Settings } from './types'
import { DEFAULT_SETTINGS } from './fields'

const hasValues = (o?: object) => !!o && Object.values(o).some((v) => v !== undefined)

/** An entry is worth keeping if it holds anything besides the default medication schedule. */
export function isMeaningful(e: DayEntry, meds: MedSchedule[]): boolean {
  if (e.periodStart || e.bleeding || e.notes?.trim() || hasValues(e.scores) || hasValues(e.symptoms)) return true
  const planned = scheduledMeds(meds, e.date)
  return Object.entries(e.meds ?? {}).some(([id, v]) => v !== undefined && v !== (planned[id as keyof typeof planned] ?? false))
}

/** Strip undefined keys so stored objects stay small and comparisons are simple. */
export function clean(e: DayEntry): DayEntry {
  const strip = <T extends object>(o?: T) => {
    if (!o) return undefined
    const r = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T
    return Object.keys(r).length ? r : undefined
  }
  const out: DayEntry = { date: e.date, updatedAt: e.updatedAt }
  if (e.periodStart) out.periodStart = true
  if (e.bleeding) out.bleeding = e.bleeding
  const meds = strip(e.meds)
  if (meds) out.meds = meds
  const scores = strip(e.scores)
  if (scores) out.scores = scores
  const symptoms = strip(e.symptoms)
  if (symptoms) out.symptoms = symptoms
  if (e.notes?.trim()) out.notes = e.notes
  return out
}

/** Fields present in `incoming` win; everything else is kept. */
export function mergeEntry(existing: DayEntry | undefined, incoming: DayEntry): DayEntry {
  if (!existing) return incoming
  return clean({
    ...existing,
    ...Object.fromEntries(Object.entries(incoming).filter(([, v]) => v !== undefined)),
    meds: { ...existing.meds, ...incoming.meds },
    scores: { ...existing.scores, ...incoming.scores },
    symptoms: { ...existing.symptoms, ...incoming.symptoms },
    updatedAt: Date.now(),
  })
}

/** Placeholder doses from earlier versions that should be replaced by the current default. */
const LEGACY_DOSES: Partial<Record<MedSchedule['id'], string>> = { testosteron: 'Dagelijks' }

export function normalizeSettings(s?: Partial<Settings>): Settings {
  const meds = DEFAULT_SETTINGS.meds.map((def) => {
    const med = { ...def, ...s?.meds?.find((m) => m.id === def.id) }
    if (med.dose === LEGACY_DOSES[med.id]) med.dose = def.dose
    return med
  })
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    meds,
    symptoms: Array.isArray(s?.symptoms) ? s.symptoms : DEFAULT_SETTINGS.symptoms,
    customSymptoms: Array.isArray(s?.customSymptoms) ? s.customSymptoms : [],
  }
}
