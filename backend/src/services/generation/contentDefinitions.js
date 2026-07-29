export const PLATFORMS = {
  twitter: { label: 'Twitter / X', formats: ['single', 'thread', 'ad'], maxChars: 280 },
  instagram: { label: 'Instagram', formats: ['caption', 'carousel', 'script', 'ad'], maxChars: 2200 },
  linkedin: { label: 'LinkedIn', formats: ['single', 'article', 'carousel', 'ad'], maxChars: 3000 },
  tiktok: { label: 'TikTok', formats: ['script', 'caption', 'hooks'], maxChars: 300 },
  email: { label: 'Email', formats: ['subject', 'email', 'newsletter'], maxChars: 2000 },
  blog: { label: 'Blog', formats: ['outline', 'article', 'seoBrief'], maxChars: 6000 },
  ad: { label: 'Ad Copy', formats: ['ad'], maxChars: 500 },
};

export const LEGACY_FORMAT_MAP = {
  blog: 'outline',
  email: 'subject',
};

export const TONES = ['professional', 'casual', 'witty', 'enthusiastic', 'bold', 'minimal', 'storytelling', 'data-driven'];
export const TOPICS = ['general', 'motivational', 'tech', 'travel', 'funny', 'educational', 'startup'];
export const OBJECTIVES = ['awareness', 'engagement', 'education', 'authority', 'traffic', 'lead-generation', 'conversion', 'announcement', 'community', 'recruitment'];

export const VARIANT_STRATEGIES = [
  { id: 'authority', label: 'Authority / Educational', instruction: 'Teach clearly, use evidence, and make the reader trust the expertise.' },
  { id: 'story', label: 'Personal Story / Emotional', instruction: 'Use a relatable story arc, emotional tension, and a human takeaway.' },
  { id: 'conversion', label: 'Contrarian / High-Conversion', instruction: 'Challenge an assumption, make the value concrete, and drive action.' },
];

export function normalizeFormat(format) {
  return LEGACY_FORMAT_MAP[format] || format || 'single';
}

export function assertPlatformFormat(platform, format) {
  const definition = PLATFORMS[platform];
  if (!definition) return { ok: false, message: `Unsupported platform: ${platform}` };
  const normalized = normalizeFormat(format);
  if (!definition.formats.includes(normalized)) {
    return { ok: false, message: `${definition.label} does not support format '${format}'. Supported formats: ${definition.formats.join(', ')}` };
  }
  return { ok: true, format: normalized, definition };
}
