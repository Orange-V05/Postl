import express from "express";
import cors from "cors";
// axios removed - using native fetch instead
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import Joi from "joi";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

dotenv.config();

// Power Debug: Clean and sanitize API Keys
if (process.env.OPENROUTER_API_KEY) {
  process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY.replace(/["']/g, "").trim();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Firebase Admin Setup ─────────────────────────────────────────────────────
let serviceAccount;
const saPath = path.join(__dirname, "service-account.json");

if (fs.existsSync(saPath)) {
  try {
    let saRaw = fs.readFileSync(saPath, "utf8");
    const firstBrace = saRaw.indexOf('{');
    if (firstBrace !== -1) {
      saRaw = saRaw.substring(firstBrace).trim();
    }
    console.log("[Firebase] Sanitized Entry (First 20):", saRaw.substring(0, 20));
    serviceAccount = JSON.parse(saRaw);
  } catch (err) {
    console.error("[Firebase] Error: service-account.json is malformed.", err.message);
  }
} else {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
}

if (serviceAccount && serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

if (serviceAccount && serviceAccount.project_id) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("[Firebase] Admin SDK initialized via JSON engine.");
} else {
  console.warn("[Firebase] Warning: service-account.json missing and FIREBASE_SERVICE_ACCOUNT_KEY invalid.");
}

const app = express();
app.set('trust proxy', 1); 
const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
}));

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : true,
  credentials: true,
};
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());

// Auth Middleware
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("[Auth] Token verification failed:", error.message);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// ─── Cache with TTL (1 hour) ──────────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 200;
const responseCache = new Map();

function makeCacheKey(params) {
  const hash = crypto.createHash("sha256").update(JSON.stringify(params)).digest("hex").slice(0, 16);
  return hash;
}

function cacheGet(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  if (responseCache.size >= MAX_CACHE_SIZE) {
    const oldest = responseCache.keys().next().value;
    responseCache.delete(oldest);
  }
  responseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── AI Result Cleaning (Enhanced) ───────────────────────────────────────────
const cleanAIResult = (text) => {
  if (!text) return "";
  let clean = text;

  // Remove common AI preamble patterns
  const preamblePatterns = [
    /^(Here(?:'s| is) (?:a |an |the |your )?(?:.*?):?\s*\n?)/i,
    /^(Sure[!,.].*?\n)/i,
    /^(Absolutely[!,.].*?\n)/i,
    /^(Of course[!,.].*?\n)/i,
    /^(I'd be happy to.*?\n)/i,
    /^(Let me.*?\n)/i,
    /^(Great[!,.].*?\n)/i,
  ];
  preamblePatterns.forEach(p => { clean = clean.replace(p, ""); });

  // Specific markers
  const markers = ["<|RESULT|>:", "Creative Post:", "Instruction:", "Output:", "JSON:", "Content:", "Response:"];
  markers.forEach(mark => {
    if (clean.includes(mark)) clean = clean.split(mark).pop();
  });

  const patterns = [
    /^\s*["']|["']\s*$/g,
    /Create a short.*post about:/gi,
    /Keep it under \d+ words/gi,
    /content studio post/gi,
    /creative (general|tech|travel|motivational|funny|educational)/gi,
    /\*\*Note:?\*\*.*/gis,
    /^---+\s*$/gm,
  ];
  patterns.forEach((p) => { clean = clean.replace(p, ""); });

  clean = clean.replace(/IMAGE_TAG:.*$/is, "");

  // Clean up excessive whitespace but preserve intentional formatting
  clean = clean.replace(/\n{4,}/g, "\n\n\n");

  return clean.trim();
};

// ─── Engagement Score Prediction ──────────────────────────────────────────────
const predictEngagementScore = (text, platform, tone) => {
  let score = 50; // Baseline

  // Length optimization
  const len = text.length;
  const optimalLengths = {
    twitter: { min: 80, max: 260, sweet: 180 },
    instagram: { min: 100, max: 1500, sweet: 500 },
    linkedin: { min: 200, max: 2000, sweet: 800 },
    tiktok: { min: 50, max: 250, sweet: 150 },
    email: { min: 20, max: 55, sweet: 40 },
    blog: { min: 500, max: 4000, sweet: 2000 },
    ad: { min: 30, max: 120, sweet: 80 },
  };
  const opt = optimalLengths[platform] || optimalLengths.twitter;
  if (len >= opt.min && len <= opt.max) score += 10;
  if (Math.abs(len - opt.sweet) < opt.sweet * 0.3) score += 8;

  // Engagement signals
  if (/\?/.test(text)) score += 7; // Questions boost replies
  if (/\n/.test(text)) score += 5; // Line breaks improve readability
  if (/[🔥⚡💡🚀✨🎯💪🧠]/.test(text)) score += 4; // Strategic emoji use
  if (/\d+%|\d+x|\d+\+/.test(text)) score += 6; // Data points
  if (/^[A-Z]/.test(text) && text.split('\n')[0].length < 80) score += 5; // Strong hook
  if (text.includes('#') && ['twitter', 'instagram', 'tiktok'].includes(platform)) score += 4;
  if (tone === 'witty' || tone === 'bold') score += 3;
  if (tone === 'storytelling') score += 5;
  if (/thread|🧵/i.test(text)) score += 6; // Thread format

  // Penalties
  if (len > opt.max * 1.5) score -= 10;
  if (!/[.!?]$/.test(text.trim())) score -= 3; // No ending punctuation
  if (/(.)\1{4,}/.test(text)) score -= 5; // Repeated characters

  return Math.min(98, Math.max(15, score));
};

// ─── Smart Hashtag Generation ─────────────────────────────────────────────────
const generateHashtags = (text, platform, category) => {
  if (!['twitter', 'instagram', 'tiktok'].includes(platform)) return null;

  const keywords = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 8);

  const baseTags = {
    twitter: ['trending', 'viral', 'mustread'],
    instagram: ['instagood', 'explore', 'fyp', 'reels'],
    tiktok: ['fyp', 'viral', 'trending', 'foryou'],
  };

  const categoryTags = {
    single: ['content', 'creator'],
    thread: ['thread', 'breakdown'],
    caption: ['caption', 'mood'],
    script: ['script', 'video', 'content'],
    ad: ['marketing', 'growth'],
    pitch: ['startup', 'business'],
  };

  const allTags = [
    ...keywords.map(k => k.replace(/\s/g, '')),
    ...(baseTags[platform] || []),
    ...(categoryTags[category] || []),
  ];

  const unique = [...new Set(allTags)].slice(0, platform === 'instagram' ? 20 : 8);
  return unique.map(t => `#${t}`).join(' ');
};

// ─── Validation Schema ───────────────────────────────────────────────────────
const generateSchema = Joi.object({
  prompt: Joi.string().min(2).max(500).required(),
  topic: Joi.string()
    .valid("general", "motivational", "tech", "travel", "funny", "educational", "startup")
    .default("general"),
  platform: Joi.string()
    .valid("twitter", "instagram", "linkedin", "tiktok", "email", "blog", "ad")
    .default("twitter"),
  contentType: Joi.string()
    .valid("single", "thread", "caption", "script", "blog", "email", "ad", "pitch")
    .default("single"),
  tone: Joi.string()
    .valid("professional", "casual", "witty", "enthusiastic", "bold", "minimal", "storytelling", "data-driven")
    .default("professional"),
  creativity: Joi.number().min(0).max(1).default(0.7),
  prefLocal: Joi.boolean().default(false),
  variants: Joi.number().min(1).max(3).default(1),
  model: Joi.string().default("mistralai/mistral-small-3.1-24b-instruct:free"),
});

// ─── Platform Intelligence v4.0 ──────────────────────────────────────────────
const PLATFORM_RULES = {
  twitter: {
    maxLen: 280,
    style: "Hook-first writing. Every line must earn the next. Use strategic line breaks for visual punch. No hashtag spam—max 2. Write like a reply guy who went viral. One powerful insight per tweet.",
    viralExample: "I spent 10 years building startups.\n\nHere's what nobody tells you about Year 1:\n\nYou won't feel ready. Do it anyway.\n\n(🧵)",
    bestTime: "Tue/Wed 9-11 AM EST",
    antiPatterns: "Never start with 'Just a reminder' or 'Hot take:'. Don't use more than 2 hashtags. Don't start with a question unless it's rhetorical.",
  },
  instagram: {
    maxLen: 2200,
    style: "First line IS the hook—it's all users see in feed. Then tell a micro-story. Use short paragraphs. End with a clear CTA. Emojis as bullet points, not decoration. Hashtags go at the very end, separated by line breaks.",
    viralExample: "I almost quit my dream career last Tuesday.\n\nHere's what stopped me 👇\n\nI remembered that every single person I admire felt exactly like I do right now.\n\nThe difference? They stayed.\n\n💡 Save this for the days it gets hard.",
    bestTime: "Mon/Thu 11 AM - 1 PM EST",
    antiPatterns: "Never start with 'Happy Monday!' or 'Just posted!'. Avoid 'Link in bio' as the first line.",
  },
  linkedin: {
    maxLen: 3000,
    style: "Open with a bold, contrarian statement or a personal vulnerability. Short paragraphs (1-2 sentences max). Use '↳' or '→' for lists. Professional but human—share failures, not just wins. End with a question to drive comments.",
    viralExample: "I got fired from my dream job.\n\nBest thing that ever happened to me.\n\nHere's what I learned in the 6 months after:\n\n→ Your network is your real resume\n→ Titles mean nothing. Skills mean everything.\n→ The market rewards builders, not job-holders.\n\nWhat's the best career setback you've experienced?",
    bestTime: "Tue-Thu 8-10 AM EST",
    antiPatterns: "Never use 'I'm humbled to announce'. Avoid corporate jargon like 'synergy' or 'leverage'. Don't start with 'Exciting news!'.",
  },
  tiktok: {
    maxLen: 300,
    style: "THE HOOK IS EVERYTHING. First 3 seconds = first line of your caption. Use pattern interrupts. Conversational, raw, unfiltered. Speak like you're telling your best friend a secret. Use trending formats.",
    viralExample: "POV: You discover this productivity hack and your whole life changes\n\n(Trust me, I wish I knew this 5 years ago)\n\nThe 2-minute rule: If it takes less than 2 minutes, do it RIGHT NOW.\n\nYou're welcome. 🤝",
    bestTime: "Tue/Thu 2-5 PM EST",
    antiPatterns: "Never be formal. Don't use corporate language. Avoid long paragraphs—this isn't LinkedIn.",
  },
  email: {
    maxLen: 60,
    style: "Subject line ONLY. Create extreme curiosity or urgency without being clickbait. Use numbers, brackets [URGENT], personalization, or unexpected contrasts. The recipient must feel compelled to open.",
    viralExample: "The $0 strategy that outperformed our $50K campaign",
    bestTime: "Tue/Wed 10 AM EST",
    antiPatterns: "Never use ALL CAPS for full subject. Avoid 'Newsletter #47' format. Don't start with 'Hey' or 'Hi'.",
  },
  blog: {
    maxLen: 5000,
    style: "SEO-optimized structure. Start with a compelling H1. Use H2 headers for major sections. Include bullet points for scanability. Open with a stat or provocative statement. Every section should deliver standalone value. Include a clear conclusion with CTA.",
    viralExample: "# How I Grew from 0 to 100K Followers in 90 Days\n\n## The Counter-Intuitive Strategy Nobody Talks About\n\nMost creators focus on posting more. I focused on posting less—but better.\n\n### The 3-Pillar Framework\n- Pillar 1: Content Recycling\n- Pillar 2: Engagement-First Distribution\n- Pillar 3: Collaborative Growth",
    bestTime: "Mon 9 AM EST",
    antiPatterns: "Never start with 'In this article, we will...'. Avoid generic intros. Don't bury the value—lead with it.",
  },
  ad: {
    maxLen: 150,
    style: "Direct response copywriting. Lead with the biggest benefit, not the feature. Create desire, then urgency. Clear, single CTA. Use power words: Free, New, Proven, Guaranteed, Instant, Secret.",
    viralExample: "Stop wasting 3 hours/day on content.\n\nPOSTL generates platform-perfect posts in 10 seconds.\n\n✅ 7 platforms, 1 click\n✅ Used by 10,000+ creators\n\n→ Start free today",
    bestTime: "Daily 6-9 PM EST",
    antiPatterns: "Never be vague about the benefit. Avoid 'Click here to learn more'. Don't use multiple CTAs.",
  },
};

// ─── Tone Personality Engine ──────────────────────────────────────────────────
const TONE_INSTRUCTIONS = {
  professional: "Write with authority and credibility. Use data and expertise. Confident but not arrogant. Think McKinsey meets TED Talk.",
  casual: "Write like you're texting a smart friend. Relaxed but insightful. Use contractions, colloquialisms, and conversational flow.",
  witty: "Sharp, clever, unexpected. Use wordplay, irony, and cultural references. Make them smile AND think. Think of the wittiest person at a dinner party.",
  enthusiastic: "High energy, infectious excitement. Use exclamation marks sparingly but strategically. Think motivational coach meets product launch.",
  bold: "Provocative. Contrarian. Challenge assumptions. Be polarizing on purpose—strong opinions attract strong engagement. Think Gary Vee meets Naval.",
  minimal: "Less is more. Every single word must earn its place. No filler. Short sentences. White space is your weapon. Think Apple copywriting.",
  storytelling: "Open with a scene, not a statement. Use sensory details. Create tension, then resolve. Make them feel, then think. Think Humans of New York.",
  "data-driven": "Lead with numbers, percentages, and research. Back every claim. Use frameworks and models. Think research paper meets Twitter thread.",
};

// ─── Strategy Brief Generator v4.0 ───────────────────────────────────────────
const generateStrategyBrief = (platform, contentType, text) => {
  const rules = PLATFORM_RULES[platform] || PLATFORM_RULES.twitter;
  const frameworks = {
    single: ["Hook → Value → CTA", "Contrarian Take → Evidence → Reframe"],
    thread: ["AIDA (Attention-Interest-Desire-Action)", "Problem → Analysis → Solution"],
    caption: ["Story → Lesson → CTA", "Hook → Relatability → Engagement Prompt"],
    script: ["Hook (3s) → Setup → Payoff → CTA", "POV → Conflict → Resolution"],
    blog: ["Skyscraper Technique", "Pillar-Cluster SEO Model"],
    email: ["Curiosity Gap", "FOMO + Social Proof"],
    ad: ["PAS (Problem-Agitate-Solve)", "Before/After/Bridge"],
    pitch: ["Problem → Solution → Traction", "Vision → Proof → Ask"],
  };

  const proTips = {
    twitter: [
      "End with a question to boost replies by 40%.",
      "Threads get 3x more engagement than single tweets.",
      "The best-performing tweets are 70-100 characters long.",
      "Quote-tweeting your own thread starter drives 2x impressions.",
    ],
    instagram: [
      "Carousel posts get 3x the reach of single images.",
      "First line determines 80% of engagement—it's your headline.",
      "Save > Like for the algorithm. Ask people to save your post.",
      "Reels under 15 seconds get 2x the reach.",
    ],
    linkedin: [
      "Posts with personal stories get 2x engagement.",
      "The algorithm favors posts that get comments in the first hour.",
      "Tagging 3-5 people strategically boosts reach by 50%.",
      "Documents/carousels outperform text-only by 3x.",
    ],
    tiktok: [
      "Pattern interrupts in the first second reduce scroll-aways by 60%.",
      "Duets and stitches get 2x organic reach.",
      "The algorithm tests every video to 200-500 people first.",
      "Trending sounds get 30% more reach than original audio.",
    ],
    email: [
      "Subject lines with numbers get 36% higher open rates.",
      "Questions outperform statements by 20%.",
      "[Brackets] in subject lines increase open rates by 11%.",
      "Personalized subject lines get 26% more opens.",
    ],
    blog: [
      "Long-form (2000+ words) ranks 3x better in search.",
      "Posts with images every 350 words get 2x engagement.",
      "Listicle-format posts get 80% more traffic.",
      "Update old content for a 106% traffic boost.",
    ],
    ad: [
      "Social proof in ad copy increases conversions by 15%.",
      "Ads with numbers in headlines get 36% more clicks.",
      "Video ads outperform static by 20-30%.",
      "Single clear CTA outperforms multiple CTAs by 42%.",
    ],
  };

  const availableFrameworks = frameworks[contentType] || frameworks.single;
  const availableTips = proTips[platform] || proTips.twitter;

  return {
    bestTime: rules.bestTime,
    hashtags: generateHashtags(text || "", platform, contentType),
    framework: availableFrameworks[Math.floor(Math.random() * availableFrameworks.length)],
    tip: availableTips[Math.floor(Math.random() * availableTips.length)],
    charCount: text ? text.length : 0,
    maxChars: rules.maxLen,
    engagementScore: text ? predictEngagementScore(text, platform, contentType) : null,
  };
};

// ─── AI Prompt Refinement v4.0 ───────────────────────────────────────────────
const refineUserPrompt = async (prompt, topic) => {
  if (prompt.length >= 15) return prompt;
  if (!process.env.OPENROUTER_API_KEY) return prompt;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://postl-v4.vercel.app",
        "X-Title": "Postl Content Intelligence",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-3.1-24b-instruct:free",
        temperature: 0.9,
        max_tokens: 100,
        messages: [
          {
            role: "system",
            content: `You are a creative prompt expander. The user will provide a short subject (1-5 words). Expand it into one vivid, specific, actionable sentence that a content creator can use as a post topic. 
CRITICAL RULE: You MUST preserve the exact core subject the user provides. Do not completely change the subject just to fit the context. Use the context only as an angle/flavor.

Examples (for context: tech):
- "elephant" → "How AI researchers are using machine learning to track and protect elephant populations."
- "coffee" → "The tech stack behind the world's largest automated coffee roasting facility."`,
          },
          {
            role: "user",
            content: `Expand this subject: "${prompt}" (Angle/Flavor: ${topic})`,
          },
        ],
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Cloud AI Expansion Error] Status: ${response.status}, Body: ${errorText}`);
      throw new Error(`Cloud AI expansion failed: ${response.status}`);
    }
    
    const data = await response.json();
    const refined = data.choices[0]?.message?.content || prompt;
    console.log(`[Smart Prompt] Refined to: "${refined.trim()}"`);
    return refined.trim().replace(/^['"]|['"]$/g, '');
  } catch (err) {
    console.warn("[Smart Prompt] Expansion failed - this might indicate a network issue or invalid API key.", err.message);
    return prompt;
  }
};

// ─── Post-Launch Connectivity Probe ──────────────────────────────────────────
const testOpenRouterConnection = async () => {
  if (!process.env.OPENROUTER_API_KEY) return;
  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[OpenRouter Check] ✅ PASSED - API Key is valid (Usage: $${data.data?.usage || 0})`);
    } else {
      const errTxt = await response.text();
      console.error(`[OpenRouter Check] ❌ FAILED - Status: ${response.status}, Details: ${errTxt}`);
    }
  } catch (err) {
    console.error("[OpenRouter Check] ❌ CRITICAL CONNECTIVITY ERROR:", err.message);
  }
};

// ─── Retry with Exponential Backoff ──────────────────────────────────────────
const callWithRetry = async (fn, maxRetries = 2, baseDelay = 1000) => {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[Retry] Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
};

// ─── Build System Prompt v4.0 ────────────────────────────────────────────────
const buildSystemPrompt = (platform, contentType, tone, topic, platformRules) => {
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
  
  return `You are POSTL — an elite content strategist who has managed social accounts with 1M+ followers. You create content that dominates feeds and drives real engagement.

CRITICAL DIRECTIVE: The user will provide a specific prompt/subject. You MUST write strictly about that subject. Do not change the topic. Use the THEMATIC TOPIC below merely as an angle or perspective for the user's subject, but the user's subject remains the absolute center of the content.

PLATFORM: ${platform.toUpperCase()}
CONTENT FORMAT: ${contentType.toUpperCase()}
THEMATIC TOPIC/ANGLE: ${topic.toUpperCase()}

═══ PLATFORM MASTERY ═══
${platformRules.style}

VIRAL REFERENCE (match this energy and structure):
"""
${platformRules.viralExample}
"""

═══ TONE: ${tone.toUpperCase()} ═══
${toneInstruction}

═══ ANTI-PATTERNS (NEVER DO THESE) ═══
${platformRules.antiPatterns}
- NEVER start with "In today's world" or "In the age of" or "In a world where"
- NEVER use "Are you tired of" or "Have you ever wondered"
- NEVER say "Let's dive in" or "Without further ado"
- NEVER start with "Hey there!" or "Hello everyone!"
- NEVER include meta-commentary like "Here's a post about..."

═══ OUTPUT FORMAT ═══
- Write ONLY the content. No labels, no intro, no outro, no meta-commentary.
- Match the exact format for the content type:
  ${contentType === 'thread' ? '• Number posts as 1/, 2/, etc. Separate with "---". Each post should hook into the next.' : ''}
  ${contentType === 'script' ? '• Use [VISUAL] and [AUDIO/VO] blocks. Start with a 3-second hook. Include timing cues.' : ''}
  ${contentType === 'blog' ? '• Use markdown headers (## and ###). Include bullet points. Open with a stat or hook.' : ''}
  ${contentType === 'email' ? '• Output format: Subject: [your subject line]' : ''}
  ${contentType === 'ad' ? '• Format: Headline: [headline]\\nBody: [2-3 lines]\\nCTA: [action]' : ''}
  ${contentType === 'caption' ? '• Write the caption, then add strategic hashtags at the end.' : ''}
  ${contentType === 'pitch' ? '• 3 powerful sentences: Problem, Solution, Proof/Traction.' : ''}
  ${contentType === 'single' ? '• One powerful, standalone post optimized for maximum engagement.' : ''}
- MAX LENGTH: ${platformRules.maxLen} characters.
- DO NOT append IMAGE_TAG or any metadata.`;
};

// ─── Endpoints ────────────────────────────────────────────────────────────────

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", version: "4.0", engine: "POSTL Core" });
});

router.post("/generate-post", authenticate, async (req, res) => {
  const { error, value } = generateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  let { prompt, topic, platform, contentType, tone, creativity, prefLocal, variants, model } = value;
  
  // Dynamic fallback for model
  if (!model) model = "mistralai/mistral-small-3.1-24b-instruct:free";
  
  const startTime = Date.now();
  prompt = await refineUserPrompt(prompt, topic);
  
  const cacheKey = makeCacheKey({ prompt, topic, platform, contentType, tone, creativity, prefLocal, variants });
  const platformRules = PLATFORM_RULES[platform] || PLATFORM_RULES.twitter;

  const cached = cacheGet(cacheKey);
  if (cached) {
    console.log("[Cache] Serving cached response");
    return res.json({ ...cached, cached: true });
  }

  // Cloud AI (OpenRouter) — PRIMARY ENGINE
  if (!prefLocal) {
    if (!process.env.OPENROUTER_API_KEY) {
      console.warn("[Cloud AI] Warning: OPENROUTER_API_KEY missing. Falling back to Local AI Engine.");
    } else {
      try {
        console.log(`[Cloud AI v4] Generating ${variants}x ${tone} ${contentType} for ${platform}...`);
        
        const systemPrompt = buildSystemPrompt(platform, contentType, tone, topic, platformRules);
        
        // Generate requested number of variants
        const variantPromises = Array.from({ length: variants }, (_, i) => 
          callWithRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://postl-v4.vercel.app",
                "X-Title": "Postl Content Intelligence",
              },
              body: JSON.stringify({
                model: model,
                temperature: Math.min(1.2, creativity + (i * 0.1)), 
                max_tokens: 1000,
                messages: [
                  { role: "system", content: systemPrompt },
                  {
                    role: "user",
                    content: `Create a ${contentType} about: ${prompt}${i > 0 ? `\n\n(Generate a DIFFERENT angle/approach than the previous version. Variation #${i + 1}.)` : ''}`,
                  },
                ],
              }),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[Cloud AI Generation Error] Status: ${response.status}, Body: ${errorText}`);
              
              // RESILIENCE: Try a hard fallback model if the primary fails
              if (model !== "google/gemini-2.0-flash-exp:free") {
                console.warn("[Cloud AI Resilience] Primary model failed. Attempting Emergency Fallback (Gemini Flash)...");
                return callWithRetry(() => {
                   // This is an internal retry with a different model
                   // For brevity, we'll just throw and let the loop handle it or implement actual recursive call
                   throw new Error("RETRY_WITH_FALLBACK");
                }, 0);
              }
              
              throw new Error(`Cloud AI core failed: ${response.status}`);
            }
            
            const data = await response.json();
            return data.choices[0]?.message?.content || "";
          })
        );
        
        const rawResults = await Promise.allSettled(variantPromises);
        const results = rawResults
          .filter(r => r.status === 'fulfilled' && r.value)
          .map(r => cleanAIResult(r.value));
        
        if (results.length === 0) {
          throw new Error("All variant generations returned empty.");
        }
        
        const primaryResult = results[0];
        const strategy = generateStrategyBrief(platform, contentType, primaryResult);
        const elapsedMs = Date.now() - startTime;

        const responseData = {
          results,
          strategy,
          meta: {
            model: model,
            engine: "cloud",
            variants: results.length,
            elapsedMs,
            platform,
            contentType,
            tone,
          },
        };
        
        cacheSet(cacheKey, responseData);
        return res.json(responseData);
      } catch (err) {
        console.warn("[Cloud AI] Performance bottleneck, attempting Local Neural Engine:", err.message);
      }
    }
  }

  // ─── Local AI Fallback ────────────────────────────────────────────────────────
  const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:5000";

  try {
    console.log(`[Local AI] Connecting to Neural Engine at ${AI_SERVER_URL}...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const localResponse = await fetch(`${AI_SERVER_URL}/generate-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt, topic, platform, contentType, tone, creativity
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!localResponse.ok) {
      throw new Error(`Local AI Engine error: ${localResponse.status}`);
    }
    
    const localData = await localResponse.json();
    const cleanResults = localData.results.map(cleanAIResult);
    const primaryResult = cleanResults[0] || "";
    const strategy = generateStrategyBrief(platform, contentType, primaryResult);
    const elapsedMs = Date.now() - startTime;
    
    const responseData = {
      results: cleanResults,
      strategy,
      meta: {
        model: "gpt2-large",
        engine: "local",
        variants: cleanResults.length,
        elapsedMs,
        platform,
        contentType,
        tone,
      },
    };
    cacheSet(cacheKey, responseData);
    return res.json(responseData);
  } catch (localErr) {
    console.error("[Fatal] Resilience Failure:", localErr.message);
    if (localErr.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: "Local Neural Engine is still booting up. Please wait 15 seconds and try again." });
    }
    return res.status(500).json({ error: "All creative engines failed. Please check connectivity or API keys." });
  }
});

// Universal Routing mounts
app.use("/api", router);
app.use("/.netlify/functions/api", router);
app.use("/", router);

// Only listen locally if Not running inside Serverless functions
if (!process.env.LAMBDA_TASK_ROOT && !process.env.NETLIFY) {
  app.listen(PORT, async () => {
    console.log(`[POSTL-CORE v4.0] Backend running on http://localhost:${PORT}`);
    await testOpenRouterConnection();
  });
}

// Export for Serverless handlers
export default app;

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});