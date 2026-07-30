import crypto from 'crypto';

export function safeHashId(value = '') {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
}

export function firebaseErrorCode(err) {
  return err?.code || err?.errorInfo?.code || err?.status || err?.details?.firebaseCode || 'unknown';
}

export function isFirebaseNotFound(err) {
  const code = firebaseErrorCode(err);
  return code === 5 || code === '5' || code === 'NOT_FOUND' || code === 'not-found' || code === 'auth/user-not-found';
}

export function safeFirebaseErrorMeta(err) {
  return {
    firebaseCode: firebaseErrorCode(err),
    firebaseMessage: typeof err?.message === 'string' ? err.message.slice(0, 120) : '',
  };
}
