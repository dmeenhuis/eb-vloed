import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { medStatus } from './meds'
import { DEFAULT_MEDS } from './fields'
import { parseWorkbook } from './excelImport'

describe('medStatus', () => {
  const progesteron = DEFAULT_MEDS.find((m) => m.id === 'progesteron')!

  it('follows a 14 on / 14 off schedule', () => {
    expect(medStatus(progesteron, '2026-11-20').scheduled).toBe(false)
    expect(medStatus(progesteron, '2026-11-21')).toMatchObject({ scheduled: true, hint: 'Kuurdag 1/14' })
    expect(medStatus(progesteron, '2026-12-04')).toMatchObject({ scheduled: true, hint: 'Kuurdag 14/14' })
    expect(medStatus(progesteron, '2026-12-05')).toMatchObject({ scheduled: false, hint: 'Stopdag 1/14' })
    expect(medStatus(progesteron, '2026-12-19')).toMatchObject({ scheduled: true, hint: 'Kuurdag 1/14' })
  })
})

// Uses the original spreadsheet when available locally (personal data is not part of the repo).
const SHEET = process.env.CYCLUS_XLSX ?? `${process.env.HOME}/Downloads/cyclus_en_hormoondagboek juiste versie.xlsx`

describe.runIf(existsSync(SHEET))('parseWorkbook (original sheet)', () => {
  const result = parseWorkbook(new Uint8Array(readFileSync(SHEET)), '2026-11-25')
  const byDate = new Map(result.entries.map((e) => [e.date, e]))

  it('imports logged days up to today', () => {
    expect(result.entries[0].date).toBe('2026-10-16')
    expect(result.entries.at(-1)!.date).toBe('2026-11-25')
    expect(result.skippedFuture).toBeGreaterThan(0)
    expect(result.periodStarts).toBe(2)
  })

  it('maps all columns', () => {
    expect(byDate.get('2026-10-16')).toMatchObject({ periodStart: true })
    expect(byDate.get('2026-11-10')).toMatchObject({
      periodStart: true,
      bleeding: 'hevig',
      meds: { lenzetto: true, testosteron: true },
      notes: 'hele zere onderrug. Thuisgewerkt',
    })
    expect(byDate.get('2026-11-21')?.meds).toEqual({ progesteron: true, lenzetto: true, testosteron: true })
    expect(byDate.get('2026-11-25')).toMatchObject({
      scores: { energie: 3, stemming: 1, slaap: 5 },
      symptoms: { hoofdpijn: 1, duizeligheid: 1, spierpijn: 1, opvliegers: 0, darmklachten: 1 },
    })
  })
})
