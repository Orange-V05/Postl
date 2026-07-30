export class ProviderError extends Error {
  constructor(code, message, retryable = true, details = undefined) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.retryable = retryable;
    this.details = details;
    this.provider = details?.provider;
    this.status = details?.status;
  }
}

export const PROVIDER_ERROR_CODES = Object.freeze({
  CONFIGURATION_ERROR: 'configuration_error',
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  PROVIDER_TIMEOUT: 'provider_timeout',
  PROVIDER_RATE_LIMITED: 'provider_rate_limited',
  MODEL_NOT_FOUND: 'model_not_found',
  PROVIDER_HTTP_ERROR: 'provider_http_error',
  PROVIDER_NETWORK_ERROR: 'provider_network_error',
  OUTPUT_PARSE_FAILED: 'output_parse_failed',
  OUTPUT_SCHEMA_INVALID: 'output_schema_invalid',
  CLIENT_CANCELLED: 'client_cancelled',
});

export function classifyFetchError(err, provider) {
  if (err?.name === 'AbortError') {
    return new ProviderError(PROVIDER_ERROR_CODES.PROVIDER_TIMEOUT, `${provider} timed out.`, true, { provider });
  }
  return new ProviderError(PROVIDER_ERROR_CODES.PROVIDER_NETWORK_ERROR, `${provider} request failed.`, true, { provider, message: err?.message });
}

export function classifyHttpError(provider, status, bodyText = '') {
  if (status === 401 || status === 403) {
    return new ProviderError(PROVIDER_ERROR_CODES.CONFIGURATION_ERROR, `${provider} credentials were rejected.`, false, { provider, status });
  }
  if (status === 404) {
    return new ProviderError(PROVIDER_ERROR_CODES.MODEL_NOT_FOUND, `${provider} model was not found or is unavailable.`, true, { provider, status });
  }
  if (status === 429) {
    return new ProviderError(PROVIDER_ERROR_CODES.PROVIDER_RATE_LIMITED, `${provider} quota or rate limit was reached.`, true, { provider, status });
  }
  if (status >= 500) {
    return new ProviderError(PROVIDER_ERROR_CODES.PROVIDER_UNAVAILABLE, `${provider} is temporarily unavailable.`, true, { provider, status });
  }
  return new ProviderError(PROVIDER_ERROR_CODES.PROVIDER_HTTP_ERROR, `${provider} returned HTTP ${status}.`, false, { provider, status, bodyPreview: bodyText.slice(0, 120) });
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  try {
    return await fetch(url, { ...options, signal });
  } finally {
    clearTimeout(timeout);
  }
}
