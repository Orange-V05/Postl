const apiBase = 'https://openrouter.ai/api/v1';
const keyPresent = Boolean(process.env.OPENROUTER_API_KEY);
const configured = (process.env.OPENROUTER_FREE_MODELS || '').split(',').map((item) => item.trim()).filter(Boolean);

function priceIsZero(value) {
  if (value === 0 || value === '0') return true;
  if (value === null || value === undefined || value === '') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed === 0;
}

function safeModel(model) {
  return {
    id: model.id,
    name: model.name || model.id,
    contextLength: model.context_length || null,
    architecture: model.architecture?.modality || model.architecture?.tokenizer || null,
  };
}

if (!keyPresent) {
  console.error('OPENROUTER_API_KEY is not set.');
  process.exit(2);
}

const response = await fetch(`${apiBase}/models`, {
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://postl.vercel.app',
    'X-Title': process.env.OPENROUTER_APP_TITLE || 'POSTL',
  },
});

if (!response.ok) {
  console.error(JSON.stringify({ ok: false, status: response.status, code: 'openrouter_models_request_failed' }));
  process.exit(1);
}

const payload = await response.json();
const models = Array.isArray(payload?.data) ? payload.data : [];
const zeroPrice = models.filter((model) => priceIsZero(model?.pricing?.prompt) && priceIsZero(model?.pricing?.completion));
const byId = new Map(models.map((model) => [model.id, model]));
const invalidConfigured = configured.filter((id) => {
  const model = byId.get(id);
  return !model || !priceIsZero(model?.pricing?.prompt) || !priceIsZero(model?.pricing?.completion);
});

console.log(JSON.stringify({
  ok: invalidConfigured.length === 0,
  keyPresent: true,
  configuredCount: configured.length,
  invalidConfigured,
  confirmedZeroPriceCount: zeroPrice.length,
  recommendedZeroPriceModels: zeroPrice.slice(0, 20).map(safeModel),
}, null, 2));

if (invalidConfigured.length > 0) process.exit(1);
