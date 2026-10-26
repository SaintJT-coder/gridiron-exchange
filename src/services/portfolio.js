import { players } from '../data/players.js';
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

export const defaultSettings = { name: 'Evan', email: '', theme: 'dark', alerts: true };
export function readAccount(text) {
  if (text && new TextEncoder().encode(text).length > 500000) throw new Error('Account file is too large. Maximum size is 500 KB.');
  if (!text) return { ...initialAccount(), revision: 0, settings: { ...defaultSettings }, watchlist: ['ceedee-lamb','breece-hall','tee-higgins','george-kittle'] };
  const account = JSON.parse(text);
  const known = new Set(players.map(p => p.id));
  if(account && Object.keys(account).some(key=>!['version','revision','cash','holdings','transactions','settings','watchlist'].includes(key))) throw new Error('Unknown account fields. Choose an unmodified Gridiron backup.');
  if (!account || account.version !== 1 || !Number.isFinite(account.cash) || account.cash < 0 || account.cash > 1000000000
      || !Array.isArray(account.holdings) || account.holdings.length > players.length || !Array.isArray(account.transactions) || account.transactions.length > 5000
      || (account.revision !== undefined && (!Number.isSafeInteger(account.revision) || account.revision < 0))
      || account.transactions.some(t => !t || !known.has(t.playerId) || !['Bought', 'Sold'].includes(t.action)
        || !Number.isInteger(t.shares) || t.shares < 1 || t.shares > 1000000 || !Number.isFinite(t.price) || t.price < .01 || t.price > 1000000000)
      || new Set(account.holdings.map(h => h?.playerId)).size !== account.holdings.length
      || account.holdings.some(h => !h || !known.has(h.playerId) || !Number.isInteger(h.shares) || h.shares <= 0 || h.shares > 1000000
        || !Number.isFinite(h.avgCost) || h.avgCost < 0 || h.avgCost > 1000000000
        || (h.costBasisCents !== undefined && (!Number.isSafeInteger(h.costBasisCents) || h.costBasisCents < 0)))) {
    throw new Error('Saved portfolio could not be read. Its stored record has been left untouched.');
  }
  const settings = { ...defaultSettings, ...account.settings };
  if(account.settings && (typeof account.settings!=='object' || Array.isArray(account.settings)
    || Object.keys(account.settings).some(key=>!Object.keys(defaultSettings).includes(key)))) throw new Error('Invalid settings fields.');
  if (typeof settings.name !== 'string' || !settings.name.trim() || settings.name.length > 80
      || typeof settings.email !== 'string' || settings.email.length > 254
      || !['dark','light'].includes(settings.theme) || typeof settings.alerts !== 'boolean'
      || (account.watchlist && (!Array.isArray(account.watchlist) || account.watchlist.length > players.length || account.watchlist.some(id=>!known.has(id))))) throw new Error('Invalid account preferences. Stored data was preserved.');
  return { ...account, revision: account.revision || 0, settings, watchlist: [...new Set(account.watchlist || ['ceedee-lamb','breece-hall','tee-higgins','george-kittle'])] };
}

export function portfolioTotals(holdings, players) {
  const costCents = holdings.reduce((sum, h) => sum + holdingCost(h), 0);
  const valueCents = holdings.reduce((sum, h) => sum + cents((players.find(p => p.id === h.playerId)?.price || 0) * h.shares), 0);
  return { cost: costCents / 100, value: valueCents / 100, gain: (valueCents - costCents) / 100,
    returnPct: costCents ? (valueCents - costCents) / costCents * 100 : 0 };
}

// Average-cost accounting: new market prices never rewrite purchase costs.
export function executeTrade(account, playerId, side, shares, price, now = new Date().toISOString()) {
  if (!players.some(p=>p.id===playerId) || !['buy', 'sell'].includes(side) || !Number.isInteger(shares) || shares < 1 || shares > 1000000 || !Number.isFinite(price) || price < .01 || price > 1000000000) {
    return { error: 'Enter a valid share quantity and wait for an ESPN-based quote.' };
  }
  if(account.transactions.length>=5000) return {error:'Your account has reached 5,000 records. Export a backup before archiving older records.'};
  const amount = cents(price) * shares;
  if(!Number.isSafeInteger(amount)) return {error:'Trade amount is too large.'};
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
  return { account: { ...account, revision: (account.revision || 0) + 1, cash: (cents(account.cash) + (side === 'buy' ? -amount : amount)) / 100,
    holdings, transactions: [transaction, ...account.transactions] } };
}
