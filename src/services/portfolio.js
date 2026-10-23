export const ACCOUNT_KEY = 'gridiron-exchange-paper-account-v1';
const cents = value => Math.round(value * 100);
export const holdingCost = holding => holding.costBasisCents ?? cents(holding.avgCost * holding.shares);

export function initialAccount() {
  return { version: 1, cash: 7519.50, holdings: [
    { playerId: 'patrick-mahomes', shares: 12, avgCost: 120.45 },
    { playerId: 'josh-allen', shares: 10, avgCost: 112.30 },
    { playerId: 'lamar-jackson', shares: 8, avgCost: 108.12 },
    { playerId: 'justin-jefferson', shares: 15, avgCost: 132.40 },
    { playerId: 'jamar-chase', shares: 12, avgCost: 101.75 },
    { playerId: 'saquon-barkley', shares: 10, avgCost: 88.23 },
  ], transactions: [
    { date: 'Apr 26', playerId: 'patrick-mahomes', action: 'Bought', shares: 5, price: 128.40, demo: true },
    { date: 'Apr 25', playerId: 'justin-jefferson', action: 'Bought', shares: 10, price: 142.10, demo: true },
    { date: 'Apr 24', playerId: 'saquon-barkley', action: 'Sold', shares: 5, price: 94.32, demo: true },
  ] };
}

export function readAccount(text) {
  if (!text) return initialAccount();
  const account = JSON.parse(text);
  if (account.version !== 1 || !Number.isFinite(account.cash) || account.cash < 0
      || !Array.isArray(account.holdings) || !Array.isArray(account.transactions)
      || account.transactions.some(t => !t.playerId || !['Bought', 'Sold'].includes(t.action)
        || !Number.isInteger(t.shares) || t.shares < 1 || !Number.isFinite(t.price) || t.price <= 0)
      || new Set(account.holdings.map(h => h.playerId)).size !== account.holdings.length
      || account.holdings.some(h => !h.playerId || !Number.isInteger(h.shares) || h.shares <= 0
        || !Number.isFinite(h.avgCost) || h.avgCost < 0
        || (h.costBasisCents !== undefined && (!Number.isSafeInteger(h.costBasisCents) || h.costBasisCents < 0)))) {
    throw new Error('Saved portfolio could not be read. Its stored record has been left untouched.');
  }
  return account;
}

export function portfolioTotals(holdings, players) {
  const costCents = holdings.reduce((sum, h) => sum + holdingCost(h), 0);
  const valueCents = holdings.reduce((sum, h) => sum + cents((players.find(p => p.id === h.playerId)?.price || 0) * h.shares), 0);
  return { cost: costCents / 100, value: valueCents / 100, gain: (valueCents - costCents) / 100,
    returnPct: costCents ? (valueCents - costCents) / costCents * 100 : 0 };
}

// Average-cost accounting: new market prices never rewrite purchase costs.
export function executeTrade(account, playerId, side, shares, price, now = new Date().toISOString()) {
  if (!['buy', 'sell'].includes(side) || !Number.isInteger(shares) || shares < 1 || !Number.isFinite(price) || price <= 0) {
    return { error: 'Enter a valid share quantity and wait for an ESPN-based quote.' };
  }
  const amount = cents(price) * shares;
  const old = account.holdings.find(h => h.playerId === playerId);
  if (side === 'buy' && amount > cents(account.cash)) return { error: 'Not enough simulated cash for this trade.' };
  if (side === 'sell' && (!old || old.shares < shares)) return { error: 'You do not have enough shares to sell.' };
  const oldCost = old ? holdingCost(old) : 0;
  const removedCost = side === 'sell' ? Math.round(oldCost * shares / old.shares) : 0;
  const nextShares = (old?.shares || 0) + (side === 'buy' ? shares : -shares);
  const costBasisCents = side === 'buy' ? oldCost + amount : oldCost - removedCost;
  const position = { playerId, shares: nextShares, costBasisCents, avgCost: nextShares ? costBasisCents / nextShares / 100 : 0 };
  const holdings = account.holdings.filter(h => h.playerId !== playerId);
  if (nextShares) holdings.push(position);
  const transaction = { id: `${now}-${account.transactions.length}`, executedAt: now, date: now,
    playerId, action: side === 'buy' ? 'Bought' : 'Sold', shares, price: cents(price) / 100,
    ...(side === 'sell' ? { realizedGain: (amount - removedCost) / 100 } : {}) };
  return { account: { ...account, cash: (cents(account.cash) + (side === 'buy' ? -amount : amount)) / 100,
    holdings, transactions: [transaction, ...account.transactions] } };
}
