import { RefreshCw, UserPlus, Users } from 'lucide-react'
import { money } from '@/lib/serializers'
import type { Dashboard, User } from './types'
import { pct } from './utils'
import { Metric } from './ui'

export function AppHeader({
  activeUser,
  dashboard,
  onOpenUserPicker,
  onOpenCreateUser,
  onRefresh,
}: {
  activeUser?: User
  dashboard?: Dashboard
  onOpenUserPicker: () => void
  onOpenCreateUser: () => void
  onRefresh: () => void
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Crypto Paper Trading MVP
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">
              Trading desk
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
              onClick={onOpenUserPicker}
              aria-label="Select user"
            >
              <Users size={16} />
              <span className="max-w-44 truncate">{activeUser?.name ?? 'Select user'}</span>
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800"
              onClick={onOpenCreateUser}
            >
              <UserPlus size={16} />
              Create User
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded bg-slate-900 px-4 text-sm font-semibold text-white"
              onClick={onRefresh}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="Cash" value={money(dashboard?.totals.currentBalance ?? 0)} />
          <Metric label="Assets" value={money(dashboard?.totals.assetValue ?? 0)} />
          <Metric label="Total" value={money(dashboard?.totals.totalValue ?? 0)} />
          <Metric
            label="PnL"
            value={`${money(dashboard?.totals.pnl ?? 0)} / ${pct(dashboard?.totals.pnlPct ?? 0)}`}
            positive={(dashboard?.totals.pnl ?? 0) >= 0}
          />
        </section>
      </div>
    </header>
  )
}
