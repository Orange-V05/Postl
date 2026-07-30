import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Joi from 'joi';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('env');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const repoRoot = path.resolve(backendRoot, '..');

dotenv.config({ path: path.join(backendRoot, '.env') });
dotenv.config({ path: path.join(repoRoot, '.env') });

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4000),
  ALLOWED_ORIGINS: Joi.string().allow('').default('http://localhost:3005,http://127.0.0.1:3005'),
  FIREBASE_SERVICE_ACCOUNT_KEY: Joi.string().allow('').default(''),
  FIREBASE_SERVICE_ACCOUNT_JSON: Joi.string().allow('').default(''),
  FIREBASE_SERVICE_ACCOUNT_PATH: Joi.string().allow('').default(path.join(backendRoot, 'service-account.json')),
  FIREBASE_PROJECT_ID: Joi.string().allow('').default(''),
  FIREBASE_CLIENT_EMAIL: Joi.string().allow('').default(''),
  FIREBASE_PRIVATE_KEY: Joi.string().allow('').default(''),
  AI_PRIMARY_PROVIDER: Joi.string().valid('ollama', 'openrouter', 'huggingface').allow('').default(''),
  AI_FALLBACK_PROVIDERS: Joi.string().allow('').default('openrouter,huggingface'),
  OLLAMA_URL: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://localhost:11434'),
  OLLAMA_MODEL: Joi.string().default('gemma-4:e2b'),
  OPENROUTER_API_KEY: Joi.string().allow('').default(''),
  OPENROUTER_MODEL: Joi.string().default('google/gemma-3-27b-it:free'),
  OPENROUTER_FREE_MODELS: Joi.string().allow('').default(''),
  ALLOW_PAID_AI_MODELS: Joi.boolean().truthy('true').falsy('false').default(false),
  HF_TOKEN: Joi.string().allow('').default(''),
  HF_MODEL: Joi.string().default('google/gemma-2b-it'),
  AI_MODELS: Joi.string().allow('').default(''),
  USER_DAILY_GENERATION_LIMIT: Joi.number().integer().min(0).default(25),
  USER_DAILY_REPURPOSE_LIMIT: Joi.number().integer().min(0).default(10),
  OPENROUTER_HTTP_REFERER: Joi.string().uri({ scheme: ['http', 'https'] }).allow('').default('https://postl.vercel.app'),
  OPENROUTER_APP_TITLE: Joi.string().trim().max(100).default('POSTL Content Intelligence'),
  CACHE_TTL_MS: Joi.number().integer().min(0).default(60 * 60 * 1000),
  CACHE_MAX_ITEMS: Joi.number().integer().min(0).default(200),
  PROVIDER_TIMEOUT_MS: Joi.number().integer().min(1000).default(45000),
  PROVIDER_CONCURRENCY: Joi.number().integer().min(1).max(3).default(1),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(15 * 60 * 1000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(100),
}).unknown(true);

const { value, error } = schema.validate(process.env, { abortEarly: false, convert: true });
if (error) {
  const message = error.details.map((d) => d.message).join('; ');
  throw new Error(`Invalid backend environment: ${message}`);
}

const origins = value.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
if (value.NODE_ENV === 'production' && origins.length === 0) {
  throw new Error('ALLOWED_ORIGINS must be set explicitly in production when credentials are enabled.');
}

const fallbackProviders = value.AI_FALLBACK_PROVIDERS.split(',').map((p) => p.trim()).filter(Boolean);
const aiPrimaryProvider = value.AI_PRIMARY_PROVIDER || (value.NODE_ENV === 'production' ? 'openrouter' : 'ollama');

export const env = Object.freeze({
  ...value,
  AI_PRIMARY_PROVIDER: aiPrimaryProvider,
  backendRoot,
  repoRoot,
  allowedOrigins: origins,
  fallbackProviders,
  isProduction: value.NODE_ENV === 'production',
  isDevelopment: value.NODE_ENV !== 'production',
});

if (!env.isProduction) {
  logger.info('Backend environment loaded', {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    allowedOrigins: env.allowedOrigins,
    aiPrimaryProvider: env.AI_PRIMARY_PROVIDER,
    aiFallbackProviders: env.fallbackProviders,
  });
}
