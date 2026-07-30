import { Router } from 'express';
import { getRegistryDiagnostics } from '../services/providers/providerRegistry.js';
import { PLATFORMS, OBJECTIVES, TONES } from '../services/generation/contentDefinitions.js';

const router = Router();

router.get('/models', (_req, res) => {
  const registry = getRegistryDiagnostics();
  res.json({
    data: {
      models: registry.enabledModels,
      providers: registry.providers,
      activeProvider: registry.primaryProvider,
      fallbackProviders: registry.fallbackProviders,
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
