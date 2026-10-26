# Reliable shared market and private accounts

## Shared market

The browser reads market.json from this site's origin. GitHub Actions updates the shared file approximately every five minutes, captures future weekly ESPN full-PPR projections before scheduled kickoff, and appends final game settlements. The market-data branch preserves this ledger independently of the source and app builds. The public ledger contains sports data only; no profiles, holdings, email addresses, credentials or account backups are published.

Settled actuals, projections and before/after prices never change on later provider refreshes. Prices carry across seasons. Earlier missing games prevent later games from settling. New games without a captured pregame projection stay pending; they require an explicit historical_backfill dispatch after review. The initial launch imported older historical projections once and labels them historical-bootstrap; it cannot retroactively prove a pregame snapshot. Prior-season display-only archive rows do not contribute to the current price chain.

Pricing remains custom: each actual full-PPR point above/below projection moves the simulated price 0.5%, capped at +/-15%, rounded to cents with a one-cent floor. This is not PredictionStrike's formula, a demand-based exchange, or a real-money product.

The app refuses trades when a game is live, scheduled kickoff has passed without settlement, a final has not been processed, a player's history is incomplete, provider verification failed, or the published market is over 20 minutes old. This deliberately fails closed if scheduled workflows are delayed. GitHub scheduling is best effort, not a real-time availability guarantee. The browser refreshes the public ledger each minute and verifies it again at preview confirmation. A changed price requires another review rather than silent execution.

All listed players refresh together. Teams, schedules and athlete profiles are fetched from ESPN; trends use actual settled prices. Tee Higgins's original sample ESPN ID incorrectly pointed to Travis Etienne; it is corrected to 4239993, verified against ESPN's Bengals roster. Identity/name checks now pause mismatches. Unsupported or unavailable athlete logs stay paused.

## Accounts and backups

Old version-1 browser records migrate in memory without changing cash, quantities, original execution prices or weighted average purchase costs. Revision zero is added only for concurrency coordination. New trades, preferences and watchlists are committed with a browser Web Lock and revision check. Another tab's change causes a stale write to fail rather than replace that trade. Storage events refresh other tabs. A previous raw record is retained locally before overwriting; corrupt records are preserved and can be recovered by a reviewed backup import.

Exports use a versioned JSON envelope. Imports validate a maximum 500 KB account, supported players, finite/ranged economics, quantities, transaction limits, profile fields and preferences. The UI previews replacement and exports the current account first. The original record is retained during recovery. Backups contain personal paper-account data; keep them private. Credentials never enter portfolio payloads.

## Optional private cloud sync

Firebase email/password sign-in uses the existing gridiron-exchange-eb38b project and its Standard default Firestore database in nam5. Existing sign-in configuration/domains were verified. No Analytics, App Check bypass, Functions deployment or billing upgrade was added. The old experimental Firebase branch was not merged.

Only paperBackups/{uid} is newly accessible. Every other database path remains denied. This exact document supports owner get, create and update; collection listing and client deletion are denied. Strict field checks require uid, positive revision, bounded opaque JSON payload, immutable createdAt and a server updatedAt. Updates require revision +1. The client also verifies document/payload revisions and validates decoded account data.

The payload is intentionally a private personal backup, not a trusted economic balance. A user can edit their own simulation; public competitions, ranking, real-money use or shared economic accounts would require server-enforced trade execution and stronger abuse protections. These are prototype rules that need further review before broad distribution.

Signing in never silently replaces a guest account or an existing cloud account. Users explicitly select an existing cloud portfolio or back up a guest portfolio when the cloud slot is empty. Guest and per-UID browser caches remain separate. Cloud writes use Firestore transactions and revision checks; a concurrent device update is loaded for review. Offline cloud writes do not silently proceed. Live subscriptions propagate cloud changes; signing out returns to the guest account. Settings/theme/watchlist are part of the chosen account.

## Validation and operations

npm test covers scoring matching, settled-price immutability, year continuity, missing earlier games, kickoff snapshots, stale/live trading guards, identity mismatches, average-cost accounting, serialization, simultaneous tabs and backup recovery. npm run build verifies production output. npm audit reports no vulnerabilities after compatible patches and a patched gRPC override.

The Firestore rules compiled via Firebase dry-run, passed Google rules-service access tests and 15 isolated live allow/deny checks. Browser QA verified reviewed quantity purchases, preserved execution costs, settings persistence, light theme, backup export/restore preview, explicit cloud backup, synchronization to a second session, and guest restoration on sign-out. Temporary cloud test identities/documents were removed. A 390px viewport override was not applied by the current browser backend, so a true phone-device check remains recommended.

The publishing workflow runs on main pushes, scheduled intervals and manual dispatch. It tests source, updates and commits market-data, builds the app and deploys a Pages artifact to the existing URL. Concurrency serializes market writes and deployments. A failed update leaves the last public site in place and eventually pauses trading through the freshness guard. To repair a missed historical projection, dispatch Publish app and settle market with historical_backfill enabled; review the resulting historical-provenance rows. Do not force-push or regenerate an existing settled ledger.
