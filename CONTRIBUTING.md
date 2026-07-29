# Contributing to POSTL

## Workflow

1. Check `git status` before changing files.
2. Do not commit secrets or dependency folders.
3. Keep changes focused and incremental.
4. Run relevant validation before opening a PR.
5. Update `UPGRADE_REPORT.md` for modernization work.

## Validation

```bash
npm run build
npm run test:unit
cd backend && npm run build
```

Run Python syntax check if touching `backend/LocalAIServer`:

```bash
cd backend && python -m py_compile LocalAIServer/server.py
```

## Testing guidance

Use Vitest APIs consistently. Mock Firebase and AI providers at boundaries. Do not depend on real shared accounts or live AI providers in deterministic tests.
