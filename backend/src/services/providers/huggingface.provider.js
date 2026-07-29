import { env } from '../../config/env.js';
import { classifyFetchError, fetchWithTimeout, ProviderError } from './provider.interface.js';

export function createHuggingFaceProvider() {
  return {
    name: 'huggingface',
    model: env.HF_MODEL,
    enabled: Boolean(env.HF_TOKEN),
    metadata: { id: 'cloud-huggingface', label: `Hugging Face (${env.HF_MODEL})`, capabilities: ['generation'], local: false },
    validateConfig() { return this.enabled ? [] : ['HF_TOKEN is required']; },
    async health() { return { ok: this.enabled }; },
    async generate({ prompt, temperature, timeoutMs }) {
      if (!this.enabled) throw new ProviderError('provider_not_configured', 'Hugging Face is not configured.', false);
      const started = Date.now();
      let response;
      try {
        response = await fetchWithTimeout(`https://api-inference.huggingface.co/models/${env.HF_MODEL}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.HF_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: prompt, parameters: { temperature, max_new_tokens: 900, return_full_text: false } }),
        }, timeoutMs);
      } catch (err) { throw classifyFetchError(err, 'huggingface'); }
      if (!response.ok) throw new ProviderError('provider_http_error', `Hugging Face returned ${response.status}.`, response.status === 429 || response.status >= 500, { status: response.status });
      const data = await response.json();
      const text = Array.isArray(data) ? data[0]?.generated_text : data.generated_text || data.output || '';
      return { provider: 'huggingface', model: env.HF_MODEL, text, latencyMs: Date.now() - started };
    },
  };
}
