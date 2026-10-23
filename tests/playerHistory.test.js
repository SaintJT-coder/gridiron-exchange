import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fantasyPoints, priceHistory, readBoxscore, loadPlayerHistory } from '../src/services/playerHistory.js';

const final = { competitions: [{ status: { type: { completed: true } } }] };
const box = categories => ({ header: final, boxscore: { players: [{ statistics: categories }] } });
const category = (name, keys, stats, id = '7') => ({ name, keys, athletes: [{ athlete: { id }, stats }] });

test('PPR includes passing, rushing, receiving and lost fumbles without double counting', () => {
  assert.equal(fantasyPoints({ passingYards: 300, passingTouchdowns: 2, interceptions: 1, rushingYards: 30, rushingTouchdowns: 1, receptions: 2, receivingYards: 20, receivingTouchdowns: 1, fumblesLost: 1 }), 35);
  assert.equal(fantasyPoints({ rushingYards: -4 }), -0.4);
});
test('box score keys distinguish passing INT from defensive interceptions', () => {
  const result = readBoxscore(box([
    category('passing', ['passingYards', 'passingTouchdowns', 'interceptions'], ['250', '2', '1']),
    category('receiving', ['receptions', 'receivingYards'], ['4', '50']),
    category('fumbles', ['fumbles', 'fumblesLost'], ['2', '1']),
    category('interceptions', ['interceptions'], ['3']),
  ]), '7');
  assert.equal(result.points, 23);
});
test('unfinished games and absent players are excluded, missing stats fail visibly', () => {
  assert.equal(readBoxscore({ header: {} }, '7'), null);
  assert.equal(readBoxscore(box([category('passing', ['passingYards'], ['250'], '8')]), '7'), null);
  assert.throws(() => readBoxscore(box([category('passing', ['passingYards'], ['--'])]), '7'), /unavailable/);
  assert.throws(() => readBoxscore({ header: final }, '7'), /unavailable/);
});
test('price replay is chronological, bounded, rounded, and resets each season', () => {
  const history = priceHistory([
    { date: '2026-09-14', season: 2026, points: 0 },
    { date: '2025-12-20', season: 2025, points: 100 },
    { date: '2026-09-07', season: 2026, points: 100 },
  ], { price: 100, position: 'QB' });
  assert.deepEqual(history.map(g => g.price), [115, 115, 103.5]);
  assert.deepEqual(history.map(g => g.delta), [15, 15, -11.5]);
});
test('service crosses seasons, ignores preseason, uses completed appearances, and caches', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async url => {
    calls++;
    if (url.includes('gamelog')) {
      const season = url.includes('season=2026') ? 2026 : 2025;
      const ids = season === 2026 ? ['new'] : ['old1', 'old2', 'old3', 'old4', 'old5'];
      return { ok: true, json: async () => ({ seasonTypes: [{ categories: [{ splitType: '2', events: ids.map(eventId => ({ eventId })) }, { splitType: '1', events: [{ eventId: 'pre' }] }] }], events: Object.fromEntries(ids.map((id, i) => [id, { gameDate: `${season}-09-${String(7 + i).padStart(2, '0')}`, week: i + 1, opponent: { abbreviation: 'KC' } }])) }) };
    }
    return { ok: true, json: async () => box([category('passing', ['passingYards'], ['250'])]) };
  };
  try {
    const player = { espnId: '7', position: 'QB', price: 100 };
    const data = await loadPlayerHistory(player, new Date('2026-10-23'));
    assert.equal(data.games.length, 5);
    assert.equal(data.games[0].id, 'new');
    assert.equal(data.games[0].price, 95);
    const previousCalls = calls;
    await loadPlayerHistory(player, new Date('2026-10-23'));
    assert.equal(calls, previousCalls);
  } finally { globalThis.fetch = original; }
});
