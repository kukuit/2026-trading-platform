import { HandCoins } from 'lucide-react'
import { money, preciseMoney, quantity } from '@/lib/serializers'
import type { PortfolioRow } from './types'
import { pct, toneClass } from './utils'
import { EmptyRow, Td, Th } from './ui'

export function PortfolioTable({
  portfolio,
  onSell,
}: {
  portfolio: PortfolioRow[]
  onSell: (holding: PortfolioRow) => void
}) {
  return (
    <div className="table-scroll overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="min-w-[940px] w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <Th className="w-12 text-center">No.</Th>
            <Th>Coin</Th>
            <Th className="text-right">Quantity</Th>
            <Th className="text-right">Avg Price</Th>
            <Th className="text-right">Current Price</Th>
            <Th className="text-right">Market Value</Th>
            <Th className="text-right">Unrealized PnL</Th>
            <Th className="text-right">PnL %</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {portfolio.map((row, index) => (
            <tr key={row.id} className="border-t border-slate-100">
              <Td className="w-12 text-center text-slate-500">{index + 1}</Td>
              <Td>
                <span className="font-semibold">{row.symbol}</span>
                <span className="ml-2 text-slate-500">{row.name}</span>
              </Td>
              <Td className="text-right">{quantity(row.quantity)}</Td>
              <Td className="text-right">{preciseMoney(row.avgPrice)}</Td>
              <Td className="text-right">{preciseMoney(row.currentPrice)}</Td>
              <Td className="text-right">{money(row.marketValue)}</Td>
              <Td className={`text-right ${toneClass(row.unrealizedPnl)}`}>
                {preciseMoney(row.unrealizedPnl)}
              </Td>
              <Td className={`text-right ${toneClass(row.unrealizedPnlPct)}`}>
                {pct(row.unrealizedPnlPct)}
              </Td>
              <Td>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded bg-orange-500 text-white"
                  onClick={() => onSell(row)}
                  title="Sell"
                  aria-label={`Sell ${row.symbol}`}
                >
                  <HandCoins size={16} />
                </button>
              </Td>
            </tr>
          ))}
          {!portfolio.length && <EmptyRow colSpan={9} text="No holdings yet." />}
        </tbody>
      </table>
    </div>
  )
}
