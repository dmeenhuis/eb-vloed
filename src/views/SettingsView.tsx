import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Download, FileSpreadsheet, FileUp, HardDrive, ListChecks, Minus, Plus, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { InstallCard } from '../components/InstallCard'
import { SymptomPicker } from '../components/SymptomPicker'
import { Button, Card, cx, Switch, useConfirm, useToast } from '../components/ui'
import { createCsv, parseBackup, saveFile } from '../lib/backup'
import { addDays, formatDayMonth, formatDayMonthYear } from '../lib/date'
import { DEFAULT_SETTINGS, PHASES } from '../lib/fields'
import { isPersisted, requestPersistence } from '../lib/db'
import { medStatus } from '../lib/meds'
import { useStore } from '../lib/store'
import { symptomLabel } from '../lib/symptoms'
import { useBackup } from '../lib/useBackup'
import type { MedSchedule, Settings } from '../lib/types'

export function SettingsView() {
  return (
    <div className="space-y-4">
      <h1 className="pt-1 text-2xl font-bold tracking-tight">Instellingen</h1>
      <InstallCard />
      <MedsSettings />
      <SymptomSettings />
      <CycleSettings />
      <PhaseInfo />
      <DataSettings />
      <p className="pb-2 text-center text-xs text-muted">Eb &amp; Vloed {__APP_VERSION__} · al je gegevens blijven op dit apparaat</p>
    </div>
  )
}

function MedsSettings() {
  const { settings, updateSettings, today } = useStore()
  const setMed = (id: MedSchedule['id'], patch: Partial<MedSchedule>) =>
    updateSettings((s) => ({ ...s, meds: s.meds.map((m) => (m.id === id ? { ...m, ...patch } : m)) }))

  return (
    <Card title="Medicatie">
      <p className="-mt-1 mb-3 text-xs text-muted">
        Het schema bepaalt wat er in het dagboek alvast is aangevinkt. Je hoeft alleen iets aan te passen als je een dosis overslaat.
      </p>
      <div className="space-y-3">
        {settings.meds.map((m) => {
          const status = medStatus(m, today)
          return (
            <div key={m.id} className="rounded-2xl bg-sunken p-3">
              <div className="flex items-center gap-3">
                <input
                  value={m.name}
                  onChange={(e) => setMed(m.id, { name: e.target.value })}
                  aria-label="Naam"
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
                />
                <Switch label={`${m.name} gebruiken`} checked={m.enabled} onChange={(enabled) => setMed(m.id, { enabled })} />
              </div>
              {m.enabled && (
                <div className="mt-3 space-y-3">
                  <Field label="Dosering">
                    <input
                      value={m.dose}
                      onChange={(e) => setMed(m.id, { dose: e.target.value })}
                      placeholder="bijv. 100 mg"
                      aria-label={`Dosering ${m.name}`}
                      className="w-full max-w-56 min-w-0 rounded-xl bg-card px-3 py-2 text-right text-base outline-none focus:ring-2 focus:ring-rose-500/50"
                    />
                  </Field>
                  <Field label="Schema">
                    <Segmented
                      value={m.type}
                      options={[
                        { value: 'daily', label: 'Dagelijks' },
                        { value: 'cyclic', label: 'Cyclisch' },
                      ]}
                      onChange={(type) => setMed(m.id, { type })}
                    />
                  </Field>
                  {m.type === 'cyclic' && (
                    <>
                      <Field label="Eerste dag van een kuur">
                        <input
                          type="date"
                          value={m.startDate}
                          onChange={(e) => e.target.value && setMed(m.id, { startDate: e.target.value })}
                          className="rounded-xl bg-card px-3 py-2 text-base outline-none"
                        />
                      </Field>
                      <Field label="Dagen gebruiken">
                        <Stepper value={m.daysOn} min={1} max={60} onChange={(daysOn) => setMed(m.id, { daysOn })} />
                      </Field>
                      <Field label="Dagen stoppen">
                        <Stepper value={m.daysOff} min={0} max={60} onChange={(daysOff) => setMed(m.id, { daysOff })} />
                      </Field>
                      <p className="rounded-xl bg-card px-3 py-2 text-xs text-muted">
                        Vandaag: <b className="text-ink">{status.hint}</b>
                        {status.daysUntilChange !== undefined &&
                          (status.scheduled
                            ? ` · laatste dag ${formatDayMonth(addDays(today, status.daysUntilChange - 1))}`
                            : ` · volgende kuur start ${formatDayMonth(addDays(today, status.daysUntilChange))}`)}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function SymptomSettings() {
  const { settings, updateSettings } = useStore()
  const [picking, setPicking] = useState(false)
  const remove = (id: string) => updateSettings((s) => ({ ...s, symptoms: s.symptoms.filter((x) => x !== id) }))

  return (
    <Card title="Klachten">
      <p className="-mt-1 mb-3 text-xs text-muted">
        Kies welke klachten je dagelijks bijhoudt; je scoort ze van 0 (geen) tot 3 (ernstig). Eerder ingevulde waarden blijven zichtbaar in het overzicht, ook
        als je een klacht niet meer bijhoudt.
      </p>
      {settings.symptoms.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {settings.symptoms.map((id) => (
            <li key={id} className="flex items-center gap-0.5 rounded-full bg-sunken py-1 pr-1 pl-3 text-sm">
              {symptomLabel(id, settings)}
              <button type="button" onClick={() => remove(id)} aria-label={`${symptomLabel(id, settings)} niet meer bijhouden`} className="grid size-7 place-items-center rounded-full text-muted">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 rounded-2xl bg-sunken p-3 text-sm text-muted">Je houdt nog geen klachten bij.</p>
      )}
      <Button className="w-full" onClick={() => setPicking(true)}>
        <ListChecks size={18} /> Klachten kiezen
      </Button>
      <SymptomPicker open={picking} onClose={() => setPicking(false)} />
    </Card>
  )
}

function CycleSettings() {
  const { settings, updateSettings, cycle } = useStore()
  const set = (patch: Partial<Settings>) => updateSettings((s) => ({ ...s, ...patch }))
  return (
    <Card title="Cyclus en fases">
      <p className="-mt-1 mb-3 text-xs leading-relaxed text-muted">
        De fase wordt geschat vanaf je laatste menstruatiestart. De ovulatie valt meestal ±{settings.lutealPhaseDays} dagen vóór de volgende menstruatie,
        dus bij een cyclus van {cycle.stats.avgCycleLength} dagen rond dag {Math.max(cycle.stats.avgCycleLength - settings.lutealPhaseDays, settings.menstruationPhaseDays + 1)}.
        De cycluslengte wordt berekend uit je laatste{' '}
        {cycle.stats.sampleSize > 1 ? `${cycle.stats.sampleSize} cycli` : 'cycli'}; de standaardwaarde wordt gebruikt zolang er nog geen volledige cyclus is.
      </p>
      <div className="space-y-3">
        <Field label="Standaard cycluslengte" hint={cycle.stats.cycleLengthFromData ? 'niet in gebruik: berekend uit je gegevens' : 'in gebruik'}>
          <Stepper onCard value={settings.defaultCycleLength} min={15} max={60} onChange={(v) => set({ defaultCycleLength: v })} />
        </Field>
        <Field label="Menstruatiefase" hint="aantal dagen">
          <Stepper onCard value={settings.menstruationPhaseDays} min={1} max={10} onChange={(v) => set({ menstruationPhaseDays: v })} />
        </Field>
        <Field label="Luteale fase" hint="aantal dagen">
          <Stepper onCard value={settings.lutealPhaseDays} min={8} max={18} onChange={(v) => set({ lutealPhaseDays: v })} />
        </Field>
      </div>
    </Card>
  )
}

function PhaseInfo() {
  const [open, setOpen] = useState(false)
  return (
    <Card>
      <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setOpen(!open)}>
        <span className="text-[15px] font-semibold">Uitleg fases</span>
        <ChevronDown size={18} className={cx('text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="animate-fade-in mt-3 space-y-3">
          {Object.values(PHASES).map((p) => (
            <div key={p.label} className="rounded-2xl bg-sunken p-3 text-sm leading-relaxed">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <span className="size-2.5 rounded-full" style={{ background: p.color }} />
                {p.label}
              </div>
              <p className="text-muted">
                <b className="text-ink">Hormonen:</b> {p.hormones}
              </p>
              <p className="mt-1 text-muted">
                <b className="text-ink">Klachten:</b> {p.body}
              </p>
            </div>
          ))}
          <p className="text-xs text-muted">Bij perimenopauze en hormoontherapie is de fase niet betrouwbaar uit alleen de kalender af te leiden.</p>
        </div>
      )}
    </Card>
  )
}

function DataSettings() {
  const { entries, settings, cycle, today, mergeEntries, replaceAll } = useStore()
  const { makeBackup, daysSinceBackup } = useBackup()
  const confirm = useConfirm()
  const toast = useToast()
  const backupInput = useRef<HTMLInputElement>(null)
  const excelInput = useRef<HTMLInputElement>(null)
  const [persisted, setPersisted] = useState<boolean>()

  useEffect(() => {
    void isPersisted().then(setPersisted)
  }, [])

  async function restoreBackup(file: File) {
    try {
      const backup = parseBackup(await file.text())
      const ok = await confirm({
        title: 'Back-up terugzetten?',
        message: (
          <>
            De back-up van {formatDayMonthYear(backup.exportedAt.slice(0, 10))} bevat <b>{backup.entries.length} dagen</b>. Alle huidige gegevens en instellingen
            worden vervangen.
          </>
        ),
        confirmLabel: 'Terugzetten',
        danger: true,
      })
      if (!ok) return
      await replaceAll(backup.entries, backup.settings)
      toast('Back-up teruggezet')
    } catch (e) {
      toast((e as Error).message)
    }
  }

  async function importExcel(file: File) {
    try {
      const { parseWorkbook } = await import('../lib/excelImport')
      const result = parseWorkbook(new Uint8Array(await file.arrayBuffer()), today)
      if (!result.entries.length) {
        toast('Geen ingevulde dagen gevonden in dit bestand')
        return
      }
      const overlap = result.entries.filter((e) => entries.has(e.date)).length
      const ok = await confirm({
        title: 'Excel importeren?',
        message: (
          <>
            <b>{result.entries.length} dagen</b> gevonden ({formatDayMonth(result.entries[0].date)} t/m {formatDayMonth(result.entries.at(-1)!.date)}), waarvan{' '}
            {result.periodStarts} menstruatiestart{result.periodStarts === 1 ? '' : 's'}.
            {overlap > 0 && ` Voor ${overlap} dagen die al in de app staan, worden de waarden uit Excel overgenomen.`}
            {result.skippedFuture > 0 && ` ${result.skippedFuture} vooruit ingevulde dagen in de toekomst worden overgeslagen.`}
          </>
        ),
        confirmLabel: 'Importeren',
      })
      if (!ok) return
      await mergeEntries(result.entries)
      toast(`${result.entries.length} dagen geïmporteerd`)
    } catch (e) {
      toast(`Importeren mislukt: ${(e as Error).message}`)
    }
  }

  async function clearAll() {
    const ok = await confirm({
      title: 'Alles wissen?',
      message: `Alle ${entries.size} ingevulde dagen en je instellingen worden definitief verwijderd. Maak eerst een back-up als je twijfelt.`,
      confirmLabel: 'Alles wissen',
      danger: true,
    })
    if (!ok) return
    await replaceAll([], DEFAULT_SETTINGS)
    toast('Alle gegevens zijn gewist')
  }

  return (
    <Card title="Gegevens">
      <div className="mb-3 flex items-start gap-3 rounded-2xl bg-sunken p-3 text-sm">
        {persisted ? <ShieldCheck size={20} className="shrink-0 text-emerald-500" /> : <HardDrive size={20} className="shrink-0 text-amber-500" />}
        <div className="flex-1">
          <p className="font-semibold">{entries.size} dagen opgeslagen op dit apparaat</p>
          <p className="text-xs text-muted">
            {persisted
              ? 'Permanente opslag is ingeschakeld: de browser ruimt je gegevens niet zomaar op.'
              : 'Permanente opslag is (nog) niet toegestaan. Installeer de app op je startscherm en maak regelmatig een back-up.'}
            {' '}Laatste back-up: {daysSinceBackup === undefined ? 'nog nooit' : daysSinceBackup === 0 ? 'vandaag' : `${daysSinceBackup} dagen geleden`}.
          </p>
          {!persisted && (
            <button type="button" className="mt-1 text-xs font-semibold text-rose-500" onClick={() => void requestPersistence().then(setPersisted)}>
              Permanente opslag aanvragen
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <ActionRow icon={<Download size={20} />} title="Back-up maken" sub="Bewaar het bestand bijv. in je cloudopslag" onClick={makeBackup} />
        <ActionRow icon={<Upload size={20} />} title="Back-up terugzetten" sub="Vervangt alle huidige gegevens" onClick={() => backupInput.current?.click()} />
        <ActionRow
          icon={<FileSpreadsheet size={20} />}
          title="Exporteren voor Excel"
          sub="CSV-bestand, bijv. voor de huisarts of gynaecoloog"
          onClick={() => void saveFile(createCsv(entries, settings, cycle), `eb-en-vloed-${today}.csv`)}
        />
        <ActionRow icon={<FileUp size={20} />} title="Importeren uit Excel" sub="Het oorspronkelijke dagboek (.xlsx)" onClick={() => excelInput.current?.click()} />
        <ActionRow icon={<Trash2 size={20} />} title="Alles wissen" danger onClick={clearAll} />
      </div>

      <input
        ref={backupInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void restoreBackup(f)
        }}
      />
      <input
        ref={excelInput}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void importExcel(f)
        }}
      />
    </Card>
  )
}

function ActionRow({ icon, title, sub, onClick, danger }: { icon: ReactNode; title: string; sub?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-1 py-2 text-left transition active:bg-sunken">
      <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', danger ? 'bg-red-500/10 text-red-500' : 'bg-rose-500/10 text-rose-500')}>{icon}</span>
      <span className="min-w-0">
        <span className={cx('block text-sm font-semibold', danger && 'text-red-600 dark:text-red-400')}>{title}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-[11px] text-muted">{hint}</span>}
      </span>
      {children}
    </div>
  )
}

function Stepper({ value, min, max, onChange, onCard }: { value: number; min: number; max: number; onChange: (v: number) => void; onCard?: boolean }) {
  const btn = cx('grid size-9 place-items-center rounded-xl text-ink disabled:opacity-30', onCard ? 'bg-sunken' : 'bg-card')
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Minder">
        <Minus size={16} />
      </button>
      <span className="w-9 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Meer">
        <Plus size={16} />
      </button>
    </div>
  )
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold', value === o.value ? 'bg-rose-500 text-white' : 'text-muted')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
