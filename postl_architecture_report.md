# Postl Project Architecture & Development Report

This report provides a comprehensive analysis of the Postl Content Intelligence OS, detailing its architecture, code structure, business logic, and the recent development milestones achieved. 

---

## 🏗️ 1. High-Level Architecture

Postl is a modern, full-stack Content Intelligence platform designed to generate platform-specific, highly optimized social media content using advanced AI orchestration.

**Stack:**
*   **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Zustand.
*   **Backend:** Node.js (v22, ES Modules), Express.js, Joi Validation.
*   **Database & Auth:** Firebase (Authentication & Firestore).
*   **AI Infrastructure:** OpenRouter API (Primary Cloud Engine).
*   **Deployment:** Vercel (Frontend) / Render (Backend).

The architecture enforces a strict separation of concerns, communicating via a RESTful JSON API protected by Firebase Auth tokens and strict CORS policies.

---

## 💻 2. Frontend Architecture (`/src`)

The frontend is a highly polished, responsive Single Page Application (SPA) focusing on a premium "Ferrari-inspired" UI/UX with glassmorphism elements.

### State Management & Data Flow
*   **`useStore.ts` (Zustand):** Manages local user preferences (`selectedModel`, `creativity`, `tone`, `fontSize`, `darkMode`) and usage statistics. It uses `persist` middleware to save state across sessions. 
*   **`AuthContext.tsx`:** Wraps the application to manage Firebase authentication state, providing user objects and secure JWT tokens for backend API calls.
*   **`client.ts`:** A robust API client that wraps the native `fetch` API. It handles authorization headers, request timeouts, request ID generation for tracing, and normalizes errors into a custom `ApiClientError` class.

### Key Components
*   **`GeneratePost.tsx`:** The core engine room of the UI. It orchestrates the collection of user inputs (Platform, Topic, Format, Tone), provides "Smart Prompt Suggestions," and manages the generation lifecycle. It directly saves successful generations to Firestore (`posts` collection).
*   **Studio Selectors:** Modular components (`ModelSelector`, `PlatformSelector`, `ToneSelector`, etc.) that feed into the generation state.
*   **`PostResultView.tsx`:** Renders the AI output, handling variations, strategy briefs (Launch Briefs), and user feedback (helpful/unhelpful).
*   **Animations:** Extensive use of `framer-motion` for fluid state transitions, loaders, and gooey background effects (`GooeyBackground.tsx`).

---

## ⚙️ 3. Backend Architecture (`/backend/src`)

The backend is an intelligent orchestration layer designed for maximum resilience, rate limiting, and AI provider fallback. 

### Core Server & Middleware
*   **`app.js` & `server.js`:** Bootstraps the Express application. Configured with `trust proxy` to handle Render's load balancers correctly.
*   **Security:** Uses `helmet` for HTTP headers, `cors` configured strictly via the `ALLOWED_ORIGINS` environment variable, and `express-rate-limit` to prevent abuse.
*   **Firebase Admin:** Initializes via `service-account.json` or environment variables to verify incoming JWT tokens securely.

### AI Generation Pipeline (`generation.service.js`)
The generation logic is sophisticated and multi-step:
1.  **Validation (`generation.schema.js`):** Ensures the incoming request matches expected constraints using Joi.
2.  **Quota Check (`quota.service.js`):** Verifies the user hasn't exceeded their daily generation limits.
3.  **Brief Analysis (`briefAnalyzer.js`):** Analyzes the user's prompt for readiness and platform fit.
4.  **Prompt Building (`promptBuilder.js`):** Constructs highly specific system prompts based on the requested platform (e.g., Twitter vs. LinkedIn), tone, and content type.
5.  **Provider Execution (`providerRegistry.js`):** Routes the request to the configured AI provider.

### The OpenRouter Provider (`openrouter.provider.js`)
This is the most complex service, recently hardened for production:
*   **Zero-Price Verification:** Contains aggressive logic (`hasZeroPromptAndCompletionPricing`) to ensure the system only utilizes "Free" OpenRouter models (e.g., Mistral, Llama 3) to prevent unexpected billing.
*   **Catalog Caching:** Fetches and caches the OpenRouter model catalog with a defined TTL.
*   **Connectivity Probes:** Includes a `testOpenRouterConnection` function that pings OpenRouter on server startup to validate API keys and log current usage limits.
*   **Resilience & Fallback:** If a specific model request fails, it automatically intercepts the error and falls back to a guaranteed reliable model (e.g., `mistralai/mistral-small-3.1-24b-instruct:free`).

---

## 🚀 4. Recent Development Milestones

Over the recent development sessions, several critical upgrades were made to stabilize the platform for production:

1.  **Axios to Native Fetch Migration:** The backend was entirely refactored to remove the `axios` dependency. Axios was causing severe `ERR_MODULE_NOT_FOUND` deployment crashes in Node v22 ESM environments on Render. Native `fetch` resolved this.
2.  **Vercel Deployment Fixes:** Created a `.vercelignore` file to prevent Vercel's build system from attempting to compile the backend folder, resolving build script errors.
3.  **Proxy Rate-Limiting Fix:** Added `app.set('trust proxy', 1)` to resolve Express validation errors on Render caused by X-Forwarded-For headers.
4.  **"Power Debug" & "Max Resilience" Updates:** 
    *   Added auto-sanitization of API keys (stripping accidental quotes/spaces).
    *   Implemented mandatory headers (`HTTP-Referer`, `Origin`, `X-Title`) required by OpenRouter's free tier.
    *   Forced numeric types for `temperature` and `max_tokens` in AI requests.
    *   Implemented transparent error reporting, passing raw AI provider errors (e.g., 401 Unauthorized) directly back to the React frontend for easier debugging.

## 🔮 Summary
The Postl project is now a highly resilient, cloud-native application. The codebase is clean, typed (on the frontend), and features robust fallback mechanisms. It successfully abstracts the complexities of prompt engineering and AI model routing away from the user, presenting a seamless, premium interface for content creation.
