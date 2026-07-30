import { describe, expect, it } from 'vitest';
import { classifyFirebaseRestError, parseEnvText, summarizeConfig } from './verify-firebase-auth-config.mjs';

const validEnv = {
  VITE_FIREBASE_API_KEY: 'test-browser-key-12345678901234567890',
  VITE_FIREBASE_AUTH_DOMAIN: 'postl-0.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'postl-0',
  VITE_FIREBASE_STORAGE_BUCKET: 'postl-0.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789012',
  VITE_FIREBASE_APP_ID: '1:123456789012:web:abcdef123456',
};

describe('verify-firebase-auth-config helpers', () => {
  it('parses env files without exposing values', () => {
    expect(parseEnvText('A=one\n# ignored\nB=two=three')).toEqual({ A: 'one', B: 'two=three' });
  });

  it('summarizes coherent config using safe identifiers only', () => {
    const result = summarizeConfig(validEnv);
    expect(result.ok).toBe(true);
    expect(result.safe).toMatchObject({ projectId: 'postl-0', authDomain: 'postl-0.firebaseapp.com', appIdSuffix: '123456' });
  });

  it('detects missing, quoted, placeholder, newline, and mismatched-project config', () => {
    const result = summarizeConfig({
      ...validEnv,
      VITE_FIREBASE_API_KEY: 'your_api_key',
      VITE_FIREBASE_AUTH_DOMAIN: 'other.firebaseapp.com',
      VITE_FIREBASE_APP_ID: '"1:123456789012:web:abcdef123456"',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123\n456',
    });
    expect(result.ok).toBe(false);
    expect(result.invalid).toEqual(expect.arrayContaining([
      'VITE_FIREBASE_API_KEY:placeholder',
      'VITE_FIREBASE_APP_ID:quoted',
      'VITE_FIREBASE_MESSAGING_SENDER_ID:newline',
      'VITE_FIREBASE_AUTH_DOMAIN:mismatched_project',
    ]));
  });

  it('classifies Identity Toolkit REST errors safely', () => {
    expect(classifyFirebaseRestError(200, 'OK')).toBe('ok');
    expect(classifyFirebaseRestError(400, 'OPERATION_NOT_ALLOWED')).toBe('email_password_disabled');
    expect(classifyFirebaseRestError(400, 'API_KEY_INVALID')).toBe('api_key_or_project_configuration');
    expect(classifyFirebaseRestError(403, 'REQUEST_BLOCKED')).toBe('api_key_restriction_or_app_check');
    expect(classifyFirebaseRestError(400, 'INVALID_LOGIN_CREDENTIALS')).toBe('invalid_credentials');
  });
});
