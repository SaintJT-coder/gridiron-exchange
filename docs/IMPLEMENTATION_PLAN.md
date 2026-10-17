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


## Repository inspection and concrete Firebase migration plan (2026-10-17 UTC)

### Verified baseline
Inspected main at `6c0ebf60cf471efce10fc0e4d9cbca0bf8ceaa9d` and foundation at `9b00a6226279587d1603c296b8d0b162e51072c4`. The repository has zero open issues and no open pull requests at inspection. The foundation branch adds only this plan, marketMath.js, and its tests; Firebase integration is not implemented. Continue on that branch; do not merge main as part of this plan.

| Source | Current behavior | Required replacement |
| --- | --- | --- |
| src/App.jsx | React useState owns $7,519.50 cash, six holdings, three trades, and watchlist; refresh resets them. Roster joins holdings to static catalog. Buy/sell uses client prices and rounds cash; shares below 1 rejected; transaction display truncated to 12. | Authenticated season account subscriptions; trusted callable trades; fractional input; paginated immutable trade history. Start real accounts with $10,000 and no demo holdings. |
| src/data/players.js | 14 invented fixed prices, changes and trends; ESPN IDs are used for images, not projections. | Stable catalog IDs and provider mappings; shared authoritative prices and actual price history. Retain samples only in explicit demo mode/emulator fixtures. |
| src/pages/Dashboard.jsx | Table uses passed players, but movers/watchlist import static catalog. Chart, daily return, monthly change, greeting and schedule are samples. | One subscribed market source for every panel; real snapshots; authenticated identity; confirmed schedule. |
| src/pages/Portfolio.jsx | Imports static catalog instead of using passed players; allocation and holdings therefore stay on demo prices. | Join holdings to the same market subscription; separate total P&L from unrealized P&L. |
| src/pages/Account.jsx / components/AppShell.jsx | Fake identity, settings stored only in React; Save Changes only flashes a label. League selector has no data flow. | Auth session, persisted allowlisted preferences, functioning league selector. Email changes use Auth reauthentication/verification, not profile-document edits. |
| components/MiniSparkline.jsx / data/mockData.js | Sparkline paths and portfolio history are decorative samples. | Timestamped history; label missing history instead of fabricating it. |
| main package.json | React/Vite; no Firebase, server, test script or rules configuration. | Add Firebase SDK, functions workspace, emulator/test scripts, rules/indexes and CI. |

No leaderboard, projection retrieval, fantasy scoring calculation, weekly settlement or schedule-based lock exists in main. Foundation math is not imported by App.jsx. Existing trades do not change player values.

### Architecture and authentication
Keep the Vite/React frontend and existing visual components. Add Firebase Auth (email/password plus Google as recorded above), Firestore realtime read subscriptions, and trusted Cloud Functions for account/league creation, trades, invitations and settlement. GitHub Pages can continue serving the frontend; it is not a trusted execution environment.

Add `src/lib/firebase.js`, `src/auth/AuthProvider.jsx`, `src/data/marketRepository.js`, `src/hooks/useMarket.js`, and `src/hooks/useAccount.js`. Configure web Firebase settings through Vite environment variables and an example file; provider credentials and service-account secrets belong only in server secret management. Configure authorized sign-in domains. Do not import demo balances into real user accounts.

After authentication, an idempotent `ensureSeasonAccount` transaction creates the account exactly once: cashCents=1000000, no holdings, opening balance and season ID recorded. Repeated login, refresh and simultaneous tabs must never grant another opening balance. Use UID from verified auth, never a caller-supplied owner UID. Unsubscribe and clear account state on sign-out or season/account switch. Disable mutation UI until session and account snapshots are ready. Preserve authentication email privately; expose only public display identity.

### Collection contract (refines the proposal above)
Use one season account per UID. Leagues are social ranking groups over those accounts; joining another league does not mint another balance. This avoids the earlier ambiguous phrase “independent user portfolios”: users have separate portfolios, not an extra portfolio per league. Global prices remain shared.

| Path | Essential fields and purpose | Client access |
| --- | --- | --- |
| users/{uid} | displayName, preferences, createdAt; no public email | Owner read; narrowly validated preference/profile update |
| seasons/{seasonId} | status, openingBalanceCents, scoringVersion, marketVersion | Signed-in read; server write |
| seasons/{s}/players/{pid} | catalog/provider IDs, position, team, priceCents, priceVersion, nextGameId, marketState | Signed-in read; server write |
| seasons/{s}/games/{gid} | season/week/type, kickoffAt, status, scheduleRevision, updatedAt | Signed-in read; server write |
| seasons/{s}/projections/{gid_pid} | playerId, gameId, projectedPoints, provider, fetchedAt, lockedAt, scheduleRevision, scoringVersion, status | Signed-in read; server write |
| seasons/{s}/results/{gid_pid} | raw authorized stats or source reference, fantasyPoints, providerRevision, scoringVersion, finalizedAt | Signed-in read for permitted fields; server write |
| seasons/{s}/settlements/{gid_pid} | revision, input versions, prePriceCents, postPriceCents, status, eventId | Signed-in read; server write |
| seasons/{s}/priceEvents/{eventId} | ordered sequence, playerId, kind, before/after price, input revisions, timestamp | Server write; publish sanitized price history separately if event includes private request data |
| seasons/{s}/accounts/{uid} | cashCents, openingBalanceCents, cost/realized totals, accountVersion, createdAt | Signed-in read of game-account fields; server write |
| .../accounts/{uid}/holdings/{pid} | sharesMicros, remainingCostBasis, version | Signed-in read; server write |
| .../accounts/{uid}/trades/{requestId} | side, quantity, executedPrice, notional, realized gain, server time, request fingerprint | Signed-in read of public game fields; server write |
| .../accounts/{uid}/snapshots/{snapshotId} | cash, equity, return, valuationVersion, timestamp | Signed-in read; server write |
| users/{uid}/watchlist/{pid} | playerId, createdAt | Owner read/write with field/type/catalog validation |
| leagues/{leagueId} | name, ownerUid, seasonId, status | Member read; callable create/update |
| leagues/{leagueId}/members/{uid} | role, joinedAt, public display identity | Member read; callable membership writes |
| leagues/{leagueId}/leaderboard/{uid} | equityCents, returnPct, rank tie key, valuationVersion, asOf | Member read; server write |
| leagueInvites/{inviteHash} | leagueId, expiry, use limits | No client reads/writes; join callable only |

Game cash, holdings and executed trades are visible to signed-in users, matching the requested shared-data game. Private settings, auth email, invite secrets and operational request metadata are never public. League membership controls league-specific details and rankings. If limiting all game-data reads to fellow league members later, move public portfolio projections under the league instead of scanning memberships per holding read.

Quantities use integer microshares (six decimal places). Cash and price use integer cents; use integer/rational or decimal arithmetic in trusted code, explicit rounding, minimum one-cent executable notional, and safe range checks. Define one consistent residual cost-basis rounding policy. Do not serialize BigInt directly into Firestore. Empty positions close without leaving residual basis. Display fractional quantities without silently coercing them to integers.

### Trusted trade flow
`executeTrade({seasonId, playerId, side, sharesMicros, requestId, expectedPriceVersion})`:
1. Require authenticated user, enforce App Check for production, validate exact fields, finite safe integers, positive quantity, known side and active season.
2. In one server Firestore transaction read account, holding, player, relevant game/lock state, and existing request receipt before writes. Reuse a receipt only if its request fingerprint matches; reject request-ID reuse with different inputs.
3. Check authoritative server time against kickoff minus ten minutes, confirmed schedule revision and settlement/correction status. Unknown kickoff/state fails closed. Do not trust the scheduler or client countdown to enforce a deadline. A canceled game explicitly unlocks; a postponed game waits for confirmed schedule, then uses revised timing.
4. Reject insufficient cash or owned shares; no borrowing/shorts. Reject stale price version and return a fresh quote for confirmation. Atomically persist cash, holding/cost basis, immutable execution, receipt and any enabled price event/version.
5. Return the committed receipt. Client renders subscribed state and pending/error state; no offline queued economic writes or speculative balance commits. Retried transaction callbacks must have no external side effects.

Fixed-price execution at the current authoritative quote is sufficient for the fantasy-only market. However, the existing plan records an additional order-flow requirement with unresolved liquidity/slippage policy. Keep shared trading feature-gated until that requirement is resolved; do not silently choose a production curve or enable the illustrative calculateTradeImpact function. Auth, read subscriptions, league views and settlement fixtures can proceed independently.

### Weekly projections, scores, and corrections
Implement `functions/src/providers/` adapter contract for catalog, confirmed schedule, authorized PPR projections and final/corrected results. ESPN headshot URLs prove no projection authorization. Do not promise ESPN integration without permitted, reliable access; use a contracted source with matching scoring or import documented authorized fixtures for staging. Store provenance and scoring version; never invent missing projections.

Version the exact ESPN-style PPR scoring table and test passing/rushing/receiving yards, TDs, receptions, interceptions, fumbles and two-point conversions. If consuming provider fantasy totals, confirm they use that exact table rather than mixing scoring formats.

Fetch projections before the deadline and snapshot the latest eligible projection at lock. If a job runs late, it must not take a post-deadline projection; freeze if no eligible snapshot exists. Record schedule revisions and superseded locks on reschedule. Final actual scores are distinct from missing actual data.

For positive locked projection P, finite actual A and pre-settlement price C in cents:
`newCents = max(1, round(C * max(A, 0) / P))`.
Raw performance percentage is `100 * (max(A,0)/P - 1)`; price-return percentage uses rounded/floored prices and can differ. No gain/loss caps.
- P=22, A=44: $100 becomes $200 (+100%).
- P=22, A=11: $100 becomes $50 (-50%).
- P=22, A=0 or negative: $100 becomes $0.01 (floor).
- Missing/nonpositive P: price unchanged for that game; record frozen settlement after final game resolution.
- Missing A: pending; keep lock until resolved. Canceled games unlock without settlement movement.

Scheduled workers ingest and reconcile; they are not the security boundary. Settlement transaction checks finalized game state, locked inputs and revision, writes a unique event and priceVersion, and marks completion exactly once. Only then unlock. Fantasy math must run on trusted server code even if a client preview reuses pure math.

Corrections must supersede an existing settlement, not multiply the corrected ratio onto an already settled price. Replay that player's ordered price events from the preceding checkpoint, preserving actual committed trade fills and quantities; revise mark-to-market prices and current equity, plus affected historical valuation snapshots with audit revisions. If order-flow events are enabled, replay their defined price effects using recorded execution inputs; the final market policy must specify this explicitly. Freeze the affected player during replay, publish a new completed market/valuation version and then unlock. Repricing historical executed trades/cash would require a separate product policy and must not happen silently.

### Valuation and leaderboard
Equity = cash + sum(current price × owned shares). Total P&L = equity - opening balance; total returnPct = 100 × P&L/opening balance. Unrealized P&L = holdings market value - remaining cost basis. Realized P&L is tracked from sales. Main currently labels unrealized P&L as total return; replace those labels/calculations.

For a small friends league, backend rebuilds rankings after trades and settled/corrected price changes; no need to update every account inside a price transaction. Use an idempotent task keyed by market version. Calculate all ranks against one captured price set; publish complete generation/version before showing it. Display asOf and refreshing state while a new generation builds. Sort equity descending and UID ascending for deterministic ties. Query leaderboard by that ordering, with composite index. Paginate trade history by server timestamp plus document ID. Add holdings playerId collection-group index only if using it for valuation fan-out; avoid speculative indexes. Check index definitions into firestore.indexes.json.

### Security rules and backend authorization
Default deny. Explicit path rules only; do not add a recursive broad write grant.
- Authenticated users may read published catalog, schedule, projections, scores, and public game-account views.
- Only owners may read private user data/watchlists. Profile writes allow only displayName/preferences with length/type constraints; UID, createdAt and economic fields are immutable.
- Require league membership for league documents, members and leaderboard reads. Queries must match rule constraints; rules do not filter query results.
- Deny all client writes to cash, holdings, trades, prices, games, projections, results, settlements, ranks, invites and roles.
- Membership, account initialization, league administration and trading are callable operations with server authorization and input validation. App Check supplements authentication; it does not grant authorization.
- Admin SDK/server libraries bypass Firestore rules: least-privilege IAM and checks in every callable/worker are mandatory. Do not expose an admin settlement endpoint to ordinary users.
- Invite join validates expiry/use count atomically and rate-limits guesses. Never store raw codes in client-readable league docs.
- Notification updates, if later enabled, permit owners to change read state only.

### Smallest safe change sequence and acceptance gates
Each numbered item is a reviewable commit/PR on the existing feature branch. Preserve UI layout. Deploy nothing to production automatically.

1. **Complete the existing math foundation.** Add test script; expand cases to 22→44/11, fractional rounding, missing actual, canceled/postponed states and nonfinite/overflow inputs. Extract shared server-safe modules without activating provisional order-flow. Gate: node math tests pass.
2. **Add emulator-only Firebase scaffolding and deny-by-default rules.** Add firebase.json, firestore.rules, firestore.indexes.json, functions/package.json, environment example, gitignore and CI. Gate: rules reject unauthenticated and forged economic writes; no secret in bundle/repo.
3. **Auth and idempotent account bootstrap.** Add AuthProvider/sign-in UI and ensureSeasonAccount callable; replace fake identity. Gate: two concurrent sign-ins create one $10,000 account; reload persists; sign-out clears data.
4. **Unify read data flow.** Add repository/hooks and remove static player imports from Dashboard/Portfolio. Seed authorized sample catalog only in emulator; replace mock returns with actual or unavailable states. Gate: both browsers display the same price update and each user's own account; no demo holdings migrate.
5. **Add leagues and read-only shared portfolios/rankings.** Implement createLeague/joinLeague with membership checks and generated invite secrets; add league selector and leaderboard UI. Gate: two users join and view shared game data; outsider cannot read private league content or change roles.
6. **Implement trades behind a disabled feature flag.** Add executeTrade, fractional quantity input, idempotency and lock enforcement. Resolve order-flow policy before enabling. Gate: concurrent purchases cannot overspend, simultaneous sales cannot oversell, retries execute once, stale quotes reject, unauthorized UIDs fail.
7. **Add authorized weekly ingestion and settlement.** Lock projections, reconcile confirmed schedules, process final/corrected results and price history. Gate: exact deadline, missing projection, duplicate job, postponed/canceled game, pending score and correction replay tests pass. Fixture tests first; production feed requires access/configuration.
8. **Enable staging multi-user end-to-end flow.** Connect valuation tasks, genuine charts/history and leaderboard generations. Gate: independent browser sessions survive refresh; trades and price updates propagate; P&L and rank reconcile; provider failures fail closed. Deploy staging only after Firebase project/configuration and provider access are available; review before production activation.

### Required inputs before deployment (not blockers for planning/emulator work)
Firebase project ID, region, enabled sign-in methods/domain and billing configuration; authorized provider credentials and permitted use; production market-impact/execution policy if that recorded requirement remains in scope. Initial production price selection also needs a documented seed policy: current invented demo prices are not approved live starting prices. No missing input justifies enabling insecure client writes.

### Primary implementation references
- https://firebase.google.com/docs/functions/callable
- https://firebase.google.com/docs/firestore/manage-data/transactions
- https://firebase.google.com/docs/firestore/security/get-started
- https://firebase.google.com/docs/firestore/security/rules-query
- https://firebase.google.com/docs/app-check

This is a repository inspection and integration plan. No Firebase deployment or multi-user implementation is claimed.
