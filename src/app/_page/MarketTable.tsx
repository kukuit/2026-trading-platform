'use client'

import { useMemo, useState } from 'react'
import { BadgeDollarSign, HandCoins, Loader2, RefreshCw } from 'lucide-react'
import { money, quantity } from '@/lib/serializers'
import type { MarketCoin, MarketSortKey, PortfolioRow, SortDirection } from './types'
import { pct, toneClass, usdNumber } from './utils'
import { EmptyRow, SortableTh, Td, Th } from './ui'

type PercentFilterOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'between'

type PercentFilter = {
  operator: PercentFilterOperator
  value: string
  valueTo: string
}

const emptyPercentFilter: PercentFilter = {
  operator: 'gte',
  value: '',
  valueTo: '',
}

function matchesPercentFilter(value: number | null, filter: PercentFilter) {
  const from = Number(filter.value)
  const hasFrom = filter.value.trim() !== '' && Number.isFinite(from)

  if (filter.operator === 'between') {
    const to = Number(filter.valueTo)
    const hasTo = filter.valueTo.trim() !== '' && Number.isFinite(to)
    if (!hasFrom || !hasTo) return true
    if (value === null) return false

    const min = Math.min(from, to)
    const max = Math.max(from, to)
    return value >= min && value <= max
  }

  if (!hasFrom) return true
  if (value === null) return false

  if (filter.operator === 'gt') return value > from
  if (filter.operator === 'gte') return value >= from
  if (filter.operator === 'lt') return value < from
  return value <= from
}

export function MarketTable({
  market,
  portfolio,
  selectedCoinId,
  isLoading,
  isFetching,
  isReloadingMarketCap,
  onReloadPrice,
  onReloadMarketCap,
  onSelectCoin,
  onSell,
  onTrade,
}: {
  market: MarketCoin[]
  portfolio: PortfolioRow[]
  selectedCoinId: number | null
  isLoading: boolean
  isFetching: boolean
  isReloadingMarketCap: boolean
  onReloadPrice: () => void
  onReloadMarketCap: () => void
  onSelectCoin: (coinId: number) => void
  onSell: (holding: PortfolioRow) => void
  onTrade: (coinId: number) => void
}) {
  const [sortKey, setSortKey] = useState<MarketSortKey>('marketCap')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [isFilterVisible, setIsFilterVisible] = useState(false)
  const [change24hFilter, setChange24hFilter] = useState<PercentFilter>(emptyPercentFilter)
  const [change7dFilter, setChange7dFilter] = useState<PercentFilter>(emptyPercentFilter)
  const holdingByCoinId = useMemo(() => {
    return new Map(portfolio.map((holding) => [holding.coinId, holding]))
  }, [portfolio])
  const filteredMarket = useMemo(() => {
    return market.filter(
      (coin) =>
        matchesPercentFilter(coin.change24h, change24hFilter) &&
        matchesPercentFilter(coin.change7d, change7dFilter)
    )
  }, [change24hFilter, change7dFilter, market])
  const sortedMarket = useMemo(() => {
    return [...filteredMarket].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1

      if (sortKey === 'symbol') {
        return a.symbol.localeCompare(b.symbol) * direction
      }

      const aValue = a[sortKey] ?? Number.NEGATIVE_INFINITY
      const bValue = b[sortKey] ?? Number.NEGATIVE_INFINITY
      return (aValue - bValue) * direction
    })
  }, [filteredMarket, sortDirection, sortKey])

  const handleSort = (key: MarketSortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(key)
    setSortDirection(key === 'symbol' ? 'asc' : 'desc')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {isFilterVisible ? (
          <div className="flex flex-wrap items-end gap-2">
            <PercentFilterControl
              label="24h"
              value={change24hFilter}
              onChange={setChange24hFilter}
            />
            <PercentFilterControl label="7d" value={change7dFilter} onChange={setChange7dFilter} />
            <button
              className="h-9 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
              onClick={() => {
                setChange24hFilter(emptyPercentFilter)
                setChange7dFilter(emptyPercentFilter)
              }}
              type="button"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div />
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            className="inline-flex h-9 items-center justify-center rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
            onClick={() => setIsFilterVisible((current) => !current)}
            type="button"
          >
            {isFilterVisible ? 'Hide Filter' : 'Show Filter'}
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded bg-slate-900 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isFetching}
            onClick={onReloadPrice}
          >
            {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Reload Price
          </button>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReloadingMarketCap}
            onClick={onReloadMarketCap}
          >
            {isReloadingMarketCap ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Reload Market Cap
          </button>
        </div>
      </div>

      <div className="table-scroll overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-[1000px] w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <Th className="w-12 text-center">No.</Th>
              <SortableTh
                active={sortKey === 'symbol'}
                direction={sortDirection}
                onClick={() => handleSort('symbol')}
              >
                Coin
              </SortableTh>
              <SortableTh
                align="right"
                active={sortKey === 'priceUsd'}
                direction={sortDirection}
                onClick={() => handleSort('priceUsd')}
              >
                Price (USD)
              </SortableTh>
              <SortableTh
                align="right"
                active={sortKey === 'change24h'}
                direction={sortDirection}
                onClick={() => handleSort('change24h')}
              >
                24h
              </SortableTh>
              <SortableTh
                align="right"
                active={sortKey === 'change7d'}
                direction={sortDirection}
                onClick={() => handleSort('change7d')}
              >
                7d
              </SortableTh>
              <SortableTh
                align="right"
                active={sortKey === 'marketCap'}
                direction={sortDirection}
                onClick={() => handleSort('marketCap')}
              >
                Market Cap
              </SortableTh>
              <SortableTh
                align="right"
                active={sortKey === 'volume24h'}
                direction={sortDirection}
                onClick={() => handleSort('volume24h')}
              >
                Volume
              </SortableTh>
              <Th>Date</Th>
              <Th className="text-right">Sell</Th>
              <Th className="text-right">Buy</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={10} className="px-4 py-14 text-center text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-teal-700" />
                    Loading prices
                  </span>
                </td>
              </tr>
            )}

            {!isLoading &&
              sortedMarket.map((coin, index) => {
                const isSelected = coin.id === selectedCoinId
                const rowBackground = isSelected
                  ? 'border-blue-200 bg-blue-50'
                  : index % 2 === 0
                    ? 'border-slate-100 bg-white'
                    : 'border-slate-100 bg-slate-50/50'
                const holding = holdingByCoinId.get(coin.id)

                return (
                  <tr
                    key={coin.id}
                    className={`cursor-pointer border-t transition-colors hover:bg-blue-50/60 ${rowBackground}`}
                    onClick={() => onSelectCoin(coin.id)}
                  >
                    <Td className="w-12 text-center text-slate-500">{index + 1}</Td>
                    <Td>
                      <span className="font-semibold text-slate-950">{coin.symbol}</span>
                      <span className="ml-2 text-slate-500">{coin.name}</span>
                    </Td>
                    <Td className="text-right">
                      <span className={isFetching ? 'text-slate-400' : ''}>
                        {usdNumber(coin.priceUsd)}
                      </span>
                    </Td>
                    <Td className={`text-right ${toneClass(coin.change24h)}`}>
                      {pct(coin.change24h)}
                    </Td>
                    <Td className={`text-right ${toneClass(coin.change7d)}`}>
                      {pct(coin.change7d)}
                    </Td>
                    <Td className="text-right">{money(coin.marketCap)}</Td>
                    <Td className="text-right">{money(coin.volume24h)}</Td>
                    <Td className="whitespace-nowrap">{coin.snapshotDate ?? 'n/a'}</Td>
                    <Td className="text-right">
                      {holding ? (
                        <button
                          className="group relative inline-flex h-8 w-8 items-center justify-center rounded bg-orange-500 text-white"
                          onClick={(event) => {
                            event.stopPropagation()
                            onSelectCoin(coin.id)
                            onSell(holding)
                          }}
                          type="button"
                          title="Sell"
                          aria-label={`Sell ${coin.symbol}`}
                        >
                          <HandCoins size={16} />
                          <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
                            Quantity: {quantity(holding.quantity)}
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </Td>
                    <Td>
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={coin.priceUsd <= 0}
                        onClick={(event) => {
                          event.stopPropagation()
                          onSelectCoin(coin.id)
                          onTrade(coin.id)
                        }}
                        aria-label={`Buy ${coin.symbol}`}
                      >
                        <BadgeDollarSign size={16} />
                      </button>
                    </Td>
                  </tr>
                )
              })}

            {!isLoading && !market.length && <EmptyRow colSpan={10} text="No coins available." />}
            {!isLoading && Boolean(market.length) && !sortedMarket.length && (
              <EmptyRow colSpan={10} text="No coins match these filters." />
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PercentFilterControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: PercentFilter
  onChange: (value: PercentFilter) => void
}) {
  return (
    <div className="flex items-end gap-2">
      <label className="space-y-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <select
          className="h-9 rounded border border-slate-300 bg-white px-2 text-sm outline-none focus:border-teal-700"
          value={value.operator}
          onChange={(event) =>
            onChange({ ...value, operator: event.currentTarget.value as PercentFilterOperator })
          }
        >
          <option value="gt">&gt;</option>
          <option value="gte">&gt;=</option>
          <option value="lt">&lt;</option>
          <option value="lte">&lt;=</option>
          <option value="between">Between</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {value.operator === 'between' ? 'From %' : 'Value %'}
        </span>
        <input
          className="h-9 w-24 rounded border border-slate-300 bg-white px-2 text-sm outline-none focus:border-teal-700"
          inputMode="decimal"
          onChange={(event) => onChange({ ...value, value: event.currentTarget.value })}
          placeholder="0"
          type="number"
          value={value.value}
        />
      </label>
      {value.operator === 'between' && (
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            To %
          </span>
          <input
            className="h-9 w-24 rounded border border-slate-300 bg-white px-2 text-sm outline-none focus:border-teal-700"
            inputMode="decimal"
            onChange={(event) => onChange({ ...value, valueTo: event.currentTarget.value })}
            placeholder="5"
            type="number"
            value={value.valueTo}
          />
        </label>
      )}
    </div>
  )
}
