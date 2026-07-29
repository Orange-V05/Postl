export interface ApiBaseUrlValidationResult {
  ready: boolean;
  baseUrl: string;
  error: string;
  code: 'ok' | 'missing' | 'invalid_url' | 'insecure_url' | 'localhost_in_production';
}

export function validateApiBaseUrl(rawValue: string | undefined, production: boolean): ApiBaseUrlValidationResult {
  const raw = (rawValue || '').trim();
  if (!raw) {
    return production
      ? {
        ready: false,
        baseUrl: '',
        code: 'missing',
        error: 'POSTL backend API is not configured for this deployment. Set VITE_API_BASE_URL to the persistent backend URL and redeploy.',
      }
      : { ready: true, baseUrl: '/api', code: 'ok', error: '' };
  }

  const normalized = raw.replace(/\/+$/, '');
  if (normalized.startsWith('/')) {
    return production
      ? {
        ready: false,
        baseUrl: normalized,
        code: 'invalid_url',
        error: 'Production VITE_API_BASE_URL must be a full HTTPS URL for the persistent backend.',
      }
      : { ready: true, baseUrl: normalized, code: 'ok', error: '' };
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return {
      ready: false,
      baseUrl: normalized,
      code: 'invalid_url',
      error: 'VITE_API_BASE_URL must be a valid URL.',
    };
  }

  const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  if (production && isLocalhost) {
    return {
      ready: false,
      baseUrl: normalized,
      code: 'localhost_in_production',
      error: 'Production VITE_API_BASE_URL cannot point to localhost. Deploy a persistent HTTPS backend and redeploy the frontend.',
    };
  }

  if (production && url.protocol !== 'https:') {
    return {
      ready: false,
      baseUrl: normalized,
      code: 'insecure_url',
      error: 'Production VITE_API_BASE_URL must use HTTPS to avoid mixed-content and token exposure risks.',
    };
  }

  return { ready: true, baseUrl: normalized, code: 'ok', error: '' };
}
