const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
export const MARKET_MAX_AGE = 20 * 60 * 1000;

// Append-only settlements: subsequent provider revisions cannot rewrite a price.
export function settlePlayer(previous, player, games, snapshots, now, allowHistorical = false) {
  const old = previous || { price: player.price, history: [], snapshots: {} };
  const history = [...old.history];
  let price = old.price;
  let incomplete = history.some(g => g.settlement !== 'settled');
  const locked = { ...old.snapshots, ...snapshots };
  for (const game of [...games].sort((a,b) => Date.parse(a.date)-Date.parse(b.date))) {
    const existing = history.find(g => g.id === game.id);
    if (existing?.settlement === 'settled') continue;
    const candidate = locked[game.id];
    const snapshot = candidate && Number.isFinite(candidate.value)
      && Date.parse(candidate.capturedAt) < Date.parse(game.date) ? candidate : null;
    const baseline = snapshot?.value ?? (allowHistorical ? game.baseline : null);
    const provenance = snapshot ? 'pregame' : 'historical-bootstrap';
    const laterSettled = history.some(g => g.settlement === 'settled' && Date.parse(g.date) > Date.parse(game.date));
    const earlierBlocked = history.some(g => g.settlement !== 'settled' && Date.parse(g.date) < Date.parse(game.date));
    const valid = Number.isFinite(game.points) && Number.isFinite(baseline) && !earlierBlocked && !laterSettled;
    const before = price;
    const move = valid ? Math.max(-15, Math.min(15,(game.points-baseline)*0.5)) : null;
    if (valid) price = Math.max(.01,round(price*(1+move/100)));
    const row = { ...game, baseline, before, price, delta:valid?round(price-before):null,
      change:valid?round((price/before-1)*100):null, settlement:valid?'settled':'pending',
      projectionSource:provenance, projectionCapturedAt:snapshot?.capturedAt || now,
      settledAt:valid?now:null };
    if (existing) history.splice(history.indexOf(existing),1,row); else history.push(row);
  }
  history.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
  incomplete=history.some(g=>g.settlement!=='settled');
  const latest=history.filter(g=>g.settlement==='settled').at(-1);
  return { ...player, price, history, snapshots:locked, complete:!incomplete && !!latest,
    change:latest?.change ?? null, quoteDate:latest?.date || null };
}

export function captureProjections(previous = {}, events, values, now) {
  const snapshots={...previous};
  for(const event of events) {
    if(event.completed || event.state!=='pre' || Date.parse(event.date)<=Date.parse(now)) continue;
    const value=values(event);
    if(Number.isFinite(value)) snapshots[event.id]={value,capturedAt:now,season:event.season,week:event.week};
  }
  return snapshots;
}

export function tradingBlock(market, player, now = Date.now()) {
  const time=Date.parse(market?.generatedAt);
  if(!Number.isFinite(time) || now-time>MARKET_MAX_AGE || time>now+60000) return 'Market update is overdue. Trading is paused until fresh data arrives.';
  if(!player?.complete) return 'Pricing history is incomplete. Trading is paused until the missing game is settled.';
  if(player.error) return 'Player data could not be verified. Trading is paused.';
  const relevant=(market.schedule || []).filter(g=>g.teams.includes(player.teamId));
  if(!relevant.length) return 'No verified schedule is available for this player.';
  if(relevant.some(g=>!g.completed && (g.state==='in' || Date.parse(g.date)<=now))) return 'This player’s game is live or awaiting settlement. Trading is paused.';
  if(relevant.some(g=>g.completed && Date.parse(g.date)>Date.parse(player.checkedThrough || 0))) return 'A completed game is awaiting a verified settlement.';
  return '';
}

export function verifyIdentity(player,profile) {
 const normalize=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
 if(String(profile?.id)!==String(player.espnId)||normalize(profile?.displayName)!==normalize(player.name)) throw new Error('ESPN identity mismatch; this player is paused for review.');
}
