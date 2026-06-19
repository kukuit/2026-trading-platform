'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '@/app/_page/AppHeader'
import { MarketTable } from '@/app/_page/MarketTable'
import { PageTabs } from '@/app/_page/PageTabs'
import { PerformancePanel } from '@/app/_page/PerformancePanel'
import { PortfolioTable } from '@/app/_page/PortfolioTable'
import { SellModal, TradeModal } from '@/app/_page/TradeModals'
import { TradeHistory } from '@/app/_page/TradeHistory'
import { CreateUserModal, EditUserModal, UserPickerModal } from '@/app/_page/UserModals'
import type { Dashboard, MarketCoin, Performance, PortfolioRow, Tab, Trade, User } from '@/app/_page/types'
import {
  SELECTED_USER_STORAGE_KEY,
  fetchJson,
  readResponseError,
} from '@/app/_page/utils'

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
        body: form,
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
        body: form,
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

  const market = marketQuery.data?.market ?? []
  const selectedTradeCoin = market.find((coin) => coin.id === tradeCoinId) ?? null
  const dashboard = dashboardQuery.data
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

  const openCreateUserModal = () => {
    createUserMutation.reset()
    setIsCreateUserOpen(true)
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
      <AppHeader
        activeUser={activeUser}
        dashboard={dashboard}
        onOpenUserPicker={() => setIsUserPickerOpen(true)}
        onOpenCreateUser={openCreateUserModal}
        onRefresh={() => queryClient.invalidateQueries()}
      />

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="space-y-4">
          <PageTabs activeTab={activeTab} onChange={setActiveTab} />

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
          error={
            createUserMutation.error ? `Unable to create user. ${createUserMutation.error.message}` : ''
          }
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
          error={
            updateUserMutation.error ? `Unable to update user. ${updateUserMutation.error.message}` : ''
          }
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
          error={tradeMutation.error ? `Unable to buy this coin. ${tradeMutation.error.message}` : ''}
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
          error={tradeMutation.error ? `Unable to sell this coin. ${tradeMutation.error.message}` : ''}
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
