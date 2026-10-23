import React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { PlayerDetails } from './components/PlayerDetails.jsx';
import { AppShell } from './components/AppShell.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Portfolio } from './pages/Portfolio.jsx';
import { Account } from './pages/Account.jsx';
import { players as seedPlayers } from './data/players.js';

export default function App() {
  const [selectedId, setSelectedId] = useState(null);
  const [quotes, setQuotes] = useState({});
  const onQuote = useCallback((id, quote) => setQuotes(old => ({ ...old, [id]: quote })), []);
  const closeDetails = useCallback(() => setSelectedId(null), []);
  const marketPlayers = useMemo(() => seedPlayers.map(p => quotes[p.id] ? { ...p, price: quotes[p.id].price, change: quotes[p.id].change, priced: true } : p), [quotes]);
  const [tab, setTab] = useState('Dashboard');
  const [cash, setCash] = useState(7519.50);
  const [holdings, setHoldings] = useState([
    { playerId: 'patrick-mahomes', shares: 12, avgCost: 120.45 },
    { playerId: 'josh-allen', shares: 10, avgCost: 112.30 },
    { playerId: 'lamar-jackson', shares: 8, avgCost: 108.12 },
    { playerId: 'justin-jefferson', shares: 15, avgCost: 132.40 },
    { playerId: 'jamar-chase', shares: 12, avgCost: 101.75 },
    { playerId: 'saquon-barkley', shares: 10, avgCost: 88.23 },
  ]);
  const [transactions, setTransactions] = useState([
    { date: 'Apr 26', playerId: 'patrick-mahomes', action: 'Bought', shares: 5, price: 128.40 },
    { date: 'Apr 25', playerId: 'justin-jefferson', action: 'Bought', shares: 10, price: 142.10 },
    { date: 'Apr 24', playerId: 'saquon-barkley', action: 'Sold', shares: 5, price: 94.32 },
  ]);
  const [watchlist, setWatchlist] = useState(['ceedee-lamb', 'breece-hall', 'tee-higgins', 'george-kittle']);
  const roster = useMemo(() => marketPlayers.map(p => ({ ...p, shares: holdings.find(h => h.playerId === p.id)?.shares || 0 })), [holdings, marketPlayers]);
  const valueOf = h => {
    const p = marketPlayers.find(x => x.id === h.playerId);
    return (p?.price || 0) * h.shares;
  };
  const totalValue = holdings.reduce((sum, h) => sum + valueOf(h), 0);
  const totalReturn = holdings.reduce((sum, h) => {
    const p = marketPlayers.find(x => x.id === h.playerId);
    return sum + ((p?.price || 0) - h.avgCost) * h.shares;
  }, 0);
  const trade = (playerId, side, shares = 1) => {
    const player = marketPlayers.find(p => p.id === playerId);
    if (!player || shares < 1) return;
    const existing = holdings.find(h => h.playerId === playerId);
    if (side === 'buy') {
      const cost = player.price * shares;
      if (cost > cash) return window.alert('Not enough simulated cash for this trade.');
      setCash(v => +(v - cost).toFixed(2));
      setHoldings(old => {
        const found = old.find(h => h.playerId === playerId);
        if (!found) return [...old, { playerId, shares, avgCost: player.price }];
        return old.map(h => h.playerId === playerId
          ? { ...h, avgCost: ((h.avgCost * h.shares) + cost) / (h.shares + shares), shares: h.shares + shares }
          : h);
      });
    } else {
      if (!existing || existing.shares < shares) return window.alert('You do not have enough shares to sell.');
      setCash(v => +(v + player.price * shares).toFixed(2));
      setHoldings(old => old.map(h => h.playerId === playerId ? { ...h, shares: h.shares - shares } : h).filter(h => h.shares > 0));
    }
    setTransactions(old => [{ date: 'Today', playerId, action: side === 'buy' ? 'Bought' : 'Sold', shares, price: player.price }, ...old].slice(0, 12));
  };
  const toggleWatch = id => setWatchlist(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]);
  return <AppShell tab={tab} setTab={setTab}>
    {tab === 'Dashboard' && <Dashboard cash={cash} totalValue={totalValue} totalReturn={totalReturn} players={roster} watchlist={watchlist} toggleWatch={toggleWatch} trade={trade} onPlayerClick={setSelectedId} />}
    {tab === 'Portfolio' && <Portfolio cash={cash} totalValue={totalValue} totalReturn={totalReturn} players={roster} holdings={holdings} transactions={transactions} trade={trade} onPlayerClick={setSelectedId} />}
    {tab === 'Account' && <Account cash={cash} holdings={holdings} totalValue={totalValue} />}
    {selectedId && <PlayerDetails key={selectedId} player={seedPlayers.find(p => p.id === selectedId)} onClose={closeDetails} onQuote={onQuote} />}
  </AppShell>;
}