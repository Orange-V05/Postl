export const REQUIRED_FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export type RequiredFirebaseEnvKey = typeof REQUIRED_FIREBASE_ENV_KEYS[number];

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface FirebaseConfigValidationResult {
  ready: boolean;
  config: FirebaseClientConfig | null;
  missing: RequiredFirebaseEnvKey[];
  invalid: string[];
  developerMessage: string;
  userMessage: string;
}

export type EnvLike = Record<string, string | boolean | undefined>;

function value(env: EnvLike, key: string): string {
  const raw = env[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

function isQuoted(raw: string): boolean {
  return /^['"`].*['"`]$/.test(raw);
}

function isPlaceholder(raw: string): boolean {
  return /^(your_|your-|replace_|example|firebase-browser-key-for-tests-only)/i.test(raw);
}

function isLikelyProjectId(projectId: string): boolean {
  return /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId);
}

function isLikelyFirebaseAppId(appId: string): boolean {
  return /^\d+:[\w-]+:web:[\w-]+$/.test(appId);
}

export function validateFirebaseClientConfig(env: EnvLike, production = false): FirebaseConfigValidationResult {
  const missing = REQUIRED_FIREBASE_ENV_KEYS.filter((key) => !value(env, key));
  const invalid: string[] = [];

  const apiKey = value(env, 'VITE_FIREBASE_API_KEY');
  const projectId = value(env, 'VITE_FIREBASE_PROJECT_ID');
  const authDomain = value(env, 'VITE_FIREBASE_AUTH_DOMAIN');
  const storageBucket = value(env, 'VITE_FIREBASE_STORAGE_BUCKET');
  const messagingSenderId = value(env, 'VITE_FIREBASE_MESSAGING_SENDER_ID');
  const appId = value(env, 'VITE_FIREBASE_APP_ID');

  for (const key of REQUIRED_FIREBASE_ENV_KEYS) {
    const raw = value(env, key);
    if (raw && (isQuoted(raw) || isPlaceholder(raw))) invalid.push(key);
  }

  if (apiKey && apiKey.length < 20) invalid.push('VITE_FIREBASE_API_KEY');
  if (projectId && !isLikelyProjectId(projectId)) invalid.push('VITE_FIREBASE_PROJECT_ID');
  if (authDomain && !authDomain.endsWith('.firebaseapp.com') && !authDomain.includes('.')) invalid.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (authDomain.endsWith('.firebaseapp.com') && projectId && authDomain !== `${projectId}.firebaseapp.com`) invalid.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (storageBucket && !storageBucket.endsWith('.appspot.com') && !storageBucket.endsWith('.firebasestorage.app')) invalid.push('VITE_FIREBASE_STORAGE_BUCKET');
  if (messagingSenderId && !/^\d+$/.test(messagingSenderId)) invalid.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (appId && !isLikelyFirebaseAppId(appId)) invalid.push('VITE_FIREBASE_APP_ID');

  const ready = missing.length === 0 && invalid.length === 0;
  const developerMessage = ready
    ? ''
    : `Firebase client configuration is incomplete. Missing: ${missing.join(', ') || 'none'}. Invalid: ${invalid.join(', ') || 'none'}.`;
  const userMessage = ready
    ? ''
    : production
      ? 'POSTL is not fully configured for this deployment. Authentication and saved workspace data are temporarily unavailable.'
      : developerMessage;

  return {
    ready,
    config: ready ? {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      measurementId: value(env, 'VITE_FIREBASE_MEASUREMENT_ID') || undefined,
    } : null,
    missing,
    invalid,
    developerMessage,
    userMessage,
  };
}
