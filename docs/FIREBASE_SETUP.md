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

## Auth/account implementation update
Email/password registration, sign-in, reset email, Google popup sign-in and
sign-out are implemented. The account view subscribes only after the trusted
ensureSeasonAccount callable succeeds. Failed setup shows an error and Retry,
never a fabricated saved balance. Sample trading stays in an explicitly labeled
separate demo. Shared markets and trades are not implemented yet.

The callable initializes the fixed 2026 season account transactionally from the
verified UID and accepts no economic inputs. Repeated calls do not reset cash.
Rules permit an owner to read their account and deny every client write.
Production App Check enforcement is enabled on the callable; emulator enforcement
is disabled. No backend/rules deployment has occurred.

### Additional console setup before production testing
1. Firebase Console > App Check > register the Web app with reCAPTCHA Enterprise (score-based).
   Configure saintjt-coder.github.io as an allowed reCAPTCHA domain.
2. Put the public site key in VITE_FIREBASE_APP_CHECK_SITE_KEY in the build
   environment. Paste the generated public site key into App Check's Enterprise site key field; the domain belongs in the key's domain list in Google Cloud Fraud Defense. Enterprise setup does not use the Classic secret-key field.
3. Enable Blaze before Functions deployment. Backend deployment requires an
   authenticated Firebase CLI environment; this chat has no Firebase admin session.
4. After review, deploy the function and scoped Firestore rules together before
   deploying the frontend. Do not merge main as part of this increment.
5. Test two browser sessions and repeat login. Confirm one account document per
   UID, exactly $10,000 initial cash, and no reset after refresh.

### Local validation
Install root and functions dependencies with npm ci in each folder. Start Auth,
Firestore and Functions emulators using --project demo-gridiron-exchange, copy
.env.example to .env.local and run npm run dev. Production App Check is not needed
for this local demo project. Google provider production behavior still requires
real browser testing; email/password is available independently.

Bootstrap unit tests exercise repeated/concurrent calls through a transaction
model; they do not replace Firebase Emulator integration or deployed rules tests.
