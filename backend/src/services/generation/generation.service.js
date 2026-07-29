import crypto from 'crypto';
import { env } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { makeCacheKey, cacheGet, cacheSet } from '../cache/cache.service.js';
import { getProvider, getProviderChain, getProviderForModelId } from '../providers/providerRegistry.js';
import { ProviderError } from '../providers/provider.interface.js';
import { analyzeBrief } from './briefAnalyzer.js';
import { assertPlatformFormat, VARIANT_STRATEGIES } from './contentDefinitions.js';
import { buildGenerationPrompt, PROMPT_TEMPLATE_VERSION } from './promptBuilder.js';
import { parseProviderOutput } from './outputParser.js';
import { benchmarkTiming, scorePlatformFit } from './strategy.service.js';

export async function generateContent({ request, user, requestId }) {
  const compatibility = assertPlatformFormat(request.platform, request.contentType);
  if (!compatibility.ok) throw new ApiError('invalid_platform_format', compatibility.message, 400, false);
  request.contentType = compatibility.format;

  const briefAnalysis = analyzeBrief(request);
  const selectedProvider = getProviderForModelId(request.modelId);
  const providerNames = prioritizeProviderChain(selectedProvider?.name);
  const variantsToCreate = VARIANT_STRATEGIES.slice(0, request.variants);
  const variants = [];

  for (const strategy of variantsToCreate) {
    const variant = await generateVariant({ request, user, requestId, strategy, providerNames });
    variants.push(variant);
  }

  return { requestId, variants, briefAnalysis, benchmarkTiming: benchmarkTiming(request, user?.timezone || 'UTC') };
}

function prioritizeProviderChain(preferredName) {
  const chain = getProviderChain();
  return [preferredName, ...chain].filter((name, index, arr) => name && arr.indexOf(name) === index);
}

async function generateVariant({ request, user, requestId, strategy, providerNames }) {
  let lastError;
  for (const providerName of providerNames) {
    const provider = getProvider(providerName);
    if (!provider?.enabled) continue;
    const prompt = buildGenerationPrompt(request, strategy);
    const key = makeCacheKey({ userId: user?.uid || 'anonymous', request: { ...request, strategy: strategy.id }, provider: provider.name, model: provider.model, promptVersion: PROMPT_TEMPLATE_VERSION });
    const cached = cacheGet(key);
    if (cached) return { ...cached, cached: true };

    try {
      const providerResult = await provider.generate({ prompt, temperature: request.creativity, timeoutMs: env.PROVIDER_TIMEOUT_MS, requestId });
      const structured = parseProviderOutput(providerResult.text, request);
      if (!structured.content) throw new ProviderError('provider_empty_output', `${provider.name} returned empty content.`, true);
      const analysis = scorePlatformFit(structured.content, request);
      const variant = {
        id: crypto.randomUUID(),
        label: strategy.label,
        content: structured.content,
        hook: structured.hook,
        CTA: structured.cta,
        hashtags: structured.hashtags,
        rationale: structured.rationale || `Generated with the ${strategy.label} strategy.`,
        strategy: { framework: structured.framework, audienceIntent: structured.audienceIntent, contentGoal: structured.contentGoal },
        analysis,
        provider: { name: providerResult.provider, model: providerResult.model, latencyMs: providerResult.latencyMs, finishReason: providerResult.finishReason, usage: providerResult.usage },
        cached: false,
      };
      cacheSet(key, variant);
      return variant;
    } catch (err) {
      lastError = err;
      if (!(err instanceof ProviderError) || err.retryable === false) break;
    }
  }

  throw new ApiError(lastError?.code || 'generation_failed', lastError?.message || 'All configured AI providers failed.', 502, true);
}
