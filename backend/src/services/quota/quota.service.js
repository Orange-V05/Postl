import { env } from '../../config/env.js';
import { getFirebaseAdmin } from '../../config/firebaseAdmin.js';
import { ApiError } from '../../middleware/errorHandler.js';

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function quotaForKind(kind) {
  if (kind === 'repurpose') return env.USER_DAILY_REPURPOSE_LIMIT;
  return env.USER_DAILY_GENERATION_LIMIT;
}

export async function assertUserQuota({ uid, kind = 'generation', requestId }) {
  const limit = quotaForKind(kind);
  if (!uid) throw new ApiError('authentication_required', 'Authentication is required for AI requests.', 401, false);
  if (limit === 0) return { limit, remaining: Number.POSITIVE_INFINITY, used: 0, day: dayKey() };

  const admin = getFirebaseAdmin();
  if (!admin) throw new ApiError('quota_unavailable', 'Usage quota service is unavailable because Firebase Admin is not configured.', 503, true);

  const firestore = admin.firestore();
  const day = dayKey();
  const docId = `${uid}_${kind}_${day}`;
  const ref = firestore.collection('usageQuotas').doc(docId);
  const FieldValue = admin.firestore.FieldValue;

  return firestore.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const data = snap.exists ? snap.data() : {};
    const used = Number(data?.used || 0);
    if (used >= limit) {
      throw new ApiError('quota_exceeded', `Daily ${kind} quota reached. Try again tomorrow.`, 429, false, {
        limit,
        used,
        remaining: 0,
        day,
        requestId,
      });
    }

    const nextUsed = used + 1;
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

    return { limit, used: nextUsed, remaining: Math.max(limit - nextUsed, 0), day };
  });
}
