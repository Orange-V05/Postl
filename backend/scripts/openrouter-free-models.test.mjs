import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasZeroPromptAndCompletionPricing, isConfiguredOpenRouterFreeModel } from '../src/services/providers/openrouter.provider.js';

test('OpenRouter pricing helper accepts exactly zero prompt and completion prices', () => {
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: { prompt: '0', completion: '0' } }), true);
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: { prompt: 0, completion: 0 } }), true);
});

test('OpenRouter pricing helper rejects paid or unverifiable prices', () => {
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: { prompt: '0.0000001', completion: '0' } }), false);
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: { prompt: '0', completion: '0.0000001' } }), false);
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: { prompt: '', completion: '0' } }), false);
  assert.equal(hasZeroPromptAndCompletionPricing({ pricing: {} }), false);
});

test('OpenRouter model allowlist is administrator controlled', () => {
  const configured = (process.env.OPENROUTER_FREE_MODELS || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (configured.length) assert.equal(isConfiguredOpenRouterFreeModel(configured[0]), true);
  assert.equal(isConfiguredOpenRouterFreeModel('openai/gpt-4o'), false);
});
