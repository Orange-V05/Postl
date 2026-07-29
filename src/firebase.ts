import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { validateFirebaseClientConfig } from './config/firebaseConfig';

export const firebaseConfigState = validateFirebaseClientConfig(import.meta.env, Boolean(import.meta.env.PROD));
export const firebaseConfigError = firebaseConfigState.userMessage;
export const firebaseConfigDeveloperError = firebaseConfigState.developerMessage;
export const firebaseReady = firebaseConfigState.ready;

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (firebaseReady && firebaseConfigState.config) {
  app = getApps()[0] ?? initializeApp(firebaseConfigState.config);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);

  if (typeof window !== 'undefined' && firebaseConfigState.config.measurementId && !import.meta.env.DEV && !import.meta.env.TEST) {
    isSupported().then((supported) => {
      if (supported && app) getAnalytics(app);
    }).catch(() => {
      // Analytics should never break authentication, Firestore, rendering, or tests.
    });
  }
} else if (import.meta.env.DEV) {
  console.warn(firebaseConfigDeveloperError);
}

export const auth = authInstance;
export const db = dbInstance;
export const firebaseApp = app;
