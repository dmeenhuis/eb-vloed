import { ChevronLeft, ChevronRight, MessageSquareText } from 'lucide-react'
import { MonthGrid, monthOf, monthPrefix, useMonth } from '../components/MonthCalendar'
import { Card } from '../components/ui'
import { formatDayMonth, formatMonthYear, formatWeekdayShort } from '../lib/date'
import { PHASES } from '../lib/fields'
import { dayPath, navigate } from '../lib/route'
import { useStore } from '../lib/store'

export function CalendarView() {
  const { today, entries, cycle } = useStore()
  const { month, setMonth, shift } = useMonth(today)
  const prefix = monthPrefix(month)
  const isCurrentMonth = today.startsWith(prefix)

  const notes = [...entries.values()].filter((e) => e.date.startsWith(prefix) && e.notes?.trim()).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-bold tracking-tight">{formatMonthYear(new Date(month.y, month.m, 1))}</h1>
        <div className="flex items-center gap-1.5">
          {!isCurrentMonth && (
            <button
              type="button"
              className="mr-1 rounded-full bg-rose-500/12 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400"
              onClick={() => setMonth(monthOf(today))}
            >
              Vandaag
            </button>
          )}
          <button type="button" onClick={() => shift(-1)} aria-label="Vorige maand" className="grid size-10 place-items-center rounded-full bg-card shadow-sm">
            <ChevronLeft size={20} />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label="Volgende maand" className="grid size-10 place-items-center rounded-full bg-card shadow-sm">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <Card className="px-2.5">
        <MonthGrid month={month} onShift={shift} onSelect={(d) => navigate(dayPath(d))} />
      </Card>

      <Legend />

      {cycle.stats.nextPeriod && (
        <p className="px-1 text-sm text-muted">
          Volgende menstruatie verwacht rond <b className="text-ink">{formatDayMonth(cycle.stats.nextPeriod)}</b>, op basis van een gemiddelde cyclus van{' '}
          {cycle.stats.avgCycleLength} dagen.
        </p>
      )}

      {notes.length > 0 && (
        <Card title="Notities deze maand">
          <ul className="divide-y divide-line">
            {notes.map((e) => (
              <li key={e.date}>
                <button type="button" onClick={() => navigate(dayPath(e.date))} className="flex w-full gap-3 py-3 text-left">
                  <MessageSquareText size={18} className="mt-0.5 shrink-0 text-rose-400" />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-muted">
                      {formatWeekdayShort(e.date)} {formatDayMonth(e.date)}
                    </span>
                    <span className="line-clamp-2 text-sm">{e.notes}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-1 text-xs text-muted">
      <span className="flex items-center gap-2">
        <span className="flex">
          <span className="size-3.5 rounded-full bg-rose-200 dark:bg-rose-500/35" />
          <span className="-ml-1 size-3.5 rounded-full bg-rose-400" />
          <span className="-ml-1 size-3.5 rounded-full bg-rose-600" />
        </span>
        Bloedverlies
      </span>
      <span className="flex items-center gap-2">
        <span className="size-3.5 rounded-full border-2 border-dashed border-rose-400" /> Verwacht
      </span>
      {Object.values(PHASES).map((p) => (
        <span key={p.label} className="flex items-center gap-2">
          <span className="h-1 w-4 rounded-full" style={{ background: p.color }} /> {p.short}
        </span>
      ))}
      <span className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-ink/60" /> Scores of notitie ingevuld
      </span>
    </div>
  )
}
