"use client";

import {
  AreaChart as AreaChartIcon,
  BarChart3,
  Coins,
  History,
  LayoutDashboard,
  LineChart,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  X,
  UserPlus,
} from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money, quantity } from "@/lib/serializers";
import { appTodayInput } from "@/config/timezone";

type User = {
  id: string;
  name: string;
  description: string | null;
  startingBalance: number;
  currentBalance: number;
};

type MarketCoin = {
  id: number;
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number | null;
  change7d: number | null;
  marketCap: number;
  volume24h: number;
  snapshotDate: string | null;
};

type Dashboard = {
  user: User;
  totals: {
    currentBalance: number;
    assetValue: number;
    totalValue: number;
    pnl: number;
    pnlPct: number;
  };
};

type PortfolioRow = {
  id: string;
  coinId: number;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
};

type Trade = {
  id: string;
  date: string;
  symbol: string;
  name: string;
  type: "BUY" | "SELL";
  quantity: number;
  priceUsd: number;
  totalAmount: number;
};

type Performance = {
  points: Array<{
    date: string;
    cashBalance: number;
    assetValue: number;
    totalValue: number;
  }>;
  stats: {
    totalReturn: number;
    currentValue: number;
    highestValue: number;
    lowestValue: number;
  };
};

const tabs = [
  { id: "market", label: "Market", icon: Coins },
  { id: "portfolio", label: "Portfolio", icon: LayoutDashboard },
  { id: "history", label: "History", icon: History },
  { id: "performance", label: "Performance", icon: LineChart },
] as const;

type Tab = (typeof tabs)[number]["id"];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function pct(value: number | null) {
  if (value === null) return "n/a";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function toneClass(value: number | null) {
  if (value === null) return "text-slate-500";
  return value >= 0 ? "text-emerald-700" : "text-rose-700";
}

export default function AppShell() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [tradeCoinId, setTradeCoinId] = useState<number | null>(null);
  const [sellHolding, setSellHolding] = useState<PortfolioRow | null>(null);
  const [tradeMode, setTradeMode] = useState<"BUY" | "SELL">("BUY");
  const [tradeQuantity, setTradeQuantity] = useState("");
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(""), 3600);
  };

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchJson<{ users: User[] }>("/api/users"),
  });

  const users = usersQuery.data?.users ?? [];
  const activeUserId = selectedUserId || users[0]?.id || "";
  const activeUser = users.find((user) => user.id === activeUserId);

  const marketQuery = useQuery({
    queryKey: ["market"],
    queryFn: () => fetchJson<{ market: MarketCoin[] }>("/api/market"),
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", activeUserId],
    enabled: Boolean(activeUserId),
    queryFn: () => fetchJson<Dashboard>(`/api/users/${activeUserId}/dashboard`),
  });

  const portfolioQuery = useQuery({
    queryKey: ["portfolio", activeUserId],
    enabled: Boolean(activeUserId),
    queryFn: () => fetchJson<{ portfolio: PortfolioRow[] }>(`/api/users/${activeUserId}/portfolio`),
  });

  const tradesQuery = useQuery({
    queryKey: ["trades", activeUserId],
    enabled: Boolean(activeUserId),
    queryFn: () => fetchJson<{ trades: Trade[] }>(`/api/users/${activeUserId}/trades`),
  });

  const performanceQuery = useQuery({
    queryKey: ["performance", activeUserId],
    enabled: Boolean(activeUserId),
    queryFn: () => fetchJson<Performance>(`/api/users/${activeUserId}/performance`),
  });

  const refreshUserData = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", activeUserId] });
    queryClient.invalidateQueries({ queryKey: ["portfolio", activeUserId] });
    queryClient.invalidateQueries({ queryKey: ["trades", activeUserId] });
    queryClient.invalidateQueries({ queryKey: ["performance", activeUserId] });
  };

  const createUserMutation = useMutation({
    mutationFn: async (form: FormData) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          description: String(form.get("description") ?? ""),
          startingBalance: Number(form.get("startingBalance") ?? 0),
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json() as Promise<{ userId: string }>;
    },
    onSuccess: ({ userId }) => {
      setSelectedUserId(userId);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const marketDataMutation = useMutation({
    mutationFn: async (form: FormData) => {
      const response = await fetch("/api/market-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coinId: Number(form.get("coinId")),
          snapshotDate: String(form.get("snapshotDate")),
          priceUsd: Number(form.get("priceUsd")),
          marketCap: Number(form.get("marketCap")),
          volume24h: Number(form.get("volume24h")),
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market"] });
      refreshUserData();
    },
  });

  const tradeMutation = useMutation({
    mutationFn: async () => {
      if (tradeMode === "BUY" && !selectedTradeCoin) throw new Error("No coin selected");
      if (tradeMode === "SELL" && !sellHolding) throw new Error("No holding selected");
      const buyAmountUsd = selectedTradeCoin ? Number(tradeQuantity) * selectedTradeCoin.priceUsd : undefined;
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUserId,
          coinId: tradeMode === "BUY" ? selectedTradeCoin?.id : sellHolding?.coinId,
          type: tradeMode,
          amountUsd: tradeMode === "BUY" ? buyAmountUsd : undefined,
          quantity: tradeMode === "SELL" ? Number(tradeQuantity) : undefined,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      const coinSymbol = tradeMode === "BUY" ? selectedTradeCoin?.symbol : sellHolding?.symbol;
      setTradeQuantity("");
      setTradeCoinId(null);
      setSellHolding(null);
      showToast(`${tradeMode} ${coinSymbol ?? "coin"} thành công`);
      refreshUserData();
    },
  });

  const snapshotMutation = useMutation({
    mutationFn: async () => {
      const today = appTodayInput();
      const response = await fetch(`/api/users/${activeUserId}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotDate: today }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["performance", activeUserId] }),
  });

  const dashboard = dashboardQuery.data;
  const market = marketQuery.data?.market ?? [];
  const selectedTradeCoin = market.find((coin) => coin.id === tradeCoinId) ?? null;
  const portfolio = portfolioQuery.data?.portfolio ?? [];
  const trades = tradesQuery.data?.trades ?? [];
  const performance = performanceQuery.data;
  const cashBalance = dashboard?.totals.currentBalance ?? 0;
  const tradeQuantityNumber = Number(tradeQuantity);
  const estimatedCost =
    selectedTradeCoin && Number.isFinite(tradeQuantityNumber) && tradeQuantityNumber > 0
      ? tradeQuantityNumber * selectedTradeCoin.priceUsd
      : 0;
  const remainingCash = cashBalance - estimatedCost;
  const sellQuantityNumber = Number(tradeQuantity);
  const estimatedProceeds =
    sellHolding && Number.isFinite(sellQuantityNumber) && sellQuantityNumber > 0
      ? sellQuantityNumber * sellHolding.currentPrice
      : 0;
  const remainingHoldingQuantity = sellHolding ? sellHolding.quantity - Math.max(sellQuantityNumber || 0, 0) : 0;
  const tradeQuantityInvalid =
    Boolean(tradeQuantity) &&
    (tradeMode === "BUY"
      ? !Number.isFinite(tradeQuantityNumber) || tradeQuantityNumber <= 0 || estimatedCost > cashBalance
      : !Number.isFinite(sellQuantityNumber) ||
        sellQuantityNumber <= 0 ||
        !sellHolding ||
        sellQuantityNumber > sellHolding.quantity);

  const handleCreateUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createUserMutation.mutate(new FormData(event.currentTarget));
    event.currentTarget.reset();
  };

  const handleMarketData = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    marketDataMutation.mutate(new FormData(event.currentTarget));
  };

  const handleTrade = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeUserId || tradeQuantityInvalid) return;
    if (tradeMode === "BUY" && (!selectedTradeCoin || estimatedCost <= 0)) return;
    if (tradeMode === "SELL" && (!sellHolding || estimatedProceeds <= 0)) return;
    tradeMutation.mutate();
  };

  const openTradeModal = (coinId: number) => {
    setTradeMode("BUY");
    setTradeCoinId(coinId);
    setSellHolding(null);
    setTradeQuantity("");
    tradeMutation.reset();
  };

  const openSellModal = (holding: PortfolioRow) => {
    setTradeMode("SELL");
    setSellHolding(holding);
    setTradeCoinId(null);
    setTradeQuantity("");
    tradeMutation.reset();
  };

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
              <select
                className="h-10 min-w-56 rounded border border-slate-300 bg-white px-3 text-sm"
                value={activeUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded bg-slate-900 px-4 text-sm font-semibold text-white"
                onClick={() => {
                  queryClient.invalidateQueries();
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

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="space-y-4">
          <Panel title="Create user" icon={<UserPlus size={17} />}>
            <form className="space-y-3" onSubmit={handleCreateUser}>
              <Input name="name" placeholder="Name" required />
              <Input name="description" placeholder="Description" />
              <Input name="startingBalance" placeholder="Starting balance" type="number" defaultValue="100000" required />
              <button className="inline-flex h-9 w-full items-center justify-center gap-2 rounded bg-teal-700 px-3 text-sm font-semibold text-white">
                <Plus size={16} />
                Add
              </button>
            </form>
          </Panel>

          <Panel title="Market import" icon={<BarChart3 size={17} />}>
            <form className="space-y-3" onSubmit={handleMarketData}>
              <select name="coinId" className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm" required>
                {market.map((coin) => (
                  <option key={coin.id} value={coin.id}>
                    {coin.symbol} - {coin.name}
                  </option>
                ))}
              </select>
              <Input name="snapshotDate" type="date" defaultValue={appTodayInput()} required />
              <Input name="priceUsd" placeholder="Price USD" type="number" step="0.00000001" required />
              <Input name="marketCap" placeholder="Market cap" type="number" step="0.01" required />
              <Input name="volume24h" placeholder="Volume 24h" type="number" step="0.01" required />
              <button className="inline-flex h-9 w-full items-center justify-center gap-2 rounded bg-slate-900 px-3 text-sm font-semibold text-white">
                <Save size={16} />
                Save data
              </button>
            </form>
          </Panel>

        </aside>

        <section className="space-y-4">
          <nav className="flex gap-2 overflow-x-auto border-b border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex h-11 min-w-fit items-center gap-2 border-b-2 px-3 text-sm font-semibold ${
                    activeTab === tab.id
                      ? "border-teal-700 text-teal-800"
                      : "border-transparent text-slate-600"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {activeTab === "market" && <MarketTable market={market} onTrade={openTradeModal} />}
          {activeTab === "portfolio" && <PortfolioTable portfolio={portfolio} onSell={openSellModal} />}
          {activeTab === "history" && <TradeHistory trades={trades} />}
          {activeTab === "performance" && (
            <PerformancePanel performance={performance} onSnapshot={() => snapshotMutation.mutate()} />
          )}

          {(tradeMutation.error || marketDataMutation.error || createUserMutation.error) && (
            <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Có lỗi khi xử lý dữ liệu. Kiểm tra input, số dư hoặc số lượng coin.
            </div>
          )}
        </section>
      </div>

      {tradeMode === "BUY" && selectedTradeCoin && (
        <TradeModal
          coin={selectedTradeCoin}
          cashBalance={cashBalance}
          quantityValue={tradeQuantity}
          estimatedCost={estimatedCost}
          remainingCash={remainingCash}
          isInvalid={tradeQuantityInvalid}
          isPending={tradeMutation.isPending}
          error={tradeMutation.error ? "Không thể mua coin này. Kiểm tra số dư hoặc dữ liệu giá." : ""}
          onQuantityChange={setTradeQuantity}
          onClose={() => {
            setTradeCoinId(null);
            setTradeQuantity("");
            tradeMutation.reset();
          }}
          onSubmit={handleTrade}
        />
      )}

      {tradeMode === "SELL" && sellHolding && (
        <SellModal
          holding={sellHolding}
          quantityValue={tradeQuantity}
          estimatedProceeds={estimatedProceeds}
          remainingQuantity={remainingHoldingQuantity}
          isInvalid={tradeQuantityInvalid}
          isPending={tradeMutation.isPending}
          error={tradeMutation.error ? "Không thể bán coin này. Kiểm tra số lượng đang nắm giữ." : ""}
          onQuantityChange={setTradeQuantity}
          onSellAll={() => setTradeQuantity(String(sellHolding.quantity))}
          onClose={() => {
            setSellHolding(null);
            setTradeQuantity("");
            tradeMutation.reset();
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
  );
}

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${positive === undefined ? "text-slate-950" : positive ? "text-emerald-700" : "text-rose-700"}`}>
        {value}
      </p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm outline-none focus:border-teal-700 ${props.className ?? ""}`}
    />
  );
}

function TradeModal({
  coin,
  cashBalance,
  quantityValue,
  estimatedCost,
  remainingCash,
  isInvalid,
  isPending,
  error,
  onQuantityChange,
  onClose,
  onSubmit,
}: {
  coin: MarketCoin;
  cashBalance: number;
  quantityValue: string;
  estimatedCost: number;
  remainingCash: number;
  isInvalid: boolean;
  isPending: boolean;
  error: string;
  onQuantityChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const hasQuantity = quantityValue.trim().length > 0;
  const canBuy = hasQuantity && !isInvalid && estimatedCost > 0 && !isPending;

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
            <span className={`font-semibold ${remainingCash < 0 ? "text-rose-700" : "text-emerald-700"}`}>
              {money(remainingCash)}
            </span>
          </div>
        </div>

        {isInvalid && (
          <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            Quantity không hợp lệ hoặc số tiền mua vượt quá số dư hiện tại.
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
  );
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
  holding: PortfolioRow;
  quantityValue: string;
  estimatedProceeds: number;
  remainingQuantity: number;
  isInvalid: boolean;
  isPending: boolean;
  error: string;
  onQuantityChange: (value: string) => void;
  onSellAll: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const hasQuantity = quantityValue.trim().length > 0;
  const canSell = hasQuantity && !isInvalid && estimatedProceeds > 0 && !isPending;

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
            <span className={`font-semibold ${remainingQuantity < 0 ? "text-rose-700" : "text-slate-950"}`}>
              {quantity(Math.max(remainingQuantity, 0))}
            </span>
          </div>
        </div>

        {isInvalid && (
          <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            Quantity không hợp lệ hoặc vượt quá số lượng đang nắm giữ.
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
  );
}

function MarketTable({ market, onTrade }: { market: MarketCoin[]; onTrade: (coinId: number) => void }) {
  return (
    <div className="table-scroll overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="min-w-[920px] w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <Th>Coin</Th>
            <Th>Price</Th>
            <Th>24h</Th>
            <Th>7d</Th>
            <Th>Market Cap</Th>
            <Th>Volume</Th>
            <Th>Date</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {market.map((coin) => (
            <tr key={coin.id} className="border-t border-slate-100">
              <Td>
                <span className="font-semibold text-slate-950">{coin.symbol}</span>
                <span className="ml-2 text-slate-500">{coin.name}</span>
              </Td>
              <Td>{money(coin.priceUsd)}</Td>
              <Td className={toneClass(coin.change24h)}>{pct(coin.change24h)}</Td>
              <Td className={toneClass(coin.change7d)}>{pct(coin.change7d)}</Td>
              <Td>{money(coin.marketCap)}</Td>
              <Td>{money(coin.volume24h)}</Td>
              <Td>{coin.snapshotDate ?? "n/a"}</Td>
              <Td>
                <button
                  className="h-8 rounded bg-blue-600 px-3 text-xs font-semibold text-white"
                  onClick={() => onTrade(coin.id)}
                >
                  Trade
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PortfolioTable({ portfolio, onSell }: { portfolio: PortfolioRow[]; onSell: (holding: PortfolioRow) => void }) {
  return (
    <div className="table-scroll overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="min-w-[940px] w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <Th>Coin</Th>
            <Th>Quantity</Th>
            <Th>Avg Price</Th>
            <Th>Current Price</Th>
            <Th>Market Value</Th>
            <Th>Unrealized PnL</Th>
            <Th>PnL %</Th>
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
              <Td>{quantity(row.quantity)}</Td>
              <Td>{money(row.avgPrice)}</Td>
              <Td>{money(row.currentPrice)}</Td>
              <Td>{money(row.marketValue)}</Td>
              <Td className={toneClass(row.unrealizedPnl)}>{money(row.unrealizedPnl)}</Td>
              <Td className={toneClass(row.unrealizedPnlPct)}>{pct(row.unrealizedPnlPct)}</Td>
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
  );
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
            <Th>Quantity</Th>
            <Th>Price</Th>
            <Th>Total</Th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id} className="border-t border-slate-100">
              <Td>{new Date(trade.date).toLocaleString("vi-VN")}</Td>
              <Td>
                <span className="font-semibold">{trade.symbol}</span>
                <span className="ml-2 text-slate-500">{trade.name}</span>
              </Td>
              <Td>
                <span className={`rounded px-2 py-1 text-xs font-semibold ${trade.type === "BUY" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {trade.type}
                </span>
              </Td>
              <Td>{quantity(trade.quantity)}</Td>
              <Td>{money(trade.priceUsd)}</Td>
              <Td>{money(trade.totalAmount)}</Td>
            </tr>
          ))}
          {!trades.length && <EmptyRow colSpan={6} text="No trades yet." />}
        </tbody>
      </table>
    </div>
  );
}

function PerformancePanel({ performance, onSnapshot }: { performance?: Performance; onSnapshot: () => void }) {
  const points = performance?.points ?? [];
  const stats = performance?.stats;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Total Return" value={pct(stats?.totalReturn ?? 0)} positive={(stats?.totalReturn ?? 0) >= 0} />
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
            onClick={onSnapshot}
          >
            <Save size={16} />
            Snapshot today
          </button>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Area type="monotone" dataKey="totalValue" stroke="#087f8c" fill="#99f6e4" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function Th({ children }: { children?: ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-500">
        {text}
      </td>
    </tr>
  );
}
