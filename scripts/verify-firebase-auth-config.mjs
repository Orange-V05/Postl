#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

export function parseEnvText(text = '') {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

function readEnvFile(path) {
  try { return parseEnvText(fs.readFileSync(path, 'utf8')); } catch { return {}; }
}

function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/^['"]|['"]$/g, '') : '';
}

export function classifyFirebaseRestError(status, code) {
  if (status === 200 && code === 'OK') return 'ok';
  if (code === 'OPERATION_NOT_ALLOWED') return 'email_password_disabled';
  if (['API_KEY_INVALID', 'API_KEY_SERVICE_BLOCKED', 'PROJECT_NOT_FOUND', 'CONFIGURATION_NOT_FOUND'].includes(code)) return 'api_key_or_project_configuration';
  if (['REQUEST_BLOCKED', 'PERMISSION_DENIED'].includes(code) || /referrer|referer/i.test(code || '')) return 'api_key_restriction_or_app_check';
  if (code === 'INVALID_LOGIN_CREDENTIALS') return 'invalid_credentials';
  if (code === 'TOO_MANY_ATTEMPTS_TRY_LATER') return 'rate_limited';
  return 'unknown';
}

export function summarizeConfig(env) {
  const values = Object.fromEntries(REQUIRED.map((key) => [key, clean(env[key]) || '']));
  const missing = REQUIRED.filter((key) => !values[key]);
  const invalid = [];
  for (const key of REQUIRED) {
    const value = values[key];
    if (!value) continue;
    if (/^['"`].*['"`]$/.test(String(env[key]).trim())) invalid.push(`${key}:quoted`);
    if (/^(your_|your-|replace_|example)/i.test(value)) invalid.push(`${key}:placeholder`);
    if (/[\r\n]/.test(String(env[key]))) invalid.push(`${key}:newline`);
  }
  const projectId = values.VITE_FIREBASE_PROJECT_ID;
  const authDomain = values.VITE_FIREBASE_AUTH_DOMAIN;
  if (authDomain.endsWith('.firebaseapp.com') && projectId && authDomain !== `${projectId}.firebaseapp.com`) {
    invalid.push('VITE_FIREBASE_AUTH_DOMAIN:mismatched_project');
  }
  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    safe: {
      projectId: projectId || null,
      authDomain: authDomain || null,
      messagingSenderIdSuffix: values.VITE_FIREBASE_MESSAGING_SENDER_ID ? values.VITE_FIREBASE_MESSAGING_SENDER_ID.slice(-4) : null,
      appIdSuffix: values.VITE_FIREBASE_APP_ID ? values.VITE_FIREBASE_APP_ID.slice(-6) : null,
      apiKeySuffix: values.VITE_FIREBASE_API_KEY ? values.VITE_FIREBASE_API_KEY.slice(-4) : null,
    },
  };
}

async function callIdentityToolkit(apiKey, endpoint, body) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  const code = json?.error?.message || (res.ok ? 'OK' : 'UNKNOWN_ERROR');
  return { status: res.status, code, json };
}

async function verifyDisposableAuth(env) {
  const apiKey = clean(env.VITE_FIREBASE_API_KEY);
  const email = `auth-check-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@example.com`;
  const password = `${crypto.randomBytes(18).toString('base64url')}Aa1!`;
  let idToken = '';
  const results = [];
  const signup = await callIdentityToolkit(apiKey, 'accounts:signUp', { email, password, returnSecureToken: true });
  results.push({ step: 'signup', status: signup.status, code: signup.code, classification: classifyFirebaseRestError(signup.status, signup.code) });
  if (signup.status === 200) {
    idToken = signup.json.idToken;
    const signin = await callIdentityToolkit(apiKey, 'accounts:signInWithPassword', { email, password, returnSecureToken: true });
    results.push({ step: 'signin', status: signin.status, code: signin.code, classification: classifyFirebaseRestError(signin.status, signin.code) });
  }
  if (idToken) {
    const deleted = await callIdentityToolkit(apiKey, 'accounts:delete', { idToken });
    results.push({ step: 'delete', status: deleted.status, code: deleted.code, classification: classifyFirebaseRestError(deleted.status, deleted.code) });
  }
  return results;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local'), ...process.env };
  const summary = summarizeConfig(env);
  console.log(JSON.stringify({ firebaseConfig: summary }, null, 2));
  if (!summary.ok) process.exitCode = 1;
  if (args.has('--verify-rest')) {
    if (!summary.ok) throw new Error('Refusing REST verification with incomplete or invalid Firebase config.');
    const results = await verifyDisposableAuth(env);
    console.log(JSON.stringify({ identityToolkit: results }, null, 2));
    if (!results.every((r) => r.status === 200)) process.exitCode = 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
