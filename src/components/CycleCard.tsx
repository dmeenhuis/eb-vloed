import { useState } from 'react'
import { ChevronDown, Droplet } from 'lucide-react'
import { diffDays, formatDayMonth } from '../lib/date'
import { PHASES } from '../lib/fields'
import { phaseFor } from '../lib/cycle'
import { useStore } from '../lib/store'
import type { ISODate, Phase } from '../lib/types'
import { cx } from './ui'

/** Horizontal bar with the phases of a cycle and a marker on the given day. */
export function CycleBar({ length, menstruationDays, marker, thin }: { length: number; menstruationDays: number; marker?: number; thin?: boolean }) {
  const { settings } = useStore()
  const days = Array.from({ length }, (_, i) => phaseFor(i + 1, length, menstruationDays, settings.lutealPhaseDays).phase)
  const segments: { phase: Phase; count: number }[] = []
  for (const p of days) {
    const last = segments.at(-1)
    if (last?.phase === p) last.count++
    else segments.push({ phase: p, count: 1 })
  }
  return (
    <div className="relative">
      <div className={cx('flex gap-0.5 overflow-hidden rounded-full', thin ? 'h-1.5' : 'h-2.5')}>
        {segments.map((s, i) => (
          <div key={i} style={{ flexGrow: s.count, background: PHASES[s.phase].color }} className="opacity-80" />
        ))}
      </div>
      {marker !== undefined && (
        <div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-ink shadow-md"
          style={{ left: `${((Math.min(marker, length) - 0.5) / length) * 100}%` }}
        />
      )}
    </div>
  )
}

export function CycleCard({ date }: { date: ISODate }) {
  const { cycle, today } = useStore()
  const [open, setOpen] = useState(false)
  const info = cycle.infoFor(date)

  if (!info) {
    return (
      <section className="rounded-3xl bg-gradient-to-br from-rose-400 to-rose-600 p-5 text-white shadow-lg shadow-rose-500/20">
        <div className="flex items-center gap-2 text-sm font-medium text-white/80">
          <Droplet size={16} /> Cyclus
        </div>
        <p className="mt-2 text-lg leading-snug font-semibold">Nog geen menstruatiestart bekend</p>
        <p className="mt-1 text-sm text-white/85">
          Zet bij de eerste dag van je menstruatie de schakelaar <b>Eerste dag menstruatie</b> aan. Of importeer je Excel-bestand via Instellingen.
        </p>
      </section>
    )
  }

  const phase = PHASES[info.phase]
  const next = cycle.stats.nextPeriod
  const daysUntil = next ? diffDays(today, next) : undefined
  const isCurrent = date === today

  let subline: string | undefined
  if (isCurrent && info.overdue) subline = `Menstruatie ${info.cycleDay - info.length} ${info.cycleDay - info.length === 1 ? 'dag' : 'dagen'} later dan gemiddeld`
  else if (isCurrent && daysUntil !== undefined && info.phase !== 'menstruatie')
    subline = daysUntil <= 1 ? 'Menstruatie verwacht rond morgen' : `Menstruatie verwacht over ±${daysUntil} dagen (${formatDayMonth(next!)})`
  else if (!isCurrent) subline = `Cyclus gestart op ${formatDayMonth(info.cycleStart)}`

  return (
    <section
      className="overflow-hidden rounded-3xl p-5 text-white shadow-lg"
      style={{ background: `linear-gradient(135deg, ${phase.color}, color-mix(in oklab, ${phase.color} 70%, #1e1020))`, boxShadow: `0 10px 30px -12px ${phase.color}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-white/80">Cyclusdag</div>
          <div className="text-5xl leading-none font-bold tracking-tight">{info.cycleDay}</div>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur">{phase.label}</div>
          <div className="mt-1 text-xs text-white/75">schatting</div>
        </div>
      </div>
      {subline && <p className="mt-3 text-sm font-medium text-white/90">{subline}</p>}
      <div className="mt-4 rounded-full bg-white/25 p-0.5">
        <CycleBar length={Math.max(info.length, info.cycleDay)} menstruationDays={info.menstruationDays} marker={info.cycleDay} />
      </div>
      <button type="button" onClick={() => setOpen(!open)} className="mt-3 -mb-1 flex items-center gap-1 text-sm font-medium text-white/90">
        Wat kun je verwachten?
        <ChevronDown size={16} className={cx('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="animate-fade-in mt-2 space-y-2 text-sm leading-relaxed text-white/90">
          <p>
            <b>Hormonen:</b> {phase.hormones}
          </p>
          <p>
            <b>Veelvoorkomend:</b> {phase.body}
          </p>
          <p className="text-xs text-white/70">
            Geschat op basis van een cycluslengte van {info.length} dagen (ovulatie rond dag {info.ovulationDay}). Bij perimenopauze en hormoontherapie is de
            fase niet betrouwbaar uit alleen de kalender af te leiden.
          </p>
        </div>
      )}
    </section>
  )
}
