# POSTL Deployment

## Supported production model

Recommended:

- Frontend: Vercel, Netlify static hosting, Firebase Hosting, or any static host.
- Backend: persistent Node host such as Render, Railway, Fly.io, Cloud Run, or VPS.
- AI: OpenRouter through the backend only, restricted to administrator-allowlisted zero-price models. Ollama is local development only.
- Data/auth: Firebase Auth and Firestore.

## Production OpenRouter free-model activation

POSTL production uses the provider-agnostic backend with OpenRouter as the only production AI provider. Do not put `OPENROUTER_API_KEY` in Vite, Vercel frontend variables, source files, logs, fixtures, or `render.yaml`. Store it only as a secret backend environment variable named `OPENROUTER_API_KEY`.

Required Render backend variables:

- `NODE_ENV=production`
- `ALLOWED_ORIGINS=https://postl.vercel.app`
- `AI_PRIMARY_PROVIDER=openrouter`
- `AI_FALLBACK_PROVIDERS=`
- `ALLOW_PAID_AI_MODELS=false`
- `OPENROUTER_API_KEY` secret only
- `OPENROUTER_FREE_MODELS` comma-separated administrator allowlist of verified zero-price OpenRouter model IDs
- `OPENROUTER_HTTP_REFERER=https://postl.vercel.app`
- `OPENROUTER_APP_TITLE=POSTL`
- `PROVIDER_TIMEOUT_MS=45000`
- `OPENROUTER_CATALOG_TTL_MS=600000`
- `OPENROUTER_MAX_MODEL_ATTEMPTS=3`
- `MAX_OUTPUT_TOKENS=450`
- `MAX_PROMPT_LENGTH=12000`
- `PROVIDER_CONCURRENCY=1`
- `USER_DAILY_GENERATION_LIMIT=25`
- `USER_DAILY_REPURPOSE_LIMIT=10`
- Firebase Admin credentials for project `postl-0` via `FIREBASE_SERVICE_ACCOUNT_JSON`, or `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.

Verify the OpenRouter allowlist from a secure backend/admin shell only:

```text
cd backend
# Set OPENROUTER_API_KEY and OPENROUTER_FREE_MODELS in the process environment without printing them.
npm run verify:openrouter-free-models
```

The script calls only the OpenRouter models catalog, prints no key material, and exits nonzero if any configured model is missing, paid, or has unverifiable prompt/completion pricing. Free model availability and limits can change. Update `OPENROUTER_FREE_MODELS` in Render without a code change, then redeploy or restart the backend.

Production verification endpoints:

- `GET https://postl.onrender.com/api/health` is lightweight JSON and does not call OpenRouter.
- `GET https://postl.onrender.com/api/ready` verifies Firebase Admin plus at least one zero-price allowlisted OpenRouter model.
- `GET https://postl.onrender.com/api/models` returns friendly POSTL model IDs such as `balanced-cloud`; production must not advertise Ollama.

Set Vercel Production and Preview `VITE_API_BASE_URL` to `https://postl.onrender.com` or `https://postl.onrender.com/api`. The frontend normalizes to exactly one `/api` segment and rejects `/api/api` and localhost production URLs. Redeploy Vercel after changing this value because Vite embeds it at build time.

## Firebase and authentication

The frontend Firebase configuration is public and is not sufficient for server-side token verification or quotas. Production generation must require a Firebase ID token issued by the `postl-0` project and verified by Firebase Admin on the backend. If Firebase Admin credentials are missing, `/api/ready` reports `firebase_admin_not_configured` and protected routes fail closed.

## Current limitation

This repository update cannot set Render, Vercel, Firebase Console, or Google Cloud dashboard values because authenticated deployment tooling is not available in this environment. Configure the listed secrets manually, redeploy, then verify `/api/health`, `/api/ready`, and `/api/models`.
