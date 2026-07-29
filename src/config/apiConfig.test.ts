import { describe, expect, it } from 'vitest';
import { validateApiBaseUrl } from './apiConfig';

describe('validateApiBaseUrl', () => {
  it('uses same-origin /api only in development when unset', () => {
    expect(validateApiBaseUrl('', false)).toMatchObject({ ready: true, baseUrl: '/api', code: 'ok' });
  });

  it('requires an explicit production backend URL when unset', () => {
    expect(validateApiBaseUrl('', true)).toMatchObject({ ready: false, code: 'missing' });
  });

  it('requires HTTPS in production', () => {
    expect(validateApiBaseUrl('http://api.example.com', true)).toMatchObject({ ready: false, code: 'insecure_url' });
  });

  it('rejects localhost in production', () => {
    expect(validateApiBaseUrl('https://localhost:4000/', true)).toMatchObject({ ready: false, code: 'localhost_in_production' });
  });

  it('normalizes trailing slashes for valid URLs', () => {
    expect(validateApiBaseUrl('https://api.postl.example.com///', true)).toMatchObject({ ready: true, baseUrl: 'https://api.postl.example.com', code: 'ok' });
  });
});
