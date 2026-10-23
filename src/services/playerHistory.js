// Public ESPN endpoints; no credentials or paid-provider keys in the browser.
const API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const LOG = 'https://site.web.api.espn.com/apis/common/v3/sports/football/nfl';
const cache = new Map();
const TTL = 5 * 60 * 1000;
export const baselines = { QB: 20, RB: 15, WR: 15, TE: 12 };
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;

async function json(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.time < TTL) return hit.promise;
  const promise = fetch(url, { signal: AbortSignal.timeout(15000) }).then(r => {
    if (!r.ok) throw new Error(`Stats provider returned ${r.status}. Please retry.`);
    return r.json();
  }).catch(error => { cache.delete(url); throw error; });
  cache.set(url, { time: Date.now(), promise });
  return promise;
}

export function fantasyPoints(stats) {
  return round((stats.passingYards || 0) / 25 + (stats.passingTouchdowns || 0) * 4
    - (stats.interceptions || 0) * 2 + (stats.rushingYards || 0) / 10
    + (stats.rushingTouchdowns || 0) * 6 + (stats.receivingYards || 0) / 10
    + (stats.receivingTouchdowns || 0) * 6 + (stats.receptions || 0)
    - (stats.fumblesLost || 0) * 2);
}

export function readBoxscore(payload, athleteId) {
  if (!payload.header?.competitions?.[0]?.status?.type?.completed) return null;
  if (!payload.boxscore?.players?.length) throw new Error('The completed game box score is unavailable. Please retry later.');
  const stats = {};
  let found = false;
  for (const team of payload.boxscore.players) {
    for (const category of team.statistics || []) {
      if (!['passing', 'rushing', 'receiving', 'fumbles'].includes(category.name)) continue;
      const line = category.athletes?.find(row => String(row.athlete.id) === String(athleteId));
      if (!line) continue;
      found = true;
      if (!category.keys?.length) throw new Error('The stats provider changed its box-score format.');
      category.keys.forEach((key, i) => {
        if (!['passingYards', 'passingTouchdowns', 'interceptions', 'rushingYards', 'rushingTouchdowns', 'receivingYards', 'receivingTouchdowns', 'receptions', 'fumblesLost'].includes(key)) return;
        const value = Number(String(line.stats[i]).replaceAll(',', ''));
        if (!Number.isFinite(value)) throw new Error('A required fantasy-scoring statistic is unavailable.');
        stats[key] = value;
      });
    }
  }
  // An absent athlete is a DNP, not a zero-point performance.
  return found ? { stats, points: fantasyPoints(stats) } : null;
}

export function priceHistory(games, player) {
  let price = player.price;
  let season;
  return [...games].sort((a, b) => new Date(a.date) - new Date(b.date)).map(game => {
    if (season !== game.season) { price = player.price; season = game.season; }
    const before = price;
    const baseline = baselines[player.position];
    // A fixed, disclosed benchmark avoids inventing historical projections.
    const change = Math.max(-15, Math.min(15, (game.points - baseline) * 0.5));
    price = Math.max(0.01, round(before * (1 + change / 100)));
    return { ...game, baseline, before, price, delta: round(price - before), change: round((price / before - 1) * 100) };
  });
}

async function seasonGames(player, season) {
  const log = await json(`${LOG}/athletes/${player.espnId}/gamelog?season=${season}`);
  if (!Array.isArray(log.seasonTypes) || !log.events || typeof log.events !== 'object') {
    throw new Error('The stats provider returned an unexpected game-log format.');
  }
  const ids = new Set(log.seasonTypes.flatMap(type => (type.categories || []).flatMap(category =>
    ['2', '3'].includes(String(category.splitType)) ? (category.events || []).map(event => String(event.eventId)) : [])));
  const events = [...ids].map(id => ({ id, ...log.events[id] })).filter(event =>
    event.gameDate && new Date(event.gameDate).getTime() <= Date.now());
  const results = [];
  // Limit concurrency; shared box scores are cached across player views.
  for (let i = 0; i < events.length; i += 4) {
    results.push(...await Promise.all(events.slice(i, i + 4).map(async event => {
      const payload = await json(`${API}/summary?event=${event.id}`);
      const score = readBoxscore(payload, player.espnId);
      return score && { id: event.id, season, date: event.gameDate, week: event.week,
        matchup: `${event.atVs || 'vs'} ${event.opponent?.abbreviation || 'Opponent'}`,
        result: `${event.gameResult || ''} ${event.score || ''}`.trim(), ...score };
    })));
  }
  return results.filter(Boolean);
}

export async function loadPlayerHistory(player, now = new Date()) {
  // NFL seasons run into the next calendar year.
  const season = now.getUTCMonth() < 7 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  let games = await seasonGames(player, season);
  if (games.length < 5) games = [...await seasonGames(player, season - 1), ...games];
  const history = priceHistory(games, player);
  return { games: history.slice(-5).reverse(), quote: history.at(-1), updatedAt: new Date().toISOString() };
}
