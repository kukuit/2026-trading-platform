import { money, quantity } from '@/lib/serializers'
import type { Trade } from './types'
import { EmptyRow, Td, Th } from './ui'

export function TradeHistory({ trades }: { trades: Trade[] }) {
  return (
    <div className="table-scroll overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="min-w-[780px] w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <Th>Date</Th>
            <Th>Coin</Th>
            <Th>Type</Th>
            <Th className="text-right">Quantity</Th>
            <Th className="text-right">Price</Th>
            <Th className="text-right">Total</Th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id} className="border-t border-slate-100">
              <Td>{new Date(trade.date).toLocaleString('vi-VN')}</Td>
              <Td>
                <span className="font-semibold">{trade.symbol}</span>
                <span className="ml-2 text-slate-500">{trade.name}</span>
              </Td>
              <Td>
                <span
                  className={`rounded px-2 py-1 text-xs font-semibold ${
                    trade.type === 'BUY'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {trade.type}
                </span>
              </Td>
              <Td className="text-right">{quantity(trade.quantity)}</Td>
              <Td className="text-right">{money(trade.priceUsd)}</Td>
              <Td className="text-right">{money(trade.totalAmount)}</Td>
            </tr>
          ))}
          {!trades.length && <EmptyRow colSpan={6} text="No trades yet." />}
        </tbody>
      </table>
    </div>
  )
}
