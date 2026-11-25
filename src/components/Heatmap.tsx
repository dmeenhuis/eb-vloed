import { useLayoutEffect, useRef } from 'react'
import { bleedingLevel, PHASES } from '../lib/fields'
import { medTaken } from '../lib/meds'
import { getMetrics } from '../lib/metrics'
import { dayPath, navigate } from '../lib/route'
import { useStore } from '../lib/store'
import type { DayEntry, ISODate } from '../lib/types'
import { valueColor } from './Charts'
import { cx } from './ui'

const BLEED_COLORS = ['', '#fecdd3', '#fda4af', '#fb7185', '#e11d48']
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

interface Row {
  label: string
  cell(date: ISODate, e?: DayEntry): { color?: string; text?: string } | undefined
}

export function Heatmap({ dates }: { dates: ISODate[] }) {
  const { entries, settings, cycle } = useStore()
  const scroller = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [dates.length])

  const rows: Row[] = [
    {
      label: 'Bloedverlies',
      cell: (_, e) => {
        const l = bleedingLevel(e?.bleeding)
        return e?.bleeding ? { color: l ? BLEED_COLORS[l] : undefined, text: l ? undefined : '–' } : undefined
      },
    },
    ...settings.meds
      .filter((m) => m.enabled)
      .map(
        (m): Row => ({
          label: m.name,
          cell: (d, e) => (e ? (medTaken(m, d, e) ? { color: '#c4b5fd', text: '✓' } : { text: '–' }) : undefined),
        }),
      ),
    ...getMetrics(settings, entries).map(
      (m): Row => ({
        label: m.label,
        cell: (_, e) => {
          const v = m.get(e)
          return v === undefined ? undefined : { color: valueColor(m, v), text: String(v) }
        },
      }),
    ),
  ]

  const labelCls = 'flex h-6 items-center truncate text-[11px] font-medium text-muted'

  return (
    <div className="flex">
      <div className="w-[7.5rem] shrink-0 space-y-px pr-2">
        <div className={labelCls}>Datum</div>
        <div className={labelCls}>Cyclusdag</div>
        <div className="h-1.5" />
        {rows.map((r) => (
          <div key={r.label} className={labelCls}>
            {r.label}
          </div>
        ))}
      </div>
      <div ref={scroller} className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
        <div className="flex gap-px">
          {dates.map((d) => {
            const e = entries.get(d)
            const info = cycle.infoFor(d)
            const day = Number(d.slice(8))
            return (
              <button
                key={d}
                type="button"
                onClick={() => navigate(dayPath(d))}
                className={cx('flex w-6 shrink-0 flex-col gap-px', e?.periodStart && 'rounded-md bg-rose-500/10')}
                aria-label={`Ga naar ${d}`}
              >
                <span className={cx('flex h-6 flex-col items-center justify-center text-[10px] leading-none', day === 1 ? 'font-bold text-ink' : 'text-muted')}>
                  {day === 1 ? MONTHS[Number(d.slice(5, 7)) - 1] : day}
                </span>
                <span className="flex h-6 items-center justify-center text-[10px] font-semibold" style={{ color: info ? PHASES[info.phase].color : undefined }}>
                  {info?.cycleDay ?? ''}
                </span>
                <span className="h-1.5 rounded-full" style={{ background: info ? PHASES[info.phase].color : 'transparent', opacity: 0.8 }} />
                {rows.map((r) => {
                  const c = r.cell(d, e)
                  return (
                    <span
                      key={r.label}
                      className={cx('flex h-6 items-center justify-center rounded-md text-[10px] font-semibold', !c?.color && 'bg-sunken text-muted')}
                      style={c?.color ? { background: c.color, color: '#2a1f24' } : undefined}
                    >
                      {c?.text}
                    </span>
                  )
                })}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
