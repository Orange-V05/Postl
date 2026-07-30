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

  it('appends exactly one /api segment for valid backend origins', () => {
    expect(validateApiBaseUrl('https://postl.onrender.com///', true)).toMatchObject({ ready: true, baseUrl: 'https://postl.onrender.com/api', code: 'ok' });
  });

  it('preserves a single /api segment', () => {
    expect(validateApiBaseUrl('https://postl.onrender.com/api/', true)).toMatchObject({ ready: true, baseUrl: 'https://postl.onrender.com/api', code: 'ok' });
  });

  it('rejects duplicated /api segments', () => {
    expect(validateApiBaseUrl('https://postl.onrender.com/api/api', true)).toMatchObject({ ready: false, code: 'duplicate_api_prefix' });
  });

  it('prevents localhost production URLs even with /api', () => {
    expect(validateApiBaseUrl('https://127.0.0.1:4000/api', true)).toMatchObject({ ready: false, code: 'localhost_in_production' });
  });
});
