import { describe, expect, it } from 'vitest'
import { buildCycleModel, phaseFor } from './cycle'
import { DEFAULT_SETTINGS } from './fields'
import type { DayEntry } from './types'

const entry = (date: string, extra: Partial<DayEntry> = {}): [string, DayEntry] => [date, { date, updatedAt: 0, ...extra }]

describe('phaseFor', () => {
  it('matches the reference table for a 25 day cycle', () => {
    const phase = (d: number) => phaseFor(d, 25, 5, 14).phase
    expect([1, 5].map(phase)).toEqual(['menstruatie', 'menstruatie'])
    expect([6, 10].map(phase)).toEqual(['folliculair', 'folliculair'])
    expect(phase(11)).toBe('ovulatie')
    expect([12, 25].map(phase)).toEqual(['luteaal', 'luteaal'])
  })

  it('places ovulation 14 days before the end of a 28 day cycle', () => {
    expect(phaseFor(1, 28, 5, 14).ovulationDay).toBe(14)
  })
})

describe('buildCycleModel', () => {
  const byDate = new Map([
    entry('2026-10-16', { periodStart: true }),
    entry('2026-11-10', { periodStart: true, bleeding: 'hevig' }),
    entry('2026-11-11', { bleeding: 'licht' }),
    entry('2026-11-12', { bleeding: 'geen' }),
  ])
  const model = buildCycleModel(byDate, DEFAULT_SETTINGS, '2026-11-25')

  it('derives cycle lengths and averages from the data', () => {
    expect(model.cycles.map((c) => c.length)).toEqual([25, undefined])
    expect(model.stats.avgCycleLength).toBe(25)
    expect(model.stats.cycleLengthFromData).toBe(true)
    expect(model.stats.avgPeriodLength).toBe(2)
    expect(model.stats.nextPeriod).toBe('2026-12-05')
  })

  it('computes cycle day and phase', () => {
    expect(model.infoFor('2026-10-15')).toBeNull()
    expect(model.infoFor('2026-11-25')).toMatchObject({ cycleDay: 16, phase: 'luteaal', predicted: false })
    expect(model.infoFor('2026-11-20')).toMatchObject({ cycleDay: 11, phase: 'ovulatie' })
    expect(model.infoFor('2026-11-09')).toMatchObject({ cycleDay: 25, length: 25 })
  })

  it('predicts future cycles', () => {
    expect(model.infoFor('2026-12-05')).toMatchObject({ cycleDay: 1, predicted: true, phase: 'menstruatie' })
    expect(model.isPredictedPeriod('2026-12-05')).toBe(true)
    expect(model.isPredictedPeriod('2026-12-07')).toBe(false)
    expect(model.infoFor('2026-12-30')).toMatchObject({ cycleDay: 1, cycleStart: '2026-12-30' })
  })

  it('marks an overdue cycle and pushes the prediction forward', () => {
    const late = buildCycleModel(byDate, DEFAULT_SETTINGS, '2026-12-10')
    expect(late.infoFor('2026-12-10')).toMatchObject({ cycleDay: 31, overdue: true, phase: 'luteaal' })
    expect(late.stats.nextPeriod).toBe('2026-12-11')
  })
})
