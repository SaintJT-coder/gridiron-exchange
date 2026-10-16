# Gridiron Exchange — Approved Rules and Implementation Plan

Status: Phase 1 foundation. The existing demo remains unchanged; no Firebase credentials have been configured.

## Approved product rules
- Every account starts with $10,000 fictional cash.
- Fractional shares; no fees, leverage, or short selling.
- Trading 24/7 except each player's lock, beginning exactly 10 minutes before scheduled kickoff and ending only after the final price settlement.
- ESPN-style PPR; use authorized pregame projections, preferably ESPN when permitted and reliable.
- Fantasy settlement uses **new price = current price × max(actual fantasy points, 0) / locked projected points**, rounded to cents with a $0.01 floor. No percentage cap or smoothing.
- Missing/zero projection: no fantasy movement. Missing actual: do not settle or unlock prematurely.
- Stat corrections must recompute the relevant game settlement deterministically, preserving subsequent events.
- Canceled/postponed games, byes, and confirmed inactive players receive no fantasy price movement; rescheduled kickoff changes lock timing.
- All users share a global player price; private invite-code leagues have independent user portfolios and a total-account-value leaderboard.
- Season resets preserve archived results. League members can see holdings and trades.
- Email/password and Google Firebase sign-in; QB/RB/WR/TE initial coverage.
- Real price and portfolio histories, in-app notifications, GitHub Pages frontend, Firebase backend.

## Added requirement: order-flow price impact
Buy orders must raise the shared price; sell orders must lower it. Market impact is separate from and compounds with fantasy settlement. The initial **provisional** formula is signed trade notional divided by a per-player liquidity parameter. This is not production-ready without decisions on liquidity, slippage/execution price, supply and inventory, anti-manipulation controls, and league-specific order flow. Do not enable live shared-market trading until those decisions and tests are completed.

## Data design proposal
- `users/{uid}`: profile, settings, creation timestamp.
- `seasons/{seasonId}`: status, opening balance, scoring configuration.
- `seasons/{seasonId}/players/{playerId}`: provider IDs, team, position, authoritative current price, liquidity, market state.
- `seasons/{seasonId}/games/{gameId}`: kickoff, game status, schedule revision.
- `seasons/{seasonId}/projections/{gameId_playerId}`: locked projection, scoring scheme, provider, timestamp.
- `seasons/{seasonId}/settlements/{gameId_playerId}`: actual points, price-event ID, provider revision, status.
- `seasons/{seasonId}/priceEvents/{eventId}`: ordered immutable buy/sell/settlement/correction events for replay and audit.
- `seasons/{seasonId}/accounts/{uid}`: cash in cents, aggregate valuation snapshot, version.
- `seasons/{seasonId}/accounts/{uid}/holdings/{playerId}`: integer microshares and cost basis.
- `seasons/{seasonId}/accounts/{uid}/trades/{tradeId}`: idempotency key, price, quantity, notional, timestamp.
- `leagues/{leagueId}`: owner, invite-code hash, season, membership policy.
- `leagues/{leagueId}/members/{uid}`: role, joined timestamp.
- `users/{uid}/notifications/{id}`: message, read status.

## Phase order
1. Foundation: capture rules, deterministic market calculations and tests, architecture and security plan.
2. Firebase configuration, Auth, account creation and Firestore rules. Never store credentials in Git.
3. Callable backend trade function with idempotency, atomic cash/holdings/price events, fractional quantities, and authoritative lock checks.
4. Authorized schedule/projection/actual-score adapter; lock snapshots; postgame settlement and replayable stat corrections.
5. Leagues, invites, realtime portfolio valuation and rankings.
6. Replace demo charts and user settings; in-app notifications; deploy and verify.

## Engineering caveats
- A one-cent floor means a zero score yields a -99.99% change for a $100 stock, rather than a literal -100% to zero; this is the approved floor exception.
- Linear order impact is a placeholder. Trading execution must specify whether the quoted price is the pretrade or posttrade price and account for fractional rounding.
- Trading lock and provider result validation must be enforced in trusted server code, not merely the React client.
- Use server timestamps and atomic transactions; protect write paths with least-privilege Firestore rules.
- Google sign-in on GitHub Pages requires authorized domain configuration.
- Scheduled Cloud Functions and external sports data may incur costs.
