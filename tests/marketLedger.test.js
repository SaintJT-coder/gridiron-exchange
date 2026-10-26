import {test} from 'node:test';
import assert from 'node:assert/strict';
import {settlePlayer,captureProjections,tradingBlock,MARKET_MAX_AGE,verifyIdentity} from '../src/services/marketLedger.js';
const player={id:'patrick-mahomes',price:100,teamId:'12'};
const game=(id,date,points=30,baseline=20)=>({id,date,points,baseline,season:2026,week:1});
test('settled actuals, projections and prices cannot be rewritten by provider revisions',()=>{
  const first=settlePlayer(null,player,[game('g1','2026-09-01T20:00:00Z')],{},'2026-09-02T00:00:00Z',true);
  assert.equal(first.price,105);
  const later=settlePlayer(first,player,[game('g1','2026-09-01T20:00:00Z',100,0)],{},'2026-09-03T00:00:00Z');
  assert.equal(later.price,105);assert.deepEqual(later.history,first.history);
});
test('prices carry across seasons and duplicate refreshes cannot settle twice',()=>{
  const first=settlePlayer(null,player,[game('g1','2026-12-01T20:00:00Z')],{},'2026-12-02T00:00:00Z',true);
  const g2={...game('g2','2027-09-01T20:00:00Z'),season:2027};
  const snapshot={g2:{value:20,capturedAt:'2027-09-01T19:00:00Z'}};
  const second=settlePlayer(first,player,[g2],snapshot,'2027-09-02T00:00:00Z');
  assert.equal(second.price,110.25);
  assert.equal(settlePlayer(second,player,[g2],snapshot,'2027-09-03T00:00:00Z').price,110.25);
});
test('missing earlier games prevent later settlement until explicit backfill',()=>{
  const games=[game('g1','2026-09-01T20:00:00Z',30,null),game('g2','2026-09-08T20:00:00Z')];
  const first=settlePlayer(null,player,games,{},'2026-09-09T00:00:00Z',true);
  assert.equal(first.price,100);assert.equal(first.complete,false);assert.ok(first.history.every(g=>g.settlement==='pending'));
  const repaired=settlePlayer(first,player,[{...games[0],baseline:20},games[1]],{},'2026-09-10T00:00:00Z',true);
  assert.equal(repaired.price,110.25);assert.equal(repaired.complete,true);
});
test('projections can only be captured before kickoff and late snapshots are rejected',()=>{
  const events=[{id:'g1',date:'2026-09-01T20:00:00Z',state:'pre',season:2026,week:1}];
  assert.equal(captureProjections({},events,()=>20,'2026-09-01T19:00:00Z').g1.value,20);
  assert.deepEqual(captureProjections({},events,()=>20,'2026-09-01T20:00:00Z'),{});
  const late=settlePlayer(null,player,[game('g1',events[0].date)],{g1:{value:20,capturedAt:'2026-09-01T21:00:00Z'}},'2026-09-02T00:00:00Z');
  assert.equal(late.complete,false);assert.equal(late.price,100);
});
test('stale data, live games, passed kickoffs, incomplete histories and unprocessed finals pause trading',()=>{
  const now=Date.parse('2026-09-01T20:00:00Z');
  const p={...player,complete:true,checkedThrough:'2026-09-01T19:00:00Z'};
  const future={teams:['12','7'],date:'2026-09-02T20:00:00Z',state:'pre',completed:false};
  const market={generatedAt:'2026-09-01T19:59:00Z',schedule:[future]};
  assert.equal(tradingBlock(market,p,now),'');
  assert.match(tradingBlock(market,p,now+MARKET_MAX_AGE),/overdue/);
  assert.match(tradingBlock(market,{...p,complete:false},now),/incomplete/);
  assert.match(tradingBlock({...market,schedule:[{...future,state:'in'}]},p,now),/live/);
  assert.match(tradingBlock({...market,schedule:[{...future,date:'2026-09-01T19:30:00Z'}]},p,now),/live/);
  assert.match(tradingBlock({...market,schedule:[{...future,date:'2026-09-01T19:30:00Z',completed:true,state:'post'}]},p,now),/awaiting/);
});

test('athlete identity cannot silently switch to another ESPN player',()=>{
 assert.doesNotThrow(()=>verifyIdentity({name:'Tee Higgins',espnId:'4239993'},{id:'4239993',displayName:'Tee Higgins'}));
 assert.throws(()=>verifyIdentity({name:'Tee Higgins',espnId:'4239996'},{id:'4239996',displayName:'Travis Etienne Jr.'}),/mismatch/);
});
