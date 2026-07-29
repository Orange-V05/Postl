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

export default router;
