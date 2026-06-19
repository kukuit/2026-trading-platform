import type { User } from './types'
import { strategyRuleLabel } from './utils'

export function UserStrategyDetails({ user }: { user: User }) {
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
