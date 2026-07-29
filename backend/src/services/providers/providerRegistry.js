import { env } from '../../config/env.js';
import { createOllamaProvider } from './ollama.provider.js';
import { createOpenRouterProvider } from './openrouter.provider.js';
import { createHuggingFaceProvider } from './huggingface.provider.js';

const providers = {
  ollama: createOllamaProvider(),
  openrouter: createOpenRouterProvider(),
  huggingface: createHuggingFaceProvider(),
};

export function getProvider(name) { return providers[name] || null; }
export function getProviderChain() {
  return [env.AI_PRIMARY_PROVIDER, ...env.fallbackProviders].filter((name, index, arr) => providers[name] && arr.indexOf(name) === index);
}
export function getAvailableModels() {
  return Object.values(providers).filter((provider) => provider.enabled).map((provider) => provider.metadata);
}
export function getProviderForModelId(modelId) {
  return Object.values(providers).find((provider) => provider.metadata.id === modelId && provider.enabled) || providers[env.AI_PRIMARY_PROVIDER];
}
export function getProviderStatus() {
  return Object.values(providers).map((provider) => ({ name: provider.name, enabled: provider.enabled, model: provider.model, configErrors: provider.validateConfig() }));
}
