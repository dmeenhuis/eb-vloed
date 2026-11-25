import { useRef, useState, type TouchEvent } from 'react'
import { formatDayMonth, fromISO, monthGrid } from '../lib/date'
import { bleedingLevel, PHASES } from '../lib/fields'
import { useStore } from '../lib/store'
import type { ISODate } from '../lib/types'
import { cx } from './ui'

const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

const BLEEDING_BG = ['', '', 'bg-rose-200 dark:bg-rose-500/35', 'bg-rose-400 text-white', 'bg-rose-600 text-white']

export interface Month {
  y: number
  m: number
}

export const monthOf = (iso: ISODate): Month => {
  const d = fromISO(iso)
  return { y: d.getFullYear(), m: d.getMonth() }
}

export const monthPrefix = ({ y, m }: Month) => `${y}-${String(m + 1).padStart(2, '0')}`

export function useMonth(initial: ISODate) {
  const [month, setMonth] = useState(() => monthOf(initial))
  const shift = (n: number) => setMonth(({ y, m }) => ({ y: y + Math.floor((m + n) / 12), m: (((m + n) % 12) + 12) % 12 }))
  return { month, setMonth, shift }
}

/** Month grid with bleeding, phase and "logged" markers. Swipe horizontally to change month. */
export function MonthGrid({
  month,
  onShift,
  onSelect,
  selected,
  allowFuture = false,
}: {
  month: Month
  onShift: (n: number) => void
  onSelect: (date: ISODate) => void
  selected?: ISODate
  allowFuture?: boolean
}) {
  const touch = useRef<number | null>(null)
  const onTouchStart = (e: TouchEvent) => (touch.current = e.touches[0].clientX)
  const onTouchEnd = (e: TouchEvent) => {
    if (touch.current === null) return
    const dx = e.changedTouches[0].clientX - touch.current
    touch.current = null
    if (Math.abs(dx) > 70) onShift(dx > 0 ? -1 : 1)
  }
  const prefix = monthPrefix(month)

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {monthGrid(month.y, month.m).map((d) => (
          <DayCell key={d} date={d} inMonth={d.startsWith(prefix)} selected={d === selected} allowFuture={allowFuture} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

function DayCell({
  date,
  inMonth,
  selected,
  allowFuture,
  onSelect,
}: {
  date: ISODate
  inMonth: boolean
  selected: boolean
  allowFuture: boolean
  onSelect: (date: ISODate) => void
}) {
  const { today, entries, cycle } = useStore()
  const entry = entries.get(date)
  const info = cycle.infoFor(date)
  const level = bleedingLevel(entry?.bleeding)
  const predictedPeriod = cycle.isPredictedPeriod(date)
  const future = date > today
  const logged = !!(entry?.scores || entry?.symptoms || entry?.notes)

  return (
    <button
      type="button"
      disabled={future && !allowFuture}
      onClick={() => onSelect(date)}
      className={cx('flex flex-col items-center gap-1 py-0.5 disabled:cursor-default', !inMonth && 'opacity-35')}
      aria-label={`${formatDayMonth(date)}${info ? `, cyclusdag ${info.cycleDay}` : ''}`}
      aria-current={selected ? 'date' : undefined}
    >
      <span
        className={cx(
          'relative grid size-10 place-items-center rounded-full text-sm font-semibold',
          BLEEDING_BG[level],
          level === 1 && 'ring-2 ring-rose-300 ring-inset',
          predictedPeriod && 'border-2 border-dashed border-rose-400',
          selected ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-card' : date === today && 'ring-2 ring-ink ring-offset-2 ring-offset-card',
          future && !predictedPeriod && 'text-muted',
        )}
      >
        {Number(date.slice(8))}
        {entry?.periodStart && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-rose-600" />}
      </span>
      <span className="flex h-1.5 w-full items-center justify-center gap-0.5 px-1">
        {info && <span className="h-1 flex-1 rounded-full" style={{ background: PHASES[info.phase].color, opacity: info.predicted ? 0.3 : 0.85 }} />}
        {logged && <span className="size-1.5 shrink-0 rounded-full bg-ink/60" />}
      </span>
    </button>
  )
}
