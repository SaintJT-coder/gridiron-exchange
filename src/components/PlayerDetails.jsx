import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar.jsx';
import { loadPlayerHistory } from '../services/playerHistory.js';

const money = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
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
  const average = data?.games.length ? data.games.reduce((sum, g) => sum + g.points, 0) / data.games.length : 0;
  return createPortal(<div className="player-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialog} className="player-dialog" role="dialog" aria-modal="true" aria-labelledby="player-title">
      <header className="player-detail-header"><div className="table-player"><PlayerAvatar player={player} size="lg"/><div><p className="eyebrow">PLAYER PERFORMANCE</p><h1 id="player-title">{player.name}</h1><p className="muted">{player.position} · Live game stats / simulated stock</p></div></div><button ref={close} className="detail-close" onClick={onClose} aria-label="Close player details"><X/></button></header>
      <div aria-live="polite" aria-busy={!!state.loading}>
        {state.loading && <p className="detail-status">Loading completed games and box scores from ESPN…</p>}
        {state.error && <div className="detail-status" role="alert"><p>{state.error}</p><p className="muted">No invented game results are shown. Check your connection and try again.</p><button className="trade-btn" onClick={() => setAttempt(n => n + 1)}><RefreshCw size={14}/> Retry</button></div>}
        {data && !data.games.length && <p className="detail-status">No completed player appearances were found in this season or the previous season.</p>}
        {data?.games.length > 0 && <>
          <div className="detail-metrics"><div><span>Simulated share price</span><strong>{money(data.quote.price)}</strong><small>Replayed from season seed: {money(player.price)}</small></div><div><span>Last {data.games.length} average</span><strong>{average.toFixed(2)} FP</strong><small>Gridiron PPR scoring</small></div><div><span>Latest game move</span><strong className={data.quote.delta >= 0 ? 'positive' : 'negative'}>{data.quote.change >= 0 ? '+' : ''}{data.quote.change.toFixed(2)}%</strong><small>{data.quote.points.toFixed(2)} FP vs {data.quote.baseline} benchmark</small></div></div>
          <h2>Last {data.games.length} games played</h2><p className="muted small">Most recent first · byes, DNPs and unfinished games excluded</p>
          {data.games.length < 5 && <p className="muted">Only {data.games.length} completed appearances are available.</p>}
          <div className="table-scroll detail-table"><table><thead><tr><th>Game</th><th>Fantasy points</th><th>Benchmark</th><th>Price before → after</th><th>Price impact</th></tr></thead><tbody>{data.games.map(game => <tr key={game.id}><td><a href={`https://www.espn.com/nfl/boxscore/_/gameId/${game.id}`} target="_blank" rel="noreferrer">{game.matchup}</a><span className="game-subline">{new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Wk {game.week} · {game.result}</span></td><td><strong>{game.points.toFixed(2)}</strong><span className="fp-bar" style={{ width: `${Math.min(100, Math.max(0, game.points) * 2)}%` }}/></td><td>{game.baseline.toFixed(2)} FP</td><td>{money(game.before)} → {money(game.price)}</td><td className={game.delta >= 0 ? 'positive' : 'negative'}>{game.delta >= 0 ? '+' : ''}{money(game.delta)}<span className="game-subline">{game.change >= 0 ? '+' : ''}{game.change.toFixed(2)}%</span></td></tr>)}</tbody></table></div>
          <p className="muted small">Source: ESPN completed box scores · fetched {new Date(data.updatedAt).toLocaleTimeString()} · refreshes after five minutes on reopening.</p>
        </>}
      </div>
      <details className="scoring-notes"><summary>How fantasy points affect price</summary><p>Gridiron PPR: 1 point per reception, 1 per 10 rushing/receiving yards, 1 per 25 passing yards, 4 per passing touchdown, 6 per rushing/receiving touchdown, −2 per interception and lost fumble. Two-point conversions, return touchdowns and bonuses are excluded.</p><p>Each point above or below the fixed position benchmark moves the simulated price by 0.5%, capped at ±15% per game. Benchmarks: QB 20, RB/WR 15, TE 12. These are game rules, not provider projections.</p><p>Prices replay chronologically from the demo seed at each season’s start, including all available regular-season and playoff appearances. The latest calculated price is used for this player’s paper trades and portfolio valuation after loading. Older seasons reset to their seed. These are reconstructed simulation prices, not recorded historical trades.</p><p>Inspired by PredictionStrike’s performance-linked player stocks. This app uses its own scoring and pricing rules; fan demand is not modeled. Game data is fetched on demand, not continuously streamed.</p></details>
    </section>
  </div>, document.body);
}
