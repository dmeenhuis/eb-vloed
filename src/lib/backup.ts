import { addDays, isValidISO, today } from './date'
import { isIOS } from './platform'
import type { CycleModel } from './cycle'
import { BLEEDING_OPTIONS, PHASES, SCORES } from './fields'
import { reportedSymptoms } from './metrics'
import { symptomLabel } from './symptoms'
import { medTaken } from './meds'
import type { DayEntry, ISODate, Settings } from './types'

// Original app name, kept so existing backup files stay valid.
const APP_ID = 'cyclusdagboek'

export interface Backup {
  app: typeof APP_ID
  version: 1
  exportedAt: string
  settings: Settings
  entries: DayEntry[]
}

export function createBackup(entries: Map<ISODate, DayEntry>, settings: Settings): Blob {
  const backup: Backup = {
    app: APP_ID,
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    entries: [...entries.values()].sort((a, b) => a.date.localeCompare(b.date)),
  }
  return new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' })
}

export function parseBackup(text: string): Backup {
  let data: Partial<Backup>
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Dit is geen geldig back-upbestand.')
  }
  if (data.app !== APP_ID || !Array.isArray(data.entries)) throw new Error('Dit is geen back-up van Eb & Vloed.')
  const entries = data.entries.filter((e): e is DayEntry => !!e && typeof e.date === 'string' && isValidISO(e.date))
  return { ...(data as Backup), entries }
}

export function createCsv(entries: Map<ISODate, DayEntry>, settings: Settings, cycle: CycleModel): Blob {
  const dates = [...entries.keys()].sort()
  const meds = settings.meds.filter((m) => m.enabled)
  const symptoms = reportedSymptoms(settings, entries)
  const header = [
    'Datum',
    'Menstruatie gestart?',
    'Cyclusdag',
    'Fase (schatting)',
    'Bloedverlies',
    ...meds.map((m) => `${m.name} gebruikt?`),
    ...SCORES.map((s) => `${s.label} (1-5)`),
    ...symptoms.map((id) => `${symptomLabel(id, settings)} (0-3)`),
    'Notities',
  ]
  const rows: string[][] = [header]
  if (dates.length) {
    const last = dates.at(-1)! > today() ? dates.at(-1)! : today()
    for (let d = dates[0]; d <= last; d = addDays(d, 1)) {
      const e = entries.get(d)
      const info = cycle.infoFor(d)
      const [y, m, day] = d.split('-')
      rows.push([
        `${day}-${m}-${y}`,
        e?.periodStart ? 'Ja' : '',
        info ? String(info.cycleDay) : '',
        info ? PHASES[info.phase].short : '',
        BLEEDING_OPTIONS.find((o) => o.id === e?.bleeding)?.label ?? '',
        ...meds.map((med) => (e ? (medTaken(med, d, e) ? 'Ja' : 'Nee') : '')),
        ...SCORES.map((s) => String(e?.scores?.[s.id] ?? '')),
        ...symptoms.map((id) => String(e?.symptoms?.[id] ?? '')),
        e?.notes ?? '',
      ])
    }
  }
  const escape = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  // Semicolons + BOM so Dutch Excel opens it correctly.
  const csv = '\uFEFF' + rows.map((r) => r.map(escape).join(';')).join('\r\n')
  return new Blob([csv], { type: 'text/csv;charset=utf-8' })
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Saves a file. On iOS downloads from a home screen app are unreliable, so the share sheet is used
 * ("Bewaar in Bestanden", iCloud, mail, …). Resolves to false when the user cancels.
 */
export async function saveFile(blob: Blob, filename: string): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type })
  if (isIOS() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return true
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false
      // Sharing not allowed (e.g. no user activation): fall back to a download.
    }
  }
  download(blob, filename)
  return true
}
