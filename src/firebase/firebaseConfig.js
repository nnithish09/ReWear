import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'];

let app = null;
let auth = null;
let db = null;
let firebaseInitError = null;

try {
  const missing = REQUIRED_KEYS.filter((key) => !firebaseConfig[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase environment variables for: ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill in your Firebase web app values.'
    );
  }
  // Initialize only once (safe with hot module reloading).
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  firebaseInitError = error;
  console.error('Firebase initialization failed:', error);
}

export { app, auth, db, firebaseInitError };
