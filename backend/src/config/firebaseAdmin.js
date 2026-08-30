import fs from 'fs';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('firebase-admin');

let initialized = false;
let unavailableReason = '';
let projectId = '';

function parseServiceAccount() {
  const inlineJson = env.FIREBASE_SERVICE_ACCOUNT_JSON || env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (inlineJson) {
    return JSON.parse(inlineJson);
  }

  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    return {
      project_id: env.FIREBASE_PROJECT_ID,
      client_email: env.FIREBASE_CLIENT_EMAIL,
      private_key: env.FIREBASE_PRIVATE_KEY,
    };
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
      unavailableReason = 'firebase_admin_not_configured';
      logger.warn('Firebase service account is not configured. Protected production routes will fail closed.');
      return getFirebaseAdminState();
    }

    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialized = true;
    projectId = serviceAccount.project_id;
    unavailableReason = '';
    logger.info('Firebase Admin initialized', { projectId: serviceAccount.project_id });
  } catch (err) {
    initialized = false;
    projectId = '';
    unavailableReason = err.message || 'firebase_admin_initialization_failed';
    logger.warn('Firebase Admin unavailable; protected routes will fail closed.', { reason: unavailableReason });
  }

  return getFirebaseAdminState();
}

export function getFirebaseAdminState() {
  return { initialized, unavailableReason, projectId };
}

export function getFirebaseAdmin() {
  return initialized ? admin : null;
}

export function getFirebaseFirestore() {
  if (!initialized) return null;
  return getFirestore(admin.app(), env.FIREBASE_FIRESTORE_DATABASE_ID);
}
