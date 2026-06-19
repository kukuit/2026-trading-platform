import type { Strategy, User } from './types'

export const SELECTED_USER_STORAGE_KEY = 'trading-platform:selected-user-id'
export const DEFAULT_STARTING_BALANCE_VND = '100000000'

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(await readResponseError(response))
  return response.json()
}

export async function readResponseError(response: Response) {
  const message = await response.text()
  return `Request failed (${response.status}): ${message || response.statusText}`
}

export function pct(value: number | null) {
  if (value === null) return 'n/a'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function chartDateLabel(value: string) {
  return value.slice(5)
}

export function toneClass(value: number | null) {
  if (value === null) return 'text-slate-500'
  return value >= 0 ? 'text-[#00b600]' : 'text-[#fb0000]'
}

export function usdNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 1000 ? 2 : 8,
  }).format(value)
}

export function formatUsdInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return ''
  return value.toFixed(2).replace(/\.00$/, '')
}

export function createUserPayloadFromForm(form: FormData) {
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

export function updateUserPayloadFromForm(form: FormData) {
  return {
    name: String(form.get('name') ?? '').trim(),
    description: String(form.get('description') ?? '').trim(),
    maxCoinCount: optionalNumberFromForm(form, 'maxCoinCount'),
    coinSelectionRule: optionalTextFromForm(form, 'coinSelectionRule'),
    buyRule: optionalTextFromForm(form, 'buyRule'),
    sellRule: optionalTextFromForm(form, 'sellRule'),
  }
}

export function strategyRuleLabel(rule: string | null) {
  if (!rule) return '-'
  return strategyRuleLabels[rule] ?? rule
}

export function strategyName(strategy: Strategy) {
  return `${strategyRuleLabel(strategy.coinSelectionRule)} / ${strategyRuleLabel(strategy.buyRule)} / ${strategyRuleLabel(strategy.sellRule)}`
}

export function userStrategyName(user: User) {
  return user.strategy ? strategyName(user.strategy) : 'No strategy assigned'
}

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
