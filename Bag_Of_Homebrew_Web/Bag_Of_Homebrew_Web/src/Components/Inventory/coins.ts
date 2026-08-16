export interface CoinType {
  key: 'platinum' | 'gold' | 'electrum' | 'silver' | 'copper';
  abbr: string;
  color: string;
  copperValue: number;
}

export const COINS: CoinType[] = [
  { key: 'platinum', abbr: 'pp', color: '#D8D8E0', copperValue: 1000 },
  { key: 'gold',     abbr: 'gp', color: '#E0B33D', copperValue: 100 },
  { key: 'electrum', abbr: 'ep', color: '#B8C89A', copperValue: 50 },
  { key: 'silver',   abbr: 'sp', color: '#B0B0B8', copperValue: 10 },
  { key: 'copper',   abbr: 'cp', color: '#C87B4A', copperValue: 1 },
];

export type CurrencyAmounts = Record<CoinType['key'], number>;

export interface CoinBreakdown {
  key: CoinType['key'];
  abbr: string;
  color: string;
  count: number;
}

// Re-denominate the total wealth into whole coins, starting from `fromKey` downward.
// Returns only coins with a non-zero count.
export function convertCurrency(amounts: CurrencyAmounts, fromKey: CoinType['key']): CoinBreakdown[] {
  // 1. Total value in copper
  const totalCopper = COINS.reduce((sum, c) => sum + amounts[c.key] * c.copperValue, 0);

  // 2. Coins from the chosen ceiling downward (COINS is already ordered high → low)
  const startIndex = COINS.findIndex((c) => c.key === fromKey);
  const usable = COINS.slice(startIndex);

  // 3. Greedy breakdown
  let remaining = totalCopper;
  const breakdown: CoinBreakdown[] = usable.map((coin) => {
    const count = Math.floor(remaining / coin.copperValue);
    remaining -= count * coin.copperValue;
    return { key: coin.key, abbr: coin.abbr, color: coin.color, count };
  });

  // 4. Drop zeros
  return breakdown.filter((b) => b.count > 0);
}