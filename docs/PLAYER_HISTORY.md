# Live player game history

Click any player name in the market, movers, watchlist, or holdings. The dialog fetches ESPN game logs and completed box scores, shows the five latest appearances and fantasy points, and reconstructs performance-linked simulation prices. The loaded quote is shared by market lists, paper trades and portfolio valuations. Players not yet loaded retain their labeled demo seed; this remains a prototype, not a synchronized exchange. Account state and loaded quotes reset on refresh.

## Connection

No API key or new account is required. Browser requests use the public ESPN endpoints below, verified with real responses and wildcard CORS headers during implementation:

- `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/{espnId}/gamelog?season={year}`
- `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={eventId}`

These public endpoints are unofficial and have no availability contract. The adapter is isolated in `src/services/playerHistory.js` for replacement with a licensed provider. For a production provider requiring an API key, use a server endpoint and keep the key out of Vite/browser bundles. Existing Firebase work is left on its own branch.

The current season is August–January based on the NFL season year. If fewer than five appearances are available, the previous season is fetched. Regular season and postseason count; preseason, DNPs, byes, future games and unfinished games do not. Requests time out after 15 seconds, use four concurrent box-score requests at most per player, and share a five-minute in-memory cache. A failed request offers Retry; the UI never substitutes fabricated results. A player without a box-score appearance is excluded rather than assigned zero points.

## Scoring and pricing

Gridiron PPR: 0.04/passing yard, 4/passing TD, -2/interception, 0.1/rushing or receiving yard, 6/rushing or receiving TD, 1/reception, -2/lost fumble. Two-point conversions, return touchdowns and bonuses are excluded; this is explicitly disclosed and is not claimed to match another platform's scoring.

Fixed benchmarks are QB 20, RB/WR 15 and TE 12 points. Per-game movement is `(points - benchmark) * 0.5%`, capped at ±15%. Each season starts at the existing player's demo seed, prices compound chronologically through every available completed appearance and round to cents, with a $0.01 floor. Last-five rows show the actual before/after simulation calculation, dollar delta and rounded percent. Benchmarks are simulation rules, not historical fantasy projections. Older-season rows reset independently at the season boundary. Corrections by the provider can change reconstructed history on refresh.

PredictionStrike's publicly listed product describes performance and fan demand affecting player prices (https://apps.apple.com/us/app/predictionstrike-sport-stocks/id1532763870). This feature takes that broad product concept as reference; it does not copy its branding or claim its proprietary formula or historical prices. Fan demand is not modeled.

## Validation

`npm test` checks scoring, box-score parsing, DNP/final filtering, missing data, chronological compounding, caps, season resets, season fallback and caching. `npm run build` checks the production bundle. Live-provider checks should include a QB and receiver because categories differ. No Firebase configuration, database schema, or API secret is needed for this feature.
