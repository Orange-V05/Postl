import { createLogger } from '../utils/logger.js';

const logger = createLogger('error-handler');

export class ApiError extends Error {
  constructor(code, message, status = 500, retryable = false, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.details = details;
  }
}

export function notFound(req, res, next) {
  next(new ApiError('not_found', `Route not found: ${req.method} ${req.originalUrl}`, 404, false));
}

export function errorHandler(err, req, res, _next) {
  const isJsonSyntaxError = err instanceof SyntaxError && err.status === 400 && 'body' in err;
  const isTooLarge = err?.type === 'entity.too.large';
  const status = isJsonSyntaxError ? 400 : isTooLarge ? 413 : Number.isInteger(err.status) ? err.status : 500;
  const code = err.code || (isJsonSyntaxError ? 'malformed_json' : isTooLarge ? 'payload_too_large' : status >= 500 ? 'internal_error' : 'bad_request');
  const retryable = Boolean(err.retryable);
  const requestId = req.requestId;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error(err.message || 'Unhandled error', {
    requestId,
    code,
    status,
    retryable,
    stack: isProduction ? undefined : err.stack,
    details: isProduction ? undefined : err.details,
  });

  res.status(status).json({
    data: null,
    error: {
      code,
      message: status >= 500 && isProduction ? 'An internal service error occurred.' : err.message,
      requestId,
      retryable,
      ...(isProduction || !err.details ? {} : { details: err.details }),
    },
  });
}
