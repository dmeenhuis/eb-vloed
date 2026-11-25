import { describe, expect, it } from 'vitest'
import { normalizeSettings } from './entries'
import { DEFAULT_SETTINGS } from './fields'

const dose = (s: ReturnType<typeof normalizeSettings>, id: string) => s.meds.find((m) => m.id === id)?.dose

describe('normalizeSettings', () => {
  it('uses the default testosterone dose', () => {
    expect(dose(normalizeSettings(), 'testosteron')).toBe('1 pompje (1% zalf)')
  })

  it('replaces the old "Dagelijks" placeholder but keeps doses entered by the user', () => {
    const stored = (d: string) => ({ ...DEFAULT_SETTINGS, meds: DEFAULT_SETTINGS.meds.map((m) => (m.id === 'testosteron' ? { ...m, dose: d } : m)) })
    expect(dose(normalizeSettings(stored('Dagelijks')), 'testosteron')).toBe('1 pompje (1% zalf)')
    expect(dose(normalizeSettings(stored('2 pompjes')), 'testosteron')).toBe('2 pompjes')
  })
})
