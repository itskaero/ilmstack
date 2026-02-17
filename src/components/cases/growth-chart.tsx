'use client'

import { useMemo } from 'react'
import type { GrowthMeasurement } from '@/types/database'
import {
  type PercentilePoint, type ChartType,
  getPercentileData, CHART_LABELS, PERCENTILE_COLORS,
} from './growth-chart-data'

interface GrowthChartProps {
  chart: ChartType
  gender: 'male' | 'female'
  standard: 'who' | 'cdc'
  measurements: GrowthMeasurement[]
}

const W = 560
const H = 340
const PAD = { top: 30, right: 20, bottom: 40, left: 50 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const PERCENTILE_KEYS = ['p3', 'p10', 'p25', 'p50', 'p75', 'p90', 'p97'] as const
const PERCENTILE_LABELS = ['3rd', '10th', '25th', '50th', '75th', '90th', '97th']

function lerp(data: PercentilePoint[], ageMonths: number, key: keyof PercentilePoint): number {
  if (data.length === 0) return 0
  if (ageMonths <= data[0].age_months) return data[0][key] as number
  if (ageMonths >= data[data.length - 1].age_months) return data[data.length - 1][key] as number

  for (let i = 0; i < data.length - 1; i++) {
    const a = data[i]
    const b = data[i + 1]
    if (ageMonths >= a.age_months && ageMonths <= b.age_months) {
      const t = (ageMonths - a.age_months) / (b.age_months - a.age_months)
      return (a[key] as number) + t * ((b[key] as number) - (a[key] as number))
    }
  }
  return data[data.length - 1][key] as number
}

function getMeasurementValue(m: GrowthMeasurement, chart: ChartType): number | null {
  if (chart === 'weight_for_age') return m.weight_kg
  if (chart === 'height_for_age') return m.height_cm
  return m.head_circumference_cm
}

export function GrowthChart({ chart, gender, standard, measurements }: GrowthChartProps) {
  const data = useMemo(() => getPercentileData(chart, gender, standard), [chart, gender, standard])
  const labels = CHART_LABELS[chart]

  const { xMin, xMax, yMin, yMax, xTicks, yTicks } = useMemo(() => {
    const ages = data.map((d) => d.age_months)
    const xMin = Math.min(...ages)
    const xMax = Math.max(...ages)

    const allVals = data.flatMap((d) =>
      PERCENTILE_KEYS.map((k) => d[k] as number)
    )
    const measVals = measurements
      .map((m) => getMeasurementValue(m, chart))
      .filter((v): v is number => v != null)

    const combined = [...allVals, ...measVals]
    const yMin = Math.floor(Math.min(...combined) * 0.95)
    const yMax = Math.ceil(Math.max(...combined) * 1.05)

    // Generate ~6 ticks
    const xStep = Math.ceil((xMax - xMin) / 6 / 6) * 6
    const xTicks: number[] = []
    for (let x = xMin; x <= xMax; x += xStep) xTicks.push(x)

    const yRange = yMax - yMin
    const yStep = Math.ceil(yRange / 6)
    const yTicks: number[] = []
    for (let y = yMin; y <= yMax; y += yStep) yTicks.push(y)

    return { xMin, xMax, yMin, yMax, xTicks, yTicks }
  }, [data, measurements, chart])

  const toX = (age: number) => PAD.left + ((age - xMin) / (xMax - xMin)) * PLOT_W
  const toY = (val: number) => PAD.top + (1 - (val - yMin) / (yMax - yMin)) * PLOT_H

  const percentileLines = useMemo(() => {
    return PERCENTILE_KEYS.map((key) => {
      const points = data.map((d) => `${toX(d.age_months)},${toY(d[key] as number)}`).join(' ')
      return { key, points }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, xMin, xMax, yMin, yMax])

  const patientPoints = useMemo(() => {
    return measurements
      .map((m) => {
        const val = getMeasurementValue(m, chart)
        if (val == null) return null
        return { x: toX(m.age_months), y: toY(val), age: m.age_months, val }
      })
      .filter(Boolean) as { x: number; y: number; age: number; val: number }[]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measurements, chart, xMin, xMax, yMin, yMax])

  return (
    <div className="border border-border rounded-lg p-3 bg-card">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">{labels.title}</h4>
        <span className="text-[10px] text-muted-foreground uppercase">
          {standard === 'who' ? 'WHO' : 'CDC'} · {gender === 'male' ? 'Boys' : 'Girls'}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 340 }}>
        {/* Grid lines */}
        {yTicks.map((y) => (
          <line key={`y-${y}`} x1={PAD.left} x2={W - PAD.right} y1={toY(y)} y2={toY(y)}
            stroke="currentColor" strokeOpacity={0.08} />
        ))}
        {xTicks.map((x) => (
          <line key={`x-${x}`} x1={toX(x)} x2={toX(x)} y1={PAD.top} y2={PAD.top + PLOT_H}
            stroke="currentColor" strokeOpacity={0.08} />
        ))}

        {/* Axes */}
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + PLOT_H} stroke="currentColor" strokeOpacity={0.2} />
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + PLOT_H} y2={PAD.top + PLOT_H} stroke="currentColor" strokeOpacity={0.2} />

        {/* Y labels */}
        {yTicks.map((y) => (
          <text key={`yl-${y}`} x={PAD.left - 6} y={toY(y) + 3} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.5}>
            {y}
          </text>
        ))}

        {/* X labels */}
        {xTicks.map((x) => (
          <text key={`xl-${x}`} x={toX(x)} y={PAD.top + PLOT_H + 16} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.5}>
            {x < 24 ? `${x}m` : `${(x / 12).toFixed(0)}y`}
          </text>
        ))}

        {/* Axis titles */}
        <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
          Age
        </text>
        <text x={12} y={H / 2} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}
          transform={`rotate(-90, 12, ${H / 2})`}>
          {labels.yLabel}
        </text>

        {/* Percentile curves */}
        {percentileLines.map(({ key, points }, i) => (
          <g key={key}>
            <polyline
              points={points}
              fill="none"
              stroke={PERCENTILE_COLORS[key as keyof typeof PERCENTILE_COLORS]}
              strokeWidth={key === 'p50' ? 2 : 1}
              strokeDasharray={key === 'p50' ? undefined : '4,3'}
              opacity={key === 'p50' ? 0.8 : 0.4}
            />
            {/* Label at end */}
            {data.length > 0 && (
              <text
                x={toX(data[data.length - 1].age_months) + 3}
                y={toY(data[data.length - 1][key] as number) + 3}
                fontSize={7}
                fill={PERCENTILE_COLORS[key as keyof typeof PERCENTILE_COLORS]}
                opacity={0.6}
              >
                {PERCENTILE_LABELS[i]}
              </text>
            )}
          </g>
        ))}

        {/* Patient data line */}
        {patientPoints.length > 1 && (
          <polyline
            points={patientPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2.5}
          />
        )}

        {/* Patient data dots */}
        {patientPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#3b82f6" stroke="white" strokeWidth={1.5} />
            <title>{`Age: ${p.age < 24 ? `${p.age}m` : `${(p.age / 12).toFixed(1)}y`}, Value: ${p.val}`}</title>
          </g>
        ))}
      </svg>
    </div>
  )
}
