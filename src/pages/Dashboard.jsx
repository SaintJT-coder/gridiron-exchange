import React from 'react';
import { useMemo, useState } from 'react';
import { Search, ArrowUpRight, Star, CalendarDays, TrendingUp, CircleDollarSign, Wallet, ChevronRight } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

import { portfolioSeries, games } from '../data/mockData.js';
import { PlayerAvatar } from '../components/PlayerAvatar.jsx';
import { MiniSparkline } from '../components/MiniSparkline.jsx';
import { StatCard } from '../components/StatCard.jsx';

const money = n => n.toLocaleString('en-US', { style:'currency', currency:'USD' });
export function Dashboard({ cash, totalValue, totalReturn, players, watchlist, toggleWatch, trade, onPlayerClick }) {
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('All Positions');
  const [team, setTeam] = useState('All Teams');
  const filtered = useMemo(() => players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && (position === 'All Positions' || p.position === position) && (team === 'All Teams' || p.team === team)), [players, search, position, team]);
  const movers = [...players].sort((a,b) => b.change-a.change).slice(0,5);
  const watchPlayers = players.filter(p => watchlist.includes(p.id));
  const total = totalValue + cash;
  return <div className="page-stack">
    <div className="welcome-row"><div><p className="eyebrow">SUNDAY MARKET · DEMO MODE</p><h1>Good afternoon, Evan</h1><p className="muted">The market moves. Make the right play.</p></div><div className="market-status"><span className="live-dot"/> NFL market simulation <span className="muted">·</span> Season demo</div></div>
    <div className="stats-grid">
      <StatCard label="Total Portfolio Value" value={money(total)} change={`▲ ${money(totalReturn)} (${(totalReturn / 10000 * 100).toFixed(2)}%)`} sub="Since starting balance"/>
      <StatCard label="Available Cash" value={money(cash)} sub="Ready to invest"/>
      <StatCard label="Today's Return" value={`+${money(284.20)}`} change="▲ 2.33%" sub="Demo market movement" accent/>
    </div>
    <div className="dashboard-overview">
      <section className="panel chart-panel">
        <div className="panel-heading"><div><h2>Portfolio Value</h2><p className="muted small">Your simulated account performance</p></div><div className="chart-current">{money(total)}<span>▲ 11.43% (1M)</span></div></div>
        <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={portfolioSeries}><defs><linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#11d6b0" stopOpacity={0.25}/><stop offset="100%" stopColor="#11d6b0" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="label" hide/><Tooltip contentStyle={{background:'#071a2c',border:'1px solid #1d4661',borderRadius:8,color:'#e9f4ff'}} formatter={v=>money(v)}/><Area type="monotone" dataKey="value" stroke="#11d6b0" strokeWidth={2.5} fill="url(#portfolioFill)"/></AreaChart></ResponsiveContainer></div>
        <div className="chart-footer"><span>$6k</span><span>$8k</span><span>$10k</span><span>$12k</span><div className="range-pills"><button>1W</button><button className="selected">1M</button><button>3M</button><button>1Y</button></div></div>
      </section>
      <section className="panel movers-panel"><div className="panel-heading"><div><h2>Top Movers</h2><p className="muted small">Biggest percentage changes</p></div><TrendingUp size={18} className="teal"/></div><div className="mover-tabs"><span className="selected">Gainers</span><span>Losers</span></div>
        {movers.map(p=><div className="mover-row" key={p.id}><PlayerAvatar player={p} size="sm"/><div className="player-ident"><button className="player-name" onClick={()=>onPlayerClick(p.id)}>{p.name}</button><span>{p.position} · {p.team}</span></div><div className="mover-price">{money(p.price)}<span className={p.change < 0 ? 'negative' : 'positive'}>{p.change > 0 ? '▲' : '▼'} {Math.abs(p.change).toFixed(1)}%</span></div></div>)}
      </section>
    </div>
    <section className="panel market-panel">
      <div className="panel-heading market-heading"><div><h2>NFL Market</h2><p className="muted small">Click a player for live game stats and performance-based paper prices</p></div><span className="demo-tag">SIMULATED PRICES</span></div>
      <div className="filters"><label className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search players..."/></label><select value={position} onChange={e=>setPosition(e.target.value)}><option>All Positions</option>{['QB','RB','WR','TE'].map(x=><option key={x}>{x}</option>)}</select><select value={team} onChange={e=>setTeam(e.target.value)}><option>All Teams</option>{[...new Set(players.map(p=>p.team))].sort().map(x=><option key={x}>{x}</option>)}</select></div>
      <div className="table-scroll"><table><thead><tr><th>Player</th><th>Team</th><th>Pos</th><th>Share Price</th><th>Game / Demo Change</th><th>Illustrative Trend</th><th>Trade</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><div className="table-player"><button className={`watch-star ${watchlist.includes(p.id) ? 'on' : ''}`} onClick={()=>toggleWatch(p.id)} aria-label="Toggle watchlist"><Star size={14} fill={watchlist.includes(p.id) ? 'currentColor' : 'none'}/></button><PlayerAvatar player={p}/><div className="player-ident"><button className="player-name" onClick={()=>onPlayerClick(p.id)}>{p.name}</button><span>{p.position} · {p.team}</span></div></div></td><td><span className="team-badge">{p.team}</span></td><td>{p.position}</td><td className="price-cell">{money(p.price)}<span className="game-subline">{p.priced ? (p.quoteMissing ? 'ESPN adjustment unavailable' : 'ESPN PPR simulation') : 'Demo seed · open player'}</span></td><td><span className={p.change < 0 ? 'negative' : 'positive'}>{p.change > 0 ? '▲' : '▼'} {Math.abs(p.change).toFixed(1)}%</span></td><td><MiniSparkline positive={p.change >= 0}/></td><td><button className="trade-btn" onClick={()=>trade(p.id,'buy',1)}>Buy</button></td></tr>)}</tbody></table></div>
      {filtered.length===0 && <div className="empty-state">No players match those filters.</div>}
    </section>
    <div className="bottom-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Watchlist</h2><p className="muted small">Players you’re keeping an eye on</p></div><span className="link-like">{watchPlayers.length} players <ChevronRight size={14}/></span></div>{watchPlayers.map(p=><div className="watch-row" key={p.id}><PlayerAvatar player={p} size="sm"/><div className="player-ident"><button className="player-name" onClick={()=>onPlayerClick(p.id)}>{p.name}</button><span>{p.position} · {p.team}</span></div><span className="price-cell">{money(p.price)}</span><span className={p.change < 0 ? 'negative' : 'positive'}>{p.change > 0 ? '+' : ''}{p.change}%</span></div>)}</section>
      <section className="panel"><div className="panel-heading"><div><h2>Upcoming Games</h2><p className="muted small">Schedule preview · sample data</p></div><CalendarDays size={18} className="teal"/></div>{games.map(g=><div className="game-row" key={g.matchup}><div className="matchup-mark"><span>{g.away}</span><span className="at">@</span><span>{g.home}</span></div><div className="player-ident"><strong>{g.matchup}</strong><span>{g.time}</span></div><ChevronRight size={16} className="muted"/></div>)}</section>
    </div>
    <p className="disclaimer"><CircleDollarSign size={14}/> All balances, prices, performance, and transactions are simulated for entertainment. No real money or live market prices.</p>
  </div>;
}