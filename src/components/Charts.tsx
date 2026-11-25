import type { ReactNode } from 'react'
import { isBleeding, PHASES, SCORE_COLORS, SYMPTOM_COLORS } from '../lib/fields'
import { shortDate, type Metric } from '../lib/metrics'
import type { DayCycleInfo } from '../lib/cycle'
import type { DayEntry, ISODate } from '../lib/types'

const W = 340
const H = 170
const PAD = { l: 20, r: 6, t: 8, b: 30 }
const PLOT_W = W - PAD.l - PAD.r
const PLOT_H = H - PAD.t - PAD.b

export const valueColor = (metric: Metric, v: number) => (metric.kind === 'score' ? SCORE_COLORS[v] : SYMPTOM_COLORS[v])

function YGrid({ metric }: { metric: Metric }) {
  const y = (v: number) => PAD.t + (1 - (v - metric.min) / (metric.max - metric.min)) * PLOT_H
  return (
    <g>
      {Array.from({ length: metric.max - metric.min + 1 }, (_, i) => metric.min + i).map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="3 3" />
          <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">
            {v}
          </text>
        </g>
      ))}
    </g>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <text x={PAD.l + PLOT_W / 2} y={PAD.t + PLOT_H / 2} textAnchor="middle" fontSize="11" fill="var(--muted)">
      {children}
    </text>
  )
}

export function TrendChart({
  dates,
  metric,
  entries,
  infoFor,
}: {
  dates: ISODate[]
  metric: Metric
  entries: Map<ISODate, DayEntry>
  infoFor: (d: ISODate) => DayCycleInfo | null
}) {
  const n = dates.length
  const step = PLOT_W / Math.max(n, 1)
  const x = (i: number) => PAD.l + (i + 0.5) * step
  const y = (v: number) => PAD.t + (1 - (v - metric.min) / (metric.max - metric.min)) * PLOT_H
  const points = dates.flatMap((d, i) => {
    const v = metric.get(entries.get(d))
    return v === undefined ? [] : [{ i, v, d }]
  })
  const path = points.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
  const ticks = n > 1 ? [0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1] : [0]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${metric.label} over tijd`}>
      {dates.map((d, i) =>
        isBleeding(entries.get(d)?.bleeding) ? <rect key={d} x={PAD.l + i * step} y={PAD.t} width={step} height={PLOT_H} fill="#f43f5e" opacity={0.12} /> : null,
      )}
      <YGrid metric={metric} />
      {dates.map((d, i) => {
        const info = infoFor(d)
        return info ? <rect key={d} x={PAD.l + i * step} y={H - PAD.b + 6} width={step + 0.3} height={4} fill={PHASES[info.phase].color} opacity={0.8} /> : null
      })}
      {[...new Set(ticks)].map((i) => (
        <text key={i} x={x(i)} y={H - 6} fontSize="9" fill="var(--muted)" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
          {shortDate(dates[i])}
        </text>
      ))}
      {points.length > 1 && <path d={path} fill="none" stroke="#f43f5e" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />}
      {points.map((p) => (
        <circle key={p.d} cx={x(p.i)} cy={y(p.v)} r={n > 120 ? 2.5 : 4} fill={valueColor(metric, p.v)} stroke="var(--card)" strokeWidth={1.5} />
      ))}
      {!points.length && <Empty>Nog geen gegevens in deze periode</Empty>}
    </svg>
  )
}

export interface CycleSeries {
  start: ISODate
  values: (number | undefined)[]
  current: boolean
}

const SERIES_COLORS = ['#f43f5e', '#8b5cf6', '#14b8a6', '#f59e0b']

export function CycleCompareChart({ series, metric, maxDay }: { series: CycleSeries[]; metric: Metric; maxDay: number }) {
  const step = PLOT_W / Math.max(maxDay, 1)
  const x = (day: number) => PAD.l + (day - 0.5) * step
  const y = (v: number) => PAD.t + (1 - (v - metric.min) / (metric.max - metric.min)) * PLOT_H
  const hasData = series.some((s) => s.values.some((v) => v !== undefined))
  const ticks = [1, ...Array.from({ length: Math.floor(maxDay / 7) }, (_, i) => (i + 1) * 7).filter((d) => d < maxDay - 2), maxDay]

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${metric.label} per cyclusdag`}>
        <YGrid metric={metric} />
        {ticks.map((d) => (
          <text key={d} x={x(d)} y={H - 10} fontSize="9" fill="var(--muted)" textAnchor="middle">
            {d}
          </text>
        ))}
        <text x={W - PAD.r} y={H - 0.5} fontSize="8" fill="var(--muted)" textAnchor="end">
          cyclusdag
        </text>
        {series.map((s, si) => {
          const color = SERIES_COLORS[si % SERIES_COLORS.length]
          const pts = s.values.flatMap((v, i) => (v === undefined ? [] : [{ day: i + 1, v }]))
          const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.day).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
          return (
            <g key={s.start} opacity={s.current ? 1 : 0.55}>
              {pts.length > 1 && <path d={d} fill="none" stroke={color} strokeWidth={s.current ? 2.5 : 1.75} strokeLinejoin="round" strokeLinecap="round" />}
              {pts.map((p) => (
                <circle key={p.day} cx={x(p.day)} cy={y(p.v)} r={s.current ? 3.5 : 2.5} fill={color} stroke="var(--card)" strokeWidth={1} />
              ))}
            </g>
          )
        })}
        {!hasData && <Empty>Nog geen gegevens</Empty>}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {series.map((s, si) => (
          <span key={s.start} className="flex items-center gap-1.5">
            <span className="h-1 w-4 rounded-full" style={{ background: SERIES_COLORS[si % SERIES_COLORS.length] }} />
            {s.current ? 'Huidige cyclus' : `Vanaf ${shortDate(s.start)}`}
          </span>
        ))}
      </div>
    </div>
  )
}
