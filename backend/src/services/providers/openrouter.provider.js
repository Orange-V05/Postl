import { env } from '../../config/env.js';
import { classifyFetchError, classifyHttpError, fetchWithTimeout, ProviderError, PROVIDER_ERROR_CODES } from './provider.interface.js';

export function createOpenRouterProvider(models = []) {
  return {
    name: 'openrouter',
    model: env.OPENROUTER_MODEL,
    enabled: Boolean(env.OPENROUTER_API_KEY && models.length),
    metadata: { name: 'openrouter', label: 'OpenRouter', capabilities: ['generation', 'repurpose', 'structured-json'], local: false, streamingReady: true, models },
    validateConfig() { return this.enabled ? [] : [env.OPENROUTER_API_KEY ? 'No enabled OpenRouter models' : 'OPENROUTER_API_KEY is required']; },
    async health() { return { ok: this.enabled }; },
    async generate({ prompt, temperature, timeoutMs, model }) {
      if (!this.enabled) throw new ProviderError(PROVIDER_ERROR_CODES.CONFIGURATION_ERROR, 'OpenRouter is not configured.', false, { provider: 'openrouter' });
      const started = Date.now();
      let response;
      try {
        response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': env.OPENROUTER_HTTP_REFERER, 'X-Title': env.OPENROUTER_APP_TITLE },
          body: JSON.stringify({ model: model || env.OPENROUTER_MODEL, temperature, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
        }, timeoutMs);
      } catch (err) { throw classifyFetchError(err, 'openrouter'); }
      if (!response.ok) throw classifyHttpError('openrouter', response.status, await response.text().catch(() => ''));
      const data = await response.json();
      return { provider: 'openrouter', model: model || env.OPENROUTER_MODEL, text: data.choices?.[0]?.message?.content || '', latencyMs: Date.now() - started, finishReason: data.choices?.[0]?.finish_reason, usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens } : undefined };
    },
  };
}
