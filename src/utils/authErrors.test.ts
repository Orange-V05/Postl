import { describe, expect, it } from 'vitest';
import { translateFirebaseAuthError } from './authErrors';

describe('translateFirebaseAuthError', () => {
  it.each(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'])('maps %s to a neutral credential message', (code) => {
    const result = translateFirebaseAuthError({ code });
    expect(result.category).toBe('credentials');
    expect(result.message).toBe('The email or password is incorrect.');
    expect(result.code).toBe(code);
  });

  it('maps invalid email to input guidance', () => {
    expect(translateFirebaseAuthError({ code: 'auth/invalid-email' })).toMatchObject({
      category: 'input',
      message: 'Enter a valid email address.',
    });
  });

  it('maps disabled accounts separately from credentials', () => {
    expect(translateFirebaseAuthError({ code: 'auth/user-disabled' }).category).toBe('account');
  });

  it('maps provider disabled to administrator configuration guidance', () => {
    const result = translateFirebaseAuthError({ code: 'auth/operation-not-allowed' });
    expect(result.category).toBe('configuration');
    expect(result.message).toContain('Email/password sign-in is not enabled');
  });

  it.each(['auth/invalid-api-key', 'auth/api-key-not-valid', 'auth/project-not-found', 'auth/configuration-not-found', 'auth/unauthorized-domain', 'auth/app-not-authorized'])('maps %s to deployment configuration guidance', (code) => {
    const result = translateFirebaseAuthError({ code });
    expect(result.category).toBe('configuration');
    expect(result.message).toContain('Authentication is not configured correctly');
  });

  it('maps too many requests and network failures distinctly', () => {
    expect(translateFirebaseAuthError({ code: 'auth/too-many-requests' }).category).toBe('rate_limit');
    expect(translateFirebaseAuthError({ code: 'auth/network-request-failed' }).category).toBe('network');
  });

  it('returns a safe diagnostic id for unexpected errors without leaking raw messages', () => {
    const result = translateFirebaseAuthError({ code: 'auth/internal-error', message: 'raw backend response with details' });
    expect(result.category).toBe('unknown');
    expect(result.message).toContain('Reference:');
    expect(result.message).not.toContain('raw backend response');
  });
});
