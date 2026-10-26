# Gridiron Exchange

NFL player-stock paper trading with ESPN default full-PPR points and weekly projections. All balances and share prices are simulated; no real-money trading, deposits or brokerage connections.

## App

- Shared append-only market ledger, captured pregame projections, continuous prices across seasons, and immutable settled game prices.
- Clickable player details with the last five available appearances, actual/projected fantasy points and per-game price impact.
- Verified current teams, upcoming games, gainers/losers and settled-price trends.
- Quantity-based buy/sell previews that recheck prices, balance, account revision and game status before confirmation.
- Recorded purchase-cost portfolio returns and persistent guest accounts with cross-tab protection.
- JSON backup/export and reviewed restore; optional private Firebase email/password cloud sync across devices.
- Saved display profile, light/dark theme, in-app confirmations and watchlists.

## Run

Node.js 24 recommended. Run npm ci, npm test and npm run dev. npm run build creates the production bundle. npm run market:update refreshes public/market.json from the existing ledger; do not delete or recreate an existing settled ledger.

## Architecture and limits

See [reliability and account documentation](docs/RELIABILITY_RELEASE.md) for settlement rules, data provenance, backup migration, cloud privacy, tests and deployment. See [ESPN provider details](docs/PLAYER_HISTORY.md) for point-source matching. Public ESPN endpoints are unofficial; availability is not guaranteed. GitHub scheduled updates are best effort. Trading pauses on stale/incomplete data or games awaiting settlement.

Firebase web configuration is public metadata. Admin credentials must never be placed in this repository or browser bundle. Private accounts live only in owner-scoped Firestore documents or local browser storage, not the published market-data branch. The private backups are a personal simulation rather than server-authoritative competitive trading balances. Prototype Security Rules need review before broad distribution.

Player photos remain remote ESPN references with initials fallback. Verify provider permissions for public/commercial distribution.
