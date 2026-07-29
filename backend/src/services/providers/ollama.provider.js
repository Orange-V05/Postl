import { env } from '../../config/env.js';
import { classifyFetchError, fetchWithTimeout, ProviderError } from './provider.interface.js';

export function createOllamaProvider() {
  return {
    name: 'ollama',
    model: env.OLLAMA_MODEL,
    enabled: Boolean(env.OLLAMA_URL && env.OLLAMA_MODEL),
    metadata: { id: 'local-gemma', label: `Local Ollama (${env.OLLAMA_MODEL})`, capabilities: ['generation', 'repurpose'], local: true },
    validateConfig() { return this.enabled ? [] : ['OLLAMA_URL and OLLAMA_MODEL are required']; },
    async health() {
      try {
        const res = await fetchWithTimeout(`${env.OLLAMA_URL}/api/tags`, { method: 'GET' }, 3000);
        return { ok: res.ok, status: res.status };
      } catch { return { ok: false }; }
    },
    async generate({ prompt, temperature, timeoutMs }) {
      const started = Date.now();
      let response;
      try {
        response = await fetchWithTimeout(`${env.OLLAMA_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: env.OLLAMA_MODEL, stream: false, options: { temperature }, messages: [{ role: 'user', content: prompt }] }),
        }, timeoutMs);
      } catch (err) { throw classifyFetchError(err, 'ollama'); }
      if (!response.ok) throw new ProviderError('provider_http_error', `Ollama returned ${response.status}.`, response.status >= 500, { status: response.status });
      const data = await response.json();
      return { provider: 'ollama', model: env.OLLAMA_MODEL, text: data.message?.content || data.response || '', latencyMs: Date.now() - started, finishReason: data.done ? 'stop' : undefined };
    },
  };
}
