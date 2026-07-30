import { env } from '../../config/env.js';

const configuredModels = (env.AI_MODELS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const openRouterConfiguredFreeModels = (env.OPENROUTER_FREE_MODELS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const openRouterModelCandidates = env.ALLOW_PAID_AI_MODELS
  ? [env.OPENROUTER_MODEL].filter(Boolean)
  : (openRouterConfiguredFreeModels.length > 0
    ? openRouterConfiguredFreeModels
    : [env.OPENROUTER_MODEL].filter((model) => model && model.endsWith(':free')));

const defaults = [
  {
    id: 'balanced-cloud',
    label: 'Balanced Cloud',
    provider: 'openrouter',
    providerModel: openRouterModelCandidates[0],
    providerModels: openRouterModelCandidates,
    capabilities: ['generation', 'repurpose', 'structured-json'],
    local: false,
    enabled: Boolean(env.OPENROUTER_API_KEY && openRouterModelCandidates.length),
    privacy: 'cloud',
  },
  {
    id: 'local-gemma',
    label: 'Local Ollama',
    provider: 'ollama',
    providerModel: env.OLLAMA_MODEL,
    providerModels: [env.OLLAMA_MODEL].filter(Boolean),
    capabilities: ['generation', 'repurpose', 'structured-json'],
    local: true,
    enabled: env.isDevelopment && Boolean(env.OLLAMA_URL && env.OLLAMA_MODEL),
    privacy: 'local',
  },
  {
    id: 'economy-hf',
    label: 'Economy Cloud',
    provider: 'huggingface',
    providerModel: env.HF_MODEL,
    providerModels: [env.HF_MODEL].filter(Boolean),
    capabilities: ['generation', 'repurpose'],
    local: false,
    enabled: Boolean(env.HF_TOKEN),
    privacy: 'cloud',
  },
];

export function getModelCatalog() {
  const allow = new Set(configuredModels);
  return defaults
    .filter((model) => configuredModels.length === 0 || allow.has(model.id))
    .map((model) => ({ ...model, enabled: model.enabled && Boolean(model.providerModel) }));
}

export function getEnabledModelsForProvider(providerName) {
  return getModelCatalog().filter((model) => model.provider === providerName && model.enabled);
}

export function getModelById(modelId) {
  return getModelCatalog().find((model) => model.id === modelId) || null;
}
