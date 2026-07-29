import app from './app.js';
import { env } from './config/env.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('server');
let server;

export function startServer() {
  if (server) return server;
  server = app.listen(env.PORT, () => {
    logger.info('POSTL backend listening', { port: env.PORT });
  });
  return server;
}

export async function stopServer(signal = 'manual') {
  if (!server) return;
  logger.info('POSTL backend shutting down', { signal });
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  server = undefined;
}

if (!process.env.LAMBDA_TASK_ROOT && !process.env.NETLIFY && process.env.POSTL_NO_LISTEN !== '1') {
  startServer();
}

async function shutdown(signal) {
  try {
    await stopServer(signal);
    process.exit(0);
  } catch (err) {
    logger.error('Graceful shutdown failed', { message: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: reason?.message || String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: env.isProduction ? undefined : err.stack });
});
