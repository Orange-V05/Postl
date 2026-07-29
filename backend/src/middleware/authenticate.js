import { getFirebaseAdmin, getFirebaseAdminState } from '../config/firebaseAdmin.js';
import { ApiError } from './errorHandler.js';

export async function authenticate(req, _res, next) {
  const admin = getFirebaseAdmin();
  if (!admin) {
    const state = getFirebaseAdminState();
    return next(new ApiError('auth_service_unavailable', 'Authentication service is not configured on this server.', 503, false, { reason: state.unavailableReason }));
  }

  const authHeader = req.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError('auth_missing_token', 'Authentication token is required.', 401, false));
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return next(new ApiError('auth_missing_token', 'Authentication token is required.', 401, false));
  }

  try {
    req.user = await admin.auth().verifyIdToken(token);
    return next();
  } catch (_err) {
    return next(new ApiError('auth_invalid_token', 'Authentication token is invalid or expired.', 401, false));
  }
}
