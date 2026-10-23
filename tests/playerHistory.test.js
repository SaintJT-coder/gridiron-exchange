import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFantasyWeek, hasAppearance, priceHistory, loadPlayerHistory } from '../src/services/playerHistory.js';

const entry = (source, total, extra = {}) => ({ seasonId: 2026, scoringPeriodId: 1, statSourceId: source, statSplitTypeId: 1, appliedTotal: total, ...extra });
const response = stats => ({ players: [{ player: { id: 4262921, stats } }] });
const final = { competitions: [{ status: { type: { completed: true } } }] };
const box = id => ({ header: final, boxscore: { players: [{ statistics: [{ name: 'receiving', athletes: [{ athlete: { id } }] }] }] } });

test('uses ESPN full-PPR total and player weekly projection, including conversion points', () => {
  // ESPN preset 3 live response: Jefferson 2026 W1 = 31.2, not the old 29.2 approximation.
  assert.deepEqual(readFantasyWeek(response([entry(0,31.2), entry(1,17.08263745)]),4262921,2026,1), { points:31.2, baseline:17.08263745 });
});
test('never confuses season, player, week, source, season totals or postseason', () => {
  const payload = response([entry(0,31.2),entry(1,17.08),entry(1,999,{seasonId:2025}),entry(1,888,{scoringPeriodId:2}),entry(1,777,{statSplitTypeId:0})]);
  assert.equal(readFantasyWeek(payload,4262921,2026,1).baseline,17.08);
  assert.deepEqual(readFantasyWeek(payload,7,2026,1),{points:null,baseline:null});
  assert.deepEqual(readFantasyWeek(payload,4262921,2026,1,'3'),{points:null,baseline:null});
});
test('zero is valid; missing, nonfinite or duplicate ESPN totals remain unavailable', () => {
  assert.deepEqual(readFantasyWeek(response([entry(0,0),entry(1,0)]),4262921,2026,1),{points:0,baseline:0});
  assert.equal(readFantasyWeek(response([entry(0,31.2)]),4262921,2026,1).baseline,null);
  assert.equal(readFantasyWeek(response([entry(1,null)]),4262921,2026,1).baseline,null);
  assert.equal(readFantasyWeek(response([entry(1,Infinity)]),4262921,2026,1).baseline,null);
  assert.equal(readFantasyWeek(response([entry(1,10),entry(1,12)]),4262921,2026,1).baseline,null);
});
test('completed appearances exclude DNPs and unfinished games', () => {
  assert.equal(hasAppearance(box(4262921),4262921),true);
  assert.equal(hasAppearance(box(7),4262921),false);
  assert.equal(hasAppearance({header:{}},4262921),false);
  assert.throws(()=>hasAppearance({header:final},4262921),/unavailable/);
});
test('price uses precise ESPN projection and holds when data is missing', () => {
  const games = [
    {date:'2026-09-01',season:2026,points:31.2,baseline:17.08263745},
    {date:'2026-09-08',season:2026,points:30,baseline:null},
    {date:'2026-09-15',season:2026,points:null,baseline:20},
    {date:'2026-09-22',season:2026,points:100,baseline:20},
    {date:'2026-09-29',season:2026,points:-20,baseline:20},
    {date:'2027-09-01',season:2027,points:20,baseline:20},
  ];
  const rows=priceHistory(games,{price:100});
  assert.equal(rows[0].price,107.06);
  assert.equal(rows[1].price,107.06); assert.equal(rows[1].delta,null);
  assert.equal(rows[2].change,null);
  assert.equal(rows[3].price,123.12); assert.equal(rows[4].price,104.65);
  assert.equal(rows[5].price,100);
});
test('integration matches fantasy season/week, falls back across seasons, caches with player filters', async () => {
  const original = globalThis.fetch; let calls=0;
  globalThis.fetch=async (url, options) => {
    calls++;
    if(url.includes('leaguedefaults')) {
      const id=JSON.parse(options.headers['x-fantasy-filter']).players.filterIds.value[0];
      const season=url.includes('/2026/')?2026:2025;
      return {ok:true,json:async()=>({players:[{player:{id,stats:Array.from({length:5},(_,i)=>[entry(0,31.2,{seasonId:season,scoringPeriodId:i+1}),entry(1,id===4262921?17.08:10,{seasonId:season,scoringPeriodId:i+1})]).flat()}}]})};
    }
    if(url.includes('gamelog')) {
      const season=url.includes('season=2026')?2026:2025;const ids=season===2026?['new']:['old1','old2','old3','old4','old5'];
      return {ok:true,json:async()=>({seasonTypes:[{categories:[{splitType:'2',events:ids.map(eventId=>({eventId}))},{splitType:'1',events:[{eventId:'pre'}]}]}],events:Object.fromEntries(ids.map((id,i)=>[id,{gameDate:season+'-09-'+String(7+i).padStart(2,'0'),week:i+1,opponent:{abbreviation:'KC'}}]))})};
    }
    return {ok:true,json:async()=>({header:final,boxscore:{players:[{statistics:[{name:'receiving',athletes:[{athlete:{id:4262921}},{athlete:{id:7}}]}]}]}})};
  };
  try {
    const p={espnId:'4262921',price:100}; const data=await loadPlayerHistory(p,new Date('2026-10-23'));
    assert.equal(data.games.length,5); assert.equal(data.games[0].id,'new'); assert.equal(data.games[0].baseline,17.08);
    const previous=calls;await loadPlayerHistory(p,new Date('2026-10-23'));assert.equal(calls,previous);
    const second=await loadPlayerHistory({...p,espnId:'7'},new Date('2026-10-23'));assert.equal(second.games[0].baseline,10);
  } finally {globalThis.fetch=original;}
});
