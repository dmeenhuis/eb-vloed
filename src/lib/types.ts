/** Local calendar date in the form YYYY-MM-DD. */
export type ISODate = string

export type Bleeding = 'geen' | 'spotting' | 'licht' | 'gemiddeld' | 'hevig'

export type MedId = 'progesteron' | 'lenzetto' | 'testosteron'
export type ScoreId = 'energie' | 'stemming' | 'slaap'

export interface DayEntry {
  date: ISODate
  periodStart?: boolean
  bleeding?: Bleeding
  meds?: Partial<Record<MedId, boolean>>
  scores?: Partial<Record<ScoreId, number>>
  /** Severity 0-3, keyed by symptom id (see symptoms.ts). */
  symptoms?: Partial<Record<string, number>>
  notes?: string
  updatedAt: number
}

export interface MedSchedule {
  id: MedId
  name: string
  dose: string
  enabled: boolean
  type: 'daily' | 'cyclic'
  /** Anchor date of a cyclic schedule (first "on" day). */
  startDate: ISODate
  daysOn: number
  daysOff: number
}

export interface Settings {
  meds: MedSchedule[]
  /** Used for predictions until there is enough own data. */
  defaultCycleLength: number
  menstruationPhaseDays: number
  lutealPhaseDays: number
  /** Symptoms in the daily log, in display order. */
  symptoms: string[]
  customSymptoms: { id: string; label: string }[]
  lastBackupAt?: number
}

export type Phase = 'menstruatie' | 'folliculair' | 'ovulatie' | 'luteaal'
