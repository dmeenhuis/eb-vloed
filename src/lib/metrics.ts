import { addDays, diffDays, formatDayMonthShort } from './date'
import { SCORES } from './fields'
import { symptomLabel } from './symptoms'
import type { DayEntry, ISODate, Settings } from './types'

export interface Metric {
  id: string
  label: string
  kind: 'score' | 'symptom'
  min: number
  max: number
  get(e?: DayEntry): number | undefined
}

/** Tracked symptoms first (in their order), then untracked ones that still have recorded values. */
export function reportedSymptoms(settings: Settings, entries: Map<ISODate, DayEntry>): string[] {
  const withData = new Set<string>()
  for (const e of entries.values()) for (const [id, v] of Object.entries(e.symptoms ?? {})) if (v !== undefined) withData.add(id)
  const extra = [...withData].filter((id) => !settings.symptoms.includes(id)).sort((a, b) => symptomLabel(a, settings).localeCompare(symptomLabel(b, settings)))
  return [...settings.symptoms, ...extra]
}

export function getMetrics(settings: Settings, entries: Map<ISODate, DayEntry>): Metric[] {
  return [
    ...SCORES.map((s): Metric => ({ id: s.id, label: s.label, kind: 'score', min: 1, max: 5, get: (e) => e?.scores?.[s.id] })),
    ...reportedSymptoms(settings, entries).map(
      (id): Metric => ({ id, label: symptomLabel(id, settings), kind: 'symptom', min: 0, max: 3, get: (e) => e?.symptoms?.[id] }),
    ),
  ]
}

export const dateRange = (from: string, to: string) => Array.from({ length: Math.max(diffDays(from, to) + 1, 0) }, (_, i) => addDays(from, i))

export const shortDate = formatDayMonthShort
