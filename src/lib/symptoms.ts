import type { Settings } from './types'

export interface SymptomDef {
  id: string
  label: string
  category: string
}

export const SYMPTOM_CATEGORIES: { id: string; label: string; hint?: string }[] = [
  { id: 'opvliegers', label: 'Opvliegers & hart' },
  { id: 'stemming', label: 'Stemming & denken' },
  { id: 'slaap', label: 'Slaap & energie' },
  { id: 'hoofd', label: 'Hoofd & zenuwen' },
  { id: 'zintuigen', label: 'Ogen, oren & mond' },
  { id: 'spieren', label: 'Spieren & gewrichten' },
  { id: 'maag', label: 'Maag & darmen' },
  { id: 'huid', label: 'Huid & haar' },
  { id: 'urogenitaal', label: 'Blaas, vagina & seksualiteit' },
  { id: 'lichaam', label: 'Cyclus, borsten & lichaam' },
  { id: 'aandoeningen', label: 'Aandoeningen', hint: 'Meestal een diagnose; dagelijks scoren is vaak minder zinvol.' },
  { id: 'eigen', label: 'Eigen klachten' },
]

/** [label, id?] per category. Without an explicit id, the id is derived from the label. */
const CATALOG: Record<string, (string | [string, string])[]> = {
  opvliegers: [['Opvliegers', 'opvliegers'], ['Nachtelijk zweten', 'nachtzweten'], 'Hartkloppingen', 'Onregelmatige hartslag'],
  stemming: [
    'Angst',
    'Brainfog',
    'Concentratieproblemen',
    'Depressieve gevoelens',
    'Geheugenproblemen',
    'Mentale problemen en stemmingswisselingen',
    'Neerslachtigheid',
    'Prikkelbaarheid',
    'Stemmingswisselingen',
  ],
  slaap: ['Slaapstoornissen', 'Vermoeidheid'],
  hoofd: [
    ['Hoofdpijn', 'hoofdpijn'],
    'Migraine',
    ['Duizeligheid', 'duizeligheid'],
    'Vertigo',
    'Benigne positieduizeligheid',
    'Gevoel van elektrische schok',
    'Tintelingen in vingers en tenen',
    'Kriebels onder de huid',
  ],
  zintuigen: ['Droge of jeukende ogen', 'Jeukende ogen', 'Jeukende oren', 'Tinnitus', 'Droge mond', 'Mondbranden', 'Tandproblemen'],
  spieren: [['Spier- en gewrichtsklachten', 'spierpijn'], 'Gewrichtspijn (artralgie)', 'Kaakgewrichtsklachten', 'Frozen shoulder'],
  maag: [['Maag-darmklachten', 'darmklachten'], 'Opgeblazen gevoel', 'Oprispingen', 'Brandend maagzuur', 'Gastro-oesofageale reflux'],
  huid: [
    'Acne',
    'Droge huid',
    'Jeukende huid',
    'Dunner wordende huid',
    'Huidveranderingen',
    'Eczeem',
    'Rimpels',
    'Broze nagels',
    'Dunner wordend (hoofd)haar',
    'Ongewenste haargroei',
    'Lichaamsgeur',
    'Door androgenen veroorzaakte klachten',
  ],
  urogenitaal: [
    'Vaginale droogte',
    'Pijn bij het vrijen',
    'Verminderd libido',
    'Seksuele problemen',
    'Urineverlies',
    'Incontinentie',
    'Urineweginfecties',
    'Urogenitale klachten',
  ],
  lichaam: ['Pijnlijke borsten', 'Veranderingen in de menstruatiecyclus', 'Gewichtstoename', 'Veranderingen in je figuur'],
  aandoeningen: [
    'Artritis',
    'Astma',
    'Auto-immuunziekten (nieuwe of een verergering)',
    'Chronischevermoeidheidssyndroom',
    'Darmkanker',
    'Fibromyalgie',
    'Insulineresistentie',
    'Leververvetting (niet-alcoholisch)',
    'Nierstenen',
    'Osteoporose',
    'Prikkelbaredarmsyndroom',
    'Sarcopenie (verminderde spiermassa en -kracht)',
    'Slaapapneu',
    'Verhoogde cholesterol/verhoogde triglyceriden',
  ],
}

/** Lowercase, accents removed: for ids and for searching. */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export const slugify = (s: string) =>
  normalize(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const SYMPTOM_CATALOG: SymptomDef[] = Object.entries(CATALOG).flatMap(([category, items]) =>
  items.map((item) => {
    const [label, id] = typeof item === 'string' ? [item, slugify(item)] : item
    return { id, label, category }
  }),
)

/** Tracked by default; matches the columns of the original spreadsheet. */
export const DEFAULT_SYMPTOMS = ['hoofdpijn', 'duizeligheid', 'spierpijn', 'opvliegers', 'nachtzweten', 'darmklachten']

export const SYMPTOM_LEVELS = ['Geen', 'Licht', 'Matig', 'Ernstig']

const catalogById = new Map(SYMPTOM_CATALOG.map((s) => [s.id, s]))

export function allSymptoms(settings: Pick<Settings, 'customSymptoms'>): SymptomDef[] {
  return [...settings.customSymptoms.map((c) => ({ ...c, category: 'eigen' })), ...SYMPTOM_CATALOG]
}

export function symptomLabel(id: string, settings: Pick<Settings, 'customSymptoms'>): string {
  return catalogById.get(id)?.label ?? settings.customSymptoms.find((c) => c.id === id)?.label ?? id.replace(/^eigen-/, '').replace(/-/g, ' ')
}
