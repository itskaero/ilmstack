'use client'

import { useState, useCallback, useMemo } from 'react'
import { Plus, Trash2, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GrowthData, GrowthMeasurement, PatientGender } from '@/types/database'
import type { ChartType } from './growth-chart-data'
import { GrowthChart } from './growth-chart'

interface GrowthChartEditorProps {
  growthData: GrowthData | null
  onChange: (data: GrowthData | null) => void
  readOnly: boolean
  patientGender: PatientGender | null
}

const EMPTY_DATA: GrowthData = {
  measurements: [],
  parents: { father_height_cm: undefined, mother_height_cm: undefined },
  chart_type: 'who',
}

function newMeasurement(): GrowthMeasurement {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    age_months: 0,
    weight_kg: null,
    height_cm: null,
    head_circumference_cm: null,
    bmi: null,
  }
}

function calcBmi(weight: number | null, height: number | null): number | null {
  if (!weight || !height || height <= 0) return null
  const m = height / 100
  return Math.round((weight / (m * m)) * 10) / 10
}

const CHART_TABS: { key: ChartType; label: string }[] = [
  { key: 'weight_for_age', label: 'Weight' },
  { key: 'height_for_age', label: 'Height' },
  { key: 'head_circumference', label: 'Head Circ.' },
]

export function GrowthChartEditor({ growthData, onChange, readOnly, patientGender }: GrowthChartEditorProps) {
  const data = growthData ?? EMPTY_DATA
  const [chartTab, setChartTab] = useState<ChartType>('weight_for_age')
  const gender = patientGender === 'female' ? 'female' : 'male'

  const update = useCallback(
    (partial: Partial<GrowthData>) => {
      onChange({ ...data, ...partial })
    },
    [data, onChange]
  )

  const updateMeasurement = useCallback(
    (id: string, field: keyof GrowthMeasurement, value: string) => {
      const measurements = data.measurements.map((m) => {
        if (m.id !== id) return m
        const updated = { ...m }
        if (field === 'date') {
          updated.date = value
        } else if (field === 'age_months') {
          updated.age_months = parseFloat(value) || 0
        } else if (field === 'weight_kg' || field === 'height_cm' || field === 'head_circumference_cm') {
          updated[field] = value ? parseFloat(value) : null
        }
        updated.bmi = calcBmi(updated.weight_kg, updated.height_cm)
        return updated
      })
      update({ measurements })
    },
    [data.measurements, update]
  )

  const addRow = useCallback(() => {
    update({ measurements: [...data.measurements, newMeasurement()] })
  }, [data.measurements, update])

  const removeRow = useCallback(
    (id: string) => {
      update({ measurements: data.measurements.filter((m) => m.id !== id) })
    },
    [data.measurements, update]
  )

  // Mid-parental height
  const targetHeight = useMemo(() => {
    const f = data.parents?.father_height_cm
    const m = data.parents?.mother_height_cm
    if (!f || !m) return null
    if (gender === 'male') {
      const mid = (f + m + 13) / 2
      return { mid, low: mid - 8.5, high: mid + 8.5 }
    }
    const mid = (f + m - 13) / 2
    return { mid, low: mid - 8.5, high: mid + 8.5 }
  }, [data.parents, gender])

  return (
    <div className="space-y-5">
      {/* Standard + Chart type selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {(['who', 'cdc'] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={readOnly}
              onClick={() => update({ chart_type: s })}
              className={`px-3 py-1.5 font-medium transition-colors ${
                data.chart_type === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground'
              } ${readOnly ? 'cursor-default' : ''}`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {CHART_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setChartTab(t.key)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                chartTab === t.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {data.chart_type === 'who' ? 'WHO (0-5 yrs)' : 'CDC (2-20 yrs)'} · {gender === 'male' ? 'Boys' : 'Girls'}
        </span>
      </div>

      {/* Chart */}
      <GrowthChart
        chart={chartTab}
        gender={gender}
        standard={data.chart_type}
        measurements={data.measurements}
      />

      {/* Measurements table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Measurements</h4>
          {!readOnly && (
            <Button type="button" variant="outline" size="sm" onClick={addRow} className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> Add Row
            </Button>
          )}
        </div>

        {data.measurements.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            {readOnly ? 'No growth measurements recorded.' : 'Click "Add Row" to start recording measurements.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-1.5 px-1 font-medium">Date</th>
                  <th className="text-left py-1.5 px-1 font-medium">Age (mo)</th>
                  <th className="text-left py-1.5 px-1 font-medium">Weight (kg)</th>
                  <th className="text-left py-1.5 px-1 font-medium">Height (cm)</th>
                  <th className="text-left py-1.5 px-1 font-medium">HC (cm)</th>
                  <th className="text-left py-1.5 px-1 font-medium">BMI</th>
                  {!readOnly && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {data.measurements.map((m) => (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="py-1 px-1">
                      {readOnly ? (
                        m.date
                      ) : (
                        <Input
                          type="date"
                          value={m.date}
                          onChange={(e) => updateMeasurement(m.id, 'date', e.target.value)}
                          className="h-7 text-xs w-[120px]"
                        />
                      )}
                    </td>
                    <td className="py-1 px-1">
                      {readOnly ? (
                        m.age_months
                      ) : (
                        <Input
                          type="number"
                          step="0.5"
                          value={m.age_months}
                          onChange={(e) => updateMeasurement(m.id, 'age_months', e.target.value)}
                          className="h-7 text-xs w-[70px]"
                        />
                      )}
                    </td>
                    <td className="py-1 px-1">
                      {readOnly ? (
                        m.weight_kg ?? '—'
                      ) : (
                        <Input
                          type="number"
                          step="0.1"
                          value={m.weight_kg ?? ''}
                          onChange={(e) => updateMeasurement(m.id, 'weight_kg', e.target.value)}
                          className="h-7 text-xs w-[70px]"
                        />
                      )}
                    </td>
                    <td className="py-1 px-1">
                      {readOnly ? (
                        m.height_cm ?? '—'
                      ) : (
                        <Input
                          type="number"
                          step="0.1"
                          value={m.height_cm ?? ''}
                          onChange={(e) => updateMeasurement(m.id, 'height_cm', e.target.value)}
                          className="h-7 text-xs w-[70px]"
                        />
                      )}
                    </td>
                    <td className="py-1 px-1">
                      {readOnly ? (
                        m.head_circumference_cm ?? '—'
                      ) : (
                        <Input
                          type="number"
                          step="0.1"
                          value={m.head_circumference_cm ?? ''}
                          onChange={(e) => updateMeasurement(m.id, 'head_circumference_cm', e.target.value)}
                          className="h-7 text-xs w-[70px]"
                        />
                      )}
                    </td>
                    <td className="py-1 px-1 text-muted-foreground">
                      {m.bmi ?? '—'}
                    </td>
                    {!readOnly && (
                      <td className="py-1 px-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(m.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mid-Parental (Targeted) Height Calculator */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Mid-Parental (Targeted) Height</h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Father&apos;s Height (cm)</Label>
            {readOnly ? (
              <p className="text-sm">{data.parents?.father_height_cm ?? '—'}</p>
            ) : (
              <Input
                type="number"
                step="0.1"
                value={data.parents?.father_height_cm ?? ''}
                onChange={(e) =>
                  update({
                    parents: {
                      ...data.parents,
                      father_height_cm: e.target.value ? parseFloat(e.target.value) : undefined,
                    },
                  })
                }
                className="h-8 text-sm"
                placeholder="e.g. 175"
              />
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mother&apos;s Height (cm)</Label>
            {readOnly ? (
              <p className="text-sm">{data.parents?.mother_height_cm ?? '—'}</p>
            ) : (
              <Input
                type="number"
                step="0.1"
                value={data.parents?.mother_height_cm ?? ''}
                onChange={(e) =>
                  update({
                    parents: {
                      ...data.parents,
                      mother_height_cm: e.target.value ? parseFloat(e.target.value) : undefined,
                    },
                  })
                }
                className="h-8 text-sm"
                placeholder="e.g. 162"
              />
            )}
          </div>
        </div>

        {targetHeight && (
          <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
            <p>
              <span className="font-medium">Targeted Height:</span>{' '}
              <span className="text-primary font-semibold">{targetHeight.mid.toFixed(1)} cm</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Range: {targetHeight.low.toFixed(1)} – {targetHeight.high.toFixed(1)} cm (±8.5 cm)
            </p>
            <p className="text-[10px] text-muted-foreground">
              Formula ({gender === 'male' ? 'Boys' : 'Girls'}): (Father + Mother {gender === 'male' ? '+ 13' : '− 13'}) ÷ 2
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
