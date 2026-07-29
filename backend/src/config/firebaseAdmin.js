import fs from 'fs';
import admin from 'firebase-admin';
import { env } from './env.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('firebase-admin');

let initialized = false;
let unavailableReason = '';

function parseServiceAccount() {
  if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
  }

  if (env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
    const raw = fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
    return JSON.parse(raw.slice(raw.indexOf('{')).trim());
  }

  return null;
}

export function initializeFirebaseAdmin() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return getFirebaseAdminState();
  }

  try {
    const serviceAccount = parseServiceAccount();
    if (!serviceAccount?.project_id || !serviceAccount?.private_key || !serviceAccount?.client_email) {
      unavailableReason = 'Firebase service account is not configured.';
      if (env.isProduction) throw new Error(unavailableReason);
      logger.warn(unavailableReason);
      return getFirebaseAdminState();
    }

    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialized = true;
    unavailableReason = '';
    logger.info('Firebase Admin initialized', { projectId: serviceAccount.project_id });
  } catch (err) {
    initialized = false;
    unavailableReason = err.message || 'Firebase Admin initialization failed.';
    if (env.isProduction) throw err;
    logger.warn('Firebase Admin unavailable in development', { reason: unavailableReason });
  }

  return getFirebaseAdminState();
}

export function getFirebaseAdminState() {
  return { initialized, unavailableReason };
}

export function getFirebaseAdmin() {
  return initialized ? admin : null;
}
