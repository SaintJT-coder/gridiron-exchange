import test from 'node:test';
import assert from 'node:assert/strict';
import { settleFantasyPrice, calculateTradeImpact, isTradeLocked } from '../src/lib/marketMath.js';

test('fantasy overperformance and underperformance are proportional', () => {
  assert.equal(settleFantasyPrice(10000, 20, 30).priceCents, 15000);
  assert.equal(settleFantasyPrice(10000, 20, 10).priceCents, 5000);
});
test('zero or negative actual scores respect the penny floor', () => {
  assert.equal(settleFantasyPrice(10000, 20, 0).priceCents, 1);
  assert.equal(settleFantasyPrice(10000, 20, -2).priceCents, 1);
});
test('missing or zero projections freeze price', () => {
  assert.equal(settleFantasyPrice(10000, 0, 20).status, 'frozen_missing_projection');
  assert.equal(settleFantasyPrice(10000, NaN, 20).priceCents, 10000);
});
test('buys raise prices and sells lower prices', () => {
  assert.ok(calculateTradeImpact(10000, 1000000, 10000, 'buy').priceCents > 10000);
  assert.ok(calculateTradeImpact(10000, 1000000, 10000, 'sell').priceCents < 10000);
});
test('trading locks exactly ten minutes before kickoff', () => {
  const kickoff = 2000000000000;
  assert.equal(isTradeLocked(kickoff, kickoff - 600001, false), false);
  assert.equal(isTradeLocked(kickoff, kickoff - 600000, false), true);
  assert.equal(isTradeLocked(kickoff, kickoff + 1000, false), true);
  assert.equal(isTradeLocked(kickoff, kickoff + 1000, true), false);
});
