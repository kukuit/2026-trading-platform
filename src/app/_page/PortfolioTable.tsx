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
          {portfolio.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
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
                  className="h-8 rounded bg-orange-500 px-3 text-xs font-semibold text-white"
                  onClick={() => onSell(row)}
                >
                  Sell
                </button>
              </Td>
            </tr>
          ))}
          {!portfolio.length && <EmptyRow colSpan={8} text="No holdings yet." />}
        </tbody>
      </table>
    </div>
  )
}
