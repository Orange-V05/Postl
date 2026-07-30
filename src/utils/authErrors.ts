const AUTH_CONFIGURATION_CODES = new Set([
  'auth/invalid-api-key',
  'auth/api-key-not-valid',
  'auth/project-not-found',
  'auth/configuration-not-found',
  'auth/unauthorized-domain',
  'auth/app-not-authorized',
]);

export interface AuthErrorMessage {
  code: string;
  message: string;
  category: 'credentials' | 'input' | 'account' | 'rate_limit' | 'network' | 'configuration' | 'unknown';
  diagnosticId: string;
}

function safeCode(error: unknown): string {
  const maybe = error as { code?: unknown };
  return typeof maybe?.code === 'string' && maybe.code ? maybe.code : 'auth/unknown';
}

export function createAuthDiagnosticId(code: string): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${code.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}-${suffix}`;
}

export function translateFirebaseAuthError(error: unknown): AuthErrorMessage {
  const code = safeCode(error);
  const diagnosticId = createAuthDiagnosticId(code);

  if (code === 'auth/invalid-email') {
    return { code, diagnosticId, category: 'input', message: 'Enter a valid email address.' };
  }

  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(code)) {
    return { code, diagnosticId, category: 'credentials', message: 'The email or password is incorrect.' };
  }

  if (code === 'auth/user-disabled') {
    return { code, diagnosticId, category: 'account', message: 'This account has been disabled. Contact support if you believe this is a mistake.' };
  }

  if (code === 'auth/too-many-requests') {
    return { code, diagnosticId, category: 'rate_limit', message: 'Too many failed attempts. Please wait before trying again.' };
  }

  if (code === 'auth/network-request-failed') {
    return { code, diagnosticId, category: 'network', message: 'Could not reach Firebase Authentication. Check your connection and try again.' };
  }

  if (code === 'auth/operation-not-allowed') {
    return { code, diagnosticId, category: 'configuration', message: 'Email/password sign-in is not enabled for this Firebase project. Contact the site administrator.' };
  }

  if (AUTH_CONFIGURATION_CODES.has(code)) {
    return { code, diagnosticId, category: 'configuration', message: 'Authentication is not configured correctly for this deployment. Contact the site administrator.' };
  }

  return { code, diagnosticId, category: 'unknown', message: `Authentication failed unexpectedly. Reference: ${diagnosticId}` };
}

export function logAuthFailure(scope: string, translated: AuthErrorMessage) {
  if (import.meta.env.DEV) {
    console.warn('[auth]', scope, { code: translated.code, category: translated.category, diagnosticId: translated.diagnosticId });
  }
}
