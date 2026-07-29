# POSTL Upgrade Report

This report is maintained throughout the modernization work. It records verified baseline state, implementation plan, changes made, validation commands, migration concerns, and remaining limitations.

## 1. Baseline repository audit

Date: 2026-07-29
Repository: `D:\postl`
Branch: `main`

### 1.1 Git state before modernization

Command: `git status --short && git branch --show-current`

Result:

```text
 M backend/server.js
?? whatitis
main
```

Important: the repository was already dirty before this upgrade work. `backend/server.js` had existing uncommitted modifications, and `whatitis` was an untracked document from the prior documentation task. I will preserve these and avoid overwriting unrelated user work.

### 1.2 Root package scripts

From `package.json`:

- `dev`: starts Vite.
- `build`: runs TypeScript compile then Vite production build.
- `preview`: starts Vite preview.
- `test`: runs Vitest.
- `test:unit`: runs `vitest run`.
- `test:e2e`: runs Cypress.
- `test:ci`: runs Vitest and Cypress.
- `cypress:open`: opens Cypress.
- `deploy:vercel`: deploys to Vercel.
- `deploy:netlify`: deploys `dist` to Netlify.
- `clean`: removes root node_modules and lockfile, then reinstalls with force.

### 1.3 Backend package scripts

From `backend/package.json`:

- `start`: `concurrently "node server.js" "python LocalAIServer/server.py"`.
- `start:prod`: `node server.js`.
- `build`: no-op echo.

Concern: backend start launches the Python GPT-2 service even though current Express generation does not call it. This wastes resources and creates misleading architecture.

### 1.4 Frontend API/base URL state

Observed:

- Vite dev proxy maps `/api` to `http://localhost:4000`.
- `.env.example` documents `VITE_API_BASE_URL`, but current frontend Firebase/API logic does not consistently centralize API calls through a typed client.
- `GeneratePost.tsx` imports Axios directly.

Required direction:

- Introduce centralized typed API client.
- Use `VITE_API_BASE_URL` with safe dev default.
- Attach Firebase token and request ID consistently.

### 1.5 Firebase client initialization

Observed in `src/firebase.ts`:

- Firebase client config is hardcoded directly in source.
- Analytics initializes unconditionally with `getAnalytics(app)`.

Risks:

- Config drift between environments.
- Analytics may crash in unsupported/non-browser contexts.

Required direction:

- Move Firebase client config to Vite env variables.
- Initialize Analytics only in browser and only when supported.
- Fail clearly if required frontend config is missing.

### 1.6 Firebase Admin initialization

Observed in `backend/server.js`:

- Uses service-account file if present, otherwise parses `FIREBASE_SERVICE_ACCOUNT_KEY`.
- Logs the first 20 characters of service-account JSON. This is unsafe.
- `dotenv.config({ path: path.join(__dirname, '.env') })` happens before `__dirname` is defined.
- Auth middleware does not explicitly handle Firebase Admin unavailable state.

Required direction:

- Centralize environment loading.
- Never log service-account JSON fragments or token prefixes.
- Track explicit Admin initialization state.
- In production, fail startup if protected auth cannot work.
- In development, warn clearly and return service-configuration errors for protected routes.

### 1.7 Environment variables

Frontend documented in `.env.example`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_API_BASE_URL`

Backend documented in `backend/.env.example`:

- `PORT`
- `ALLOWED_ORIGINS`
- `OPENROUTER_API_KEY`
- `AI_SERVER_URL`
- `FIREBASE_SERVICE_ACCOUNT_KEY`

Backend currently also uses or should use:

- `NODE_ENV`
- `FIREBASE_SERVICE_ACCOUNT_PATH`
- `AI_PRIMARY_PROVIDER`
- `AI_FALLBACK_PROVIDERS`
- `OLLAMA_URL`
- `OLLAMA_MODEL`
- `OPENROUTER_MODEL`
- `HF_TOKEN`
- `HF_MODEL`
- cache settings
- request timeout settings
- rate-limit settings

### 1.8 AI providers and model identifiers

Observed:

- Backend generation currently uses Ollama as primary via `OLLAMA_URL` and `OLLAMA_MODEL`, defaulting to `gemma-4:e2b`.
- Prompt refinement uses OpenRouter with `google/gemma-3-27b-it:free` if `OPENROUTER_API_KEY` exists.
- Fallback uses Hugging Face API with `HF_TOKEN` and `HF_MODEL` defaulting to `google/gemma-2b-it`.
- `ModelSelector.tsx` exposes `gemma4:e2b`, which does not match backend default `gemma-4:e2b`.
- `useStore.ts` default selected model is `google/gemma-3-27b-it:free`, also inconsistent.
- Python Flask server uses GPT-2 Large but is not wired into Express generation.

Required direction:

- Provider abstraction.
- Backend-controlled model IDs/capability IDs.
- `GET /api/models` exposes enabled models only.
- Frontend requests allowed model/capability ID, not arbitrary provider model.
- Python GPT-2 removed from default startup or integrated explicitly as legacy experimental provider. Recommended: remove from default startup and document as legacy because GPT-2 Large is not instruction-tuned.

### 1.9 API routes

Observed in `backend/server.js`:

- `GET /health`
- `POST /generate-post`
- Router mounted at `/api`, `/.netlify/functions/api`, and `/`.

Missing but required:

- `GET /api/models`
- `POST /api/feedback`
- `POST /api/repurpose`
- Future brand/campaign endpoints or Firestore-backed client flows.

### 1.10 Firestore reads and writes

Observed:

- `GeneratePost.tsx` writes generated posts to `posts` collection.
- `PostHistory.tsx` reads realtime `posts` for current user with `where(userId == uid)`, order by timestamp desc, limit 50.
- `PostHistory.tsx` deletes posts directly from client.

Concerns:

- No Firestore rules are present in the repo.
- History uses realtime listener capped at 50 but is not paginated.
- No campaign/brand/profile collections yet.

Required direction:

- Add Firestore security rules and indexes.
- Add data model docs.
- Move sensitive writes backend-side if rules cannot safely enforce them.
- Add pagination and content library filters.

### 1.11 Zustand persistence

Observed:

- Store key: `postl-v4-store`.
- Persists preferences, recent prompts, usage stats.
- No explicit version/migration.

Concerns:

- Stale tests expect `prefs.aiModel`, while current code uses `selectedModel`.
- Future preference changes should migrate safely.

Required direction:

- Add persistence version and migration.
- Add timezone, default brand/campaign refs, reduced-motion preference where appropriate.

### 1.12 Deployment files

Observed:

- `netlify.toml` builds frontend and wraps Express backend with Netlify function.
- `vercel.json` serves frontend SPA only.
- Current Ollama primary provider requires persistent host and is not compatible with standard short-lived static/serverless-only deployment.

Required direction:

- Pick and document supported deployment architecture.
- Recommended: static frontend on Netlify/Vercel, persistent Node backend on Railway/Render/Fly/Cloud Run/VPS, Ollama on persistent backend host or secured inference host, cloud fallback through OpenRouter/Hugging Face.
- Netlify Functions can be supported only when primary production provider is cloud API, not local Ollama.

### 1.13 Test suite state

Observed:

- Unit tests exist for GeneratePost, Navbar, AuthContext, useStore.
- Tests are stale and reference obsolete UI/store fields.
- `AuthContext.test.tsx` has duplicate `const` declarations.
- Tests mix Jest and Vitest APIs.
- MSW mocks outdated `/generate-post` path and nonexistent share endpoints.
- Cypress baseUrl is `http://localhost:3000`, but Vite dev server uses `3005`.

Baseline command:

```text
npm run test:unit -- --runInBand
```

Result: failed because Vitest does not support Jest's `--runInBand` option.

A clean unit run still needs to be run and fixed in a later phase.

### 1.14 Credential and secret tracking

Observed:

- `.gitignore` includes `.env`, `.env.*` except `.env.example`, `firebase-key.json`, and `service-account.json`.
- Secret-name scan of tracked files did not show tracked `firebase-key.json` or `service-account.json`.
- The files exist locally under backend but are ignored.
- `backend/node_modules` appears tracked in Git, which is a major hygiene issue.

Required security note:

- Even if not tracked now, any Firebase service-account key that was ever committed or exposed must be rotated in Firebase/Google Cloud.
- Local credential files should be preserved locally but removed from tracking if tracked.

### 1.15 Baseline validation commands

#### Frontend TypeScript + production build

Command: `npm run build`

Result: passed.

Summary:

- Vite built successfully.
- Largest chunk: Firebase around 496 kB raw / 114 kB gzip.

#### Backend Node syntax

Command: `cd backend && node --check server.js`

Result: failed.

Error:

```text
D:\postl\backend\server.js:692
    }
    ^
SyntaxError: missing ) after argument list
```

#### Backend build script

Command: `cd backend && npm run build`

Result: passed only because it is a no-op echo.

#### Python syntax

Command: `cd backend && python -m py_compile LocalAIServer\server.py`

Result: passed.

#### Dependency audit

Commands:

- `npm audit --audit-level=moderate`
- `cd backend && npm audit --audit-level=moderate`

Result: vulnerabilities reported in both root and backend dependency trees. Notable packages include `axios`, `@grpc/grpc-js`, `@protobufjs/utf8`, and others. Full audit output was lengthy and should be rerun after dependency updates.

#### Cypress binary verification

Command: `npm exec -- cypress verify`

Result: passed.

### 1.16 Current runtime failures verified

- Backend does not pass syntax validation.
- Backend also has a likely ESM initialization bug from using `__dirname` before definition.
- Unit test command with Jest-style flag fails.
- Test files are stale and likely fail under real Vitest run.

## 2. Prioritized implementation plan

### Phase 1: Critical stability and security

Goals:

- Preserve working frontend build.
- Replace `backend/server.js` monolith with modular Express app.
- Fix ESM path setup and route brace syntax.
- Add centralized env loading/validation.
- Add safe Firebase Admin initialization state.
- Add request IDs, safe structured logging, consistent error envelope, centralized error handler.
- Add explicit CORS allowlist behavior.
- Remove unused Python GPT-2 service from default backend startup and document legacy status.
- Harden `.gitignore` and document credential rotation.
- Update backend scripts to new entrypoint.
- Validate backend syntax/startup after refactor.

### Phase 2: AI provider architecture and generation contract

Goals:

- Provider abstraction for Ollama, OpenRouter, Hugging Face.
- Normalized provider result/errors.
- Config-controlled primary/fallback chain.
- `GET /api/models`.
- Backend-approved model IDs.
- Structured generation output with repair fallback.
- Platform/format/objective compatibility definitions.
- Brief-quality analyzer.
- Stable platform-fit heuristic with factor breakdown.
- Explainable strategy and hashtags.
- Intentional variant strategies.

### Phase 3: Frontend integration and maintainability

Goals:

- Replace hardcoded Firebase config with env-based config.
- Safe Analytics initialization.
- Central typed API client.
- Shared frontend types/constants.
- ModelSelector loads `/api/models`.
- Update GeneratePost request/response handling.
- Mount ErrorBoundary.
- Add reduced-motion support for authenticated workspace.
- Add Zustand version/migration and timezone.

### Phase 4: Product workspace capabilities

Goals:

- Brand Voice DNA data model and UI.
- Campaign model and UI.
- Content library pagination/filtering/favorites/status/tags.
- Editor with autosave basics and versioning foundations.
- Repurposing endpoint and UI.
- Firestore security rules and indexes.

### Phase 5: Tests, CI, docs, deployment

Goals:

- Rebuild stale unit/component tests.
- Backend integration tests with mocked providers/auth.
- E2E tests aligned to real ports and deterministic mocks/emulators.
- Dependency audit remediation where safe.
- README, ARCHITECTURE, SECURITY, DEPLOYMENT, CONTRIBUTING.
- CI workflow.
- Final build/test/runtime verification.

## 3. Change log

### 3.1 Critical backend stability and security

Affected files:

- `backend/server.js`
- `backend/src/app.js`
- `backend/src/server.js`
- `backend/src/config/env.js`
- `backend/src/config/firebaseAdmin.js`
- `backend/src/middleware/*`
- `backend/src/routes/*`
- `backend/package.json`
- `netlify/functions/api.js`

Implemented fixes:

- Replaced the broken monolithic `backend/server.js` with a compatibility wrapper around a modular backend.
- Fixed the verified backend syntax failure from the old `/generate-post` brace structure by moving route logic into focused route/controller/service modules.
- Fixed the ESM `__dirname` ordering issue by centralizing path setup in `backend/src/config/env.js`.
- Added centralized backend environment loading and validation with safe defaults in development and stricter production behavior.
- Added explicit Firebase Admin initialization state.
- Removed unsafe service-account JSON fragment logging.
- Authentication middleware now returns `auth_service_unavailable`, `auth_missing_token`, or `auth_invalid_token` consistently.
- Added request IDs, structured safe logging, centralized error middleware, safe JSON error envelopes, rate limit middleware, and explicit CORS allowlist handling.
- Removed the unused Flask GPT-2 process from default `backend npm start`; it is now available only through `start:legacy-local-ai` and documented as experimental.

Migration concerns:

- Backend entrypoint is now `backend/src/server.js`; `backend/server.js` remains as a compatibility wrapper.
- Production must configure Firebase Admin correctly or protected routes will not work.
- A malformed ignored local `backend/service-account.json` was detected during smoke import. It is not leaked, but the local developer must replace or remove it.

### 3.2 AI provider architecture and generation contract

Affected files:

- `backend/src/services/providers/*`
- `backend/src/services/generation/*`
- `backend/src/validation/generation.schema.js`
- `backend/src/controllers/generation.controller.js`
- `backend/src/routes/models.routes.js`
- `backend/src/controllers/repurpose.controller.js`
- `backend/src/routes/repurpose.routes.js`

Implemented fixes:

- Added provider abstraction for Ollama, OpenRouter, and Hugging Face.
- Added normalized provider results with provider name, model, text, latency, finish reason, and optional usage.
- Added provider configuration validation and health metadata surfaced via `/api/health` and `/api/models`.
- Provider selection is controlled by backend configuration and backend-approved model IDs.
- Added `/api/models` so the browser sees only enabled/approved model capabilities.
- Consolidated model identifiers around frontend `local-gemma` mapped to backend `OLLAMA_MODEL`.
- Added platform/format/objective definitions and compatibility checks.
- Added validated generation request schema with unknown-field rejection.
- Added structured JSON prompting for generation output.
- Added defensive legacy plain-text parser as fallback.
- Added explainable brief analyzer, replacing the misleading readiness-only logic on the backend.
- Added heuristic Platform Fit Score with factor breakdown and disclaimer instead of claiming real engagement prediction.
- Removed random strategy selection in favor of deterministic variant strategies.
- Added stable generic benchmark timing with a disclaimer that no account-performance data is available.
- Added `POST /api/repurpose` foundation using the same provider architecture.

Migration concerns:

- Frontend callers should send `modelId`, not arbitrary provider model names.
- Existing old response consumers need the new envelope mapping. `GeneratePost.tsx` was updated for the new schema.
- Real structured-output quality still depends on the configured provider/model.

### 3.3 Frontend environment, API client, and dashboard integration

Affected files:

- `src/firebase.ts`
- `src/api/client.ts`
- `src/components/GeneratePost.tsx`
- `src/components/studio/ModelSelector.tsx`
- `src/store/useStore.ts`
- `src/main.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/BrandVoiceForm.tsx`
- `src/components/CampaignForm.tsx`

Implemented fixes:

- Replaced hardcoded Firebase client config with Vite environment variables.
- Firebase Analytics now initializes only in browser and only when supported.
- Added centralized typed fetch API client with request IDs, timeouts, token header support, and normalized errors.
- Updated `GeneratePost` to use the centralized API client and new backend response envelope.
- Updated `ModelSelector` to load backend-controlled models from `/api/models` with a safe fallback list.
- Updated default selected model to `local-gemma`.
- Mounted `ErrorBoundary` at the React app root.
- Hardened ErrorBoundary so production users do not see raw internal errors.
- Added Brand Voice DNA form that stores editable brand profiles in Firestore.
- Added Campaign form that stores draft campaigns in Firestore.
- Added Dashboard tabs for Library, Brand, Campaign, and Analytics.

Migration concerns:

- Frontend builds now require Firebase Vite environment variables. An ignored local `.env.local` was updated for local validation.
- Brand Voice analysis is a heuristic draft, not a final AI voice-analysis workflow yet.

### 3.4 Security, Firestore, and repository hygiene

Affected files:

- `.gitignore`
- `.env.example`
- `backend/.env.example`
- `firestore.rules`
- `firestore.indexes.json`
- Git index for `backend/node_modules`

Implemented fixes:

- Hardened `.gitignore` for nested dependency folders, env files, Firebase service-account JSONs, private key formats, and credential-style files.
- Updated frontend and backend env templates to reflect actual variables.
- Added Firestore security rules for `posts`, `brands`, `campaigns`, `feedback`, and `users`.
- Added Firestore indexes for common post and campaign queries.
- Removed tracked `backend/node_modules` files from the Git index with `git rm -r --cached --ignore-unmatch backend/node_modules`, leaving the developer's local dependency files intact.

Security action still required:

- If any Firebase service-account key was ever committed, copied, or exposed, rotate it in Firebase/Google Cloud. Git removal does not revoke credentials.

### 3.5 Tests and docs

Affected files:

- `src/api/client.test.ts`
- `src/context/AuthContext.test.tsx`
- `src/store/useStore.test.tsx`
- `src/components/Navbar.test.tsx`
- `src/components/GeneratePost.test.tsx`
- `README.md`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `DEPLOYMENT.md`
- `CONTRIBUTING.md`

Implemented fixes:

- Replaced stale Vitest/Jest-mixed tests with current Vitest tests.
- Added API client tests.
- Updated AuthContext tests without duplicate declarations.
- Updated store tests for `selectedModel` and current store shape.
- Updated Navbar and GeneratePost smoke tests for current UI.
- Added README, architecture, security, deployment, and contribution docs.

## 4. Validation performed

### Passing validation

- `cd backend && npm run build` passed.
- `npm run build` passed.
- `npm run test:unit` passed: 5 test files, 9 tests.
- `cd backend && python -m py_compile LocalAIServer\\server.py` passed.
- `npm exec -- cypress verify` passed.
- Backend app import smoke test passed with safe development warning for malformed local Firebase Admin credential.

### Known warnings

- Vitest emits React Router future-flag warnings.
- GeneratePost component test emits a Framer Motion warning about animating `strokeDashoffset` from undefined in jsdom. The test still passes.

## 5. Remaining limitations

- Full Brand Voice DNA AI extraction and editable review workflow is only a first Firestore-backed form with heuristic analysis.
- Campaign workspace is a draft form, not yet a full campaign board with scheduling/status pipelines.
- Content library still needs pagination, richer filters, favorites, tags, status management, and bulk archive/delete.
- Rich editor features such as autosave, undo/redo, version history, compare variants, and section-level regeneration remain to be implemented.
- E2E tests are not rebuilt yet. Cypress binary verifies, but specs still need deterministic auth/provider mocks and port alignment.
- CI workflow has not yet been added.
- Dependency audit vulnerabilities were documented but not fully remediated in this pass.
- Production deployment still requires real Firebase Admin credentials and AI provider configuration.
- Ollama requires a persistent host and should not be used as a standard short-lived serverless backend provider.
- The ignored local `backend/service-account.json` appears malformed and should be replaced or removed locally.

## 6. Stage 2 Production Readiness Audit

Date: 2026-07-29
Base commit verified: `fbf1ef4 Modernize-POSTL-architecture-security`
Branch verified: `main`, ahead of `origin/main` by one commit.
Working-tree rule: `output.md` remains local-only through `.git/info/exclude` and is not committed.
Remote synchronization update: after verification, `main` was pushed to `origin/main` and `git ls-remote origin refs/heads/main` resolved to `23ea7cbd24f08e912294fa01ea8824ca76445905`.
Security update: a redacted history scan found historical `src/firebase.ts` commits on `origin/main` containing a Firebase browser API key ending in the locally recorded suffix. Current `HEAD` loads Firebase client config from Vite env vars. Manual Google Cloud/Firebase restriction or rotation remains required; history rewriting was not performed because it would require explicit coordination and force-with-lease.

### 6.1 Audit findings matrix

| ID | Severity | Finding | Affected files | Reproduction / evidence | Impact | Proposed fix | Implemented fix | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S2-001 | High | Backend compatibility wrapper imported `src/server.js` as a side effect, so importing `backend/server.js` could start an HTTP listener. | `backend/server.js`, `backend/src/server.js` | Inspect `backend/server.js`: `import './src/server.js'`. | Test imports and serverless wrappers can open duplicate ports or create side effects. | Keep app import pure and isolate listening in one executable server module. | `backend/server.js` now exports app/createApp only. `src/server.js` exports `startServer`/`stopServer` and listens only outside serverless contexts when `POSTL_NO_LISTEN` is not set. | `cd backend && npm run build` passed. Smoke import prints `app import ok` without listener log. |
| S2-002 | High | Backend build script checked only two JS files and did not validate config/import behavior. | `backend/package.json`, `backend/scripts/check-js-syntax.js`, `backend/scripts/config-check.js` | Previous script checked only `src/server.js` and `src/app.js`. | Syntax errors in controllers, routes, providers, scripts, and validation files could ship. | Add all-file syntax check, config validation, and import smoke test. | Added `scripts/check-js-syntax.js`, `scripts/config-check.js`, `smoke:import`, and expanded `build`. | `cd backend && npm run build` checked 32 JS files, ran config check, and smoke import. |
| S2-003 | High | Firebase Admin remains unavailable locally because ignored `backend/service-account.json` is malformed. | Local `backend/service-account.json`, `backend/src/config/firebaseAdmin.js` | Build/config-check output: `Bad escaped character in JSON at position 1472`. | Protected routes return `auth_service_unavailable`; Firebase authentication cannot be claimed functional locally. | Replace/remove malformed local credential, configure valid `FIREBASE_SERVICE_ACCOUNT_KEY` or path, rotate exposed keys. | Documented as active blocker. No secret file was committed. | `cd backend && npm run build` shows redacted development warning and config state. |
| S2-004 | Critical | Dependency audit still reports vulnerabilities. Root has critical/high/moderate issues. Backend is reduced but still has Firebase Admin transitive `uuid` vulnerabilities requiring breaking remediation. | `package.json`, `package-lock.json`, `backend/package.json`, `backend/package-lock.json` | Root audit: 22 vulnerabilities after removing unused `axios`/`openai`. Backend audit: 8 moderate transitive `uuid` advisories after safe audit fix. | Known vulnerable dependency tree. Some root findings are dev-only, but Firebase/Admin transitive issues remain relevant. | Remove unused risky dependencies, apply non-force fixes, then evaluate breaking upgrades separately. | Removed unused root `axios` and `openai`; removed unused backend `concurrently`; ran backend `npm audit fix`. Root `npm audit fix` timed out and requires further pass. | Builds/tests pass after dependency changes. Audits still fail and remain open. |
| S2-005 | High | Cypress was only verified previously; real Cypress run is not production-ready and timed out. Specs are stale and target port 3000 while Vite uses 3005. | `cypress.config.js`, `cypress/e2e/*.cy.ts`, `vite.config.ts` | `npm run test:e2e` timed out after 180 seconds. Specs use fake login and obsolete UI/scheduling assumptions. | CI/E2E cannot prove working user flows. | Replace E2E setup with automatic server startup, deterministic auth/provider mocks or Firebase emulator, and current UI flows. | Documented gap. Not fixed in this focused commit. | Real Cypress command timed out; binary verification alone is insufficient. |
| S2-006 | High | Brand Voice and Campaign features are mostly frontend forms and are not complete workspace capabilities. | `src/components/BrandVoiceForm.tsx`, `src/components/CampaignForm.tsx`, `src/components/GeneratePost.tsx`, Firestore rules | Source inspection shows forms exist, but generation does not load/use brand/campaign data beyond ID fields, and CRUD/versioning/pagination/analysis lifecycle are incomplete. | Product claims overstate functional readiness. | Implement authenticated CRUD, schema validation, selected brand/campaign integration in generation, version tracking, and tests. | Documented gap. | Source inspection only, no passing CRUD/E2E tests exist. |
| S2-007 | High | Post persistence is still client-side and forgeable. | `src/components/GeneratePost.tsx`, `firestore.rules` | `GeneratePost.tsx` calls `addDoc(collection(db, 'posts'), postData)` from client. | Provider metadata, prompt version, idempotency keys, ownership, and server timestamps are not authoritatively enforced by backend. | Move generated-record persistence to backend or add strict backend save route with authenticated UID. | Documented gap. | Source inspection. |
| S2-008 | Medium | Request body handling did not classify malformed JSON/content-type errors explicitly. | `backend/src/app.js`, `backend/src/middleware/errorHandler.js` | Express JSON parser errors would flow as generic bad/internal errors. | API clients receive inconsistent errors. | Add content-type guard and normalized `malformed_json`, `payload_too_large`, `unsupported_media_type`. | Implemented guard and normalized parser/limit error classification. | `cd backend && npm run build` passed. Dedicated integration tests still needed. |
| S2-009 | Medium | Provider timeout helper ignored caller abort signal when its own timeout was active. | `backend/src/services/providers/provider.interface.js` | `fetchWithTimeout` used `options.signal || controller.signal`. | Request deadlines and client cancellation are unreliable. | Combine caller and timeout signals. | Uses `AbortSignal.any([options.signal, controller.signal])` when caller signal exists. | Syntax/build validation passed. Runtime cancellation tests still needed. |
| S2-010 | Medium | `.gitignore` missed local artifacts such as TypeScript build info, Cypress screenshots/videos/downloads, temp logs, and push error logs. | `.gitignore` | `git check-ignore` covered env/build/dependency/service-account paths but missed several local artifacts. | Accidental future commits of generated files or local logs are possible. | Expand ignore rules. | Added `*.tsbuildinfo`, `*.log`, `push_error*.txt`, `backend_tracked_deps.txt`, `stage2-*.tmp`, `coverage/`, Cypress artifacts. | `git status` shows no tracked suspicious artifacts. |
| S2-011 | Medium | Route contract documentation was incomplete. | `ARCHITECTURE.md` | Docs did not contain method/auth/schema/persistence/rate-limit table. | Frontend-backend drift and unclear API guarantees. | Add route contract table. | Added in Stage 2 documentation update. | Manual doc/source inspection. |
| S2-012 | Medium | Test suite remains shallow and allows warnings. | `src/**/*.test.*`, component code | Unit tests pass 5 files / 9 tests but warnings remain for React Router future flags and Framer Motion animation. | Passing tests are not strong production evidence. | Expand tests and fail unexpected warnings after resolving known warnings. | Documented gap. | `npm run test:unit` passes with warnings. |
| S2-013 | Medium | Root output logging to `output.md` hit Windows file locking after timed-out Cypress. | `output.md` local-only | Shell append returned `The process cannot access the file because it is being used by another process.` | Terminal-output log may lag until lock clears. | Avoid parallel writes to `output.md`; use single writer or direct file overwrite after command completion. | Documented operational issue. `output.md` remains ignored and local-only. | `git check-ignore -v output.md` confirmed local exclude. |

### 6.2 Stage 2 validation performed so far

- `git status --short --branch`: verified `main...origin/main [ahead 1]` with only Stage 2 working changes.
- `npm run build`: passed after dependency changes. Vite 6.4.3 built 483 modules; Firebase chunk remains about 497 kB raw / 114 kB gzip.
- `npm run test:unit`: passed 5 files / 9 tests, with known React Router and Framer Motion warnings.
- `cd backend && npm run build`: passed. It now checks 32 JS files, validates config, and smoke-imports the app.
- `npm audit --audit-level=moderate`: still fails at root with 22 vulnerabilities after removing unused direct dependencies.
- `cd backend && npm audit --audit-level=moderate`: still fails with 8 moderate Firebase Admin transitive `uuid` issues after safe audit fix.
- `npm run test:e2e`: actual Cypress run timed out after 180 seconds. This is a real failure and replaces the earlier weaker Cypress binary verification claim.
- `git check-ignore -v output.md .env .env.local dist build backend\\LocalAIServer\\venv backend\\node_modules backend\\service-account.json`: confirmed high-risk local paths are ignored. Additional ignore coverage was added for missed artifacts.

### 6.3 Stage 2 implemented fixes in this checkpoint

- Made backend import wrappers pure and removed server-start side effects from `backend/server.js`.
- Added explicit `startServer()` and `stopServer()` exports with graceful `SIGTERM`/`SIGINT` shutdown handling.
- Added all-JS backend syntax checking.
- Added backend config-check command that reports safe Firebase/provider state without starting a listener.
- Added backend import smoke command.
- Added normalized unsupported media type, malformed JSON, and payload-too-large error classification.
- Fixed provider timeout helper to combine request cancellation and timeout signals.
- Removed unused direct root dependencies `axios` and `openai`.
- Removed unused backend dependency `concurrently`.
- Applied safe backend audit fixes, reducing backend audit to transitive Firebase Admin `uuid` advisories.
- Expanded `.gitignore` for local generated/test/log artifacts.

### 6.4 Remaining Stage 2 blockers

- Root dependency audit still fails and needs another safe fix pass plus possible planned major upgrades.
- Follow-up root lockfile updates from `npm audit fix` removed the previously reported critical root advisories, but root audit still fails with 22 vulnerabilities classified as 1 low, 2 moderate, and 19 high. Remaining root fixes require deliberate breaking-change decisions around Jest, esbuild, and React Router related dependency chains.
- Backend Firebase Admin transitive audit issues need a deliberate Firebase Admin upgrade/downgrade decision, not blind `--force`.
- Firebase Admin is not locally functional until malformed local credentials are replaced or removed.
- Cypress E2E must be rebuilt and made deterministic; current specs are stale and not evidence of real workflows.
- Brand Voice, Campaigns, post persistence, editor, repurposing UI, pagination/history, Firestore emulator tests, API integration tests, and accessibility tests remain incomplete.
- Git-history secret scanning needs a robust tool or carefully quoted command. Do not rewrite history automatically; rotate any service account or API key that was ever exposed.
