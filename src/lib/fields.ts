import { DEFAULT_SYMPTOMS } from './symptoms'
import type { Bleeding, MedSchedule, Phase, ScoreId, Settings } from './types'

export const BLEEDING_OPTIONS: { id: Bleeding; label: string; level: number }[] = [
  { id: 'geen', label: 'Geen', level: 0 },
  { id: 'spotting', label: 'Spotting', level: 1 },
  { id: 'licht', label: 'Licht', level: 2 },
  { id: 'gemiddeld', label: 'Gemiddeld', level: 3 },
  { id: 'hevig', label: 'Hevig', level: 4 },
]

export const bleedingLevel = (b?: Bleeding) => BLEEDING_OPTIONS.find((o) => o.id === b)?.level ?? 0
export const bleedingLabel = (b?: Bleeding) => BLEEDING_OPTIONS.find((o) => o.id === b)?.label ?? ''
/** Real bleeding (not spotting) — counts towards period length. */
export const isBleeding = (b?: Bleeding) => bleedingLevel(b) >= 2

export const SCORES: { id: ScoreId; label: string; low: string; high: string }[] = [
  { id: 'energie', label: 'Energie', low: 'Heel laag', high: 'Heel goed' },
  { id: 'stemming', label: 'Stemming', low: 'Heel slecht', high: 'Heel goed' },
  { id: 'slaap', label: 'Slaap', low: 'Heel slecht', high: 'Heel goed' },
]

/** Colour scales modelled on the conditional formatting of the original sheet. */
export const SCORE_COLORS = ['', '#fb7185', '#fdba74', '#fcd34d', '#a3e635', '#34d399']
export const SYMPTOM_COLORS = ['#34d399', '#fcd34d', '#fb923c', '#f43f5e']

export const PHASES: Record<Phase, { label: string; short: string; color: string; hormones: string; body: string }> = {
  menstruatie: {
    label: 'Menstruatiefase',
    short: 'Menstruatie',
    color: '#f43f5e',
    hormones: 'Oestrogeen en progesteron zijn op hun laagste punt.',
    body: 'Krampen in de onderbuik, lage rugpijn, vermoeidheid, hoofdpijn en soms dunnere ontlasting door stoffen die de baarmoeder laten samentrekken (prostaglandines).',
  },
  folliculair: {
    label: 'Folliculaire fase',
    short: 'Folliculair',
    color: '#14b8a6',
    hormones: 'Oestrogeen stijgt snel.',
    body: 'Meestal de meest klachtenvrije dagen. Je voelt je vaak energieker en lichter. Vlak voor de ovulatie kun je helder, rekbaar slijm opmerken.',
  },
  ovulatie: {
    label: 'Ovulatie',
    short: 'Ovulatie',
    color: '#f59e0b',
    hormones: 'Korte piek in oestrogeen en LH.',
    body: 'Ovulatiepijn (een korte steek of zeurend gevoel aan één kant van de onderbuik), gevoelige tepels of een lichte stijging van je lichaamstemperatuur.',
  },
  luteaal: {
    label: 'Luteale fase',
    short: 'Luteaal',
    color: '#8b5cf6',
    hormones: 'Progesteron stijgt eerst en daalt daarna scherp (vanaf ca. een week voor de menstruatie).',
    body: 'PMS-klachten zoals gespannen of pijnlijke borsten, een opgeblazen gevoel, vocht vasthouden, acné, trek in zoet/zout, vermoeidheid en prikkelbaarheid.',
  },
}

export const DEFAULT_MEDS: MedSchedule[] = [
  { id: 'progesteron', name: 'Progesteron', dose: '100 mg', enabled: true, type: 'cyclic', startDate: '2026-11-21', daysOn: 14, daysOff: 14 },
  { id: 'lenzetto', name: 'Lenzetto', dose: '2 sprays', enabled: true, type: 'daily', startDate: '2026-01-01', daysOn: 14, daysOff: 14 },
  { id: 'testosteron', name: 'Testosteron', dose: '1 pompje (1% zalf)', enabled: true, type: 'daily', startDate: '2026-01-01', daysOn: 14, daysOff: 14 },
]

export const DEFAULT_SETTINGS: Settings = {
  meds: DEFAULT_MEDS,
  defaultCycleLength: 28,
  menstruationPhaseDays: 5,
  lutealPhaseDays: 14,
  symptoms: DEFAULT_SYMPTOMS,
  customSymptoms: [],
}
