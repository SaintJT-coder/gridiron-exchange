# Firebase project setup

## Recorded configuration
- Project: gridiron-exchange-eb38b
- Web app: 1:491997148196:web:965a77ef18e0511499d4b1
- Existing default Firestore database location: nam5 (reported by owner).
- Planned callable/worker region: us-central1, aligned with nam5.
- Web configuration: src/lib/firebaseConfig.js.

The configuration is saved on the feature branch only. Firebase SDK initialization,
Auth UI, server account bootstrap and application data subscriptions remain to be
implemented. This commit does not connect the running demo to Firebase, deploy
rules, change Firebase console settings, or enable Analytics. No Admin credential
was supplied or is needed in the frontend.

## Console checklist from an iPhone
1. Open https://console.firebase.google.com/project/gridiron-exchange-eb38b/overview
   in Safari; request desktop website if necessary.
2. Authentication > Sign-in method: enable Email/Password and Google. Choose the
   project support email for Google. Provider enablement has not been verified.
3. Authentication > Settings > Authorized domains: add saintjt-coder.github.io
   without a scheme or path. Domain configuration has not been verified.
4. Firestore Database > Rules: verify the initial database remains closed.
   The bootstrap firestore.rules in this branch denies all client reads/writes.
   Do not switch to test mode or manually create demo balances.
5. Leave the existing nam5 database in place. No migration is required.
6. Blaze billing is required later to deploy Cloud Functions; console setup and
   local emulator work can proceed before upgrading.

## Next code increment
Install the Firebase web SDK with a synchronized package lock; initialize App,
Auth, Firestore and Functions using firebaseConfig and FUNCTIONS_REGION. Add
emulator-only connection configuration before production data mutations.
Implement sign-in/session UI and test idempotent server-side account creation
before replacing demo state. Do not show a fake $10,000 account as if persisted.
Add path-specific rules with emulator tests before deploying those rules.

## Deployment boundary
The .firebaserc default points at the owner's real project, so always use an
explicit project when running CLI operations. This configuration contains no
automatic deployment workflow. For local emulator work, use a demo project ID:
`firebase emulators:start --project demo-gridiron-exchange`.
Do not deploy the bootstrap deny-all rules over a working live app without
reviewing the project's existing rules first.

## References
- https://firebase.google.com/docs/web/setup
- https://firebase.google.com/docs/firestore/locations
- https://firebase.google.com/docs/functions/locations
