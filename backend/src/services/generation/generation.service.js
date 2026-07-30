import crypto from 'crypto';
import { env } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { makeCacheKey, cacheGet, cacheSet } from '../cache/cache.service.js';
import { getProvider, getProviderChain, resolveModelSelection } from '../providers/providerRegistry.js';
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
  const selected = resolveModelSelection(request.modelId);
  if (!selected) throw new ApiError('ai_provider_unavailable', 'No configured AI provider is available for this deployment.', 503, true);
  const providerNames = prioritizeProviderChain(selected.provider.name);
  const selectedModel = selected.model;
  const variantsToCreate = VARIANT_STRATEGIES.slice(0, request.variants);
  const variants = [];

  for (const strategy of variantsToCreate) {
    const variant = await generateVariant({ request, user, requestId, strategy, providerNames, selectedModel });
    variants.push(variant);
  }

  return { requestId, variants, briefAnalysis, benchmarkTiming: benchmarkTiming(request, user?.timezone || 'UTC') };
}

function prioritizeProviderChain(preferredName) {
  const chain = getProviderChain();
  return [preferredName, ...chain].filter((name, index, arr) => name && arr.indexOf(name) === index);
}

async function generateVariant({ request, user, requestId, strategy, providerNames, selectedModel }) {
  let lastError;
  for (const providerName of providerNames) {
    const provider = getProvider(providerName);
    if (!provider?.enabled) continue;
    const modelCandidates = provider.name === selectedModel.provider
      ? (selectedModel.providerModels?.length ? selectedModel.providerModels : [selectedModel.providerModel])
      : (provider.metadata.models[0]?.providerModels?.length ? provider.metadata.models[0].providerModels : [provider.metadata.models[0]?.providerModel || provider.model]);
    const prompt = buildGenerationPrompt(request, strategy);

    let attempted = 0;
    for (const modelForProvider of modelCandidates.filter(Boolean)) {
      if (provider.name === 'openrouter' && attempted >= env.OPENROUTER_MAX_MODEL_ATTEMPTS) break;
      attempted += 1;
      const key = makeCacheKey({ userId: user?.uid || 'anonymous', request: { ...request, strategy: strategy.id }, provider: provider.name, model: modelForProvider, promptVersion: PROMPT_TEMPLATE_VERSION });
      const cached = cacheGet(key);
      if (cached) return { ...cached, cached: true };

      try {
        const providerResult = await provider.generate({ prompt, temperature: request.creativity, timeoutMs: env.PROVIDER_TIMEOUT_MS, requestId, model: modelForProvider });
        const structured = parseProviderOutput(providerResult.text, request);
        if (!structured.content) throw new ProviderError('provider_empty_output', `${provider.name} returned empty content.`, true, { provider: provider.name });
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
  }

  const code = providerNames.includes('openrouter') ? 'free_models_temporarily_unavailable' : (lastError?.code || 'generation_failed');
  const message = providerNames.includes('openrouter')
    ? 'The free AI service is temporarily unavailable. Please try again later.'
    : (lastError?.message || 'All configured AI providers failed.');
  throw new ApiError(code, message, 503, true, { provider: lastError?.provider, status: lastError?.status });
}
