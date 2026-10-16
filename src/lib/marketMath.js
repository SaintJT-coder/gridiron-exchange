// Pure market calculations. Prices are fictional USD cents; shares are integer microshares.
// Keep authoritative calculations on the server when Firebase trading is implemented.
export const SHARE_SCALE = 1_000_000n;
export const MIN_PRICE_CENTS = 1n;

export function settleFantasyPrice(priceCents, projectedPoints, actualPoints) {
  if (!Number.isSafeInteger(priceCents) || priceCents < 1) throw new Error('Invalid price');
  if (!Number.isFinite(projectedPoints) || projectedPoints <= 0) {
    return { priceCents, status: 'frozen_missing_projection' };
  }
  if (!Number.isFinite(actualPoints)) return { priceCents, status: 'pending_actual' };
  // The exact proportional percentage is used, subject only to cent rounding and $0.01 floor.
  const ratio = Math.max(0, actualPoints) / projectedPoints;
  const result = Math.max(1, Math.round(priceCents * ratio));
  if (!Number.isSafeInteger(result)) throw new Error('Price overflow');
  return { priceCents: result, status: 'settled' };
}

export function calculateTradeImpact(priceCents, sharesMicros, liquidityDollars, side) {
  if (!Number.isSafeInteger(priceCents) || priceCents < 1) throw new Error('Invalid price');
  if (!Number.isSafeInteger(sharesMicros) || sharesMicros <= 0) throw new Error('Invalid shares');
  if (!Number.isFinite(liquidityDollars) || liquidityDollars <= 0) throw new Error('Invalid liquidity');
  if (!['buy', 'sell'].includes(side)) throw new Error('Invalid side');
  // First-phase illustrative linear price-impact curve; tune and test before live activation.
  // Impact = signed trade notional / liquidity. No fantasy-performance cap is applied.
  const notionalDollars = priceCents / 100 * sharesMicros / Number(SHARE_SCALE);
  const change = (side === 'buy' ? 1 : -1) * notionalDollars / liquidityDollars;
  const newPrice = Math.max(1, Math.round(priceCents * (1 + change)));
  if (!Number.isSafeInteger(newPrice)) throw new Error('Price overflow');
  return { priceCents: newPrice, impactPercent: change * 100 };
}

export function isTradeLocked(kickoffEpochMs, nowEpochMs, settlementComplete) {
  if (!Number.isFinite(kickoffEpochMs) || !Number.isFinite(nowEpochMs)) return true;
  return nowEpochMs >= kickoffEpochMs - 10 * 60 * 1000 && !settlementComplete;
}
