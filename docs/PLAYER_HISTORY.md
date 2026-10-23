# ESPN full-PPR player history

Click a player in the market, movers, watchlist, holdings or transactions. The last five completed appearances show ESPN Fantasy full-PPR actual points, that player's weekly ESPN projection, and reconstructed simulation-price changes.

## Sources

- Game log: https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/{espnId}/gamelog?season={year}
- Completed appearances: https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={eventId}
- Fantasy actuals and projections: https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leaguedefaults/3?view=kona_playercard

The fantasy request uses x-fantasy-filter to select the ESPN athlete ID, source IDs 0 (actual) and 1 (projection), and weekly split type 1. The endpoint's preset 3 is ESPN default full PPR. The adapter reads ESPN's appliedTotal directly, matching athlete ID, seasonId, scoringPeriodId and statSplitTypeId. It never substitutes a season total, another player's projection, or a fixed position benchmark. Exact provider precision is retained for pricing; display rounds to two decimals.

Actual and projected scores both use ESPN's full-PPR preset, including two-point conversions, return/recovery touchdowns and turnovers. No partial box-score calculator is used. ESPN's rules: https://support.espn.com/hc/en-us/articles/360003914032-Scoring-Formats . Custom league settings can differ.

Live validation examples: Justin Jefferson 2026 week 1 scores 31.20 full-PPR points (including a two-point conversion), projected 17.08263745. Patrick Mahomes 2026 week 6 scores 10.48, projected 18.77409043. Retrieved projections are historical values currently returned by ESPN, not independently verified snapshots frozen at kickoff. Provider revisions can change a reconstruction.

These public endpoints are unofficial and have no availability contract. CORS GET and x-fantasy-filter preflight were verified for the published origin. No API key or account is required. For a production provider requiring a key, use a server endpoint. Never place a private key in a browser bundle.

## Missing data and seasons

NFL regular-season weeks map to ESPN fantasy scoring periods. Postseason games remain visible but have unavailable fantasy values rather than incorrectly matching playoff week 1 to regular-season fantasy week 1. Missing or ambiguous actuals/projections show Unavailable. No price adjustment is applied for that appearance, and the price carries forward. A failed fantasy request still permits viewing the game log without fabricated values.

Current-season appearances are loaded first, with previous-season fallback when fewer than five are available. Preseason, unfinished games, DNPs and byes are excluded. Up to four box-score requests run at once, with 15-second timeouts and a five-minute in-memory cache keyed by URL plus filters, so one player's projections cannot leak into another's cache entry.

## Simulation pricing

Each point above/below the matching ESPN weekly full-PPR projection moves price by 0.5%, capped at plus/minus 15% per game. No fixed QB/RB/WR/TE benchmarks remain. Price replays chronologically from the existing demo seed each season, rounding to cents with a $0.01 floor. Missing data holds price without claiming a measured zero-percent impact. These are reconstructed game prices, not recorded market trades or PredictionStrike prices. Fan demand is not modeled.

A loaded player's quote feeds market lists, paper trades and portfolio valuations. Unheld, unopened players retain labeled demo seeds. Quotes reload from ESPN after refresh; paper holdings, execution records and purchase costs persist in this browser. The app is still an on-demand prototype rather than a synchronized exchange. Existing Firebase work stays on its separate branch.

## Validation

npm test covers exact ESPN totals/projections, two-point-conversion regression, season/week/player/source matching, duplicate/missing/zero values, postseason isolation, completed appearances, price caps, season resets, fallback and per-player caching. npm run build verifies the production bundle. Live checks cover a QB and a WR.

## Portfolio purchase comparisons

Held players refresh automatically on app opening, focus and every five minutes, two players at a time. The Portfolio page has a Refresh prices button. Partial/failed refreshes are labeled estimates with each position's quote status. Opening quote failures never alter holdings or their purchase costs. Trade execution verifies a stats-based quote and blocks when no price can be verified.

Unrealized gain/loss = current value of remaining shares minus their recorded cost basis. Return percentage divides that gain by the recorded cost of remaining shares, not a fixed starting balance or current account balance. Cash is excluded from this return denominator. Chart bars compare purchase cost and current value, replacing invented dated account performance. Quote changes revalue shares; they never revise historical execution prices.

New paper trades atomically update cash, shares, transaction records and weighted average purchase cost. Total position cost is tracked in integer cents; partial sells remove a proportional average cost and record realized gain separately. Transactions keep their actual execution timestamp/price. Seeded sample transactions remain explicitly labeled and are not used to reconstruct the incomplete opening history.

Account data persists in browser localStorage under gridiron-exchange-paper-account-v1. Existing opening positions retain their recorded average costs; acquisition dates are not fabricated. Older session-only trades lost before this feature cannot be recovered. Storage is device/browser-specific, not a cloud account. Invalid saved data is left untouched with a warning and trading blocked; write failures warn the user to keep the tab open. Quotes refresh independently and are not treated as persisted execution prices.
