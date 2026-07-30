import { env } from '../../config/env.js';
import { createOllamaProvider } from './ollama.provider.js';
import { createOpenRouterProvider } from './openrouter.provider.js';
import { createHuggingFaceProvider } from './huggingface.provider.js';
import { getEnabledModelsForProvider, getModelById, getModelCatalog } from './modelRegistry.js';

const providers = {
  ollama: createOllamaProvider(getEnabledModelsForProvider('ollama')),
  openrouter: createOpenRouterProvider(getEnabledModelsForProvider('openrouter')),
  huggingface: createHuggingFaceProvider(getEnabledModelsForProvider('huggingface')),
};

export function getProvider(name) {
  return providers[name] || null;
}

export function getProviderChain() {
  return [env.AI_PRIMARY_PROVIDER, ...env.fallbackProviders]
    .filter((name, index, arr) => providers[name] && arr.indexOf(name) === index);
}

export function getAvailableModels() {
  return getModelCatalog()
    .filter((model) => model.enabled && providers[model.provider]?.enabled)
    .map(({ id, label, capabilities, local, privacy, provider }) => ({ id, label, capabilities, local, privacy, provider }));
}

export function resolveModelSelection(modelId) {
  const catalog = getModelCatalog();
  const candidates = [
    getModelById(modelId),
    catalog.find((candidate) => candidate.provider === env.AI_PRIMARY_PROVIDER && candidate.enabled),
    ...catalog.filter((candidate) => candidate.enabled),
  ].filter(Boolean);

  for (const model of candidates) {
    const provider = providers[model.provider];
    if (provider?.enabled) return { model, provider };
  }

  return null;
}

export function getProviderForModelId(modelId) {
  return resolveModelSelection(modelId)?.provider || providers[env.AI_PRIMARY_PROVIDER] || null;
}

export function getProviderStatus() {
  return Object.values(providers).map((provider) => ({
    name: provider.name,
    enabled: provider.enabled,
    active: provider.name === env.AI_PRIMARY_PROVIDER,
    fallbackIndex: env.fallbackProviders.indexOf(provider.name),
    models: provider.metadata.models.map(({ id, label, capabilities, local, privacy }) => ({ id, label, capabilities, local, privacy })),
    capabilities: provider.metadata.capabilities,
    local: provider.metadata.local,
    streamingReady: provider.metadata.streamingReady,
    configErrors: provider.validateConfig(),
  }));
}

export function getRegistryDiagnostics() {
  return {
    primaryProvider: env.AI_PRIMARY_PROVIDER,
    fallbackProviders: env.fallbackProviders,
    enabledModels: getAvailableModels(),
    providers: getProviderStatus(),
  };
}
