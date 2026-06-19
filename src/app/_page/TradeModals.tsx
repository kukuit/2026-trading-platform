'use client'

import type { FormEvent } from 'react'
import { Loader2, X } from 'lucide-react'
import { money, quantity } from '@/lib/serializers'
import type { MarketCoin, PortfolioRow } from './types'
import { Input } from './ui'

export function TradeModal({
  coin,
  cashBalance,
  quantityValue,
  amountUsdValue,
  estimatedCost,
  remainingCash,
  isInvalid,
  isPending,
  error,
  onQuantityChange,
  onAmountUsdChange,
  onClose,
  onSubmit,
}: {
  coin: MarketCoin
  cashBalance: number
  quantityValue: string
  amountUsdValue: string
  estimatedCost: number
  remainingCash: number
  isInvalid: boolean
  isPending: boolean
  error: string
  onQuantityChange: (value: string) => void
  onAmountUsdChange: (value: string) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const hasQuantity = quantityValue.trim().length > 0
  const canBuy = hasQuantity && !isInvalid && estimatedCost > 0 && !isPending

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Buy coin</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {coin.symbol} - {coin.name}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{money(coin.priceUsd)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-600"
            aria-label="Close trade modal"
          >
            <X size={16} />
          </button>
        </div>

        <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="trade-quantity">
          Quantity
        </label>
        <Input
          id="trade-quantity"
          value={quantityValue}
          onChange={(event) => onQuantityChange(event.target.value)}
          placeholder="0.00000000"
          type="number"
          min="0"
          step="0.00000001"
          required
          className="mt-2 h-11"
        />

        <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="trade-amount">
          USD
        </label>
        <Input
          id="trade-amount"
          value={amountUsdValue}
          onChange={(event) => onAmountUsdChange(event.target.value)}
          placeholder="0.00"
          type="number"
          min="0"
          step="0.01"
          required
          className="mt-2 h-11"
        />

        <div className="mt-4 space-y-2 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Available cash</span>
            <span className="font-semibold text-slate-950">{money(cashBalance)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Estimated cost</span>
            <span className="font-semibold text-slate-950">{money(estimatedCost)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Remaining cash</span>
            <span
              className={`font-semibold ${remainingCash < 0 ? 'text-rose-700' : 'text-emerald-700'}`}
            >
              {money(remainingCash)}
            </span>
          </div>
        </div>

        {isInvalid && (
          <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            Quantity is invalid or the purchase amount exceeds the current cash balance.
          </p>
        )}
        {error && (
          <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        )}

        <button
          disabled={!canBuy}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-teal-700 px-4 text-sm font-semibold text-white"
        >
          {isPending && <Loader2 size={16} className="animate-spin" />}
          BUY
        </button>
      </form>
    </div>
  )
}

export function SellModal({
  holding,
  quantityValue,
  estimatedProceeds,
  remainingQuantity,
  isInvalid,
  isPending,
  error,
  onQuantityChange,
  onSellAll,
  onClose,
  onSubmit,
}: {
  holding: PortfolioRow
  quantityValue: string
  estimatedProceeds: number
  remainingQuantity: number
  isInvalid: boolean
  isPending: boolean
  error: string
  onQuantityChange: (value: string) => void
  onSellAll: () => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const hasQuantity = quantityValue.trim().length > 0
  const canSell = hasQuantity && !isInvalid && estimatedProceeds > 0 && !isPending

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-rose-700">Sell coin</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {holding.symbol} - {holding.name}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{money(holding.currentPrice)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-600"
            aria-label="Close sell modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="sell-quantity">
            Quantity
          </label>
          <button
            type="button"
            onClick={onSellAll}
            className="h-8 rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700"
          >
            Sell all
          </button>
        </div>
        <Input
          id="sell-quantity"
          value={quantityValue}
          onChange={(event) => onQuantityChange(event.target.value)}
          placeholder="0.00000000"
          type="number"
          min="0"
          step="0.00000001"
          required
          className="mt-2 h-11"
        />

        <div className="mt-4 space-y-2 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Holding quantity</span>
            <span className="font-semibold text-slate-950">{quantity(holding.quantity)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Estimated proceeds</span>
            <span className="font-semibold text-slate-950">{money(estimatedProceeds)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Remaining quantity</span>
            <span
              className={`font-semibold ${remainingQuantity < 0 ? 'text-rose-700' : 'text-slate-950'}`}
            >
              {quantity(Math.max(remainingQuantity, 0))}
            </span>
          </div>
        </div>

        {isInvalid && (
          <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            Quantity is invalid or exceeds the current holding quantity.
          </p>
        )}
        {error && (
          <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        )}

        <button
          disabled={!canSell}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-rose-700 px-4 text-sm font-semibold text-white"
        >
          {isPending && <Loader2 size={16} className="animate-spin" />}
          SELL
        </button>
      </form>
    </div>
  )
}
