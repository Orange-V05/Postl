import { Router } from 'express';
import { getFirebaseAdminState } from '../config/firebaseAdmin.js';
import { cacheStats } from '../services/cache/cache.service.js';
import { getProvider, getProviderStatus } from '../services/providers/providerRegistry.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    data: {
      status: 'ok',
      version: '4.1',
      engine: 'POSTL Core',
      requestJson: true,
      openRouterKeyPresent: getProvider('openrouter')?.validateConfig().includes('OPENROUTER_API_KEY is required') === false,
      cache: cacheStats(),
    },
    error: null,
  });
});

router.get('/ready', async (_req, res) => {
  const firebase = getFirebaseAdminState();
  const providers = getProviderStatus();
  const openrouter = getProvider('openrouter');
  const openrouterHealth = openrouter ? await openrouter.health() : { ok: false, code: 'openrouter_provider_missing' };
  const openrouterReady = Boolean(openrouterHealth.ok);
  const ready = firebase.initialized && openrouterReady;
  res.status(ready ? 200 : 503).json({
    data: {
      status: ready ? 'ready' : 'not_ready',
      firebaseAdmin: {
        ready: firebase.initialized,
        code: firebase.initialized ? 'ok' : (firebase.unavailableReason || 'firebase_admin_not_configured'),
        projectId: firebase.projectId || null,
      },
      openRouter: {
        ready: openrouterReady,
        code: openrouterHealth.code,
        keyPresent: Boolean(openrouterHealth.keyPresent),
        verifiedFreeModels: openrouterHealth.verifiedFreeModels || [],
        paidModelsAllowed: false,
      },
      providers,
    },
    error: ready ? null : {
      code: 'service_not_ready',
      message: 'POSTL backend is running but production dependencies are not fully configured.',
      requestId: res.getHeader('x-request-id'),
      retryable: true,
    },
  });
});

export default router;
