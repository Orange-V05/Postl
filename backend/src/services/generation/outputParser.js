import { categorizeHashtags } from './strategy.service.js';

export function parseProviderOutput(text, request) {
  const raw = text || '';
  const parsed = tryParseJson(raw) || tryParseJson(extractJson(raw));
  if (parsed?.content) return normalizeStructuredOutput(parsed, request);
  return legacyPlainText(raw, request);
}

function tryParseJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return '';
  return text.slice(start, end + 1);
}

export function legacyCleanAIResult(text) {
  if (!text) return '';
  let clean = text;
  [/^(Here(?:'s| is).*?:?\s*\n?)/i, /^(Sure[!,.].*?\n)/i, /^(Absolutely[!,.].*?\n)/i, /^(Of course[!,.].*?\n)/i].forEach((p) => { clean = clean.replace(p, ''); });
  ['<|RESULT|>:', 'Creative Post:', 'Instruction:', 'Output:', 'JSON:', 'Content:', 'Response:'].forEach((mark) => { if (clean.includes(mark)) clean = clean.split(mark).pop(); });
  clean = clean.replace(/IMAGE_TAG:.*$/is, '').replace(/^\s*["']|["']\s*$/g, '').replace(/\n{4,}/g, '\n\n\n');
  return clean.trim();
}

function legacyPlainText(text, request) {
  const content = legacyCleanAIResult(text);
  return { content, hook: content.split('\n').find(Boolean) || '', cta: '', hashtags: categorizeHashtags(content.match(/#[\w-]+/g) || [], request), framework: inferFramework(content, request), audienceIntent: request.audience || 'General audience', contentGoal: request.objective };
}

function normalizeStructuredOutput(parsed, request) {
  return { content: String(parsed.content || '').trim(), hook: parsed.hook || '', cta: parsed.cta || parsed.CTA || '', hashtags: categorizeHashtags(parsed.hashtags || [], request), framework: parsed.strategy?.framework || parsed.framework || inferFramework(parsed.content, request), audienceIntent: parsed.strategy?.audienceIntent || request.audience || 'General audience', contentGoal: parsed.strategy?.contentGoal || request.objective, rationale: parsed.rationale || parsed.strategy?.rationale || '' };
}

function inferFramework(content, request) {
  if (request.objective === 'conversion' || request.platform === 'ad') return 'Problem → Promise → Proof → CTA';
  if (request.contentType === 'thread') return 'Hook → Steps → Takeaway';
  if (/\?/.test(content || '')) return 'Insight → Engagement Prompt';
  return 'Hook → Value → Next Step';
}
