'use client'

import { useMemo, useState } from 'react'
import { BadgeDollarSign, Loader2, RefreshCw } from 'lucide-react'
import { money } from '@/lib/serializers'
import type { MarketCoin, MarketSortKey, SortDirection } from './types'
import { pct, toneClass, usdNumber } from './utils'
import { EmptyRow, SortableTh, Td, Th } from './ui'

export function MarketTable({
  market,
  isLoading,
  isFetching,
  isReloadingMarketCap,
  onReloadPrice,
  onReloadMarketCap,
  onTrade,
}: {
  market: MarketCoin[]
  isLoading: boolean
  isFetching: boolean
  isReloadingMarketCap: boolean
  onReloadPrice: () => void
  onReloadMarketCap: () => void
  onTrade: (coinId: number) => void
}) {
  const [sortKey, setSortKey] = useState<MarketSortKey>('marketCap')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const sortedMarket = useMemo(() => {
    return [...market].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1

      if (sortKey === 'symbol') {
        return a.symbol.localeCompare(b.symbol) * direction
      }

      const aValue = a[sortKey] ?? Number.NEGATIVE_INFINITY
      const bValue = b[sortKey] ?? Number.NEGATIVE_INFINITY
      return (aValue - bValue) * direction
    })
  }, [market, sortDirection, sortKey])

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
      <div className="flex flex-wrap justify-end gap-2">
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

      <div className="table-scroll overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-[920px] w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
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
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-teal-700" />
                    Loading prices
                  </span>
                </td>
              </tr>
            )}

            {!isLoading &&
              sortedMarket.map((coin) => (
                <tr key={coin.id} className="border-t border-slate-100">
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
                  <Td>
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={coin.priceUsd <= 0}
                      onClick={() => onTrade(coin.id)}
                      aria-label={`Buy ${coin.symbol}`}
                    >
                      <BadgeDollarSign size={16} />
                    </button>
                  </Td>
                </tr>
              ))}

            {!isLoading && !market.length && <EmptyRow colSpan={8} text="No coins available." />}
          </tbody>
        </table>
      </div>
    </div>
  )
}
