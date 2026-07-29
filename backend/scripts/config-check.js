import { env } from '../src/config/env.js';
import { initializeFirebaseAdmin, getFirebaseAdminState } from '../src/config/firebaseAdmin.js';
import { getProviderStatus } from '../src/services/providers/providerRegistry.js';

const firebaseState = initializeFirebaseAdmin();
const providers = getProviderStatus();
const enabledProviders = providers.filter((provider) => provider.enabled);

const result = {
  ok: true,
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  allowedOrigins: env.allowedOrigins,
  firebaseAdmin: getFirebaseAdminState(),
  providers: providers.map((provider) => ({
    name: provider.name,
    enabled: provider.enabled,
    model: provider.model,
    configErrors: provider.configErrors,
  })),
};

if (env.isProduction && !firebaseState.initialized) {
  result.ok = false;
  result.error = 'Firebase Admin must initialize in production.';
}

if (enabledProviders.length === 0) {
  result.ok = false;
  result.error = result.error || 'At least one AI provider must be enabled.';
}

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
