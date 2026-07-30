import { env } from '../../config/env.js';
import { classifyFetchError, classifyHttpError, fetchWithTimeout, ProviderError, PROVIDER_ERROR_CODES } from './provider.interface.js';

export const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';
let catalogCache = { fetchedAt: 0, byId: new Map(), error: null };

export function getConfiguredOpenRouterFreeModels() {
  return (env.OPENROUTER_FREE_MODELS || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function numericPrice(value) {
  if (value === 0 || value === '0') return 0;
  if (value === null || value === undefined || value === '') return Number.NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function hasZeroPromptAndCompletionPricing(model) {
  return numericPrice(model?.pricing?.prompt) === 0 && numericPrice(model?.pricing?.completion) === 0;
}

export function isConfiguredOpenRouterFreeModel(modelId) {
  return getConfiguredOpenRouterFreeModels().includes(modelId);
}

async function refreshOpenRouterCatalog(timeoutMs = env.PROVIDER_TIMEOUT_MS) {
  let response;
  try {
    response = await fetchWithTimeout(`${OPENROUTER_API_BASE}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.OPENROUTER_HTTP_REFERER,
        'X-Title': env.OPENROUTER_APP_TITLE,
      },
    }, timeoutMs);
  } catch (err) {
    throw classifyFetchError(err, 'openrouter');
  }
  if (!response.ok) throw classifyHttpError('openrouter', response.status, await response.text().catch(() => ''));
  const data = await response.json().catch(() => null);
  if (!Array.isArray(data?.data)) throw new ProviderError('provider_catalog_invalid', 'OpenRouter returned an invalid model catalog.', true, { provider: 'openrouter' });
  catalogCache = { fetchedAt: Date.now(), byId: new Map(data.data.map((model) => [model.id, model])), error: null };
  return catalogCache;
}

export async function getOpenRouterCatalog({ force = false, timeoutMs = env.PROVIDER_TIMEOUT_MS } = {}) {
  const fresh = catalogCache.byId.size > 0 && Date.now() - catalogCache.fetchedAt < env.OPENROUTER_CATALOG_TTL_MS;
  if (!force && fresh) return catalogCache;
  if (!env.OPENROUTER_API_KEY) {
    const error = new ProviderError(PROVIDER_ERROR_CODES.CONFIGURATION_ERROR, 'OpenRouter API key is not configured.', false, { provider: 'openrouter' });
    catalogCache.error = error;
    throw error;
  }
  return refreshOpenRouterCatalog(timeoutMs);
}

export async function verifyOpenRouterFreeModel(modelId, options = {}) {
  if (!isConfiguredOpenRouterFreeModel(modelId)) throw new ProviderError('free_model_not_allowlisted', 'Requested OpenRouter model is not in the configured free-model allowlist.', false, { provider: 'openrouter', model: modelId });
  const catalog = await getOpenRouterCatalog(options);
  const model = catalog.byId.get(modelId);
  if (!model) throw new ProviderError(PROVIDER_ERROR_CODES.MODEL_NOT_FOUND, 'Configured OpenRouter free model is unavailable.', true, { provider: 'openrouter', model: modelId });
  if (!hasZeroPromptAndCompletionPricing(model)) throw new ProviderError('paid_model_rejected', 'Configured OpenRouter model is not verified as zero price.', false, { provider: 'openrouter', model: modelId });
  return model;
}

export async function getVerifiedOpenRouterFreeModels(options = {}) {
  const verified = [];
  for (const modelId of getConfiguredOpenRouterFreeModels()) {
    try {
      const model = await verifyOpenRouterFreeModel(modelId, options);
      verified.push({ id: model.id, name: model.name || model.id, contextLength: model.context_length, architecture: model.architecture });
    } catch {
      // Readiness reports aggregate availability without exposing provider internals.
    }
  }
  return verified;
}

export function createOpenRouterProvider(models = []) {
  const configuredFreeModels = getConfiguredOpenRouterFreeModels();
  return {
    name: 'openrouter',
    model: configuredFreeModels[0] || env.OPENROUTER_MODEL,
    enabled: Boolean(env.OPENROUTER_API_KEY && configuredFreeModels.length && models.length && env.ALLOW_PAID_AI_MODELS === false),
    metadata: { name: 'openrouter', label: 'OpenRouter', capabilities: ['generation', 'repurpose', 'structured-json'], local: false, streamingReady: true, models },
    validateConfig() {
      const errors = [];
      if (!env.OPENROUTER_API_KEY) errors.push('OPENROUTER_API_KEY is required');
      if (!configuredFreeModels.length) errors.push('OPENROUTER_FREE_MODELS must contain verified zero-price model IDs');
      if (env.ALLOW_PAID_AI_MODELS) errors.push('ALLOW_PAID_AI_MODELS must remain false');
      if (!models.length) errors.push('No enabled OpenRouter friendly models');
      return errors;
    },
    async health() {
      if (!this.enabled) return { ok: false, keyPresent: Boolean(env.OPENROUTER_API_KEY), code: 'openrouter_not_configured' };
      try {
        const verified = await getVerifiedOpenRouterFreeModels();
        return { ok: verified.length > 0, keyPresent: true, verifiedFreeModels: verified.map((model) => model.id), code: verified.length ? 'ok' : 'free_models_temporarily_unavailable' };
      } catch (err) {
        return { ok: false, keyPresent: true, code: err.code || 'free_model_verification_failed' };
      }
    },
    async generate({ prompt, temperature, timeoutMs, model }) {
      if (!this.enabled) throw new ProviderError(PROVIDER_ERROR_CODES.CONFIGURATION_ERROR, 'OpenRouter is not configured for free-model production use.', false, { provider: 'openrouter' });
      const selectedModel = model || configuredFreeModels[0];
      await verifyOpenRouterFreeModel(selectedModel, { timeoutMs });
      const started = Date.now();
      let response;
      try {
        response = await fetchWithTimeout(`${OPENROUTER_API_BASE}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': env.OPENROUTER_HTTP_REFERER, 'X-Title': env.OPENROUTER_APP_TITLE },
          body: JSON.stringify({ model: selectedModel, temperature, max_tokens: env.MAX_OUTPUT_TOKENS, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: String(prompt).slice(0, env.MAX_PROMPT_LENGTH) }] }),
        }, timeoutMs);
      } catch (err) { throw classifyFetchError(err, 'openrouter'); }
      if (!response.ok) throw classifyHttpError('openrouter', response.status, await response.text().catch(() => ''));
      const data = await response.json().catch(() => null);
      const text = data?.choices?.[0]?.message?.content || '';
      if (!text) throw new ProviderError('provider_malformed_response', 'OpenRouter returned an empty or malformed response.', true, { provider: 'openrouter', model: selectedModel });
      return { provider: 'openrouter', model: selectedModel, text, latencyMs: Date.now() - started, finishReason: data.choices?.[0]?.finish_reason, usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens } : undefined };
    },
  };
}
