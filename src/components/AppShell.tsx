'use client'

import {
  AreaChart as AreaChartIcon,
  Coins,
  History,
  LayoutDashboard,
  LineChart,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  BadgeDollarSign,
  X,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { money, preciseMoney, quantity } from '@/lib/serializers'
import { USD_TO_VND_RATE } from '@/config/currency'

type Strategy = {
  id: string
  note: string | null
  maxCoinCount: number | null
  coinSelectionRule: string | null
  buyRule: string | null
  sellRule: string | null
}

type User = {
  id: string
  name: string
  description: string | null
  startingBalance: number
  currentBalance: number
  strategyId: string | null
  status: number
  strategy: Strategy | null
}

type MarketCoin = {
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

type Dashboard = {
  user: User
  totals: {
    currentBalance: number
    assetValue: number
    totalValue: number
    pnl: number
    pnlPct: number
  }
}

type PortfolioRow = {
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

type Trade = {
  id: string
  date: string
  symbol: string
  name: string
  type: 'BUY' | 'SELL'
  quantity: number
  priceUsd: number
  totalAmount: number
}

type Performance = {
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

const tabs = [
  { id: 'market', label: 'Market', icon: Coins },
  { id: 'portfolio', label: 'Portfolio', icon: LayoutDashboard },
  { id: 'history', label: 'History', icon: History },
  { id: 'performance', label: 'Performance', icon: LineChart },
] as const

type Tab = (typeof tabs)[number]['id']

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(await readResponseError(response))
  return response.json()
}

async function readResponseError(response: Response) {
  const message = await response.text()
  return `Request failed (${response.status}): ${message || response.statusText}`
}

function pct(value: number | null) {
  if (value === null) return 'n/a'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function chartDateLabel(value: string) {
  return value.slice(5)
}

function toneClass(value: number | null) {
  if (value === null) return 'text-slate-500'
  return value >= 0 ? 'text-[#00b600]' : 'text-[#fb0000]'
}

function usdNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 1000 ? 2 : 8,
  }).format(value)
}

type MarketSortKey = 'symbol' | 'priceUsd' | 'change24h' | 'change7d' | 'marketCap' | 'volume24h'
type SortDirection = 'asc' | 'desc'

const SELECTED_USER_STORAGE_KEY = 'trading-platform:selected-user-id'

const strategyRuleLabels: Record<string, string> = {
  TOP_MARKET_CAP_100: 'Top market cap 100',
  TOP_MARKET_CAP_50: 'Top market cap 50',
  HIGHEST_VOLUME: 'Highest volume',
  HIGHEST_24H_GROWTH: 'Highest 24h growth',
  HIGHEST_7D_GROWTH: 'Highest 7d growth',
  REBALANCE_DAILY: 'Rebalance daily',
  REBALANCE_WEEKLY: 'Rebalance weekly',
  TAKE_PROFIT: 'Take profit',
  STOP_LOSS: 'Stop loss',
}

const DEFAULT_STARTING_BALANCE_VND = '100000000'

function optionalNumberFromForm(form: FormData, name: string) {
  const value = String(form.get(name) ?? '').trim()
  if (!value) return null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function optionalTextFromForm(form: FormData, name: string) {
  const value = String(form.get(name) ?? '').trim()
  return value || null
}

function createUserPayloadFromForm(form: FormData) {
  return {
    name: String(form.get('name') ?? '').trim(),
    description: String(form.get('description') ?? '').trim(),
    startingBalance: Number(form.get('startingBalance') ?? 0),
    maxCoinCount: optionalNumberFromForm(form, 'maxCoinCount'),
    coinSelectionRule: optionalTextFromForm(form, 'coinSelectionRule'),
    buyRule: optionalTextFromForm(form, 'buyRule'),
    sellRule: optionalTextFromForm(form, 'sellRule'),
  }
}

function updateUserPayloadFromForm(form: FormData) {
  return {
    name: String(form.get('name') ?? '').trim(),
    description: String(form.get('description') ?? '').trim(),
    maxCoinCount: optionalNumberFromForm(form, 'maxCoinCount'),
    coinSelectionRule: optionalTextFromForm(form, 'coinSelectionRule'),
    buyRule: optionalTextFromForm(form, 'buyRule'),
    sellRule: optionalTextFromForm(form, 'sellRule'),
  }
}

function formatUsdInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return ''
  return value.toFixed(2).replace(/\.00$/, '')
}

function strategyRuleLabel(rule: string | null) {
  if (!rule) return '-'
  return strategyRuleLabels[rule] ?? rule
}

function strategyName(strategy: Strategy) {
  return `${strategyRuleLabel(strategy.coinSelectionRule)} / ${strategyRuleLabel(strategy.buyRule)} / ${strategyRuleLabel(strategy.sellRule)}`
}

function userStrategyName(user: User) {
  return user.strategy ? strategyName(user.strategy) : 'No strategy assigned'
}

function UserStrategyDetails({ user }: { user: User }) {
  if (!user.strategy) return <span>No strategy assigned</span>

  return (
    <div className="space-y-1 text-xs leading-5">
      <p>
        <span className="font-semibold text-slate-700">Max coin count:</span>{' '}
        {user.strategy.maxCoinCount ?? '-'}
      </p>
      <p>
        <span className="font-semibold text-slate-700">Coin selection rule:</span>{' '}
        {strategyRuleLabel(user.strategy.coinSelectionRule)}
      </p>
      <p>
        <span className="font-semibold text-slate-700">Buy rule:</span>{' '}
        {strategyRuleLabel(user.strategy.buyRule)}
      </p>
      <p>
        <span className="font-semibold text-slate-700">Sell rule:</span>{' '}
        {strategyRuleLabel(user.strategy.sellRule)}
      </p>
    </div>
  )
}

export default function AppShell() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('market')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [tradeCoinId, setTradeCoinId] = useState<number | null>(null)
  const [sellHolding, setSellHolding] = useState<PortfolioRow | null>(null)
  const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL'>('BUY')
  const [tradeQuantity, setTradeQuantity] = useState('')
  const [tradeAmountUsd, setTradeAmountUsd] = useState('')
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [hasLoadedStoredUser, setHasLoadedStoredUser] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(''), 3600)
  }

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchJson<{ users: User[] }>('/api/users'),
  })

  const users = useMemo(() => usersQuery.data?.users ?? [], [usersQuery.data?.users])
  const activeUserId = selectedUserId
  const activeUser = users.find((user) => user.id === activeUserId)
  const editingUser = users.find((user) => user.id === editingUserId)

  const marketQuery = useQuery({
    queryKey: ['market'],
    queryFn: () => fetchJson<{ market: MarketCoin[] }>('/api/market'),
    refetchOnWindowFocus: false,
  })

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', activeUserId],
    enabled: Boolean(activeUserId),
    queryFn: () => fetchJson<Dashboard>(`/api/users/${activeUserId}/dashboard`),
  })

  const portfolioQuery = useQuery({
    queryKey: ['portfolio', activeUserId],
    enabled: Boolean(activeUserId),
    queryFn: () => fetchJson<{ portfolio: PortfolioRow[] }>(`/api/users/${activeUserId}/portfolio`),
  })

  const tradesQuery = useQuery({
    queryKey: ['trades', activeUserId],
    enabled: Boolean(activeUserId),
    queryFn: () => fetchJson<{ trades: Trade[] }>(`/api/users/${activeUserId}/trades`),
  })

  const performanceQuery = useQuery({
    queryKey: ['performance', activeUserId],
    enabled: Boolean(activeUserId),
    queryFn: () => fetchJson<Performance>(`/api/users/${activeUserId}/performance`),
  })

  const refreshUserData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard', activeUserId] })
    queryClient.invalidateQueries({ queryKey: ['portfolio', activeUserId] })
    queryClient.invalidateQueries({ queryKey: ['trades', activeUserId] })
    queryClient.invalidateQueries({ queryKey: ['performance', activeUserId] })
  }, [activeUserId, queryClient])

  useEffect(() => {
    if (marketQuery.dataUpdatedAt) {
      refreshUserData()
    }
  }, [marketQuery.dataUpdatedAt, refreshUserData])

  useEffect(() => {
    const storedUserId = window.localStorage.getItem(SELECTED_USER_STORAGE_KEY) ?? ''
    setSelectedUserId(storedUserId)
    setHasLoadedStoredUser(true)
  }, [])

  useEffect(() => {
    if (!hasLoadedStoredUser || !usersQuery.isSuccess || usersQuery.isFetching) return
    if (!users.length) {
      setIsUserPickerOpen(false)
      return
    }

    const hasSelectedUser = Boolean(
      selectedUserId && users.some((user) => user.id === selectedUserId && user.status === 1),
    )
    if (selectedUserId && !hasSelectedUser) {
      setSelectedUserId('')
      window.localStorage.removeItem(SELECTED_USER_STORAGE_KEY)
    }
    setIsUserPickerOpen(!hasSelectedUser)
  }, [hasLoadedStoredUser, selectedUserId, users, usersQuery.isFetching, usersQuery.isSuccess])

  const createUserMutation = useMutation({
    mutationFn: async (form: FormData) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createUserPayloadFromForm(form)),
      })
      if (!response.ok) throw new Error(await readResponseError(response))
      return response.json() as Promise<{ userId: string }>
    },
    onSuccess: ({ userId }) => {
      setSelectedUserId(userId)
      window.localStorage.setItem(SELECTED_USER_STORAGE_KEY, userId)
      setIsCreateUserOpen(false)
      setIsUserPickerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, form }: { userId: string; form: FormData }) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateUserPayloadFromForm(form)),
      })
      if (!response.ok) throw new Error(await readResponseError(response))
      return response.json() as Promise<{ userId: string }>
    },
    onSuccess: ({ userId }) => {
      setEditingUserId(null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
      queryClient.invalidateQueries({ queryKey: ['performance', userId] })
    },
  })

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 0 | 1 }) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error(await readResponseError(response))
      return response.json() as Promise<{ userId: string; status: 0 | 1 }>
    },
    onSuccess: ({ userId, status }) => {
      if (status === 0 && userId === activeUserId) {
        setSelectedUserId('')
        window.localStorage.removeItem(SELECTED_USER_STORAGE_KEY)
        setIsUserPickerOpen(true)
      }
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
      queryClient.invalidateQueries({ queryKey: ['portfolio', userId] })
      queryClient.invalidateQueries({ queryKey: ['trades', userId] })
      queryClient.invalidateQueries({ queryKey: ['performance', userId] })
    },
  })

  const marketCapMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/market-cap', {
        method: 'POST',
      })
      if (!response.ok) throw new Error(await readResponseError(response))
      return response.json() as Promise<{ updated: number }>
    },
    onSuccess: ({ updated }) => {
      showToast(`Reloaded market cap for ${updated} coins`)
      queryClient.invalidateQueries({ queryKey: ['market'] })
    },
  })

  const tradeMutation = useMutation({
    mutationFn: async () => {
      if (tradeMode === 'BUY' && !selectedTradeCoin) throw new Error('No coin selected')
      if (tradeMode === 'SELL' && !sellHolding) throw new Error('No holding selected')
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          coinId: tradeMode === 'BUY' ? selectedTradeCoin?.id : sellHolding?.coinId,
          type: tradeMode,
          quantity: Number(tradeQuantity),
        }),
      })
      if (!response.ok) throw new Error(await readResponseError(response))
      return response.json()
    },
    onSuccess: () => {
      const coinSymbol = tradeMode === 'BUY' ? selectedTradeCoin?.symbol : sellHolding?.symbol
      setTradeQuantity('')
      setTradeAmountUsd('')
      setTradeCoinId(null)
      setSellHolding(null)
      showToast(`${tradeMode} ${coinSymbol ?? 'coin'} completed`)
      refreshUserData()
    },
  })

  const dashboard = dashboardQuery.data
  const market = marketQuery.data?.market ?? []
  const selectedTradeCoin = market.find((coin) => coin.id === tradeCoinId) ?? null
  const portfolio = portfolioQuery.data?.portfolio ?? []
  const trades = tradesQuery.data?.trades ?? []
  const performance = performanceQuery.data
  const cashBalance = dashboard?.totals.currentBalance ?? 0
  const tradeQuantityNumber = Number(tradeQuantity)
  const estimatedCost =
    selectedTradeCoin && Number.isFinite(tradeQuantityNumber) && tradeQuantityNumber > 0
      ? tradeQuantityNumber * selectedTradeCoin.priceUsd
      : 0
  const remainingCash = cashBalance - estimatedCost
  const sellQuantityNumber = Number(tradeQuantity)
  const estimatedProceeds =
    sellHolding && Number.isFinite(sellQuantityNumber) && sellQuantityNumber > 0
      ? sellQuantityNumber * sellHolding.currentPrice
      : 0
  const remainingHoldingQuantity = sellHolding
    ? sellHolding.quantity - Math.max(sellQuantityNumber || 0, 0)
    : 0
  const tradeQuantityInvalid =
    Boolean(tradeQuantity) &&
    (tradeMode === 'BUY'
      ? !Number.isFinite(tradeQuantityNumber) ||
        tradeQuantityNumber <= 0 ||
        estimatedCost > cashBalance
      : !Number.isFinite(sellQuantityNumber) ||
        sellQuantityNumber <= 0 ||
        !sellHolding ||
        sellQuantityNumber > sellHolding.quantity)

  const handleCreateUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    createUserMutation.mutate(new FormData(event.currentTarget))
    event.currentTarget.reset()
  }

  const handleUpdateUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingUserId) return
    updateUserMutation.mutate({ userId: editingUserId, form: new FormData(event.currentTarget) })
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId)
    window.localStorage.setItem(SELECTED_USER_STORAGE_KEY, userId)
    setIsUserPickerOpen(false)
  }

  const handleToggleUserStatus = (user: User) => {
    const status = user.status === 1 ? 0 : 1
    if (
      status === 0 &&
      !window.confirm(`Disable ${user.name}? This account will be hidden from the active user list.`)
    ) {
      return
    }

    updateUserStatusMutation.mutate({ userId: user.id, status })
  }

  const handleTrade = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeUserId || tradeQuantityInvalid) return
    if (tradeMode === 'BUY' && (!selectedTradeCoin || estimatedCost <= 0)) return
    if (tradeMode === 'SELL' && (!sellHolding || estimatedProceeds <= 0)) return
    tradeMutation.mutate()
  }

  const formatTradeInput = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return ''
    return value.toFixed(8).replace(/\.?0+$/, '')
  }

  const handleBuyQuantityChange = (value: string) => {
    setTradeQuantity(value)
    const numericValue = Number(value)
    if (!selectedTradeCoin || !Number.isFinite(numericValue) || numericValue <= 0) {
      setTradeAmountUsd('')
      return
    }

    setTradeAmountUsd(formatTradeInput(numericValue * selectedTradeCoin.priceUsd))
  }

  const handleBuyAmountUsdChange = (value: string) => {
    setTradeAmountUsd(value)
    const numericValue = Number(value)
    if (!selectedTradeCoin || !Number.isFinite(numericValue) || numericValue <= 0) {
      setTradeQuantity('')
      return
    }

    setTradeQuantity(formatTradeInput(numericValue / selectedTradeCoin.priceUsd))
  }

  const openTradeModal = (coinId: number) => {
    setTradeMode('BUY')
    setTradeCoinId(coinId)
    setSellHolding(null)
    setTradeQuantity('')
    setTradeAmountUsd('')
    tradeMutation.reset()
  }

  const openSellModal = (holding: PortfolioRow) => {
    setTradeMode('SELL')
    setSellHolding(holding)
    setTradeCoinId(null)
    setTradeQuantity('')
    setTradeAmountUsd('')
    tradeMutation.reset()
  }

  return (
    <main className="min-h-screen">
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
                onClick={() => setIsUserPickerOpen(true)}
                aria-label="Select user"
              >
                <Users size={16} />
                <span className="max-w-44 truncate">{activeUser?.name ?? 'Select user'}</span>
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800"
                onClick={() => {
                  createUserMutation.reset()
                  setIsCreateUserOpen(true)
                }}
              >
                <UserPlus size={16} />
                Create User
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded bg-slate-900 px-4 text-sm font-semibold text-white"
                onClick={() => {
                  queryClient.invalidateQueries()
                }}
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

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="space-y-4">
          <nav className="flex gap-2 overflow-x-auto border-b border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex h-11 min-w-fit items-center gap-2 border-b-2 px-3 text-sm font-semibold ${
                    activeTab === tab.id
                      ? 'border-teal-700 text-teal-800'
                      : 'border-transparent text-slate-600'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </nav>

          {activeTab === 'market' && (
            <MarketTable
              market={market}
              isLoading={marketQuery.isLoading}
              isFetching={marketQuery.isFetching}
              isReloadingMarketCap={marketCapMutation.isPending}
              onReloadPrice={() => marketQuery.refetch()}
              onReloadMarketCap={() => marketCapMutation.mutate()}
              onTrade={openTradeModal}
            />
          )}
          {activeTab === 'portfolio' && (
            <PortfolioTable portfolio={portfolio} onSell={openSellModal} />
          )}
          {activeTab === 'history' && <TradeHistory trades={trades} />}
          {activeTab === 'performance' && (
            <PerformancePanel
              performance={performance}
              onRefresh={() =>
                queryClient.invalidateQueries({ queryKey: ['performance', activeUserId] })
              }
            />
          )}

          {(tradeMutation.error ||
            marketCapMutation.error ||
            createUserMutation.error ||
            updateUserMutation.error ||
            updateUserStatusMutation.error) && (
            <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Something went wrong while processing data. Check the input, balance, or coin quantity.
            </div>
          )}
        </section>
      </div>

      {isCreateUserOpen && (
        <CreateUserModal
          isPending={createUserMutation.isPending}
          error={createUserMutation.error ? `Unable to create user. ${createUserMutation.error.message}` : ''}
          onClose={() => {
            setIsCreateUserOpen(false)
            createUserMutation.reset()
          }}
          onSubmit={handleCreateUser}
        />
      )}

      {isUserPickerOpen && (
        <UserPickerModal
          users={users}
          selectedUserId={activeUserId}
          isLoading={usersQuery.isLoading}
          isStatusPending={updateUserStatusMutation.isPending}
          onSelect={handleSelectUser}
          onToggleStatus={handleToggleUserStatus}
          onCreateUser={() => {
            createUserMutation.reset()
            updateUserMutation.reset()
            updateUserStatusMutation.reset()
            setIsUserPickerOpen(false)
            setIsCreateUserOpen(true)
          }}
          onEditUser={(userId) => {
            updateUserMutation.reset()
            updateUserStatusMutation.reset()
            setEditingUserId(userId)
          }}
          onClose={() => setIsUserPickerOpen(false)}
        />
      )}

      {editingUser && (
        <EditUserModal
          key={editingUser.id}
          user={editingUser}
          isPending={updateUserMutation.isPending}
          error={updateUserMutation.error ? `Unable to update user. ${updateUserMutation.error.message}` : ''}
          onClose={() => {
            setEditingUserId(null)
            updateUserMutation.reset()
          }}
          onSubmit={handleUpdateUser}
        />
      )}

      {tradeMode === 'BUY' && selectedTradeCoin && (
        <TradeModal
          coin={selectedTradeCoin}
          cashBalance={cashBalance}
          quantityValue={tradeQuantity}
          amountUsdValue={tradeAmountUsd}
          estimatedCost={estimatedCost}
          remainingCash={remainingCash}
          isInvalid={tradeQuantityInvalid}
          isPending={tradeMutation.isPending}
          error={
            tradeMutation.error ? `Unable to buy this coin. ${tradeMutation.error.message}` : ''
          }
          onQuantityChange={handleBuyQuantityChange}
          onAmountUsdChange={handleBuyAmountUsdChange}
          onClose={() => {
            setTradeCoinId(null)
            setTradeQuantity('')
            setTradeAmountUsd('')
            tradeMutation.reset()
          }}
          onSubmit={handleTrade}
        />
      )}

      {tradeMode === 'SELL' && sellHolding && (
        <SellModal
          holding={sellHolding}
          quantityValue={tradeQuantity}
          estimatedProceeds={estimatedProceeds}
          remainingQuantity={remainingHoldingQuantity}
          isInvalid={tradeQuantityInvalid}
          isPending={tradeMutation.isPending}
          error={
            tradeMutation.error ? `Unable to sell this coin. ${tradeMutation.error.message}` : ''
          }
          onQuantityChange={setTradeQuantity}
          onSellAll={() => setTradeQuantity(String(sellHolding.quantity))}
          onClose={() => {
            setSellHolding(null)
            setTradeQuantity('')
            tradeMutation.reset()
          }}
          onSubmit={handleTrade}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[70] rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg">
          {toast}
        </div>
      )}
    </main>
  )
}

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-2 text-xl font-semibold ${positive === undefined ? 'text-slate-950' : positive ? 'text-emerald-700' : 'text-rose-700'}`}
      >
        {value}
      </p>
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm outline-none focus:border-teal-700 ${props.className ?? ''}`}
    />
  )
}

function CreateUserModal({
  isPending,
  error,
  onClose,
  onSubmit,
}: {
  isPending: boolean
  error: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const [startingBalanceUsd, setStartingBalanceUsd] = useState(
    formatUsdInput(Number(DEFAULT_STARTING_BALANCE_VND) / USD_TO_VND_RATE),
  )
  const [startingBalanceVnd, setStartingBalanceVnd] = useState(DEFAULT_STARTING_BALANCE_VND)
  const [validationError, setValidationError] = useState('')

  function formatUsdInput(value: number) {
    if (!Number.isFinite(value) || value <= 0) return ''
    return value.toFixed(2).replace(/\.00$/, '')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const startingBalance = Number(form.get('startingBalance') ?? 0)

    if (!name) {
      event.preventDefault()
      setValidationError('Name is required.')
      return
    }

    if (!Number.isFinite(startingBalance) || startingBalance <= 0) {
      event.preventDefault()
      setValidationError('USD must be greater than 0.')
      return
    }

    setValidationError('')
    onSubmit(event)
  }

  const handleUsdChange = (value: string) => {
    setStartingBalanceUsd(value)
    const numericValue = Number(value)
    setStartingBalanceVnd(
      Number.isFinite(numericValue) && numericValue > 0
        ? String(Math.round(numericValue * USD_TO_VND_RATE))
        : '',
    )
  }

  const handleVndChange = (value: string) => {
    setStartingBalanceVnd(value)
    const numericValue = Number(value)
    setStartingBalanceUsd(
      Number.isFinite(numericValue) && numericValue > 0
        ? formatUsdInput(numericValue / USD_TO_VND_RATE)
        : '',
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Create User
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">New trading account</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-600"
            aria-label="Close create user modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <Input name="name" placeholder="Name" required />
          <Input name="description" placeholder="Description" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                htmlFor="max-coin-count"
              >
                Max coin count
              </label>
              <Input
                id="max-coin-count"
                name="maxCoinCount"
                placeholder="Max coin count"
                inputMode="numeric"
              />
            </div>
            <LabeledTextInput
              id="coin-selection-rule"
              name="coinSelectionRule"
              label="Coin selection rule"
            />
            <LabeledTextInput
              id="buy-rule"
              name="buyRule"
              label="Buy rule"
            />
            <LabeledTextInput
              id="sell-rule"
              name="sellRule"
              label="Sell rule"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                USD
              </label>
              <Input
                name="startingBalance"
                placeholder="Starting balance"
                type="number"
                min="0.01"
                step="0.01"
                value={startingBalanceUsd}
                onChange={(event) => handleUsdChange(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                VND
              </label>
              <Input
                placeholder="Amount in VND"
                type="number"
                min="0"
                step="1000"
                value={startingBalanceVnd}
                onChange={(event) => handleVndChange(event.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            1 USD = {new Intl.NumberFormat('vi-VN').format(USD_TO_VND_RATE)} VND
          </p>
        </div>

        {(validationError || error) && (
          <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {validationError || error}
          </p>
        )}

        <button
          disabled={isPending}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-teal-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Create User
        </button>
      </form>
    </div>
  )
}

function EditUserModal({
  user,
  isPending,
  error,
  onClose,
  onSubmit,
}: {
  user: User
  isPending: boolean
  error: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const [validationError, setValidationError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()

    if (!name) {
      event.preventDefault()
      setValidationError('Name is required.')
      return
    }

    setValidationError('')
    onSubmit(event)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Edit User
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Trading account</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-600"
            aria-label="Close edit user modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <Input name="name" placeholder="Name" defaultValue={user.name} required />
          <Input name="description" placeholder="Description" defaultValue={user.description ?? ''} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                htmlFor="edit-max-coin-count"
              >
                Max coin count
              </label>
              <Input
                id="edit-max-coin-count"
                name="maxCoinCount"
                placeholder="Max coin count"
                inputMode="numeric"
                defaultValue={user.strategy?.maxCoinCount ?? ''}
              />
            </div>
            <LabeledTextInput
              id="edit-coin-selection-rule"
              name="coinSelectionRule"
              label="Coin selection rule"
              defaultValue={user.strategy?.coinSelectionRule ?? ''}
            />
            <LabeledTextInput
              id="edit-buy-rule"
              name="buyRule"
              label="Buy rule"
              defaultValue={user.strategy?.buyRule ?? ''}
            />
            <LabeledTextInput
              id="edit-sell-rule"
              name="sellRule"
              label="Sell rule"
              defaultValue={user.strategy?.sellRule ?? ''}
            />
          </div>
        </div>

        {(validationError || error) && (
          <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {validationError || error}
          </p>
        )}

        <button
          disabled={isPending}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-teal-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
          Save User
        </button>
      </form>
    </div>
  )
}

function LabeledTextInput({
  id,
  name,
  label,
  defaultValue,
}: {
  id: string
  name: string
  label: string
  defaultValue?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        name={name}
        defaultValue={defaultValue}
      />
    </div>
  )
}

function UserPickerModal({
  users,
  selectedUserId,
  isLoading,
  isStatusPending,
  onSelect,
  onToggleStatus,
  onCreateUser,
  onEditUser,
  onClose,
}: {
  users: User[]
  selectedUserId: string
  isLoading: boolean
  isStatusPending: boolean
  onSelect: (userId: string) => void
  onToggleStatus: (user: User) => void
  onCreateUser: () => void
  onEditUser: (userId: string) => void
  onClose: () => void
}) {
  const [statusFilter, setStatusFilter] = useState<'active' | 'disabled'>('active')
  const filteredUsers = users.filter((user) =>
    statusFilter === 'active' ? user.status === 1 : user.status === 0,
  )

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="w-full max-w-3xl rounded border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Select User
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Trading accounts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-600"
            aria-label="Close user picker"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCreateUser}
            className="inline-flex h-9 items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
          >
            <UserPlus size={15} />
            Create User
          </button>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700" htmlFor="user-status-filter">
              Status
            </label>
            <select
              id="user-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.currentTarget.value as 'active' | 'disabled')}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-teal-700"
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded border border-slate-200">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <Th>User</Th>
                <Th>Strategy</Th>
                <Th className="text-right">Cash</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <EmptyRow colSpan={4} text="Loading users." />}
              {!isLoading &&
                filteredUsers.map((user) => {
                  const isSelected = user.id === selectedUserId
                  const isActive = user.status === 1
                  return (
                    <tr key={user.id} className="border-t border-slate-100">
                      <Td>
                        <span className="font-semibold text-slate-950">{user.name}</span>
                        {isSelected && (
                          <span className="ml-2 rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                            Selected
                          </span>
                        )}
                      </Td>
                      <Td className="min-w-64 text-slate-600">
                        <UserStrategyDetails user={user} />
                      </Td>
                      <Td className="text-right">{money(user.currentBalance)}</Td>
                      <Td className="min-w-32">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className={`inline-flex h-8 w-8 items-center justify-center rounded disabled:cursor-not-allowed disabled:opacity-50 ${
                              isActive
                                ? 'border border-rose-200 bg-white text-rose-700 hover:border-rose-400'
                                : 'border border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400'
                            }`}
                            disabled={isStatusPending}
                            onClick={() => onToggleStatus(user)}
                            type="button"
                            aria-label={isActive ? `Disable ${user.name}` : `Activate ${user.name}`}
                            title={isActive ? 'Disable' : 'Activate'}
                          >
                            {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:border-teal-700 hover:text-teal-700"
                            onClick={() => onEditUser(user.id)}
                            type="button"
                            aria-label={`Edit ${user.name}`}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="h-8 rounded bg-teal-700 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isSelected || !isActive}
                            onClick={() => onSelect(user.id)}
                            type="button"
                          >
                            Select
                          </button>
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              {!isLoading && !filteredUsers.length && (
                <EmptyRow colSpan={4} text={`No ${statusFilter} users available.`} />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TradeModal({
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

function SellModal({
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

function MarketTable({
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
                  <Td className={`text-right ${toneClass(coin.change7d)}`}>{pct(coin.change7d)}</Td>
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

function PortfolioTable({
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

function TradeHistory({ trades }: { trades: Trade[] }) {
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
                  className={`rounded px-2 py-1 text-xs font-semibold ${trade.type === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
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

function PerformancePanel({
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

function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-semibold ${className}`}>{children}</th>
}

function SortableTh({
  align = 'left',
  active,
  children,
  direction,
  onClick,
}: {
  align?: 'left' | 'right'
  active: boolean
  children: ReactNode
  direction: SortDirection
  onClick: () => void
}) {
  return (
    <th className={`px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        className={`inline-flex items-center gap-1 font-semibold ${align === 'right' ? 'justify-end text-right' : 'text-left'}`}
        onClick={onClick}
      >
        {children}
        <span className={`text-[10px] ${active ? 'text-teal-700' : 'text-slate-400'}`}>
          {active ? (direction === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )
}

function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-500">
        {text}
      </td>
    </tr>
  )
}
