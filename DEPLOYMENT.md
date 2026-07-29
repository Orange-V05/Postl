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
