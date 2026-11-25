import { unzipSync, strFromU8 } from 'fflate'
import { isValidISO } from './date'
import type { Bleeding, DayEntry, ISODate, MedId, ScoreId } from './types'

type Cell = string | number
type Row = Map<number, Cell>

type ColumnKey =
  | 'date'
  | 'periodStart'
  | 'bleeding'
  | 'notes'
  | `med:${MedId}`
  | `score:${ScoreId}`
  | `sym:${string}`

const COLUMN_MATCHERS: [RegExp, ColumnKey][] = [
  [/^datum/, 'date'],
  [/menstruatie gestart/, 'periodStart'],
  [/bloedverlies/, 'bleeding'],
  [/progesteron/, 'med:progesteron'],
  [/lenzetto/, 'med:lenzetto'],
  [/testosteron/, 'med:testosteron'],
  [/energie/, 'score:energie'],
  [/stemming/, 'score:stemming'],
  [/slaap/, 'score:slaap'],
  [/hoofdpijn/, 'sym:hoofdpijn'],
  [/duizelig/, 'sym:duizeligheid'],
  [/spier|gewricht/, 'sym:spierpijn'],
  [/opvlieger|nachtzwet/, 'sym:opvliegers'],
  [/darm/, 'sym:darmklachten'],
  [/notitie|overige klachten/, 'notes'],
]

const BLEEDING_WORDS: Record<string, Bleeding> = {
  geen: 'geen',
  spotting: 'spotting',
  licht: 'licht',
  gemiddeld: 'gemiddeld',
  matig: 'gemiddeld',
  hevig: 'hevig',
  zwaar: 'hevig',
}

export interface ExcelImportResult {
  entries: DayEntry[]
  skippedFuture: number
  periodStarts: number
}

const parseXml = (text: string) => new DOMParser().parseFromString(text, 'application/xml')

const byTag = (node: Document | Element, tag: string) => Array.from(node.getElementsByTagName(tag))

function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? 'A'
  return [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1
}

function readSheet(xml: string, shared: string[]): Row[] {
  const rows: Row[] = []
  for (const r of byTag(parseXml(xml), 'row')) {
    const row: Row = new Map()
    for (const c of byTag(r, 'c')) {
      const type = c.getAttribute('t')
      const v = byTag(c, 'v')[0]?.textContent ?? ''
      let value: Cell | undefined
      if (type === 's') value = shared[Number(v)]
      else if (type === 'inlineStr') value = byTag(c, 't').map((t) => t.textContent).join('')
      else if (type === 'str' || type === 'b' || type === 'e') value = v
      else if (v !== '') value = Number(v)
      if (value !== undefined && value !== '') row.set(columnIndex(c.getAttribute('r') ?? ''), value)
    }
    rows.push(row)
  }
  return rows
}

function excelDate(value: Cell | undefined): ISODate | undefined {
  if (typeof value === 'number' && value > 0) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000)
    return d.toISOString().slice(0, 10)
  }
  if (typeof value === 'string') {
    const s = value.trim()
    const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
    const iso = dmy ? `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}` : s.slice(0, 10)
    return isValidISO(iso) ? iso : undefined
  }
  return undefined
}

function yesNo(value: Cell | undefined): boolean | undefined {
  const s = String(value ?? '').trim().toLowerCase()
  if (/^(ja|yes|j|x|1|true|waar)$/.test(s)) return true
  if (/^(nee|no|n|0|false|onwaar)$/.test(s)) return false
  return undefined
}

function score(value: Cell | undefined, min: number, max: number): number | undefined {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'))
  if (value === undefined || Number.isNaN(n)) return undefined
  return Math.min(max, Math.max(min, Math.round(n)))
}

const text = (c: Cell | undefined) => String(c ?? '').trim().toLowerCase()

function findHeader(rows: Row[], required: RegExp[]): number {
  return rows.findIndex((row) => {
    const texts = [...row.values()].map(text)
    return required.every((re) => texts.some((t) => re.test(t)))
  })
}

export function parseWorkbook(data: Uint8Array, todayISO: ISODate): ExcelImportResult {
  const files = unzipSync(data, { filter: (f) => f.name.startsWith('xl/') })
  const read = (path: string) => (files[path] ? strFromU8(files[path]) : undefined)

  const sharedXml = read('xl/sharedStrings.xml')
  const shared = sharedXml ? byTag(parseXml(sharedXml), 'si').map((si) => byTag(si, 't').map((t) => t.textContent).join('')) : []

  const sheets = Object.keys(files)
    .filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
    .map((p) => readSheet(read(p)!, shared))

  const byDate = new Map<ISODate, DayEntry>()
  let skippedFuture = 0
  let periodStarts = 0
  let foundLog = false

  const entryFor = (date: ISODate) => {
    let e = byDate.get(date)
    if (!e) byDate.set(date, (e = { date, updatedAt: Date.now() }))
    return e
  }

  for (const rows of sheets) {
    // Daily log
    const headerIdx = findHeader(rows, [/^datum/, /bloedverlies/])
    if (headerIdx >= 0) {
      foundLog = true
      const columns = new Map<number, ColumnKey>()
      for (const [col, value] of rows[headerIdx]) {
        const match = COLUMN_MATCHERS.find(([re]) => re.test(text(value)))
        if (match && ![...columns.values()].includes(match[1])) columns.set(col, match[1])
      }

      for (const row of rows.slice(headerIdx + 1)) {
        const fields = new Map<ColumnKey, Cell>()
        for (const [col, key] of columns) if (row.has(col)) fields.set(key, row.get(col)!)
        const date = excelDate(fields.get('date'))
        if (!date) continue

        const e: DayEntry = { date, updatedAt: Date.now() }
        if (yesNo(fields.get('periodStart'))) e.periodStart = true
        const bleeding = BLEEDING_WORDS[text(fields.get('bleeding'))]
        if (bleeding) e.bleeding = bleeding
        for (const [key, value] of fields) {
          const [kind, id] = key.split(':')
          if (kind === 'med') {
            const v = yesNo(value)
            if (v !== undefined) e.meds = { ...e.meds, [id]: v }
          } else if (kind === 'score') {
            const v = score(value, 1, 5)
            if (v !== undefined) e.scores = { ...e.scores, [id]: v }
          } else if (kind === 'sym') {
            const v = score(value, 0, 3)
            if (v !== undefined) e.symptoms = { ...e.symptoms, [id]: v }
          }
        }
        const notes = String(fields.get('notes') ?? '').trim()
        if (notes) e.notes = notes

        const hasData = e.periodStart || e.bleeding || e.meds || e.scores || e.symptoms || e.notes
        if (!hasData) continue
        // The sheet is pre-filled ahead of time (e.g. medication); only take what already happened.
        if (date > todayISO) {
          skippedFuture++
          continue
        }
        Object.assign(entryFor(date), e)
      }
    }

    // Event log: extra period starts that are not in the daily log.
    const eventIdx = findHeader(rows, [/^datum/, /^gebeurtenis/])
    if (eventIdx >= 0) {
      const header = rows[eventIdx]
      const dateCol = [...header].find(([, v]) => /^datum/.test(text(v)))![0]
      const eventCol = [...header].find(([, v]) => /^gebeurtenis/.test(text(v)))![0]
      for (const row of rows.slice(eventIdx + 1)) {
        const date = excelDate(row.get(dateCol))
        if (date && date <= todayISO && /menstruatie gestart/.test(text(row.get(eventCol)))) {
          entryFor(date).periodStart = true
        }
      }
    }
  }

  if (!foundLog) throw new Error('Geen dagboek gevonden. Verwacht een tabblad met de kolommen "Datum" en "Bloedverlies".')

  const entries = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  periodStarts = entries.filter((e) => e.periodStart).length
  return { entries, skippedFuture, periodStarts }
}
