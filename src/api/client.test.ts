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

  it('normalizes network failures with a request id', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed')) as any;
    await expect(apiRequest('/offline')).rejects.toMatchObject({
      code: 'network_unavailable',
      status: 0,
      retryable: true,
    });
  });

  it('uses backend request id and retry metadata when present', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: null, error: { code: 'quota_exceeded', message: 'Daily quota reached.', retryable: false, retryAfterSeconds: 120 } }), {
      status: 429,
      headers: { 'x-request-id': 'backend-rid', 'retry-after': '120' },
    }) as any);
    await expect(apiRequest('/quota')).rejects.toMatchObject({
      code: 'quota_exceeded',
      requestId: 'backend-rid',
      retryAfterSeconds: 120,
    });
  });
});
