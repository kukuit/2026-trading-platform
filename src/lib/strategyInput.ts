type StrategyInput = {
  maxCoinCount?: number | null;
  coinSelectionRule?: string | null;
  buyRule?: string | null;
  sellRule?: string | null;
};

export function normalizeStrategyInput(input: StrategyInput) {
  return {
    maxCoinCount: input.maxCoinCount ?? null,
    coinSelectionRule: input.coinSelectionRule?.trim() || null,
    buyRule: input.buyRule?.trim() || null,
    sellRule: input.sellRule?.trim() || null,
  };
}

export function hasStrategyInput(input: StrategyInput) {
  const strategy = normalizeStrategyInput(input);

  return (
    strategy.maxCoinCount !== null ||
    strategy.coinSelectionRule !== null ||
    strategy.buyRule !== null ||
    strategy.sellRule !== null
  );
}
