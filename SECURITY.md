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

## Firebase browser configuration and exposed Google API keys

Firebase web configuration values, including the Firebase browser API key, are shipped to browsers by design and are not equivalent to Firebase Admin service-account credentials. They still must not be hardcoded in source for POSTL because hardcoding prevents environment separation, makes accidental reuse easier, and can expose an unrestricted Google API key to abuse if Google Cloud restrictions are weak.

Current source loads Firebase client configuration only from Vite environment variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- optional `VITE_FIREBASE_MEASUREMENT_ID`

Stage 2 history scan found that older commits already published to `origin/main` contained a hardcoded Firebase browser API key in `src/firebase.ts`. The value is redacted in project reports and should be treated as historically exposed.

Required manual Google/Firebase remediation:

1. In Google Cloud Console, find the API key ending with the redacted suffix recorded in local audit output.
2. Review enabled APIs for that key. If it has access beyond Firebase-required browser APIs, rotate it and replace the value in deployment secrets.
3. Apply application restrictions, preferably HTTP referrers for the production domain, preview domains if needed, and local development origins only where appropriate.
4. Apply API restrictions to only the Firebase/Google APIs required by the deployed app.
5. Review quotas and recent usage for suspicious traffic.
6. Review Firebase Authorized Domains, Authentication providers, Firestore rules, Storage rules, and App Check configuration.
7. Configure frontend Firebase values in GitHub Actions, hosting provider environment variables, or local `.env.local`; never commit real values to source.

History cleanup note: removing the key from the latest commit does not remove it from old commits. Rewriting published Git history requires coordination, a backup branch/tag, secret rotation or restriction first, a tool such as `git filter-repo`, and a `git push --force-with-lease`. Do not rewrite shared history silently.

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
