import Joi from 'joi';
import { OBJECTIVES, PLATFORMS, TONES, TOPICS } from '../services/generation/contentDefinitions.js';

const formats = [...new Set(Object.values(PLATFORMS).flatMap((p) => p.formats).concat(['single', 'thread', 'caption', 'script', 'blog', 'email', 'ad', 'pitch']))];

export const generationSchema = Joi.object({
  prompt: Joi.string().trim().min(2).max(2000).required(),
  platform: Joi.string().valid(...Object.keys(PLATFORMS)).default('twitter'),
  contentType: Joi.string().valid(...formats).default('single'),
  tone: Joi.string().valid(...TONES).default('professional'),
  topic: Joi.string().valid(...TOPICS).default('general'),
  objective: Joi.string().valid(...OBJECTIVES).default('engagement'),
  audience: Joi.string().trim().max(500).allow('').default(''),
  brandProfileId: Joi.string().trim().max(128).allow(null, '').default(null),
  campaignId: Joi.string().trim().max(128).allow(null, '').default(null),
  language: Joi.string().trim().max(64).default('English'),
  locale: Joi.string().trim().max(32).default('en-US'),
  creativity: Joi.number().min(0).max(1).default(0.7),
  variants: Joi.number().integer().min(1).max(3).default(1),
  modelId: Joi.string().trim().max(128).default('local-gemma'),
  callToAction: Joi.string().trim().max(300).allow('').default(''),
  constraints: Joi.string().trim().max(1000).allow('').default(''),
}).unknown(false);

export function validateGenerationRequest(body) {
  return generationSchema.validate(body, { abortEarly: false, stripUnknown: false, convert: true });
}
