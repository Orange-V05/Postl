import { ApiError } from '../middleware/errorHandler.js';
import { validateGenerationRequest } from '../validation/generation.schema.js';
import { generateContent } from '../services/generation/generation.service.js';
import { assertUserQuota } from '../services/quota/quota.service.js';

export async function generatePost(req, res, next) {
  const { error, value } = validateGenerationRequest(req.body);
  if (error) {
    return next(new ApiError('validation_error', 'Generation request is invalid.', 400, false, error.details.map((d) => ({ path: d.path, message: d.message }))));
  }

  try {
    await assertUserQuota({ uid: req.user?.uid, kind: 'generation', requestId: req.requestId });
    const data = await generateContent({ request: value, user: req.user, requestId: req.requestId });
    return res.json({ data, error: null });
  } catch (err) {
    return next(err);
  }
}
