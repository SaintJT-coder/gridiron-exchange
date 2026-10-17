import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { ensureAccount } from './bootstrap.js';
initializeApp();
export const ensureSeasonAccount = onCall({
  region: 'us-central1', maxInstances: 5,
  enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true',
}, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Please sign in.');
  if (request.data && Object.keys(request.data).length) throw new HttpsError('invalid-argument', 'No account parameters accepted.');
  return ensureAccount(getFirestore(), request.auth.uid, () => FieldValue.serverTimestamp());
});
