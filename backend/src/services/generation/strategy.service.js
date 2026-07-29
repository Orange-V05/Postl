import { PLATFORMS } from './contentDefinitions.js';

export function scorePlatformFit(content, request) {
  const platform = PLATFORMS[request.platform] || PLATFORMS.twitter;
  const text = content || '';
  const factors = [];
  const firstLine = text.split('\n').find(Boolean) || '';

  const lengthScore = text.length <= platform.maxChars ? 25 : Math.max(0, 25 - Math.ceil((text.length - platform.maxChars) / 50));
  factors.push({ key: 'length', score: lengthScore, max: 25, explanation: `Content length is ${text.length}/${platform.maxChars} characters for ${platform.label}.` });

  const hookScore = firstLine.length > 0 && firstLine.length <= 120 ? 20 : 8;
  factors.push({ key: 'hook', score: hookScore, max: 20, explanation: hookScore === 20 ? 'The opening line is concise enough to act as a hook.' : 'The opening line may be too long or unclear.' });

  const readabilityScore = /\n/.test(text) || text.length < 280 ? 15 : 8;
  factors.push({ key: 'readability', score: readabilityScore, max: 15, explanation: readabilityScore === 15 ? 'Formatting supports quick scanning.' : 'Consider shorter paragraphs or line breaks.' });

  const objectiveScore = objectiveSignal(text, request.objective) ? 20 : 10;
  factors.push({ key: 'objective-fit', score: objectiveScore, max: 20, explanation: objectiveScore === 20 ? `The content includes signals aligned with ${request.objective}.` : `The content could align more clearly with ${request.objective}.` });

  const ctaScore = request.callToAction || /\b(comment|reply|save|share|click|download|join|book|try|learn)\b/i.test(text) ? 10 : 3;
  factors.push({ key: 'cta', score: ctaScore, max: 10, explanation: ctaScore === 10 ? 'A next step is present.' : 'No clear next step detected.' });

  const voiceScore = request.tone && toneSignal(text, request.tone) ? 10 : 6;
  factors.push({ key: 'tone-fit', score: voiceScore, max: 10, explanation: `Heuristic tone check for ${request.tone}.` });

  const score = factors.reduce((sum, f) => sum + f.score, 0);
  const label = score >= 80 ? 'strong' : score >= 60 ? 'usable' : 'needs-work';
  return { score, label, maxScore: 100, factors, disclaimer: 'This is a heuristic Platform Fit Score, not a prediction of reach or engagement.' };
}

function objectiveSignal(text, objective) {
  const patterns = {
    awareness: /introduc|discover|new|why/i,
    engagement: /\?|comment|reply|share|save/i,
    education: /how|lesson|guide|steps|framework/i,
    authority: /proof|data|research|learned|experience/i,
    traffic: /read|link|visit|learn more/i,
    'lead-generation': /download|book|demo|guide|subscribe/i,
    conversion: /start|buy|try|join|offer|limited/i,
    announcement: /launch|announce|new|release/i,
    community: /we|together|community|join/i,
    recruitment: /hiring|role|apply|team/i,
  };
  return (patterns[objective] || /.*/).test(text);
}

function toneSignal(text, tone) {
  if (tone === 'minimal') return text.length < 500;
  if (tone === 'data-driven') return /\d|%|research|data/i.test(text);
  if (tone === 'witty') return /[!?]|plot twist|funny|irony/i.test(text);
  return true;
}

export function categorizeHashtags(rawHashtags = [], request) {
  const tags = rawHashtags.map((tag) => tag.replace(/^#/, '').trim().toLowerCase()).filter(Boolean);
  if (!['twitter', 'instagram', 'tiktok'].includes(request.platform)) return null;
  const banned = new Set(['viral', 'trending', 'fyp', 'instagood', 'explore', 'foryou']);
  const clean = [...new Set(tags)].filter((tag) => !banned.has(tag)).slice(0, request.platform === 'instagram' ? 15 : 5);
  return { broad: clean.slice(0, 2), niche: clean.slice(2, 6), community: clean.slice(6, 10), brand: [], campaign: [] };
}

export function benchmarkTiming(request, timezone = 'UTC') {
  return { timezone, source: 'Generic industry benchmark', recommendation: genericTiming(request.platform), disclaimer: 'No connected account-performance data is available, so this is not personalized posting-time advice.' };
}

function genericTiming(platform) {
  const map = { twitter: 'Weekday mornings or lunch breaks', instagram: 'Late morning or early evening', linkedin: 'Tuesday to Thursday business mornings', tiktok: 'Afternoon to evening testing windows', email: 'Midweek morning send tests', blog: 'Publish early in the week for distribution', ad: 'Test continuously by audience segment' };
  return map[platform] || 'Test multiple windows and compare performance.';
}
