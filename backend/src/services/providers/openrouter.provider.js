import { env } from '../../config/env.js';
import { classifyFetchError, fetchWithTimeout, ProviderError } from './provider.interface.js';

export function createOpenRouterProvider() {
  return {
    name: 'openrouter',
    model: env.OPENROUTER_MODEL,
    enabled: Boolean(env.OPENROUTER_API_KEY),
    metadata: { id: 'cloud-openrouter', label: `OpenRouter (${env.OPENROUTER_MODEL})`, capabilities: ['generation', 'repurpose'], local: false },
    validateConfig() { return this.enabled ? [] : ['OPENROUTER_API_KEY is required']; },
    async health() { return { ok: this.enabled }; },
    async generate({ prompt, temperature, timeoutMs }) {
      if (!this.enabled) throw new ProviderError('provider_not_configured', 'OpenRouter is not configured.', false);
      const started = Date.now();
      let response;
      try {
        response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'POSTL Content Intelligence' },
          body: JSON.stringify({ model: env.OPENROUTER_MODEL, temperature, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
        }, timeoutMs);
      } catch (err) { throw classifyFetchError(err, 'openrouter'); }
      if (!response.ok) throw new ProviderError('provider_http_error', `OpenRouter returned ${response.status}.`, response.status === 429 || response.status >= 500, { status: response.status });
      const data = await response.json();
      return { provider: 'openrouter', model: env.OPENROUTER_MODEL, text: data.choices?.[0]?.message?.content || '', latencyMs: Date.now() - started, finishReason: data.choices?.[0]?.finish_reason, usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens } : undefined };
    },
  };
}
