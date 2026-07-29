# POSTL

POSTL is a premium Content Intelligence Workspace for generating, organizing, and repurposing platform-specific content with Firebase authentication and a modular AI backend.

## Current capabilities

- Firebase email/password authentication.
- Premium React/Vite dashboard and landing page.
- Content generation studio with platform, format, topic, tone, creativity, and backend-controlled model selection.
- Modular Express backend with request IDs, safe errors, validated environment, Firebase Admin auth, provider abstraction, and consistent response envelopes.
- AI provider chain: Ollama primary by default, OpenRouter and Hugging Face optional fallbacks.
- Brand Voice DNA and Campaign draft forms backed by Firestore.
- Post library/history backed by Firestore.
- Repurposing API foundation at `POST /api/repurpose`.
- Firestore rules and indexes included.

## Local setup

1. Install root dependencies: `npm install`
2. Install backend dependencies: `cd backend && npm install`
3. Copy `.env.example` to `.env.local` and fill Firebase web config.
4. Copy `backend/.env.example` to `backend/.env` and configure Firebase Admin plus AI providers.
5. Start backend: `cd backend && npm start`
6. Start frontend: `npm run dev`
7. Visit `http://localhost:3005`

## Validation commands

```bash
npm run build
npm run test:unit
cd backend && npm run build
cd backend && python -m py_compile LocalAIServer/server.py
npm exec -- cypress verify
```

## Security note

Do not commit service-account JSON, `.env` files, private keys, API tokens, or dependency folders. If a Firebase service-account key was ever committed or exposed, rotate it in Firebase/Google Cloud.

See `ARCHITECTURE.md`, `SECURITY.md`, `DEPLOYMENT.md`, and `UPGRADE_REPORT.md` for details.
