// Public ESPN endpoints; no credentials or paid-provider keys in the browser.
const API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const LOG = 'https://site.web.api.espn.com/apis/common/v3/sports/football/nfl';
const cache = new Map();
const TTL = 5 * 60 * 1000;
const FANTASY = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons';
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;

async function json(url, headers = {}) {
  const key = url + JSON.stringify(headers);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < TTL) return hit.promise;
  const promise = fetch(url, { headers, signal: AbortSignal.timeout(15000) }).then(r => {
    if (!r.ok) throw new Error(`Stats provider returned ${r.status}. Please retry.`);
    return r.json();
  }).catch(error => { cache.delete(key); throw error; });
  cache.set(key, { time: Date.now(), promise });
  return promise;
}

// appliedTotal is calculated by ESPN using its default full-PPR preset (3).
// Match all dimensions; season totals, future weeks and other players cannot substitute.
export function readFantasyWeek(payload, athleteId, season, week, seasonType = '2') {
  if (String(seasonType) !== '2') return { points: null, baseline: null };
  const player = payload.players?.find(row => String(row.player?.id) === String(athleteId))?.player;
  const entries = player?.stats || [];
  const value = source => {
    const rows = entries.filter(row => Number(row.seasonId) === Number(season)
      && Number(row.scoringPeriodId) === Number(week) && Number(row.statSplitTypeId) === 1
      && Number(row.statSourceId) === source);
    if (rows.length !== 1) return null;
    const total = rows[0].appliedTotal;
    return typeof total === 'number' && Number.isFinite(total) ? total : null;
  };
  return { points: value(0), baseline: value(1) };
}

export function hasAppearance(payload, athleteId) {
  if (!payload.header?.competitions?.[0]?.status?.type?.completed) return false;
  if (!payload.boxscore?.players?.length) throw new Error('The completed game box score is unavailable. Please retry later.');
  return payload.boxscore.players.some(team => (team.statistics || []).some(category =>
    ['passing', 'rushing', 'receiving', 'fumbles', 'kickReturns', 'puntReturns'].includes(category.name)
    && category.athletes?.some(row => String(row.athlete.id) === String(athleteId))));
}

export function priceHistory(games, player) {
  let price = player.price;
  let season;
  return [...games].sort((a, b) => new Date(a.date) - new Date(b.date)).map(game => {
    if (season !== game.season) { price = player.price; season = game.season; }
    const before = price;
    const baseline = game.baseline;
    const available = Number.isFinite(game.points) && Number.isFinite(baseline);
    // Never substitute a fixed position target for missing ESPN data.
    const change = available ? Math.max(-15, Math.min(15, (game.points - baseline) * 0.5)) : null;
    if (available) price = Math.max(0.01, round(before * (1 + change / 100)));
    return { ...game, baseline, before, price, delta: available ? round(price - before) : null, change: available ? round((price / before - 1) * 100) : null };
  });
}

async function seasonGames(player, season) {
  const log = await json(`${LOG}/athletes/${player.espnId}/gamelog?season=${season}`);
  if (!Array.isArray(log.seasonTypes) || !log.events || typeof log.events !== 'object') {
    throw new Error('The stats provider returned an unexpected game-log format.');
  }
  const ids = new Map(log.seasonTypes.flatMap(type => (type.categories || []).flatMap(category =>
    ['2', '3'].includes(String(category.splitType)) ? (category.events || []).map(event => [String(event.eventId), String(category.splitType)]) : [])));
  const events = [...ids].map(([id, seasonType]) => ({ ...log.events[id], id, seasonType })).filter(event =>
    event.gameDate && new Date(event.gameDate).getTime() <= Date.now());
  const filter = JSON.stringify({ players: { filterIds: { value: [Number(player.espnId)] }, filterStatsForSourceIds: { value: [0, 1] }, filterStatsForSplitTypeIds: { value: [1] } } });
  let fantasy;
  try {
    fantasy = await json(`${FANTASY}/${season}/segments/0/leaguedefaults/3?view=kona_playercard`, { 'x-fantasy-filter': filter });
    if (!Array.isArray(fantasy.players)) throw new Error('Unexpected fantasy response');
  } catch {
    // Game history remains visible; missing ESPN totals/projections are marked explicitly.
    fantasy = { players: [] };
  }
  const results = [];
  // Limit concurrency; shared box scores are cached across player views.
  for (let i = 0; i < events.length; i += 4) {
    results.push(...await Promise.all(events.slice(i, i + 4).map(async event => {
      const payload = await json(`${API}/summary?event=${event.id}`);
      const appearance = hasAppearance(payload, player.espnId);
      const score = readFantasyWeek(fantasy, player.espnId, season, event.week, event.seasonType);
      return appearance && { id: event.id, season, date: event.gameDate, week: event.week,
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
