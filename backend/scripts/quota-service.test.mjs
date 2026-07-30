import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reserveUserQuota } from '../src/services/quota/quota.service.js';

const FieldValue = { serverTimestamp: () => 'SERVER_TIME' };

function fakeFirestore(initial = {}, options = {}) {
  const state = new Map(Object.entries(initial));
  const writes = [];
  let queue = Promise.resolve();
  return {
    state,
    writes,
    collection(name) {
      return {
        doc(id) { return { collection: name, id }; },
      };
    },
    async runTransaction(callback) {
      const run = async () => {
        const transaction = {
          async get(ref) {
            if (options.getError) throw options.getError;
            const data = state.get(ref.id);
            return { exists: data !== undefined, data: () => data };
          },
          set(ref, value, setOptions) {
            if (options.setError) throw options.setError;
            const prior = state.get(ref.id) || {};
            state.set(ref.id, setOptions?.merge ? { ...prior, ...value } : value);
            writes.push({ ref, value, options: setOptions });
          },
        };
        return callback(transaction);
      };
      const result = queue.then(run, run);
      queue = result.catch(() => {});
      return result;
    },
  };
}

const base = { uid: 'uid-test-user', kind: 'generation', limit: 3, requestId: 'rid-test', date: new Date('2026-07-30T00:00:00Z') };
const docId = 'uid-test-user_generation_2026-07-30';

test('quota reservation initializes a brand-new authenticated user usage document conservatively', async () => {
  const firestore = fakeFirestore();
  const result = await reserveUserQuota({ ...base, firestore, FieldValue });
  assert.equal(result.used, 1);
  assert.equal(result.remaining, 2);
  assert.equal(result.existed, false);
  assert.equal(firestore.state.get(docId).used, 1);
  assert.equal(firestore.state.get(docId).limit, 3);
  assert.equal(firestore.writes[0].options.merge, true);
});

test('quota reservation increments an existing initialized user without resetting counters', async () => {
  const firestore = fakeFirestore({ [docId]: { used: 2, limit: 3, createdAt: 'OLD_TIME', plan: 'free' } });
  const result = await reserveUserQuota({ ...base, firestore, FieldValue });
  assert.equal(result.used, 3);
  assert.equal(result.remaining, 0);
  assert.equal(firestore.state.get(docId).createdAt, 'OLD_TIME');
  assert.equal(firestore.state.get(docId).plan, 'free');
});

test('quota reservation handles a partially initialized legacy usage document', async () => {
  const firestore = fakeFirestore({ [docId]: { createdAt: 'OLD_TIME', legacyField: true } });
  const result = await reserveUserQuota({ ...base, firestore, FieldValue });
  assert.equal(result.used, 1);
  assert.equal(firestore.state.get(docId).legacyField, true);
});

test('quota reservation rejects malformed usage counters before arithmetic', async () => {
  const firestore = fakeFirestore({ [docId]: { used: 'not-a-number' } });
  await assert.rejects(() => reserveUserQuota({ ...base, firestore, FieldValue }), { code: 'quota_state_invalid', status: 500 });
});

test('quota reservation enforces quota without granting unlimited usage', async () => {
  const firestore = fakeFirestore({ [docId]: { used: 3, limit: 3 } });
  await assert.rejects(() => reserveUserQuota({ ...base, firestore, FieldValue }), { code: 'quota_exceeded', status: 429 });
  assert.equal(firestore.writes.length, 0);
});

test('Firestore NOT_FOUND during quota.load maps to backend configuration error with operation details', async () => {
  const err = new Error('5 NOT_FOUND:');
  err.code = 5;
  const firestore = fakeFirestore({}, { getError: err });
  await assert.rejects(() => reserveUserQuota({ ...base, firestore, FieldValue }), (error) => {
    assert.equal(error.code, 'backend_configuration_error');
    assert.equal(error.status, 503);
    assert.equal(error.details.firebaseOperation, 'quota.load');
    assert.equal(error.details.collection, 'usageQuotas');
    assert.ok(error.details.docIdHash);
    return true;
  });
});

test('Firestore failure during quota.reserve maps to retryable quota persistence failure', async () => {
  const err = new Error('write unavailable');
  err.code = 14;
  const firestore = fakeFirestore({}, { setError: err });
  await assert.rejects(() => reserveUserQuota({ ...base, firestore, FieldValue }), (error) => {
    assert.equal(error.code, 'quota_persistence_failed');
    assert.equal(error.status, 503);
    assert.equal(error.retryable, true);
    assert.equal(error.details.firebaseOperation, 'quota.reserve');
    return true;
  });
});

test('concurrent first-generation reservations do not reset existing counters in the shared document', async () => {
  const firestore = fakeFirestore();
  await Promise.all([
    reserveUserQuota({ ...base, firestore, FieldValue }),
    reserveUserQuota({ ...base, firestore, FieldValue }),
  ]);
  assert.equal(firestore.state.get(docId).used, 2);
});
