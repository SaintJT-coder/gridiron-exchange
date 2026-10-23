import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlayerDetails } from './components/PlayerDetails.jsx';
import { AppShell } from './components/AppShell.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Portfolio } from './pages/Portfolio.jsx';
import { Account } from './pages/Account.jsx';
import { players as seedPlayers } from './data/players.js';
import { loadPlayerHistory } from './services/playerHistory.js';
import { ACCOUNT_KEY, initialAccount, readAccount, portfolioTotals, executeTrade } from './services/portfolio.js';

export default function App() {
  const [loaded] = useState(() => {
    try { return { account: readAccount(localStorage.getItem(ACCOUNT_KEY)) }; }
    catch (error) { return { account: initialAccount(), error: error.message }; }
  });
  const [account, setAccount] = useState(loaded.account);
  const accountRef = useRef(account);
  const [storageError, setStorageError] = useState(loaded.error || '');
  const [tradeError, setTradeError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [quotes, setQuotes] = useState({});
  const [quoteStatus, setQuoteStatus] = useState({});
  const inFlight = useRef(new Map());
  const [tab, setTab] = useState('Dashboard');
  const { cash, holdings, transactions } = account;
  useEffect(() => {
    if (loaded.error) return; // Never overwrite a saved record that failed validation.
    try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account)); setStorageError(''); }
    catch { setStorageError('Browser storage is unavailable. Keep this tab open: trades cannot survive a refresh.'); }
  }, [account, loaded.error]);
  const onQuote = useCallback((id, quote) => {
    const valid = quote && Number.isFinite(quote.price) && quote.change !== null;
    if (valid) setQuotes(old => ({ ...old, [id]: { ...quote, refreshedAt: new Date().toISOString() } }));
    setQuoteStatus(old => ({ ...old, [id]: valid ? 'ready' : 'unavailable' }));
  }, []);
  const refreshPlayer = useCallback(id => {
    if (inFlight.current.has(id)) return inFlight.current.get(id);
    const player = seedPlayers.find(p => p.id === id);
    if (!player) return Promise.resolve(null);
    setQuoteStatus(old => ({ ...old, [id]: 'loading' }));
    const request = loadPlayerHistory(player).then(data => {
      onQuote(id, data.quote);
      return data.quote?.change !== null ? data.quote : null;
    }).catch(() => { setQuoteStatus(old => ({ ...old, [id]: 'error' })); return null; })
      .finally(() => inFlight.current.delete(id));
    inFlight.current.set(id, request);
    return request;
  }, [onQuote]);
  const refreshPortfolio = useCallback(async () => {
    const ids = accountRef.current.holdings.map(h => h.playerId);
    // Refresh two players at a time to keep provider traffic bounded.
    for (let i = 0; i < ids.length; i += 2) await Promise.all(ids.slice(i, i + 2).map(refreshPlayer));
  }, [refreshPlayer]);
  const holdingsKey = holdings.map(h => h.playerId).sort().join(',');
  useEffect(() => {
    refreshPortfolio();
    const interval = setInterval(refreshPortfolio, 5 * 60 * 1000);
    const focus = () => refreshPortfolio();
    window.addEventListener('focus', focus);
    return () => { clearInterval(interval); window.removeEventListener('focus', focus); };
  }, [holdingsKey, refreshPortfolio]);
  const closeDetails = useCallback(() => setSelectedId(null), []);
  const marketPlayers = useMemo(() => seedPlayers.map(p => quotes[p.id]
    ? { ...p, price: quotes[p.id].price, change: quotes[p.id].change, priced: true, quoteDate: quotes[p.id].date }
    : p), [quotes]);
  const roster = useMemo(() => marketPlayers.map(p => ({ ...p, shares: holdings.find(h => h.playerId === p.id)?.shares || 0 })), [holdings, marketPlayers]);
  const totals = portfolioTotals(holdings, marketPlayers);
  const [watchlist, setWatchlist] = useState(['ceedee-lamb', 'breece-hall', 'tee-higgins', 'george-kittle']);
  const [trading, setTrading] = useState(false);
  const tradeLock = useRef(false);
  const trade = async (playerId, side, shares = 1) => {
    if (tradeLock.current) return;
    if (loaded.error) { setTradeError('Saved account needs recovery before trading. Its stored record has been preserved.'); return; }
    tradeLock.current = true; setTrading(true); setTradeError('');
    try {
      const quote = await refreshPlayer(playerId);
      if (!quote || !Number.isFinite(quote.price)) { setTradeError('Could not verify an ESPN-based price. No trade was made; retry when stats are available.'); return; }
      const result = executeTrade(accountRef.current, playerId, side, shares, quote.price);
      if (result.error) { setTradeError(result.error); return; }
      accountRef.current = result.account;
      setAccount(result.account);
    } finally { tradeLock.current = false; setTrading(false); }
  };
  const toggleWatch = id => setWatchlist(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]);
  const status = { ready: holdings.filter(h => quoteStatus[h.playerId] === 'ready').length,
    loading: holdings.some(h => quoteStatus[h.playerId] === 'loading'), total: holdings.length };
  return <AppShell tab={tab} setTab={setTab}>
    {storageError && <p className="notice-box" role="alert">{storageError}</p>}
    {tradeError && <p className="notice-box" role="alert">{tradeError}</p>}
    {trading && <p className="muted" role="status">Verifying ESPN price and recording your paper trade…</p>}
    {tab === 'Dashboard' && <Dashboard cash={cash} totalValue={totals.value} totalReturn={totals.gain} returnPct={totals.returnPct} costBasis={totals.cost} holdings={holdings} quoteStatus={status} players={roster} watchlist={watchlist} toggleWatch={toggleWatch} trade={trade} onPlayerClick={setSelectedId} />}
    {tab === 'Portfolio' && <Portfolio cash={cash} totalValue={totals.value} totalReturn={totals.gain} returnPct={totals.returnPct} costBasis={totals.cost} quoteStatus={quoteStatus} status={status} refreshPortfolio={refreshPortfolio} players={roster} holdings={holdings} transactions={transactions} trade={trade} onPlayerClick={setSelectedId} />}
    {tab === 'Account' && <Account cash={cash} holdings={holdings} totalValue={totals.value} />}
    {selectedId && <PlayerDetails key={selectedId} player={seedPlayers.find(p => p.id === selectedId)} onClose={closeDetails} onQuote={onQuote} />}
  </AppShell>;
}
