import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogErrorCode, catalogModelsFromPayload, evaluateConfiguredOpenRouterModels, hasZeroPromptAndCompletionPricing, isConfiguredOpenRouterFreeModel, refreshOpenRouterCatalog } from '../src/services/providers/openrouter.provider.js';

test('OpenRouter pricing helper accepts exactly zero prompt and completion prices', () => {
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: { prompt: '0', completion: '0' } }), true);
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: { prompt: 0, completion: 0 } }), true);
});

test('OpenRouter pricing helper rejects paid or unverifiable prices', () => {
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: { prompt: '0.0000001', completion: '0' } }), false);
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: { prompt: '0', completion: '0.0000001' } }), false);
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: { prompt: '', completion: '0' } }), false);
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: {} }), false);
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: { prompt: '-0', completion: '0' } }), false);
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: { prompt: '-1', completion: '0' } }), false);
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: { prompt: 'not-a-price', completion: '0' } }), false);
});

test('OpenRouter model allowlist is administrator controlled', () => {
  const configured = (process.env.OPENROUTER_FREE_MODELS || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (configured.length) assert.equal(isConfiguredOpenRouterFreeModel(configured[0]), true);
  assert.equal(isConfiguredOpenRouterFreeModel('openai/gpt-4o'), false);
});

test('catalog evaluation uses exact IDs, supports colon-suffixed free variants, and retains valid mixed models', () => {
  const models = catalogModelsFromPayload({ data: [
    { id: 'vendor/model:free', pricing: { prompt: '0', completion: '0' } },
    { id: 'vendor/paid:free', pricing: { prompt: '0.1', completion: '0' } },
  ] });
  const result = evaluateConfiguredOpenRouterModels(models, ['vendor/model:free', 'vendor/missing:free', 'vendor/paid:free']);
  assert.deepEqual(result.verified.map((model) => model.id), ['vendor/model:free']);
  assert.deepEqual(result.observations.map((item) => item.present), [true, false, true]);
  assert.deepEqual(result.observations.map((item) => item.zeroPriced), [true, false, false]);
  assert.equal(result.observations[0].promptPriceType, 'string');
});

test('catalog response and upstream failures receive safe diagnostic codes', () => {
  assert.throws(() => catalogModelsFromPayload({ models: [] }), { code: 'provider_catalog_invalid' });
  assert.equal(catalogErrorCode({ status: 401 }), 'catalog_auth_failed');
  assert.equal(catalogErrorCode({ name: 'AbortError', code: 'provider_timeout' }), 'catalog_timeout');
  assert.equal(catalogErrorCode({ code: 'provider_network_error' }), 'catalog_network_error');
  assert.equal(catalogErrorCode({ code: 'provider_catalog_invalid' }), 'catalog_invalid_response');
});

test('catalog fetch detects 401, timeout, and malformed JSON without exposing bodies', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('not-authorized', { status: 401 });
    await assert.rejects(() => refreshOpenRouterCatalog(50), (error) => catalogErrorCode(error) === 'catalog_auth_failed');

    globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });
    await assert.rejects(() => refreshOpenRouterCatalog(1), (error) => catalogErrorCode(error) === 'catalog_timeout');

    globalThis.fetch = async () => new Response('{not-json', { status: 200, headers: { 'content-type': 'application/json' } });
    await assert.rejects(() => refreshOpenRouterCatalog(50), (error) => catalogErrorCode(error) === 'catalog_invalid_response');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
