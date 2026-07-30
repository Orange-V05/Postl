export interface ApiBaseUrlValidationResult {
  ready: boolean;
  baseUrl: string;
  error: string;
  code: 'ok' | 'missing' | 'invalid_url' | 'insecure_url' | 'localhost_in_production' | 'duplicate_api_prefix';
}

function withExactlyOneApiSegment(url: URL): string | null {
  const parts = url.pathname.split('/').filter(Boolean);
  const apiCount = parts.filter((part) => part.toLowerCase() === 'api').length;
  if (apiCount > 1) return null;
  if (apiCount === 0) url.pathname = `${url.pathname.replace(/\/+$/, '')}/api`;
  return url.toString().replace(/\/+$/, '');
}

export function validateApiBaseUrl(rawValue: string | undefined, production: boolean): ApiBaseUrlValidationResult {
  const raw = (rawValue || '').trim();
  if (!raw) {
    return production
      ? {
        ready: false,
        baseUrl: '',
        code: 'missing',
        error: 'POSTL backend API is not configured for this deployment. Set VITE_API_BASE_URL to the persistent backend origin or /api URL and redeploy.',
      }
      : { ready: true, baseUrl: '/api', code: 'ok', error: '' };
  }

  const normalized = raw.replace(/\/+$/, '');
  if (normalized.startsWith('/')) {
    if (normalized.split('/').filter(Boolean).filter((part) => part.toLowerCase() === 'api').length > 1) {
      return { ready: false, baseUrl: normalized, code: 'duplicate_api_prefix', error: 'VITE_API_BASE_URL must include exactly one /api segment.' };
    }
    return production
      ? {
        ready: false,
        baseUrl: normalized,
        code: 'invalid_url',
        error: 'Production VITE_API_BASE_URL must be a full HTTPS URL for the persistent backend.',
      }
      : { ready: true, baseUrl: normalized.toLowerCase().endsWith('/api') ? normalized : `${normalized}/api`, code: 'ok', error: '' };
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

  const baseUrl = withExactlyOneApiSegment(url);
  if (!baseUrl) {
    return { ready: false, baseUrl: normalized, code: 'duplicate_api_prefix', error: 'VITE_API_BASE_URL must include exactly one /api segment.' };
  }

  return { ready: true, baseUrl, code: 'ok', error: '' };
}
