# POSTL Security

## Secrets

Never commit:

- `.env` or `.env.*` except examples.
- Firebase service-account JSON.
- Private keys, PEM/P8 files.
- API tokens.
- Installed dependency folders.

`.gitignore` now blocks common secret filenames and `backend/node_modules/`.

If any Firebase service-account key was previously committed, rotate it immediately in Firebase/Google Cloud IAM. Removing it from Git does not revoke it.

## Authentication

- Frontend uses Firebase Auth.
- Protected backend routes require a Firebase ID token.
- Backend returns `auth_service_unavailable` if Firebase Admin is not configured.
- Production startup fails if Firebase Admin critical config is missing or malformed.

## CORS

Credentialed CORS requires an explicit `ALLOWED_ORIGINS` allowlist. Development defaults to local Vite origins only.

## Logging

Structured logs redact secret-like metadata keys and do not log tokens, key fragments, or service-account JSON.

## Firestore

`firestore.rules` restricts user-owned collections and blocks ownership changes. `firestore.indexes.json` includes required indexes for posts and campaigns.
