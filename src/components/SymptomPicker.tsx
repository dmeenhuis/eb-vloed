import { useMemo, useState } from 'react'
import { Check, Plus, Search, Trash2, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { allSymptoms, normalize, slugify, SYMPTOM_CATEGORIES, type SymptomDef } from '../lib/symptoms'
import { Button, cx, Modal } from './ui'

export function SymptomPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Klachten kiezen"
      tall
      footer={
        <Button variant="primary" className="w-full" onClick={onClose}>
          Klaar
        </Button>
      }
    >
      <PickerBody />
    </Modal>
  )
}

function PickerBody() {
  const { settings, updateSettings, entries } = useStore()
  const [query, setQuery] = useState('')
  const tracked = new Set(settings.symptoms)
  const all = allSymptoms(settings)
  const q = normalize(query.trim())
  const matches = q ? all.filter((s) => normalize(s.label).includes(q)) : all
  const exactMatch = all.find((s) => normalize(s.label) === q)

  const withData = useMemo(() => {
    const ids = new Set<string>()
    for (const e of entries.values()) for (const id of Object.keys(e.symptoms ?? {})) ids.add(id)
    return ids
  }, [entries])

  const toggle = (id: string) =>
    updateSettings((s) => ({ ...s, symptoms: s.symptoms.includes(id) ? s.symptoms.filter((x) => x !== id) : [...s.symptoms, id] }))

  const addCustom = () => {
    const label = query.trim()
    const id = `eigen-${slugify(label)}`
    updateSettings((s) => ({
      ...s,
      customSymptoms: s.customSymptoms.some((c) => c.id === id) ? s.customSymptoms : [...s.customSymptoms, { id, label }],
      symptoms: s.symptoms.includes(id) ? s.symptoms : [...s.symptoms, id],
    }))
    setQuery('')
  }

  const removeCustom = (id: string) =>
    updateSettings((s) => ({ ...s, customSymptoms: s.customSymptoms.filter((c) => c.id !== id), symptoms: s.symptoms.filter((x) => x !== id) }))

  const row = (s: SymptomDef, showCategory = false) => (
    <SymptomRow
      key={s.id}
      symptom={s}
      checked={tracked.has(s.id)}
      category={showCategory ? SYMPTOM_CATEGORIES.find((c) => c.id === s.category)?.label : undefined}
      onToggle={() => toggle(s.id)}
      onDelete={s.category === 'eigen' && !withData.has(s.id) ? () => removeCustom(s.id) : undefined}
    />
  )

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-5 bg-card px-5 pt-1 pb-3">
        <div className="flex h-12 items-center gap-2 rounded-2xl bg-sunken px-3 focus-within:ring-2 focus-within:ring-rose-500/50">
          <Search size={18} className="shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek of voeg een klacht toe…"
            aria-label="Zoek een klacht"
            enterKeyHint="done"
            onKeyDown={(e) => e.key === 'Enter' && query.trim() && !exactMatch && addCustom()}
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Zoekopdracht wissen" className="grid size-8 place-items-center rounded-full text-muted">
              <X size={16} />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          {settings.symptoms.length} {settings.symptoms.length === 1 ? 'klacht' : 'klachten'} in je dagboek · wijzigingen worden direct bewaard
        </p>
      </div>

      {q ? (
        <ul>
          {matches.map((s) => row(s, true))}
          {!exactMatch && (
            <li>
              <button type="button" onClick={addCustom} className="flex w-full items-center gap-3 py-3 text-left">
                <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-rose-500/12 text-rose-500">
                  <Plus size={16} strokeWidth={2.5} />
                </span>
                <span className="text-[15px]">
                  <b>‘{query.trim()}’</b> toevoegen als eigen klacht
                </span>
              </button>
            </li>
          )}
        </ul>
      ) : (
        <div className="space-y-5 pb-2">
          {SYMPTOM_CATEGORIES.map((cat) => {
            const items = all.filter((s) => s.category === cat.id)
            if (!items.length) return null
            return (
              <section key={cat.id}>
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{cat.label}</h3>
                {cat.hint && <p className="mt-0.5 text-xs text-muted">{cat.hint}</p>}
                <ul className="mt-1">{items.map((s) => row(s))}</ul>
              </section>
            )
          })}
          <p className="text-xs text-muted">Staat je klacht er niet tussen? Typ hem in het zoekveld om hem als eigen klacht toe te voegen.</p>
        </div>
      )}

    </div>
  )
}

function SymptomRow({
  symptom,
  checked,
  category,
  onToggle,
  onDelete,
}: {
  symptom: SymptomDef
  checked: boolean
  category?: string
  onToggle: () => void
  onDelete?: () => void
}) {
  return (
    <li className="flex items-center border-b border-line last:border-0">
      <button type="button" role="checkbox" aria-checked={checked} onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
        <span
          className={cx(
            'grid size-6 shrink-0 place-items-center rounded-lg transition',
            checked ? 'animate-pop bg-rose-500 text-white' : 'border-2 border-line',
          )}
        >
          {checked && <Check size={15} strokeWidth={3} />}
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] leading-snug">{symptom.label}</span>
          {category && <span className="block text-xs text-muted">{category}</span>}
        </span>
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} aria-label={`${symptom.label} verwijderen`} className="grid size-10 place-items-center text-muted">
          <Trash2 size={16} />
        </button>
      )}
    </li>
  )
}
