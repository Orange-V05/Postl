export interface ApiEnvelope<T> {
  data: T | null;
  error: null | { code: string; message: string; requestId?: string; retryable?: boolean; details?: unknown };
}

export class ApiClientError extends Error {
  code: string;
  requestId?: string;
  retryable: boolean;
  status: number;
  details?: unknown;

  constructor(status: number, error: NonNullable<ApiEnvelope<unknown>['error']>) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = error.code;
    this.requestId = error.requestId;
    this.retryable = Boolean(error.retryable);
    this.details = error.details;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function apiRequest<T>(path: string, options: RequestInit & { token?: string | null; timeoutMs?: number } = {}): Promise<T> {
  const requestId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? 60000);
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('x-request-id', requestId);
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: options.signal || controller.signal });
    const envelope = await response.json().catch(() => ({ data: null, error: { code: 'invalid_json', message: 'Server returned an invalid response.', requestId, retryable: false } })) as ApiEnvelope<T>;
    if (!response.ok || envelope.error) {
      throw new ApiClientError(response.status, envelope.error || { code: 'http_error', message: `Request failed with ${response.status}`, requestId, retryable: response.status >= 500 });
    }
    return envelope.data as T;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new ApiClientError(408, { code: 'request_timeout', message: 'The request timed out.', requestId, retryable: true });
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
  return apiRequest<{ models: Array<{ id: string; label: string; capabilities: string[]; local: boolean }>; platforms: Record<string, { label: string; formats: string[]; maxChars: number }>; objectives: string[]; tones: string[] }>('/models');
}
