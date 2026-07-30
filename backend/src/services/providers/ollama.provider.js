import { env } from '../../config/env.js';
import { classifyFetchError, classifyHttpError, fetchWithTimeout } from './provider.interface.js';

export function createOllamaProvider(models = []) {
  return {
    name: 'ollama',
    model: env.OLLAMA_MODEL,
    enabled: Boolean(env.isDevelopment && env.OLLAMA_URL && env.OLLAMA_MODEL && models.length),
    metadata: { name: 'ollama', label: 'Local Ollama', capabilities: ['generation', 'repurpose', 'structured-json'], local: true, streamingReady: true, models },
    validateConfig() { return this.enabled ? [] : [env.isProduction ? 'Ollama is disabled in production unless deployed as a real network service' : 'OLLAMA_URL, OLLAMA_MODEL, and an enabled local model are required']; },
    async health() {
      try {
        const res = await fetchWithTimeout(`${env.OLLAMA_URL}/api/tags`, { method: 'GET' }, 3000);
        return { ok: res.ok, status: res.status };
      } catch { return { ok: false }; }
    },
    async generate({ prompt, temperature, timeoutMs, model }) {
      const started = Date.now();
      let response;
      try {
        response = await fetchWithTimeout(`${env.OLLAMA_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: model || env.OLLAMA_MODEL, stream: false, options: { temperature }, messages: [{ role: 'user', content: prompt }] }),
        }, timeoutMs);
      } catch (err) { throw classifyFetchError(err, 'ollama'); }
      if (!response.ok) throw classifyHttpError('ollama', response.status, await response.text().catch(() => ''));
      const data = await response.json();
      return { provider: 'ollama', model: model || env.OLLAMA_MODEL, text: data.message?.content || data.response || '', latencyMs: Date.now() - started, finishReason: data.done ? 'stop' : undefined };
    },
  };
}
