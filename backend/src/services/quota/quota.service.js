import { env } from '../../config/env.js';
import { getFirebaseAdmin } from '../../config/firebaseAdmin.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { createLogger } from '../../utils/logger.js';
import { isFirebaseNotFound, safeFirebaseErrorMeta, safeHashId } from '../../utils/firebaseDiagnostics.js';

const logger = createLogger('quota');

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function quotaForKind(kind) {
  if (kind === 'repurpose') return env.USER_DAILY_REPURPOSE_LIMIT;
  return env.USER_DAILY_GENERATION_LIMIT;
}

function readUsedCounter(data) {
  if (data?.used === undefined || data?.used === null) return 0;
  const used = Number(data.used);
  if (!Number.isInteger(used) || used < 0) {
    throw new ApiError('quota_state_invalid', 'Usage quota data is malformed and requires administrator repair.', 500, false, { firebaseOperation: 'quota.validate_counter' });
  }
  return used;
}

function mapQuotaFirebaseError(err, operation, docId) {
  const safe = safeFirebaseErrorMeta(err);
  if (err instanceof ApiError) return err;
  if (isFirebaseNotFound(err)) {
    return new ApiError('backend_configuration_error', 'POSTL usage quota storage is not available. Ask support to verify the Firestore database configuration.', 503, false, {
      firebaseOperation: operation,
      collection: 'usageQuotas',
      docIdHash: safeHashId(docId),
      firebaseCode: safe.firebaseCode,
    });
  }
  return new ApiError('quota_persistence_failed', 'Usage quota could not be checked. Please try again later.', 503, true, {
    firebaseOperation: operation,
    collection: 'usageQuotas',
    docIdHash: safeHashId(docId),
    firebaseCode: safe.firebaseCode,
  });
}

export async function reserveUserQuota({ firestore, FieldValue, uid, kind = 'generation', limit, requestId, date = new Date() }) {
  const day = dayKey(date);
  const docId = `${uid}_${kind}_${day}`;
  const docIdHash = safeHashId(docId);
  const ref = firestore.collection('usageQuotas').doc(docId);

  try {
    return await firestore.runTransaction(async (transaction) => {
      logger.info('Firebase operation started', { requestId, operation: 'quota.load', collection: 'usageQuotas', docIdHash });
      let snap;
      try {
        snap = await transaction.get(ref);
      } catch (err) {
        err.firebaseOperation = 'quota.load';
        throw err;
      }
      logger.info('Firebase operation succeeded', { requestId, operation: 'quota.load', collection: 'usageQuotas', docIdHash, exists: snap.exists });

      const data = snap.exists ? snap.data() : {};
      const used = readUsedCounter(data);
      if (used >= limit) {
        throw new ApiError('quota_exceeded', `Daily ${kind} quota reached. Try again tomorrow.`, 429, false, {
          limit,
          used,
          remaining: 0,
          day,
          requestId,
          firebaseOperation: 'quota.reserve',
          collection: 'usageQuotas',
          docIdHash,
        });
      }

      const nextUsed = used + 1;
      logger.info('Firebase operation started', { requestId, operation: 'quota.reserve', collection: 'usageQuotas', docIdHash, existed: snap.exists });
      transaction.set(ref, {
        uid,
        kind,
        day,
        used: nextUsed,
        limit,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: data?.createdAt || FieldValue.serverTimestamp(),
        schemaVersion: 1,
      }, { merge: true });
      logger.info('Firebase operation queued', { requestId, operation: 'quota.reserve', collection: 'usageQuotas', docIdHash, existed: snap.exists });

      return { limit, used: nextUsed, remaining: Math.max(limit - nextUsed, 0), day, existed: snap.exists };
    });
  } catch (err) {
    const operation = err?.details?.firebaseOperation || err?.firebaseOperation || 'quota.reserve';
    logger.warn('Firebase operation failed', { requestId, operation, collection: 'usageQuotas', docIdHash, ...safeFirebaseErrorMeta(err) });
    throw mapQuotaFirebaseError(err, operation, docId);
  }
}

export async function assertUserQuota({ uid, kind = 'generation', requestId }) {
  const limit = quotaForKind(kind);
  if (!uid) throw new ApiError('authentication_required', 'Authentication is required for AI requests.', 401, false);
  if (limit === 0) return { limit, remaining: Number.POSITIVE_INFINITY, used: 0, day: dayKey() };

  const admin = getFirebaseAdmin();
  if (!admin) throw new ApiError('quota_unavailable', 'Usage quota service is unavailable because Firebase Admin is not configured.', 503, true);

  return reserveUserQuota({
    firestore: admin.firestore(),
    FieldValue: admin.firestore.FieldValue,
    uid,
    kind,
    limit,
    requestId,
  });
}
