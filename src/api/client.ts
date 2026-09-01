import { validateApiBaseUrl } from '../config/apiConfig';

export interface ApiEnvelope<T> {
  data: T | null;
  error: null | { code: string; message: string; requestId?: string; retryable?: boolean; details?: unknown; provider?: string; retryAfterSeconds?: number };
}

export class ApiClientError extends Error {
  code: string;
  requestId?: string;
  retryable: boolean;
  status: number;
  details?: unknown;
  provider?: string;
  retryAfterSeconds?: number;

  constructor(status: number, error: NonNullable<ApiEnvelope<unknown>['error']>) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = error.code;
    this.requestId = error.requestId;
    this.retryable = Boolean(error.retryable);
    this.details = error.details;
    this.provider = error.provider;
    this.retryAfterSeconds = error.retryAfterSeconds;
  }
}

const apiBaseUrlState = validateApiBaseUrl(import.meta.env.VITE_API_BASE_URL, Boolean(import.meta.env.PROD));
export const apiConfigError = apiBaseUrlState.ready ? '' : apiBaseUrlState.error;
const API_BASE_URL = apiBaseUrlState.baseUrl;

export async function apiRequest<T>(path: string, options: RequestInit & { token?: string | null; timeoutMs?: number } = {}): Promise<T> {
  const requestId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  if (apiConfigError) {
    throw new ApiClientError(503, { code: 'api_not_configured', message: apiConfigError, requestId, retryable: false });
  }

  const controller = new AbortController();
  // Use AbortSignal.any when available to combine caller and timeout signals safely.
  const signal = options.signal && typeof (AbortSignal as any).any === 'function'
    ? (AbortSignal as any).any([options.signal, controller.signal])
    : controller.signal;
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? 60000);
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('x-request-id', requestId);
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal });
    const responseRequestId = response.headers.get('x-request-id') || requestId;
    const retryAfterSeconds = Number(response.headers.get('retry-after') || '') || undefined;
    const contentType = response.headers.get('content-type') || '';
    const rawBody = await response.text();
    if (!rawBody.trim()) {
      throw new ApiClientError(response.status || 502, { code: 'backend_deployment_invalid', message: `Backend returned an empty response with HTTP ${response.status}.`, requestId: responseRequestId, retryable: response.status >= 500 || response.status === 404 });
    }
    if (!contentType.toLowerCase().includes('application/json')) {
      const looksHtml = /^\s*<!doctype html|^\s*<html/i.test(rawBody);
      throw new ApiClientError(response.status || 502, { code: 'backend_deployment_invalid', message: looksHtml ? `Backend returned an HTML page instead of JSON with HTTP ${response.status}. Check the backend deployment and API base URL.` : `Backend returned non-JSON content with HTTP ${response.status}.`, requestId: responseRequestId, retryable: response.status >= 500 || response.status === 404 });
    }
    let envelope: ApiEnvelope<T>;
    try {
      envelope = JSON.parse(rawBody) as ApiEnvelope<T>;
    } catch {
      throw new ApiClientError(response.status || 502, { code: 'backend_deployment_invalid', message: `Backend returned malformed JSON with HTTP ${response.status}.`, requestId: responseRequestId, retryable: response.status >= 500 || response.status === 404 });
    }
    if (!envelope || typeof envelope !== 'object' || !('data' in envelope) || !('error' in envelope)) {
      throw new ApiClientError(response.status || 502, { code: 'backend_deployment_invalid', message: `Backend returned an unexpected response schema with HTTP ${response.status}.`, requestId: responseRequestId, retryable: response.status >= 500 || response.status === 404 });
    }
    if (envelope.error) {
      envelope.error.requestId ||= responseRequestId;
      envelope.error.retryAfterSeconds ||= retryAfterSeconds;
    }
    if (!response.ok || envelope.error) {
      throw new ApiClientError(response.status, envelope.error || { code: 'http_error', message: `Request failed with ${response.status}`, requestId: responseRequestId, retryable: response.status >= 500, retryAfterSeconds });
    }
    return envelope.data as T;
  } catch (err: any) {
    if (err instanceof ApiClientError) throw err;
    if (err.name === 'AbortError') throw new ApiClientError(408, { code: 'request_timeout', message: 'The request timed out.', requestId, retryable: true });
    if (err instanceof TypeError) throw new ApiClientError(0, { code: 'network_unavailable', message: 'POSTL could not reach the backend API.', requestId, retryable: true });
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

export interface GenerationVariant {
  id: string;
  label: string;
  content: string;
  hook?: string;
  CTA?: string;
  hashtags?: Record<string, string[]> | null;
  rationale?: string;
  strategy?: { framework?: string; audienceIntent?: string; contentGoal?: string };
  analysis?: { score: number; label: string; maxScore: number; factors: Array<{ key: string; score: number; max: number; explanation: string }>; disclaimer?: string };
  provider?: { name: string; model: string; latencyMs: number; finishReason?: string; usage?: unknown };
}

export interface GenerationResponse {
  requestId: string;
  variants: GenerationVariant[];
  briefAnalysis: { score: number; status: string; missing: string[]; suggestions: string[] };
  benchmarkTiming: { timezone: string; source: string; recommendation: string; disclaimer: string };
}

export function generatePost(token: string | null, body: Record<string, unknown>, timeoutMs = 60000) {
  return apiRequest<GenerationResponse>('/generate-post', { method: 'POST', token, timeoutMs, body: JSON.stringify(body) });
}

export function getModels() {
  return apiRequest<{ models: Array<{ id: string; label: string; capabilities: string[]; local: boolean; privacy?: string; provider?: string }>; platforms: Record<string, { label: string; formats: string[]; maxChars: number }>; objectives: string[]; tones: string[] }>('/models');
}
