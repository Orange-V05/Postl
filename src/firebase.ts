import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseEnvKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

const missingFirebaseEnv = firebaseEnvKeys.filter((key) => !import.meta.env[key]);

export const firebaseConfigError = missingFirebaseEnv.length > 0
  ? `Firebase is not configured for this deployment. Missing: ${missingFirebaseEnv.join(', ')}.`
  : '';

export const firebaseReady = !firebaseConfigError;

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (firebaseReady) {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);

  if (typeof window !== 'undefined' && firebaseConfig.measurementId && !import.meta.env.DEV) {
    isSupported().then((supported) => {
      if (supported && app) getAnalytics(app);
    }).catch(() => {
      // Analytics should never break local development, production rendering, or tests.
    });
  }
} else if (import.meta.env.DEV) {
  console.warn(firebaseConfigError);
}

export const auth = authInstance;
export const db = dbInstance;
export const firebaseApp = app;
