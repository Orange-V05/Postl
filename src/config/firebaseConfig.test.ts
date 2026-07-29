import { describe, expect, it } from 'vitest';
import { validateFirebaseClientConfig } from './firebaseConfig';

const completeEnv = {
  VITE_FIREBASE_API_KEY: 'firebase-browser-key-for-tests-only',
  VITE_FIREBASE_AUTH_DOMAIN: 'postl-0.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'postl-0',
  VITE_FIREBASE_STORAGE_BUCKET: 'postl-0.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789012',
  VITE_FIREBASE_APP_ID: '1:123456789012:web:abcdef123456',
  VITE_FIREBASE_MEASUREMENT_ID: 'G-ABCDEFG123',
};

describe('validateFirebaseClientConfig', () => {
  it('accepts a complete Firebase browser configuration', () => {
    const result = validateFirebaseClientConfig(completeEnv, true);
    expect(result.ready).toBe(true);
    expect(result.config).toMatchObject({
      projectId: 'postl-0',
      authDomain: 'postl-0.firebaseapp.com',
      measurementId: 'G-ABCDEFG123',
    });
    expect(result.missing).toEqual([]);
    expect(result.invalid).toEqual([]);
  });

  it('reports one missing required value with development detail', () => {
    const { VITE_FIREBASE_API_KEY, ...env } = completeEnv;
    const result = validateFirebaseClientConfig(env, false);
    expect(result.ready).toBe(false);
    expect(result.config).toBeNull();
    expect(result.missing).toEqual(['VITE_FIREBASE_API_KEY']);
    expect(result.userMessage).toContain('VITE_FIREBASE_API_KEY');
  });

  it('reports multiple missing values', () => {
    const result = validateFirebaseClientConfig({ VITE_FIREBASE_PROJECT_ID: 'postl-0' }, false);
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining([
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
    ]));
  });

  it('uses a safe generic production message without hiding developer diagnostics', () => {
    const result = validateFirebaseClientConfig({}, true);
    expect(result.ready).toBe(false);
    expect(result.userMessage).toBe('POSTL is not fully configured for this deployment. Authentication and saved workspace data are temporarily unavailable.');
    expect(result.developerMessage).toContain('VITE_FIREBASE_API_KEY');
  });

  it('rejects malformed project, sender, app, and domain values', () => {
    const result = validateFirebaseClientConfig({
      ...completeEnv,
      VITE_FIREBASE_AUTH_DOMAIN: 'not-a-firebase-domain.example.com',
      VITE_FIREBASE_PROJECT_ID: 'Bad_Project',
      VITE_FIREBASE_MESSAGING_SENDER_ID: 'abc',
      VITE_FIREBASE_APP_ID: 'bad-app-id',
    }, false);
    expect(result.ready).toBe(false);
    expect(result.invalid).toEqual(expect.arrayContaining([
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
    ]));
  });
});
