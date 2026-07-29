import app from './app.js';
import { env } from './config/env.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('server');

if (!process.env.LAMBDA_TASK_ROOT && !process.env.NETLIFY) {
  app.listen(env.PORT, () => {
    logger.info('POSTL backend listening', { port: env.PORT });
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: reason?.message || String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: env.isProduction ? undefined : err.stack });
});
