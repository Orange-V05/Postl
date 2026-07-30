import { env } from '../../config/env.js';
import { classifyFetchError, classifyHttpError, fetchWithTimeout, ProviderError } from './provider.interface.js';

export function createHuggingFaceProvider(models = []) {
  return {
    name: 'huggingface',
    model: env.HF_MODEL,
    enabled: Boolean(env.HF_TOKEN && models.length),
    metadata: { name: 'huggingface', label: 'Hugging Face', capabilities: ['generation', 'repurpose'], local: false, streamingReady: false, models },
    validateConfig() { return this.enabled ? [] : [env.HF_TOKEN ? 'No enabled Hugging Face models' : 'HF_TOKEN is required']; },
    async health() { return { ok: this.enabled }; },
    async generate({ prompt, temperature, timeoutMs, model }) {
      if (!this.enabled) throw new ProviderError('provider_not_configured', 'Hugging Face is not configured.', false);
      const started = Date.now();
      let response;
      try {
        response = await fetchWithTimeout(`https://api-inference.huggingface.co/models/${model || env.HF_MODEL}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.HF_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: prompt, parameters: { temperature, max_new_tokens: 900, return_full_text: false } }),
        }, timeoutMs);
      } catch (err) { throw classifyFetchError(err, 'huggingface'); }
      if (!response.ok) throw classifyHttpError('huggingface', response.status, await response.text().catch(() => ''));
      const data = await response.json();
      const text = Array.isArray(data) ? data[0]?.generated_text : data.generated_text || data.output || '';
      return { provider: 'huggingface', model: model || env.HF_MODEL, text, latencyMs: Date.now() - started };
    },
  };
}
