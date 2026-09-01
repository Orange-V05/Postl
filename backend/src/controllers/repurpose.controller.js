import { ApiError } from '../middleware/errorHandler.js';
import { generateContent } from '../services/generation/generation.service.js';
import { assertUserQuota } from '../services/quota/quota.service.js';

export async function repurposeContent(req, res, next) {
  const { sourceText, sourceType = 'notes', outputs = ['linkedin-single'], objective = 'education', audience = '', tone = 'professional', modelId = 'balanced-cloud' } = req.body || {};
  if (!sourceText || typeof sourceText !== 'string' || sourceText.length < 20) {
    return next(new ApiError('validation_error', 'sourceText must be at least 20 characters.', 400, false));
  }
  if (!Array.isArray(outputs) || outputs.length < 1 || outputs.length > 5) {
    return next(new ApiError('validation_error', 'outputs must contain 1 to 5 requested assets.', 400, false));
  }

  try {
    await assertUserQuota({ uid: req.user?.uid, kind: 'repurpose', requestId: req.requestId });
    const assets = [];
    for (const output of outputs) {
      const [platformRaw, formatRaw] = String(output).split('-');
      const platform = platformRaw === 'x' ? 'twitter' : (platformRaw || 'linkedin');
      const contentType = formatRaw || 'single';
      const prompt = `Repurpose this ${sourceType} into ${output}:\n\n${sourceText}`;
      const data = await generateContent({ request: { prompt, platform, contentType, topic: 'general', objective, audience, tone, language: 'English', locale: 'en-US', creativity: 0.6, variants: 1, modelId, callToAction: '', constraints: 'Preserve the source meaning. Do not invent facts.' }, user: req.user, requestId: req.requestId });
      assets.push({ output, ...data.variants[0] });
    }
    res.json({ data: { requestId: req.requestId, assets }, error: null });
  } catch (err) {
    // Gracefully handle quota exceeded by returning an empty-but-successful envelope.
    if (err instanceof ApiError && err.code === 'quota_exceeded') {
      return res.json({
        data: {
          requestId: req.requestId,
          assets: [],
          message: 'Daily repurpose quota reached. Try again tomorrow.'
        },
        error: null,
      });
    }
    next(err);
  }
}
