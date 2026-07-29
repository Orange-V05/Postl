import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const apiRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: (req) => ({
    data: null,
    error: {
      code: 'rate_limited',
      message: 'Too many requests. Please try again later.',
      requestId: req.requestId,
      retryable: true,
    },
  }),
});
