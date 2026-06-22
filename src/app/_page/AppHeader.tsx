'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [isCompact, setIsCompact] = useState(false)
  const headerRef = useRef<HTMLElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const updateCompactState = () => {
      if (animationFrameRef.current) return

      animationFrameRef.current = window.requestAnimationFrame(() => {
        setIsCompact((current) => {
          const scrollTop = window.scrollY
          if (current) return scrollTop > 0
          return scrollTop > 16
        })
        animationFrameRef.current = null
      })
    }

    updateCompactState()
    window.addEventListener('scroll', updateCompactState, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateCompactState)
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty('--app-header-height', `${header.offsetHeight}px`)
    }

    updateHeaderHeight()
    const resizeObserver = new ResizeObserver(updateHeaderHeight)
    resizeObserver.observe(header)
    window.addEventListener('resize', updateHeaderHeight)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [])

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"
    >
      <div
        className={`mx-auto flex max-w-7xl flex-col px-4 transition-all duration-200 ease-out sm:px-6 lg:px-8 ${
          isCompact ? 'gap-3 py-3' : 'gap-5 py-5'
        }`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className={`overflow-hidden transition-all duration-200 ease-out ${
              isCompact ? 'pointer-events-none max-h-0 opacity-0' : 'max-h-24 opacity-100'
            }`}
            aria-hidden={isCompact}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Crypto Paper Trading MVP
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">
              Trading desk
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:ml-auto">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
              onClick={onOpenUserPicker}
              aria-label="Select user"
            >
              {activeUser?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-6 w-6 rounded border border-slate-200 object-cover"
                  src={activeUser.avatar}
                />
              ) : (
                <Users size={16} />
              )}
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
          <Metric
            hideLabel={isCompact}
            label="Cash"
            value={money(dashboard?.totals.currentBalance ?? 0)}
          />
          <Metric
            hideLabel={isCompact}
            label="Assets"
            value={money(dashboard?.totals.assetValue ?? 0)}
          />
          <Metric
            hideLabel={isCompact}
            label="Total"
            value={money(dashboard?.totals.totalValue ?? 0)}
          />
          <Metric
            hideLabel={isCompact}
            label="PnL"
            value={`${money(dashboard?.totals.pnl ?? 0)} / ${pct(dashboard?.totals.pnlPct ?? 0)}`}
            positive={(dashboard?.totals.pnl ?? 0) >= 0}
          />
        </section>
      </div>
    </header>
  )
}
