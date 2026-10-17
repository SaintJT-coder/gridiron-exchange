// Firebase web configuration is public app metadata, not an Admin credential.
// Analytics is intentionally not initialized by this module.
export const firebaseConfig = Object.freeze({
  apiKey: "AIzaSyCvD9Heql9F9UT5wLGTeQXPaGNjISUzxL8",
  authDomain: "gridiron-exchange-eb38b.firebaseapp.com",
  projectId: "gridiron-exchange-eb38b",
  storageBucket: "gridiron-exchange-eb38b.firebasestorage.app",
  messagingSenderId: "491997148196",
  appId: "1:491997148196:web:965a77ef18e0511499d4b1",
  measurementId: "G-DX4V6X5ZG8",
});

// Firestore's existing location is nam5; do not attempt to recreate it.
export const FIRESTORE_LOCATION = "nam5";
export const FUNCTIONS_REGION = "us-central1";
