import { PLATFORMS } from './contentDefinitions.js';

const toneInstructions = {
  professional: 'Authoritative, clear, credible, and concise.',
  casual: 'Conversational, warm, and easy to read.',
  witty: 'Clever and surprising without becoming unclear.',
  enthusiastic: 'Energetic and optimistic without hype spam.',
  bold: 'Confident, contrarian where useful, and direct.',
  minimal: 'Sparse, crisp, and highly edited.',
  storytelling: 'Narrative-driven with tension and payoff.',
  'data-driven': 'Specific, evidence-based, and structured.',
};

export const PROMPT_TEMPLATE_VERSION = 'postl-generation-v1';

export function buildGenerationPrompt(request, strategy) {
  const platform = PLATFORMS[request.platform];
  return `You are POSTL, a senior content strategist. Create one content asset as strict JSON only.

Return exactly this JSON shape and no markdown fences:
{
  "content": "final content only",
  "hook": "opening hook if applicable",
  "cta": "call to action if applicable",
  "hashtags": ["tagWithoutHash"],
  "strategy": {
    "framework": "stable framework name used",
    "audienceIntent": "what the audience wants",
    "contentGoal": "goal of this asset",
    "rationale": "short explanation of why this variant works"
  }
}

CONSTRAINTS:
- Platform: ${platform.label}
- Format: ${request.contentType}
- Platform max characters: ${platform.maxChars}
- Tone: ${request.tone} (${toneInstructions[request.tone] || toneInstructions.professional})
- Topic angle: ${request.topic}
- Objective: ${request.objective}
- Audience: ${request.audience || 'Not specified'}
- Language: ${request.language}
- Locale: ${request.locale}
- CTA: ${request.callToAction || 'Infer a natural next step if useful'}
- Extra constraints: ${request.constraints || 'None'}
- Variant strategy: ${strategy.label}. ${strategy.instruction}

RULES:
- Stay strictly centered on the user's idea. Do not silently replace the subject.
- Make the objective influence structure, evidence, CTA, length, and emotional intensity.
- Do not use spam hashtags like viral, trending, fyp, instagood, explore unless explicitly requested.
- Do not claim direct publishing or actual account-performance data.
- If timing advice is included, label it generic, not personalized.

USER IDEA:
${request.prompt}`;
}
