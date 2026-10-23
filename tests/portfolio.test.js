import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialAccount, readAccount, executeTrade, portfolioTotals, holdingCost } from '../src/services/portfolio.js';

test('repricing preserves purchase costs and compares returns against invested capital, not $10k', () => {
  const holdings = [{ playerId:'a',shares:10,avgCost:100 }];
  assert.deepEqual(portfolioTotals(holdings,[{id:'a',price:120}]),{cost:1000,value:1200,gain:200,returnPct:20});
  assert.deepEqual(portfolioTotals(holdings,[{id:'a',price:80}]),{cost:1000,value:800,gain:-200,returnPct:-20});
  assert.equal(holdings[0].avgCost,100);
});
test('buy locks execution price, updates weighted cost and survives serialization', () => {
  const opening={version:1,cash:1000,holdings:[{playerId:'a',shares:2,avgCost:100}],transactions:[]};
  const result=executeTrade(opening,'a','buy',2,150,'2026-10-23T19:00:00Z').account;
  assert.equal(result.cash,700); assert.equal(result.holdings[0].avgCost,125);
  assert.equal(holdingCost(result.holdings[0]),50000);
  const saved=readAccount(JSON.stringify(result));
  assert.equal(saved.transactions[0].price,150);
  assert.equal(saved.transactions[0].executedAt,'2026-10-23T19:00:00Z');
  assert.equal(portfolioTotals(saved.holdings,[{id:'a',price:200}]).gain,300);
  assert.equal(saved.transactions[0].price,150);
  assert.equal(opening.holdings[0].avgCost,100);
});
test('partial sell removes only sold cost; realized and remaining unrealized gains stay separate', () => {
  const opening={version:1,cash:0,holdings:[{playerId:'a',shares:4,avgCost:125,costBasisCents:50000}],transactions:[]};
  const result=executeTrade(opening,'a','sell',1,200).account;
  assert.equal(result.cash,200); assert.equal(holdingCost(result.holdings[0]),37500);
  assert.equal(result.transactions[0].realizedGain,75);
  assert.equal(portfolioTotals(result.holdings,[{id:'a',price:200}]).gain,225);
  const closed=executeTrade(result,'a','sell',3,200).account;
  assert.deepEqual(closed.holdings,[]);
  assert.deepEqual(portfolioTotals(closed.holdings,[]),{cost:0,value:0,gain:0,returnPct:0});
});
test('insufficient cash/shares, invalid side and fractional quantities do not mutate account', () => {
  const opening=initialAccount(); const before=JSON.stringify(opening);
  assert.ok(executeTrade(opening,'a','buy',1,10000).error);
  assert.ok(executeTrade(opening,'a','sell',1,100).error);
  assert.ok(executeTrade(opening,'a','buy',0.5,100).error);
  assert.ok(executeTrade(opening,'a','other',1,100).error);
  assert.equal(JSON.stringify(opening),before);
});
test('new account loads defaults; malformed storage fails without silently changing purchase costs', () => {
  assert.deepEqual(readAccount(null),initialAccount());
  assert.throws(()=>readAccount('{broken'));
  assert.throws(()=>readAccount(JSON.stringify({...initialAccount(),cash:-1})));
  assert.throws(()=>readAccount(JSON.stringify({...initialAccount(),holdings:[{playerId:'a',shares:1,avgCost:null}]})));
  const original=initialAccount(); assert.deepEqual(readAccount(JSON.stringify(original)),original);
});
