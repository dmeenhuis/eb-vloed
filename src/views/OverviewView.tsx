import { useMemo, useState, type ReactNode } from 'react'
import { CycleBar } from '../components/CycleCard'
import { CycleCompareChart, TrendChart, type CycleSeries } from '../components/Charts'
import { Heatmap } from '../components/Heatmap'
import { Card, cx } from '../components/ui'
import { addDays, diffDays, formatDayMonth, formatDayMonthShort } from '../lib/date'
import { dateRange, getMetrics } from '../lib/metrics'
import { useStore } from '../lib/store'

const RANGES = [
  { label: '30 d', days: 30 },
  { label: '90 d', days: 90 },
  { label: 'Alles', days: 0 },
]

export function OverviewView() {
  const { today, entries, cycle, settings } = useStore()
  const metrics = useMemo(() => getMetrics(settings, entries), [settings, entries])
  const [metricId, setMetricId] = useState(metrics[0].id)
  const [range, setRange] = useState(30)
  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0]
  const { stats, cycles } = cycle

  const firstDate = useMemo(() => [...entries.keys()].sort()[0] ?? today, [entries, today])
  const trendDates = useMemo(() => {
    const from = range ? addDays(today, -(range - 1)) : firstDate < today ? firstDate : addDays(today, -29)
    return dateRange(from, today)
  }, [range, firstDate, today])
  const heatDates = useMemo(() => dateRange(firstDate < addDays(today, -27) ? firstDate : addDays(today, -27), today), [firstDate, today])

  const series: CycleSeries[] = useMemo(
    () =>
      cycles
        .slice(-4)
        .reverse()
        .map((c) => {
          const end = c.end ?? today
          return {
            start: c.start,
            current: !c.end,
            values: dateRange(c.start, end).map((d) => metric.get(entries.get(d))),
          }
        }),
    [cycles, entries, metric, today],
  )
  const maxDay = Math.max(stats.avgCycleLength, ...series.map((s) => s.values.length))

  const logged30 = dateRange(addDays(today, -29), today).filter((d) => entries.has(d)).length
  const daysUntil = stats.nextPeriod ? diffDays(today, stats.nextPeriod) : undefined

  return (
    <div className="space-y-4">
      <h1 className="pt-1 text-2xl font-bold tracking-tight">Overzicht</h1>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Gem. cyclus"
          value={`${stats.avgCycleLength} dagen`}
          sub={
            stats.cycleLengthFromData
              ? stats.sampleSize > 1
                ? `${stats.minLength}–${stats.maxLength} d · ${stats.sampleSize} cycli`
                : 'op basis van 1 cyclus'
              : 'standaardwaarde'
          }
        />
        <Stat label="Gem. menstruatie" value={stats.avgPeriodLength ? `${String(stats.avgPeriodLength).replace('.', ',')} dagen` : '–'} sub="dagen bloedverlies" />
        <Stat
          label="Volgende menstruatie"
          value={stats.nextPeriod ? formatDayMonth(stats.nextPeriod) : '–'}
          sub={daysUntil !== undefined ? (daysUntil <= 1 ? 'rond morgen' : `over ±${daysUntil} dagen`) : 'nog geen start bekend'}
        />
        <Stat label="Ingevuld" value={`${logged30} / 30`} sub="dagen in de laatste maand" />
      </div>

      <Card title="Verloop">
        <Chips>
          {metrics.map((m) => (
            <Chip key={m.id} active={m.id === metric.id} onClick={() => setMetricId(m.id)}>
              {m.label}
            </Chip>
          ))}
        </Chips>
        <div className="mt-3 mb-1 flex justify-end">
          <div className="inline-flex rounded-full bg-sunken p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRange(r.days)}
                className={cx('rounded-full px-3 py-1 text-xs font-semibold', range === r.days ? 'bg-card text-ink shadow-sm' : 'text-muted')}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <TrendChart dates={trendDates} metric={metric} entries={entries} infoFor={cycle.infoFor} />
        <p className="mt-1 text-xs text-muted">
          {metric.kind === 'score' ? '1 = heel laag/slecht · 5 = heel goed' : '0 = geen · 3 = ernstig'}. Roze achtergrond = menstruatie, gekleurde balk = fase.
        </p>
      </Card>

      {series.length > 0 && (
        <Card title={`${metric.label} per cyclus`}>
          <p className="-mt-1 mb-2 text-xs text-muted">Vergelijk cycli op dezelfde cyclusdag om terugkerende patronen te zien.</p>
          <CycleCompareChart series={series} metric={metric} maxDay={maxDay} />
        </Card>
      )}

      <Card title="Dagoverzicht">
        <p className="-mt-1 mb-3 text-xs text-muted">Veeg naar links voor eerdere dagen. Tik op een dag om die te bekijken of aan te passen.</p>
        <Heatmap dates={heatDates} />
      </Card>

      {cycles.length > 0 && (
        <Card title="Cycli">
          <ul className="space-y-4">
            {[...cycles].reverse().map((c) => {
              const current = !c.end
              const length = c.length ?? diffDays(c.start, today) + 1
              const barLength = current ? Math.max(stats.avgCycleLength, length) : length
              return (
                <li key={c.start}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {formatDayMonthShort(c.start)} – {c.end ? formatDayMonthShort(c.end) : 'nu'}
                    </span>
                    <span className="text-xs text-muted">
                      {current ? `dag ${length}` : `${length} dagen`}
                      {c.periodDays ? ` · ${c.periodDays} d menstruatie` : ''}
                    </span>
                  </div>
                  <CycleBar thin length={barLength} menstruationDays={Math.max(settings.menstruationPhaseDays, c.periodDays ?? 0)} marker={current ? length : undefined} />
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl bg-card p-4 shadow-[0_1px_2px_rgba(60,20,40,0.04),0_4px_16px_rgba(60,20,40,0.04)]">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-xl font-bold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  )
}

function Chips({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">{children}</div>
}

function Chip({ children, active, onClick }: { children: ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx('shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition', active ? 'bg-ink text-bg' : 'bg-sunken text-muted')}
    >
      {children}
    </button>
  )
}
