# POSTL Deployment

## Supported production model

Recommended:

- Frontend: Vercel, Netlify static hosting, Firebase Hosting, or any static host.
- Backend: persistent Node host such as Render, Railway, Fly.io, Cloud Run, or VPS.
- AI: Ollama on a persistent host or secured inference server. OpenRouter/Hugging Face can be cloud fallbacks.
- Data/auth: Firebase Auth and Firestore.

## Important Ollama note

Ollama is not suitable for ordinary short-lived Netlify/Vercel serverless functions. If deploying backend as serverless, configure `AI_PRIMARY_PROVIDER=openrouter` or another cloud provider and do not assume local Ollama exists.

## Environment variables

Frontend variables are in `.env.example`.
Backend variables are in `backend/.env.example`.

### Vercel frontend settings

Use these settings for the `Orange-V05/Postl` Vercel frontend project:

- Framework preset: Vite
- Root directory: repository root
- Install command: project default or `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`

Required Vercel frontend environment variables for Production, Preview, and Development scopes:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- optional `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_API_BASE_URL`, required for generation/repurposing in production and must point to the persistent backend URL

Vite embeds `VITE_*` variables at build time. After changing any Vercel environment variable, trigger a fresh deployment. Restarting an already-built deployment is not sufficient.

Do not put Firebase Admin service-account JSON, private keys, OpenRouter keys, Hugging Face tokens, or backend secrets into `VITE_*` variables. Frontend variables are public in the browser bundle.

If the Firebase frontend variables are missing, POSTL now renders a visible deployment-configuration diagnostic instead of a white screen. Login, signup, dashboard persistence, and authenticated generation still require valid Firebase configuration.

Firebase Console must include `postl.vercel.app` in Authentication authorized domains for email/password and OAuth redirects. Add preview domains only if they are intentionally supported. If App Check is enabled, configure the Vercel production domain there too.

Production must configure:

- `ALLOWED_ORIGINS`
- Firebase Admin credentials through `FIREBASE_SERVICE_ACCOUNT_KEY` or a secure mounted credential path.
- AI provider configuration.

## Health checks

Use:

```text
GET /api/health
GET /api/models
```

`/api/health` reports Firebase Admin state, provider config state, and local cache stats.

## Chosen production backend: Render persistent Node service

POSTL production should use Vercel for the static Vite frontend and Render for the persistent Express backend. The repository includes `render.yaml` for a Render web service rooted at `backend`. Production AI defaults to OpenRouter with Hugging Face as optional fallback; Ollama remains a local-development or separately hosted inference option, not a Vercel serverless dependency.

Render setup:

1. In Render, create a Blueprint or Web Service from `https://github.com/Orange-V05/Postl`.
2. Use `render.yaml`, or set root directory `backend`, build command `npm ci && npm run build`, start command `npm run start:prod`, and health check `/api/health`.
3. Configure secret env vars in Render only: `OPENROUTER_API_KEY`, optional `HF_TOKEN`, and `FIREBASE_SERVICE_ACCOUNT_KEY` or a secure credential path. Never expose these through Vercel `VITE_*` vars.
4. Set `ALLOWED_ORIGINS=https://postl.vercel.app` plus any intentionally supported preview origins. Do not use wildcard CORS with Authorization.
5. After Render deploys, verify `https://YOUR-RENDER-SERVICE.onrender.com/api/health` and `/api/models`.
6. Set Vercel `VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api` for Production and Preview, then redeploy Vercel.

Vercel Firebase setup:

- Add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, and optional `VITE_FIREBASE_MEASUREMENT_ID` in the Vercel dashboard for Production and Preview.
- Trigger a new Vercel deployment after changing these variables. Vite embeds them at build time.
- Ensure Firebase Authentication authorized domains include `postl.vercel.app`.
- Restrict the Firebase browser API key in Google Cloud by HTTP referrer and by required Firebase/Identity Toolkit APIs. Review usage for abuse.

Current limitation: this repository update cannot set Vercel, Firebase Console, Google Cloud, or Render dashboard values because no authenticated credentials are available in this environment.

## Authentication troubleshooting

If production login shows a credential error for accounts that exist in Firebase, inspect the real Firebase Auth error code before assuming the password is wrong. POSTL maps credential failures neutrally but preserves safe error categories in development logs.

Checklist:

- Confirm Vercel Production variables all belong to the same Firebase project: `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_API_KEY`.
- Confirm Production, not only Preview or Development, contains the variables and that values have no surrounding quotes, backticks, copied variable names, trailing spaces, or newlines.
- Redeploy after every Vercel env change because Vite embeds `VITE_*` values at build time. Verify the asset hash changes.
- In Firebase Console for the deployed project, enable Authentication and the Email/Password provider. Email link only is not the same as Email/Password.
- Ensure the user exists in Authentication Users for that same project, is not disabled, and has the password provider. A Firestore profile document alone is not an auth user.
- Add `postl.vercel.app` to Authentication authorized domains exactly without protocol or path.
- Restrict the browser API key to intended HTTP referrers such as `https://postl.vercel.app/*` and required Firebase/Auth APIs, including Identity Toolkit where applicable. Do not remove all restrictions as a shortcut.
- Inspect the Identity Toolkit network response for safe fields: endpoint, HTTP status, and Firebase error code. Do not copy passwords, API keys, ID tokens, or refresh tokens into logs.
- Check App Check, Identity Platform tenants, blocking functions, password policy, and quota only after the basic project/provider/domain/key checks pass.
- Missing Firestore profiles after successful login must be handled as profile initialization, not reported as invalid credentials.

### Disposable Firebase Auth REST verification

Use this repository-only diagnostic when production login reports credential failures and you need to verify the Firebase project independently of React UI:

```text
npm run config:firebase
npm run config:firebase:rest
```

The first command prints only safe configuration metadata: project ID, auth domain, sender ID suffix, app ID suffix, API key suffix, missing variables, and consistency errors. It never prints the full API key.

The REST command creates a disposable random Email/Password user through Identity Toolkit, signs in with the same disposable credentials, then deletes the account. It prints only step, HTTP status, safe Firebase error code, and classification. It never prints the disposable email, password, ID token, refresh token, or API key.

Interpretation:

- `signup status=400 code=OPERATION_NOT_ALLOWED`: Email/Password provider is disabled in Firebase Authentication for the configured project.
- `API_KEY_INVALID`, `API_KEY_SERVICE_BLOCKED`, `PROJECT_NOT_FOUND`, or `CONFIGURATION_NOT_FOUND`: the API key or Firebase Web App configuration is wrong or restricted incorrectly.
- `REQUEST_BLOCKED`, `PERMISSION_DENIED`, or referrer-related errors: inspect Google Cloud API-key HTTP referrer restrictions, App Check, and required Firebase/Auth APIs.
- `signin code=INVALID_LOGIN_CREDENTIALS` immediately after a successful disposable signup: investigate tenants, blocking functions, password policy, or unusual Identity Platform behavior.
- all steps `status=200 code=OK`: Firebase Email/Password is operational for that configuration. If production UI login still fails, inspect Vercel's deployed values, browser network response, form behavior, user account state, or post-login Firestore/profile initialization.

On 2026-07-30, local config for project `postl-0` returned `200 OK` for disposable signup, signin, and delete. This proves the local Firebase browser config and Email/Password provider are functional. It does not prove the Vercel Production build contains the same values; Vercel dashboard scope and redeployment still need verification.
