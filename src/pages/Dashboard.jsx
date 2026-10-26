import React from 'react';
import { useMemo, useState } from 'react';
import { Search, ArrowUpRight, Star, CalendarDays, TrendingUp, CircleDollarSign, Wallet, ChevronRight } from 'lucide-react';
import { PortfolioComparison } from '../components/PortfolioComparison.jsx';


import { PlayerAvatar } from '../components/PlayerAvatar.jsx';
import { MiniSparkline } from '../components/MiniSparkline.jsx';
import { StatCard } from '../components/StatCard.jsx';

const percent=n=>Number.isFinite(n)?`${n>0?'▲':n<0?'▼':'•'} ${Math.abs(n).toFixed(2)}%`:'Unavailable';
const money = n => n.toLocaleString('en-US', { style:'currency', currency:'USD' });
export function Dashboard({ cash, totalValue, totalReturn, returnPct, costBasis, holdings, quoteStatus, players, watchlist, toggleWatch, trade, onPlayerClick, market, name }) {
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('All Positions');
  const [team, setTeam] = useState('All Teams');
  const filtered = useMemo(() => players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && (position === 'All Positions' || p.position === position) && (team === 'All Teams' || p.team === team)), [players, search, position, team]);
  const [moverSide,setMoverSide]=useState('gainers');
  const movers=players.filter(p=>p.priced && Number.isFinite(p.change) && (moverSide==='gainers'?p.change>=0:p.change<0)).sort((a,b)=>moverSide==='gainers'?b.change-a.change:a.change-b.change).slice(0,5);
  const games=(market?.schedule||[]).filter(g=>!g.completed && Date.parse(g.date)>Date.now()-12*3600000).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).slice(0,6);
  const watchPlayers = players.filter(p => watchlist.includes(p.id));
  const total = totalValue + cash;
  return <div className="page-stack">
    <div className="welcome-row"><div><p className="eyebrow">NFL PLAYER MARKET</p><h1>Welcome, {name}</h1><p className="muted">The market moves. Make the right play.</p></div><div className="market-status"><span className="live-dot"/> NFL market simulation <span className="muted">·</span> Shared settled prices</div></div>
    <div className="stats-grid">
      <StatCard label="Total Portfolio Value" value={money(total)} change={`${totalReturn>=0?'+':'-'}${money(Math.abs(totalReturn))} (${returnPct.toFixed(2)}%)`} sub={quoteStatus.ready===quoteStatus.total?'Since purchase · recorded cost':'Estimate · ESPN quotes loading or unavailable'}/>
      <StatCard label="Available Cash" value={money(cash)} sub="Ready to invest"/>
      <StatCard label="Purchase cost of open shares" value={money(costBasis)} sub="Original costs preserved" accent/>
    </div>
    <div className="dashboard-overview">
      <PortfolioComparison holdings={holdings} players={players}/>
      <section className="panel movers-panel"><div className="panel-heading"><div><h2>Top Movers</h2><p className="muted small">Latest settled game · verified players only</p></div><TrendingUp size={18} className="teal"/></div><div className="mover-tabs"><button className={moverSide==='gainers'?'selected':''} onClick={()=>setMoverSide('gainers')}>Gainers</button><button className={moverSide==='losers'?'selected':''} onClick={()=>setMoverSide('losers')}>Losers</button></div>
        {!movers.length&&<p className="muted small">No verified {moverSide} in the latest update.</p>}{movers.map(p=><div className="mover-row" key={p.id}><PlayerAvatar player={p} size="sm"/><div className="player-ident"><button className="player-name" onClick={()=>onPlayerClick(p.id)}>{p.name}</button><span>{p.position} · {p.team}</span></div><div className="mover-price">{money(p.price)}<span className={p.change < 0 ? 'negative' : 'positive'}>{percent(p.change)}</span></div></div>)}
      </section>
    </div>
    <section className="panel market-panel">
      <div className="panel-heading market-heading"><div><h2>NFL Market</h2><p className="muted small">Click a player for live game stats and performance-based paper prices</p></div><span className="demo-tag">SIMULATED PRICES</span></div>
      <div className="filters"><label className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search players..."/></label><select value={position} onChange={e=>setPosition(e.target.value)}><option>All Positions</option>{['QB','RB','WR','TE'].map(x=><option key={x}>{x}</option>)}</select><select value={team} onChange={e=>setTeam(e.target.value)}><option>All Teams</option>{[...new Set(players.map(p=>p.team))].sort().map(x=><option key={x}>{x}</option>)}</select></div>
      <div className="table-scroll"><table><thead><tr><th>Player</th><th>Team</th><th>Pos</th><th>Share Price</th><th>Last game change</th><th>Settled price history</th><th>Trade</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><div className="table-player"><button className={`watch-star ${watchlist.includes(p.id) ? 'on' : ''}`} onClick={()=>toggleWatch(p.id)} aria-label="Toggle watchlist"><Star size={14} fill={watchlist.includes(p.id) ? 'currentColor' : 'none'}/></button><PlayerAvatar player={p}/><div className="player-ident"><button className="player-name" onClick={()=>onPlayerClick(p.id)}>{p.name}</button><span>{p.position} · {p.team}</span></div></div></td><td><span className="team-badge">{p.team}</span></td><td>{p.position}</td><td className="price-cell">{p.priced?money(p.price):'Unavailable'}<span className="game-subline">{p.priced ? 'Shared settled price' : 'Awaiting verified settlement'}</span></td><td><span className={p.change < 0 ? 'negative' : 'positive'}>{percent(p.change)}</span></td><td><MiniSparkline values={p.trend}/></td><td><button className="trade-btn" disabled={!!p.tradeBlock} title={p.tradeBlock||'Preview purchase'} onClick={()=>trade(p.id,'buy')}>{p.tradeBlock?'Paused':'Buy'}</button></td></tr>)}</tbody></table></div>
      {filtered.length===0 && <div className="empty-state">No players match those filters.</div>}
    </section>
    <div className="bottom-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Watchlist</h2><p className="muted small">Players you’re keeping an eye on</p></div><span className="link-like">{watchPlayers.length} players <ChevronRight size={14}/></span></div>{watchPlayers.map(p=><div className="watch-row" key={p.id}><PlayerAvatar player={p} size="sm"/><div className="player-ident"><button className="player-name" onClick={()=>onPlayerClick(p.id)}>{p.name}</button><span>{p.position} · {p.team}</span></div><span className="price-cell">{money(p.price)}</span><span className={p.change < 0 ? 'negative' : 'positive'}>{percent(p.change)}</span></div>)}</section>
      <section className="panel"><div className="panel-heading"><div><h2>Upcoming Games</h2><p className="muted small">ESPN schedule · local time · games in progress included</p></div><CalendarDays size={18} className="teal"/></div>{!games.length&&<p className="muted small">Schedule unavailable. Refresh the market.</p>}{games.map(g=><div className="game-row" key={g.id}><div className="matchup-mark"><span>{g.away}</span><span className="at">@</span><span>{g.home}</span></div><div className="player-ident"><strong>{g.matchup}</strong><span>{g.state==='in'?g.status:new Date(g.date).toLocaleString()}</span></div><ChevronRight size={16} className="muted"/></div>)}</section>
    </div>
    <p className="disclaimer"><CircleDollarSign size={14}/> All balances, prices, performance, and transactions are simulated for entertainment. No real money or live market prices.</p>
  </div>;
}