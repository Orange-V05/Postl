import { getFirebaseAdmin, getFirebaseAdminState } from '../config/firebaseAdmin.js';
import { ApiError } from './errorHandler.js';
import { createLogger } from '../utils/logger.js';
import { isFirebaseNotFound, safeFirebaseErrorMeta, safeHashId } from '../utils/firebaseDiagnostics.js';

const logger = createLogger('auth');

export async function authenticate(req, _res, next) {
  const admin = getFirebaseAdmin();
  if (!admin) {
    const state = getFirebaseAdminState();
    return next(new ApiError('auth_service_unavailable', 'Authentication service is not configured on this server.', 503, false, { reason: state.unavailableReason, firebaseOperation: 'auth.admin_unavailable' }));
  }

  const authHeader = req.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError('auth_missing_token', 'Authentication token is required.', 401, false));
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return next(new ApiError('auth_missing_token', 'Authentication token is required.', 401, false));
  }

  const operation = 'auth.verify_token';
  logger.info('Firebase operation started', { requestId: req.requestId, operation });
  try {
    req.user = await admin.auth().verifyIdToken(token);
    logger.info('Firebase operation succeeded', { requestId: req.requestId, operation, uidHash: safeHashId(req.user?.uid || '') });
    return next();
  } catch (err) {
    logger.warn('Firebase operation failed', { requestId: req.requestId, operation, ...safeFirebaseErrorMeta(err) });
    if (isFirebaseNotFound(err)) {
      return next(new ApiError('account_initialization_failed', 'The authenticated account could not be found by Firebase Authentication.', 401, false, { firebaseOperation: operation, firebaseCode: safeFirebaseErrorMeta(err).firebaseCode }));
    }
    return next(new ApiError('auth_invalid_token', 'Authentication token is invalid or expired.', 401, false, { firebaseOperation: operation, firebaseCode: safeFirebaseErrorMeta(err).firebaseCode }));
  }
}
