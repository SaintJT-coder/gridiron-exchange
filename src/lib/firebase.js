import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { firebaseConfig, FUNCTIONS_REGION } from './firebaseConfig.js';
const emulator = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
export const app = initializeApp(emulator ? { ...firebaseConfig, projectId: 'demo-gridiron-exchange', apiKey: 'demo-key' } : firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, FUNCTIONS_REGION);
if (emulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
} else if (import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY) {
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
}
