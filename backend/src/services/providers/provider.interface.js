export class ProviderError extends Error {
  constructor(code, message, retryable = true, details = undefined) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

export function classifyFetchError(err, provider) {
  if (err?.name === 'AbortError') return new ProviderError('provider_timeout', `${provider} timed out.`, true);
  return new ProviderError('provider_network_error', `${provider} request failed.`, true, { message: err.message });
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
