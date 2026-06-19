import { AreaChart as AreaChartIcon, RefreshCw } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { money } from '@/lib/serializers'
import type { Performance } from './types'
import { chartDateLabel, pct } from './utils'
import { Metric } from './ui'

export function PerformancePanel({
  performance,
  onRefresh,
}: {
  performance?: Performance
  onRefresh: () => void
}) {
  const points = performance?.points ?? []
  const stats = performance?.stats

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric
          label="Total Return"
          value={pct(stats?.totalReturn ?? 0)}
          positive={(stats?.totalReturn ?? 0) >= 0}
        />
        <Metric label="Current Value" value={money(stats?.currentValue ?? 0)} />
        <Metric label="Highest Value" value={money(stats?.highestValue ?? 0)} />
        <Metric label="Lowest Value" value={money(stats?.lowestValue ?? 0)} />
      </div>
      <section className="rounded border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <AreaChartIcon size={17} />
            Equity curve
          </div>
          <button
            className="inline-flex h-9 items-center gap-2 rounded bg-slate-900 px-3 text-sm font-semibold text-white"
            onClick={onRefresh}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={chartDateLabel} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}
              />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Area
                type="monotone"
                dataKey="totalValue"
                stroke="#087f8c"
                fill="#99f6e4"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
