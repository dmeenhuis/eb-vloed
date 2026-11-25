import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './fields'
import { getMetrics, reportedSymptoms } from './metrics'
import { DEFAULT_SYMPTOMS, normalize, SYMPTOM_CATALOG, SYMPTOM_CATEGORIES, symptomLabel } from './symptoms'
import type { DayEntry } from './types'

// The list of peri-/menopause symptoms this catalog is based on.
const SOURCE_LIST = `Acne
Angst
Artralgie (gewrichtspijn)
Artritis
Astma
Auto-immuunziekten (nieuwe of een verergering)
Benigne positieduizeligheid
Brainfog
Brandend maagzuur
Broze nagels
Chronischevermoeidheids-syndroom
Concentratieproblemen
Darmkanker
Depressieve gevoelens
Door androgenen veroorzaakte klachten
Droge huid
Droge mond
Droge of jeukende ogen
Duizeligheid
Dunner wordend (hoofd)haar
Dunner wordende huid
Eczeem
Fibromyalgie
Frozen shoulder
Gastro-oesofageale reflux
Geheugenproblemen
Gevoel van elektrische schok
Gewichtstoename
Gewrichtspijn
Hartkloppingen
Hoofdpijn
Huidveranderingen
Incontinentie
Insulineresistentie
Jeukende huid
Jeukende ogen
Jeukende oren
Kaakgewrichtsklachten
Kriebels onder de huid
Leververvetting
Lichaamsgeur
Maag-darmklachten
Mentale problemen en stemmingswisselingen
Migraine
Mondbranden
Nachtelijk zweten
Neerslachtigheid
Nierstenen
Niet-alcoholische leververvetting
Ongewenste haargroei
Onregelmatige hartslag
Opgeblazen gevoel
Oprispingen
Opvliegers
Osteoporose
Pijn bij het vrijen
Pijnlijke borsten
Prikkelbaarheid
Prikkelbaredarmsyndroom
Reflux, gastro-oesofageale
Rimpels
Sarcopenie (verminderde spiermassa en -kracht)
Seksuele problemen
Slaapapneu
Slaapstoornissen
Spier- en gewrichtsklachten
Spiermassa, verlies aan
Stemmingswisselingen
Tandproblemen
Tinnitus
Tintelingen in vingers en tenen
Urineverlies
Urineweginfecties
Urogenitale klachten
Vaginale droogte
Veranderingen in de menstruatiecyclus
Veranderingen in je figuur
Verhoogde cholesterol/verhoogde triglyceriden
Verminderd libido
Vermoeidheid
Vertigo`.split('\n')

// Synonyms in the source list that were merged into a single catalog item.
const MERGED: Record<string, string> = {
  'Artralgie (gewrichtspijn)': 'Gewrichtspijn (artralgie)',
  Gewrichtspijn: 'Gewrichtspijn (artralgie)',
  'Chronischevermoeidheids-syndroom': 'Chronischevermoeidheidssyndroom',
  Leververvetting: 'Leververvetting (niet-alcoholisch)',
  'Niet-alcoholische leververvetting': 'Leververvetting (niet-alcoholisch)',
  'Reflux, gastro-oesofageale': 'Gastro-oesofageale reflux',
  'Spiermassa, verlies aan': 'Sarcopenie (verminderde spiermassa en -kracht)',
}

describe('symptom catalog', () => {
  const labels = new Set(SYMPTOM_CATALOG.map((s) => s.label))

  it('covers every symptom of the source list', () => {
    const missing = SOURCE_LIST.filter((item) => !labels.has(MERGED[item] ?? item))
    expect(missing).toEqual([])
  })

  it('has unique ids and labels and only known categories', () => {
    const ids = SYMPTOM_CATALOG.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(SYMPTOM_CATALOG.map((s) => normalize(s.label))).size).toBe(ids.length)
    const categories = new Set(SYMPTOM_CATEGORIES.map((c) => c.id))
    expect(SYMPTOM_CATALOG.every((s) => categories.has(s.category))).toBe(true)
  })

  it('keeps the ids of the original spreadsheet columns, so existing data stays linked', () => {
    for (const id of ['hoofdpijn', 'duizeligheid', 'spierpijn', 'opvliegers', 'darmklachten']) {
      expect(SYMPTOM_CATALOG.some((s) => s.id === id)).toBe(true)
    }
    expect(DEFAULT_SYMPTOMS.every((id) => SYMPTOM_CATALOG.some((s) => s.id === id))).toBe(true)
  })

  it('labels custom and unknown symptoms', () => {
    const settings = { ...DEFAULT_SETTINGS, customSymptoms: [{ id: 'eigen-rugpijn', label: 'Rugpijn' }] }
    expect(symptomLabel('eigen-rugpijn', settings)).toBe('Rugpijn')
    expect(symptomLabel('hoofdpijn', settings)).toBe('Hoofdpijn')
    expect(symptomLabel('eigen-verdwenen-klacht', settings)).toBe('verdwenen klacht')
  })
})

describe('reported symptoms', () => {
  it('lists tracked symptoms first, then untracked ones that have data', () => {
    const settings = { ...DEFAULT_SETTINGS, symptoms: ['migraine', 'hoofdpijn'] }
    const entries = new Map<string, DayEntry>([
      ['2026-11-20', { date: '2026-11-20', updatedAt: 0, symptoms: { opvliegers: 2, hoofdpijn: 1 } }],
    ])
    expect(reportedSymptoms(settings, entries)).toEqual(['migraine', 'hoofdpijn', 'opvliegers'])
    expect(getMetrics(settings, entries).map((m) => m.id)).toEqual(['energie', 'stemming', 'slaap', 'migraine', 'hoofdpijn', 'opvliegers'])
  })
})
