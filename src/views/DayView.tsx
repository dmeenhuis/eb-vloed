import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Droplet, HardDrive, ListChecks, Pencil, Sparkles } from 'lucide-react'
import { CycleCard } from '../components/CycleCard'
import { DatePickerSheet } from '../components/DatePickerSheet'
import { IOSInstallCard } from '../components/InstallCard'
import { SymptomPicker } from '../components/SymptomPicker'
import { Button, Card, cx, Switch, useToast } from '../components/ui'
import { addDays, diffDays, formatDayMonth, formatDayMonthYear, formatWeekday, relativeDayLabel } from '../lib/date'
import { BLEEDING_OPTIONS, isBleeding, SCORE_COLORS, SCORES, SYMPTOM_COLORS } from '../lib/fields'
import { SYMPTOM_LEVELS, symptomLabel } from '../lib/symptoms'
import { medStatus, medTaken } from '../lib/meds'
import { dayPath, navigate } from '../lib/route'
import { useStore } from '../lib/store'
import { useBackup } from '../lib/useBackup'
import type { Bleeding, DayEntry, ISODate, ScoreId } from '../lib/types'

const SCORE_WORDS: Record<ScoreId, string[]> = {
  energie: ['', 'Heel laag', 'Laag', 'Gemiddeld', 'Goed', 'Heel goed'],
  stemming: ['', 'Heel slecht', 'Slecht', 'Gemiddeld', 'Goed', 'Heel goed'],
  slaap: ['', 'Heel slecht', 'Slecht', 'Gemiddeld', 'Goed', 'Heel goed'],
}

export function DayView({ date: requested }: { date?: ISODate }) {
  const { today, entries, cycle, updateEntry } = useStore()
  const date = requested && requested <= today ? requested : today
  const entry = entries.get(date)
  const update = useCallback((fn: (e: DayEntry) => DayEntry) => updateEntry(date, fn), [date, updateEntry])
  const go = (d: ISODate) => navigate(d === today ? '/' : dayPath(d), true)

  // Swipe left/right to change day.
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement
    touch.current = target.closest('input, textarea, [role=dialog]') ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: TouchEvent) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) < 80 || Math.abs(dy) > 50) return
    if (dx > 0) go(addDays(date, -1))
    else if (date < today) go(addDays(date, 1))
  }

  const prev = entries.get(addDays(date, -1))
  const info = cycle.infoFor(date)
  const suggestStart = isBleeding(entry?.bleeding) && !entry?.periodStart && !isBleeding(prev?.bleeding) && (!info || info.cycleDay > 10)

  return (
    <div className="space-y-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <DayHeader date={date} today={today} onGo={go} />
      {date === today && <IOSInstallCard />}
      {date === today && <BackupReminder />}
      <CycleCard date={date} />

      <Card title={<Title done={!!entry?.bleeding}>Bloedverlies</Title>}>
        <BleedingPicker value={entry?.bleeding} onChange={(bleeding) => update((e) => ({ ...e, bleeding }))} />
        {suggestStart && (
          <div className="animate-slide-up mt-3 flex items-center gap-3 rounded-2xl bg-rose-500/10 p-3">
            <Sparkles size={20} className="shrink-0 text-rose-500" />
            <p className="flex-1 text-sm leading-snug">Is dit de eerste dag van een nieuwe menstruatie?</p>
            <Button variant="primary" className="min-h-9 px-3" onClick={() => update((e) => ({ ...e, periodStart: true }))}>
              Ja, dag 1
            </Button>
          </div>
        )}
        <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-sunken px-4 py-3">
          <span>
            <span className="block text-sm font-semibold">Eerste dag menstruatie</span>
            <span className="block text-xs text-muted">Start een nieuwe cyclus (dag 1)</span>
          </span>
          <Switch label="Eerste dag menstruatie" checked={!!entry?.periodStart} onChange={(v) => update((e) => ({ ...e, periodStart: v || undefined }))} />
        </label>
      </Card>

      <MedsCard date={date} entry={entry} update={update} />

      <Card
        title={<Title done={SCORES.every((s) => entry?.scores?.[s.id] !== undefined)}>Hoe voel je je?</Title>}
        action={<CopyYesterday date={date} prev={prev} update={update} />}
      >
        <p className="-mt-1 mb-3 text-xs text-muted">1 = heel laag / slecht · 5 = heel goed</p>
        <div className="space-y-4">
          {SCORES.map((s) => (
            <ScoreRow
              key={s.id}
              label={s.label}
              value={entry?.scores?.[s.id]}
              words={SCORE_WORDS[s.id]}
              onChange={(v) => update((e) => ({ ...e, scores: { ...e.scores, [s.id]: v } }))}
            />
          ))}
        </div>
      </Card>

      <SymptomsCard entry={entry} update={update} />

      <NotesCard key={date} date={date} initial={entry?.notes ?? ''} />

      <p className="pb-2 text-center text-xs text-muted">Alles wordt direct op dit apparaat opgeslagen.</p>
    </div>
  )
}

function Title({ children, done }: { children: ReactNode; done?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      {children}
      {done && (
        <span className="animate-pop grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </span>
  )
}

function DayHeader({ date, today, onGo }: { date: ISODate; today: ISODate; onGo: (d: ISODate) => void }) {
  const [picking, setPicking] = useState(false)
  const rel = relativeDayLabel(date, today)
  const navBtn = 'grid size-11 place-items-center rounded-full bg-card text-ink shadow-sm disabled:opacity-30'
  return (
    <header className="flex items-center gap-2 pt-1">
      <button type="button" className={navBtn} onClick={() => onGo(addDays(date, -1))} aria-label="Vorige dag">
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        onClick={() => setPicking(true)}
        aria-haspopup="dialog"
        aria-label={`${formatWeekday(date)} ${formatDayMonthYear(date)}, kies een andere dag`}
        className="min-w-0 flex-1 rounded-2xl py-0.5 text-center transition active:bg-sunken"
      >
        <span className="block text-xs font-semibold tracking-wide text-rose-500 uppercase">{rel ?? `${diffDays(date, today)} dagen geleden`}</span>
        <span className="flex items-center justify-center gap-1 text-xl font-bold tracking-tight">
          <span className="truncate">
            {formatWeekday(date)} {date.slice(0, 4) === today.slice(0, 4) ? formatDayMonth(date) : formatDayMonthYear(date)}
          </span>
          <ChevronDown size={18} className="shrink-0 text-muted" />
        </span>
      </button>
      <DatePickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        value={date}
        onSelect={(d) => {
          onGo(d)
          setPicking(false)
        }}
      />
      {date < today ? (
        <button type="button" className={navBtn} onClick={() => onGo(addDays(date, 1))} aria-label="Volgende dag">
          <ChevronRight size={22} />
        </button>
      ) : (
        <div className="size-11" />
      )}
    </header>
  )
}

function BackupReminder() {
  const { makeBackup, daysSinceBackup, backupDue } = useBackup()
  if (!backupDue) return null
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-amber-400/15 p-4">
      <HardDrive size={22} className="shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="flex-1 text-sm leading-snug">
        {daysSinceBackup === undefined ? 'Je hebt nog geen back-up gemaakt.' : `Laatste back-up: ${daysSinceBackup} dagen geleden.`}
        <span className="block text-xs text-muted">Je gegevens staan alleen op dit apparaat.</span>
      </p>
      <Button variant="primary" className="min-h-9 px-3" onClick={makeBackup}>
        Back-up
      </Button>
    </div>
  )
}

function BleedingPicker({ value, onChange }: { value?: Bleeding; onChange: (b?: Bleeding) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {BLEEDING_OPTIONS.map((o) => {
        const selected = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? undefined : o.id)}
            className={cx(
              'flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[11px] font-semibold transition active:scale-95',
              selected ? 'animate-pop bg-rose-500 text-white shadow-md shadow-rose-500/30' : 'bg-sunken text-muted',
            )}
          >
            <BleedingIcon level={o.level} selected={selected} />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function BleedingIcon({ level, selected }: { level: number; selected: boolean }) {
  if (level === 0) return <span className={cx('grid size-6 place-items-center text-lg leading-none', selected ? 'text-white' : 'text-muted')}>–</span>
  if (level === 1) return <span className={cx('my-2 size-2 rounded-full', selected ? 'bg-white' : 'bg-rose-400')} />
  const n = level - 1
  return (
    <span className="flex h-6 items-end">
      {Array.from({ length: n }, (_, i) => (
        <Droplet key={i} size={n === 1 ? 20 : n === 2 ? 16 : 13} className={cx(selected ? 'fill-white text-white' : 'fill-rose-400 text-rose-400', i > 0 && '-ml-1')} />
      ))}
    </span>
  )
}

function MedsCard({ date, entry, update }: { date: ISODate; entry?: DayEntry; update: (fn: (e: DayEntry) => DayEntry) => void }) {
  const { settings } = useStore()
  const meds = settings.meds.filter((m) => m.enabled)
  if (!meds.length) return null
  return (
    <Card title="Medicatie" action={!entry?.meds && <span className="text-xs text-muted">Volgens schema</span>}>
      <div className={cx('grid gap-2', meds.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {meds.map((m) => {
          const taken = medTaken(m, date, entry)
          const status = medStatus(m, date)
          const deviates = taken !== status.scheduled
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={taken}
              onClick={() => update((e) => ({ ...e, meds: { ...e.meds, [m.id]: !taken } }))}
              className={cx(
                'relative flex flex-col items-start rounded-2xl p-3 text-left transition active:scale-95',
                taken ? 'bg-rose-500/10 ring-2 ring-rose-500' : 'bg-sunken',
              )}
            >
              <span
                className={cx(
                  'mb-2 grid size-6 place-items-center rounded-full transition',
                  taken ? 'animate-pop bg-rose-500 text-white' : 'border-2 border-line bg-card',
                )}
              >
                {taken && <Check size={14} strokeWidth={3} />}
              </span>
              <span className="w-full truncate text-sm font-semibold">{m.name}</span>
              <span className="line-clamp-2 w-full text-[11px] leading-snug text-muted">{status.hint ?? m.dose}</span>
              {deviates && <span className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">{taken ? 'Extra' : 'Overgeslagen'}</span>}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function CopyYesterday({ date, prev, update }: { date: ISODate; prev?: DayEntry; update: (fn: (e: DayEntry) => DayEntry) => void }) {
  const toast = useToast()
  const hasData = !!(prev?.scores || prev?.symptoms)
  if (!hasData) return null
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-xs font-semibold text-muted"
      onClick={() => {
        update((e) => ({ ...e, scores: { ...prev!.scores }, symptoms: { ...prev!.symptoms } }))
        toast(`Scores van ${formatDayMonth(addDays(date, -1))} overgenomen`)
      }}
    >
      <Copy size={13} /> Zoals gisteren
    </button>
  )
}

function ScoreRow({ label, value, words, onChange }: { label: string; value?: number; words: string[]; onChange: (v?: number) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted">{value ? words[value] : ''}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              aria-label={`${label} ${n}: ${words[n]}`}
              onClick={() => onChange(selected ? undefined : n)}
              className={cx('h-11 rounded-xl text-base font-semibold transition active:scale-95', selected ? 'animate-pop text-[#2a1f24] shadow-sm' : 'bg-sunken text-muted')}
              style={selected ? { background: SCORE_COLORS[n] } : undefined}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SymptomsCard({ entry, update }: { entry?: DayEntry; update: (fn: (e: DayEntry) => DayEntry) => void }) {
  const { settings } = useStore()
  const [picking, setPicking] = useState(false)
  const tracked = settings.symptoms
  // Values recorded earlier for symptoms that are no longer tracked stay visible on that day.
  const extra = Object.keys(entry?.symptoms ?? {}).filter((id) => !tracked.includes(id))
  const shown = [...tracked, ...extra]

  return (
    <Card
      title={<Title done={shown.length > 0 && shown.every((id) => entry?.symptoms?.[id] !== undefined)}>Klachten</Title>}
      action={
        tracked.length > 0 && (
          <button
            type="button"
            className="rounded-full bg-emerald-500/12 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
            onClick={() => update((e) => ({ ...e, symptoms: { ...e.symptoms, ...Object.fromEntries(tracked.map((id) => [id, 0])) } }))}
          >
            Geen klachten
          </button>
        )
      }
    >
      {shown.length > 0 ? (
        <div className="space-y-4">
          {shown.map((id) => (
            <SymptomRow
              key={id}
              label={symptomLabel(id, settings)}
              value={entry?.symptoms?.[id]}
              onChange={(v) => update((e) => ({ ...e, symptoms: { ...e.symptoms, [id]: v } }))}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Je houdt nog geen klachten bij. Kies welke klachten je dagelijks wilt scoren.</p>
      )}
      <button
        type="button"
        onClick={() => setPicking(true)}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl py-2 text-sm font-semibold text-rose-500 active:bg-sunken"
      >
        {shown.length > 0 ? <Pencil size={15} /> : <ListChecks size={16} />}
        {shown.length > 0 ? 'Klachten aanpassen' : 'Klachten kiezen'}
      </button>
      <SymptomPicker open={picking} onClose={() => setPicking(false)} />
    </Card>
  )
}

function SymptomRow({ label, value, onChange }: { label: string; value?: number; onChange: (v?: number) => void }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-semibold">{label}</div>
      <div className="grid grid-cols-4 gap-1.5">
        {SYMPTOM_LEVELS.map((word, n) => {
          const selected = value === n
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              aria-label={`${label}: ${word}`}
              onClick={() => onChange(selected ? undefined : n)}
              className={cx('h-10 rounded-xl text-xs font-semibold transition active:scale-95', selected ? 'animate-pop text-[#2a1f24] shadow-sm' : 'bg-sunken text-muted')}
              style={selected ? { background: SYMPTOM_COLORS[n] } : undefined}
            >
              {word}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function NotesCard({ date, initial }: { date: ISODate; initial: string }) {
  const { updateEntry } = useStore()
  const [text, setText] = useState(initial)
  const pending = useRef<string | null>(null)

  const flush = useCallback(() => {
    if (pending.current === null) return
    const notes = pending.current
    pending.current = null
    updateEntry(date, (e) => ({ ...e, notes: notes || undefined }))
  }, [date, updateEntry])

  useEffect(() => {
    const t = window.setTimeout(flush, 600)
    return () => window.clearTimeout(t)
  }, [text, flush])
  useEffect(() => flush, [flush])

  return (
    <Card title={<Title done={!!initial.trim()}>Overige klachten / notities</Title>}>
      <textarea
        value={text}
        onChange={(e) => {
          pending.current = e.target.value
          setText(e.target.value)
        }}
        onBlur={flush}
        rows={3}
        placeholder="Hoe was je dag? Bijzonderheden, andere klachten…"
        className="min-h-24 w-full resize-none rounded-2xl bg-sunken p-3 text-base leading-relaxed outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-rose-500/50 [field-sizing:content]"
      />
    </Card>
  )
}
