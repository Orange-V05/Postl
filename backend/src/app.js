import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { initializeFirebaseAdmin } from './config/firebaseAdmin.js';
import { requestId } from './middleware/requestId.js';
import { apiRateLimit } from './middleware/rateLimit.js';
import { ApiError, errorHandler, notFound } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import generationRoutes from './routes/generation.routes.js';
import modelsRoutes from './routes/models.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import repurposeRoutes from './routes/repurpose.routes.js';

initializeFirebaseAdmin();

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(requestId);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin && !env.isProduction) return callback(null, true);
      if (env.allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS policy.'));
    },
    credentials: true,
  }));
  app.use((req, _res, next) => {
    const hasBody = req.headers['content-length'] || req.headers['transfer-encoding'];
    if (hasBody && ['POST', 'PUT', 'PATCH'].includes(req.method) && req.is('application/json') === false) {
      return next(new ApiError('unsupported_media_type', 'Requests with a body must use application/json.', 415, false));
    }
    return next();
  });
  app.use(express.json({ limit: '1mb', strict: true }));
  app.use(apiRateLimit);

  const api = express.Router();
  api.use(healthRoutes);
  api.use(modelsRoutes);
  api.use(generationRoutes);
  api.use(feedbackRoutes);
  api.use(repurposeRoutes);

  app.use('/api', api);
  app.use('/.netlify/functions/api', api);
  app.use('/', api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export default createApp();
