import { Coins, History, LayoutDashboard, LineChart } from 'lucide-react'

export type Strategy = {
  id: string
  note: string | null
  maxCoinCount: number | null
  coinSelectionRule: string | null
  buyRule: string | null
  sellRule: string | null
}

export type User = {
  id: string
  name: string
  description: string | null
  avatar: string | null
  startingBalance: number
  currentBalance: number
  strategyId: string | null
  status: number
  strategy: Strategy | null
}

export type MarketCoin = {
  id: number
  symbol: string
  name: string
  binancePair: string | null
  coingeckoId: string | null
  priceUsd: number
  change24h: number | null
  change7d: number | null
  marketCap: number
  volume24h: number
  snapshotDate: string | null
}

export type Dashboard = {
  user: User
  totals: {
    currentBalance: number
    assetValue: number
    totalValue: number
    pnl: number
    pnlPct: number
  }
}

export type PortfolioRow = {
  id: string
  coinId: number
  symbol: string
  name: string
  quantity: number
  avgPrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnl: number
  unrealizedPnlPct: number
}

export type Trade = {
  id: string
  date: string
  symbol: string
  name: string
  type: 'BUY' | 'SELL'
  quantity: number
  priceUsd: number
  totalAmount: number
}

export type Performance = {
  points: Array<{
    date: string
    cashBalance: number
    assetValue: number
    totalValue: number
  }>
  stats: {
    totalReturn: number
    currentValue: number
    highestValue: number
    lowestValue: number
  }
}

export const tabs = [
  { id: 'market', label: 'Market', icon: Coins },
  { id: 'portfolio', label: 'Portfolio', icon: LayoutDashboard },
  { id: 'history', label: 'History', icon: History },
  { id: 'performance', label: 'Performance', icon: LineChart },
] as const

export type Tab = (typeof tabs)[number]['id']
export type MarketSortKey =
  | 'symbol'
  | 'priceUsd'
  | 'change24h'
  | 'change7d'
  | 'marketCap'
  | 'volume24h'
export type SortDirection = 'asc' | 'desc'
