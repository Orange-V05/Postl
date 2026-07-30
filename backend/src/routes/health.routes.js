import { Router } from 'express';
import { getFirebaseAdminState } from '../config/firebaseAdmin.js';
import { cacheStats } from '../services/cache/cache.service.js';
import { getProviderStatus } from '../services/providers/providerRegistry.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    data: {
      status: 'ok',
      version: '4.1',
      engine: 'POSTL Core',
      firebaseAdmin: getFirebaseAdminState().initialized ? 'ready' : 'unavailable',
      providers: getProviderStatus(),
      cache: cacheStats(),
    },
    error: null,
  });
});

router.get('/ready', (_req, res) => {
  const firebase = getFirebaseAdminState();
  const providers = getProviderStatus();
  const enabledProviders = providers.filter((provider) => provider.enabled);
  const ready = firebase.initialized && enabledProviders.length > 0;
  res.status(ready ? 200 : 503).json({
    data: {
      status: ready ? 'ready' : 'not_ready',
      firebaseAdmin: firebase.initialized ? 'ready' : 'unavailable',
      providerReady: enabledProviders.length > 0,
      providers,
    },
    error: ready ? null : {
      code: 'service_not_ready',
      message: 'POSTL backend is running but production dependencies are not fully configured.',
      retryable: true,
    },
  });
});

export default router;
