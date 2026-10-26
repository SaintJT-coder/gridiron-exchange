import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar.jsx';
import { loadSettledHistory as loadPlayerHistory } from '../services/market.js';

const points = value => Number.isFinite(value) ? `${value.toFixed(2)} FP` : 'Unavailable';
const money = n => Number.isFinite(n) ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'Unavailable';
export function PlayerDetails({ player, onClose, onQuote }) {
  const [state, setState] = useState({ loading: true });
  const [attempt, setAttempt] = useState(0);
  const dialog = useRef(null);
  const close = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const root = document.getElementById('root');
    const wasInert = root?.inert;
    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';
    close.current?.focus();
    const key = event => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const nodes = [...dialog.current.querySelectorAll('button, a[href], summary, [tabindex="0"]')].filter(n => !n.disabled);
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = overflow; if (root) root.inert = wasInert; previous?.focus(); };
  }, [onClose]);
  useEffect(() => {
    let active = true;
    setState({ loading: true });
    loadPlayerHistory(player).then(data => {
      if (!active) return;
      setState({ data });
      if (data.quote) onQuote(player.id, data.quote);
    }).catch(error => { if (active) setState({ error: error.message || 'Could not load player stats.' }); });
    return () => { active = false; };
  }, [player, attempt, onQuote]);
  const data = state.data;
  const scoredGames = data?.games.filter(g => Number.isFinite(g.points)) || [];
  const average = scoredGames.length ? scoredGames.reduce((sum, g) => sum + g.points, 0) / scoredGames.length : null;
  return createPortal(<div className="player-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialog} className="player-dialog" role="dialog" aria-modal="true" aria-labelledby="player-title">
      <header className="player-detail-header"><div className="table-player"><PlayerAvatar player={player} size="lg"/><div><p className="eyebrow">PLAYER PERFORMANCE</p><h1 id="player-title">{player.name}</h1><p className="muted">{player.position} · Live game stats / simulated stock</p></div></div><button ref={close} className="detail-close" onClick={onClose} aria-label="Close player details"><X/></button></header>
      <div aria-live="polite" aria-busy={!!state.loading}>
        {state.loading && <p className="detail-status">Loading completed games and box scores from ESPN…</p>}
        {state.error && <div className="detail-status" role="alert"><p>{state.error}</p><p className="muted">No invented game results are shown. Check your connection and try again.</p><button className="trade-btn" onClick={() => setAttempt(n => n + 1)}><RefreshCw size={14}/> Retry</button></div>}
        {data && !data.games.length && <p className="detail-status">No completed player appearances were found in this season or the previous season.</p>}
        {data?.games.length > 0 && <>
          <div className="detail-metrics"><div><span>Simulated share price</span><strong>{money(data.quote.price)}</strong><small>Shared settled market · {data.quote.complete ? 'Complete history' : 'Settlement pending'}</small></div><div><span>Last {data.games.length} average</span><strong>{points(average)}</strong><small>ESPN full PPR · {scoredGames.length} scored games</small></div><div><span>Latest game move</span><strong className={data.quote.delta >= 0 ? 'positive' : 'negative'}>{!Number.isFinite(data.quote.change) ? 'Unavailable' : `${data.quote.change >= 0 ? '+' : ''}${data.quote.change.toFixed(2)}%`}</strong><small>{points(data.quote.points)} vs {points(data.quote.baseline)} projected</small></div></div>
          {data.block && <p className="notice-box">{data.block}</p>}
          <h2>Last {data.games.length} games played</h2><p className="muted small">Most recent first · byes, DNPs and unfinished games excluded</p>
          {data.games.length < 5 && <p className="muted">Only {data.games.length} completed appearances are available.</p>}
          <div className="table-scroll detail-table"><table><thead><tr><th>Game</th><th>ESPN full PPR</th><th>ESPN projection</th><th>Price before → after</th><th>Price impact</th></tr></thead><tbody>{data.games.map(game => <tr key={game.id}><td><a href={`https://www.espn.com/nfl/boxscore/_/gameId/${game.id}`} target="_blank" rel="noreferrer">{game.matchup}</a><span className="game-subline">{new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Wk {game.week} · {game.result}</span></td><td><strong>{points(game.points)}</strong><span className="fp-bar" style={{ width: `${Math.min(100, Math.max(0, game.points) * 2)}%` }}/></td><td>{points(game.baseline)}<span className="game-subline">{game.projectionSource === 'pregame' ? 'Captured before kickoff' : 'Historical record'}</span></td><td>{money(game.before)} → {money(game.price)}</td><td className={game.delta >= 0 ? 'positive' : 'negative'}>{!Number.isFinite(game.delta) ? 'Not applied' : `${game.delta >= 0 ? '+' : ''}${money(game.delta)}`}<span className="game-subline">{!Number.isFinite(game.change) ? 'ESPN data unavailable' : `${game.change >= 0 ? '+' : ''}${game.change.toFixed(2)}%`}</span></td></tr>)}</tbody></table></div>
          <p className="muted small">Source: ESPN Fantasy full-PPR scored totals and weekly projections · fetched {new Date(data.updatedAt).toLocaleTimeString()} · shared market ledger.</p>
        </>}
      </div>
      <details className="scoring-notes"><summary>How fantasy points affect price</summary><p>Actual points and weekly benchmarks come directly from ESPN Fantasy’s default full-PPR scoring preset. This includes receptions, yardage, touchdowns, two-point conversions, return/recovery touchdowns and turnovers under ESPN’s rules.</p><p>Projections are captured by the shared updater before kickoff. Once a game settles, its points, benchmark and simulated price are recorded permanently. Older games imported when this market launched are labeled historical records; they are not claimed to be pregame snapshots.</p><p>Each point above/below the captured full-PPR projection moves price by 0.5%, capped at ±15%. Prices carry forward across seasons. Missing actuals or projections pause settlement and trading; later games cannot silently skip a missing result.</p><p>Trading pauses during a game, after scheduled kickoff until settlement, or when the market update is more than 20 minutes old. Postseason games without full-PPR projections remain pending. Prices and balances are a paper simulation.</p><p>Inspired by PredictionStrike’s performance-linked player stocks. This app uses its own scoring and pricing rules; fan demand is not modeled. Game data is fetched on demand, not continuously streamed.</p></details>
    </section>
  </div>, document.body);
}
