import { Router } from 'express';
import { getAvailableModels, getProviderStatus } from '../services/providers/providerRegistry.js';
import { PLATFORMS, OBJECTIVES, TONES } from '../services/generation/contentDefinitions.js';

const router = Router();

router.get('/models', (_req, res) => {
  res.json({
    data: {
      models: getAvailableModels(),
      providers: getProviderStatus(),
      platforms: PLATFORMS,
      objectives: OBJECTIVES,
      tones: TONES,
      legacyLocalAi: {
        status: 'experimental-disabled',
        reason: 'The Flask GPT-2 Large service is not launched by default because it is legacy, resource-heavy, and not instruction-tuned for production fallback.',
      },
    },
    error: null,
  });
});

export default router;
