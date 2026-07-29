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
