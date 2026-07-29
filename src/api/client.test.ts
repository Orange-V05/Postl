import { ApiClientError, apiRequest } from './client';

describe('api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns data from successful envelopes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { ok: true }, error: null }), { status: 200 }) as any);
    await expect(apiRequest('/health')).resolves.toEqual({ ok: true });
  });

  it('normalizes API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: null, error: { code: 'bad', message: 'Nope', requestId: 'r1', retryable: false } }), { status: 400 }) as any);
    await expect(apiRequest('/bad')).rejects.toBeInstanceOf(ApiClientError);
  });
});
