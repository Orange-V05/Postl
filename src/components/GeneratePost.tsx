import React, { useState, useContext, useEffect, useRef } from 'react';
import { FaMagic, FaBolt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import { generatePost, ApiClientError, GenerationVariant } from '../api/client';

// Sub-components
import ModelSelector from './studio/ModelSelector';
import PlatformSelector, { Platform } from './studio/PlatformSelector';
import FormatSelector, { ContentType } from './studio/FormatSelector';
import ToneSelector, { Tone } from './studio/ToneSelector';
import TopicSelector, { Topic } from './studio/TopicSelector';
import PromptInputArea from './studio/PromptInputArea';
import PostResultView from './studio/PostResultView';

/* ─── Smart Prompt Suggestions ────────────────────────────────────────────── */
const platformSuggestions: Record<string, string[]> = {
  twitter: [
    "Hot take on AI replacing creative jobs",
    "3 lessons from building a product no one wanted",
    "Unpopular opinion about remote work culture",
    "The biggest lie about 'hustle culture'",
  ],
  instagram: [
    "Behind the scenes of my creative process",
    "5 apps every content creator needs in 2026",
    "Morning routine that changed my productivity",
    "The real cost of chasing perfection",
  ],
  linkedin: [
    "Why I turned down a 6-figure offer",
    "The leadership skill nobody talks about",
    "How to network without being cringe",
    "What I learned from my biggest career failure",
  ],
  tiktok: [
    "POV: You discover this life hack",
    "Things I wish I knew at 20",
    "Day in the life of a solo founder",
    "3 red flags in job interviews",
  ],
  email: [
    "Product launch announcement",
    "Re-engagement campaign for inactive users",
    "Weekly newsletter about industry trends",
    "Limited-time offer promotion",
  ],
  blog: [
    "Complete guide to content marketing in 2026",
    "How to build a personal brand from zero",
    "The future of AI in creative industries",
    "10 mistakes that kill startup growth",
  ],
  ad: [
    "SaaS product free trial promotion",
    "Fitness coaching program enrollment",
    "Online course launch campaign",
    "E-commerce flash sale announcement",
  ],
};

const platformIntelligence: Record<string, { limit: string; primaryGoal: string; winningPattern: string; visualCue: string }> = {
  twitter: { limit: '280 chars', primaryGoal: 'Spark replies and shares fast', winningPattern: 'Hook → sharp insight → punchy CTA', visualCue: 'Bold quote card or creator portrait' },
  instagram: { limit: '2,200 chars', primaryGoal: 'Stop the scroll and save-worthy value', winningPattern: 'Relatable opener → mini story → hashtags', visualCue: 'High contrast lifestyle / carousel cover' },
  linkedin: { limit: '3,000 chars', primaryGoal: 'Build authority and trust', winningPattern: 'Personal tension → lesson → practical takeaway', visualCue: 'Clean editorial business visual' },
  tiktok: { limit: '60 sec script', primaryGoal: 'Win the first 3 seconds', winningPattern: 'POV hook → pattern interrupt → payoff', visualCue: 'Dynamic vertical video scene' },
  email: { limit: 'Inbox-ready', primaryGoal: 'Drive opens and clicks', winningPattern: 'Subject → problem → benefit → CTA', visualCue: 'Minimal product/newsletter hero' },
  blog: { limit: 'SEO structure', primaryGoal: 'Rank and educate deeply', winningPattern: 'Thesis → outline → examples → next steps', visualCue: 'Editorial feature image' },
  ad: { limit: 'Conversion copy', primaryGoal: 'Turn attention into action', winningPattern: 'Pain → promise → proof → urgency', visualCue: 'Performance ad creative' },
};

const getPromptReadiness = (prompt: string) => {
  const words = prompt.trim().split(/\s+/).filter(Boolean).length;
  const score = Math.min(100, Math.round((words / 18) * 70 + (/[?!.]/.test(prompt) ? 10 : 0) + (prompt.length > 80 ? 20 : 0)));
  const label = score >= 80 ? 'Launch-ready' : score >= 50 ? 'Strong brief' : score >= 25 ? 'Needs detail' : 'Idea seed';
  return { words, score, label };
};

const fallbackPrefs = {
  selectedModel: 'balanced-cloud',
  creativity: 0.7,
  tone: 'professional' as const,
  fontSize: 28,
  darkMode: true,
};

const GeneratePost: React.FC = () => {
  const auth = useContext(AuthContext);
  const store = useStore();
  const prefs = store?.prefs || fallbackPrefs;
  const setPrefs = store?.setPrefs || (() => undefined);
  const addRecentPrompt = store?.addRecentPrompt || (() => undefined);
  const recentPrompts = store?.recentPrompts || [];

  const [prompt, setPrompt] = useState<string>(() => {
    try { return localStorage.getItem('postl:draft') || ''; } catch { return ''; }
  });

  // Keep the draft prompt across reloads
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (prompt) localStorage.setItem('postl:draft', prompt);
        else localStorage.removeItem('postl:draft');
      } catch { /* storage unavailable */ }
    }, 300);
    return () => clearTimeout(id);
  }, [prompt]);
  const [platform, setPlatform] = useState<Platform>('twitter');
  const [topic, setTopic] = useState<'general' | 'motivational' | 'tech' | 'travel' | 'funny' | 'educational' | 'startup'>('tech');
  const [contentType, setContentType] = useState<ContentType>('single');
  const [result, setResult] = useState('');
  const [allVariants, setAllVariants] = useState<string[]>([]);
  const [strategyBrief, setStrategyBrief] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'submitted' | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000));
  const [elapsedMs, setElapsedMs] = useState(0);
  const [meta, setMeta] = useState<any>(null);
  const [genTimer, setGenTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generation timer
  useEffect(() => {
    if (loading) {
      setGenTimer(0);
      timerRef.current = setInterval(() => {
        setGenTimer(prev => prev + 100);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !auth?.user) return;
    if (!db) {
      setResult('POSTL is missing Firebase configuration for this deployment. Public pages are available, but authenticated generation and saving are disabled until Vercel Firebase environment variables are configured.');
      return;
    }
    const firestore = db;

    setLoading(true);
    setResult('');
    setAllVariants([]);
    setStrategyBrief(null);
    setFeedbackStatus(null);
    setMeta(null);
    setElapsedMs(0);
    setSeed(Math.floor(Math.random() * 1000000));

    try {
      const token = await auth.getToken();
      const data = await generatePost(token, {
        prompt,
        topic,
        platform,
        contentType,
        tone: prefs.tone,
        creativity: prefs.creativity,
        variants: 1,
        modelId: prefs.selectedModel,
        objective: 'engagement',
      }, 60000);

      const variants = data.variants || [];
      const primaryVariant = variants[0];
      const primaryResult = primaryVariant?.content || 'No content returned from AI Engine.';
      const imgP = prompt;

      setImagePrompt(imgP);
      setResult(primaryResult);
      setAllVariants(variants.map((variant: GenerationVariant) => variant.content));

      setStrategyBrief({
        framework: primaryVariant?.strategy?.framework,
        tip: primaryVariant?.rationale,
        hashtags: primaryVariant?.hashtags ? Object.entries(primaryVariant.hashtags).flatMap(([, tags]) => (tags || []).map((tag) => `#${tag}`)).join(' ') : null,
        bestTime: `${data.benchmarkTiming.recommendation} (${data.benchmarkTiming.source})`,
        engagementScore: primaryVariant?.analysis?.score ?? null,
        charCount: primaryResult.length,
        maxChars: primaryVariant?.analysis?.factors?.find((factor) => factor.key === 'length')?.max,
      });

      setMeta(primaryVariant?.provider ? {
        model: primaryVariant.provider.model,
        engine: primaryVariant.provider.name,
        variants: variants.length,
        elapsedMs: primaryVariant.provider.latencyMs,
      } : null);
      setElapsedMs(primaryVariant?.provider?.latencyMs || 0);

      // Save to recent prompts
      addRecentPrompt(prompt);

      // Save to Firestore
      const postData = {
        userId: auth.user.uid,
        content: primaryResult,
        imagePrompt: imgP,
        platform,
        topic,
        contentType,
        tone: prefs.tone,
        model: prefs.selectedModel,
        platformFitScore: primaryVariant?.analysis?.score ?? null,
        timestamp: serverTimestamp()
      };

      addDoc(collection(firestore, 'posts'), postData).catch(err => console.error("Firestore save failed:", err));

    } catch (error: any) {
      if (import.meta.env.DEV) console.error("[AI Generation Error]", error);
      if (error instanceof ApiClientError) {
        const support = error.requestId ? ` Request ID: ${error.requestId}` : '';
        const friendlyMessage = error.code === 'free_models_temporarily_unavailable'
          ? 'The free AI engine is temporarily unavailable. Please try again in a moment.'
          : error.code === 'quota_exceeded'
            ? 'Your daily content quota is full. Please try again tomorrow.'
            : `${error.message} (${error.code})`;
        setResult(`AI Engine Error: ${friendlyMessage}.${support}`);
      } else {
        setResult('AI Engine Error: POSTL could not reach the backend. Check the backend deployment and API configuration.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMore = async () => {
    if (!prompt.trim() || !auth?.user) return;

    setLoading(true);

    try {
      const token = await auth.getToken();
      const data = await generatePost(token, {
        prompt,
        topic,
        platform,
        contentType,
        tone: prefs.tone,
        creativity: prefs.creativity,
        variants: 3,
        modelId: prefs.selectedModel,
        objective: 'engagement',
      }, 90000);

      const variants = data.variants || [];
      if (variants.length > 0) {
        setAllVariants(variants.map((variant: GenerationVariant) => variant.content));
        setResult(variants[0].content);
        setStrategyBrief({
          framework: variants[0].strategy?.framework,
          tip: variants[0].rationale,
          hashtags: variants[0].hashtags ? Object.entries(variants[0].hashtags).flatMap(([, tags]) => (tags || []).map((tag) => `#${tag}`)).join(' ') : null,
          bestTime: `${data.benchmarkTiming.recommendation} (${data.benchmarkTiming.source})`,
          engagementScore: variants[0].analysis?.score ?? null,
          charCount: variants[0].content.length,
        });
        setMeta(variants[0].provider ? {
          model: variants[0].provider.model,
          engine: variants[0].provider.name,
          variants: variants.length,
          elapsedMs: variants[0].provider.latencyMs,
        } : null);
        setElapsedMs(variants[0].provider?.latencyMs || 0);
      }
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("[Variants Error]:", error);
      if (error instanceof ApiClientError) setResult(`AI Engine Error: ${error.message} (${error.code}).${error.requestId ? ` Request ID: ${error.requestId}` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text?: string) => {
    const value = text || result;
    if (!value) return;
    navigator.clipboard.writeText(value).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = async (type: 'helpful' | 'unhelpful') => {
    if (!auth?.user || !result || !db) return;
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: auth.user.uid,
        prompt,
        result,
        feedback: type,
        engine: 'cloud',
        platform,
        contentType,
        timestamp: serverTimestamp()
      });
      setFeedbackStatus('submitted');
    } catch (err) {
      console.error('Feedback failed:', err);
    }
  };

  const suggestions = platformSuggestions[platform] || platformSuggestions.twitter;
  const intelligence = platformIntelligence[platform];
  const readiness = getPromptReadiness(prompt);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Input Side */}
      <div className="w-full lg:w-5/12 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-7 rounded-2xl"
        >
          <ModelSelector
            selectedModel={prefs.selectedModel}
            setSelectedModel={(m) => setPrefs({ selectedModel: m })}
          />

          <div className="flex flex-col gap-6 mb-6">
            <PlatformSelector platform={platform} setPlatform={setPlatform} />
            <TopicSelector topic={topic} setTopic={setTopic} />
            <FormatSelector contentType={contentType} setContentType={setContentType} />
            <ToneSelector tone={prefs.tone} setTone={(t) => setPrefs({ tone: t })} />
          </div>

          <PromptInputArea
            prompt={prompt}
            setPrompt={setPrompt}
            creativity={prefs.creativity}
            setCreativity={(c) => setPrefs({ creativity: c })}
            fontSize={prefs.fontSize}
            setFontSize={(s) => setPrefs({ fontSize: s })}
            onSubmit={() => { if (!loading) handleGenerate(); }}
          />

          {/* Launch Brief */}
          <motion.div
            layout
            className="mb-6 overflow-hidden rounded-2xl border border-[var(--input-border)] bg-input-bg/70 p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-accent">Launch brief</p>
                <h4 className="mt-1 font-display text-sm font-medium text-[var(--text-color)]">
                  {readiness.label}
                </h4>
              </div>
              <div className="relative h-12 w-12 shrink-0 rounded-full p-0.5">
                <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
                  <circle cx="21" cy="21" r="17" fill="none" stroke="var(--hairline-strong)" strokeWidth="4" />
                  <motion.circle
                    cx="21" cy="21" r="17" fill="none" stroke="var(--accent-primary)" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray="106.8" animate={{ strokeDashoffset: 106.8 - (readiness.score / 100) * 106.8 }}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-xs font-medium text-[var(--text-color)]">{readiness.score}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Platform rule', intelligence.limit],
                ['Goal', intelligence.primaryGoal],
                ['Pattern', intelligence.winningPattern],
                ['Visual cue', intelligence.visualCue],
              ].map(([label, value], bi) => (
                <div key={label} className={`soft-${(bi % 3) + 1} rounded-xl p-3`}>
                  <p className="mb-1 font-medium opacity-80">{label}</p>
                  <p className="font-medium leading-snug">{value}</p>
                </div>
              ))}
            </div>

            {recentPrompts.length > 0 && !prompt && (
              <button
                type="button"
                onClick={() => setPrompt(recentPrompts[0])}
                className="mt-3 w-full rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition hover:bg-accent/15"
              >
                Reuse last winning prompt
              </button>
            )}
          </motion.div>

          {/* Smart Suggestions */}
          {!prompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <p className="text-xs font-medium text-[var(--muted-color)] mb-3 ml-1">
                Try a prompt
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 3).map((s, i) => (
                  <motion.button
                    key={i}
                    onClick={() => setPrompt(s)}
                    className="px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-xs font-medium text-[var(--muted-color)] hover:text-[var(--text-color)] hover:border-accent/30 transition-colors text-left leading-snug"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            aria-busy={loading}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-[var(--text-color)] text-[15px] font-medium text-[var(--bg-color)] transition-opacity duration-150 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Generating…</span>
                <span className="font-mono text-xs tabular-nums opacity-70">{(genTimer / 1000).toFixed(1)}s</span>
              </>
            ) : (
              <>
                <FaMagic className="text-sm" />
                <span>Generate</span>
                <span className="kbd ml-1 hidden sm:inline-flex">Ctrl ↵</span>
              </>
            )}
          </button>

          {/* Generate More Variants */}
          {result && !loading && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleGenerateMore}
              className="w-full mt-3 py-3 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--muted-color)] hover:text-[var(--text-color)] hover:border-accent/30 transition-colors flex items-center justify-center gap-2 text-xs font-medium "
            >
              <FaBolt className="text-accent" />
              Generate 3 variants
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* Result Side */}
      <div className="w-full lg:w-7/12">
        <PostResultView
          result={result}
          allVariants={allVariants}
          imagePrompt={imagePrompt}
          category={contentType}
          platform={platform}
          seed={seed}
          fontSize={prefs.fontSize}
          copied={copied}
          handleCopy={handleCopy}
          feedbackStatus={feedbackStatus}
          handleFeedback={handleFeedback}
          strategyBrief={strategyBrief}
          onRegenerate={handleGenerate}
          loading={loading}
          elapsedMs={elapsedMs}
          meta={meta}
        />
      </div>
    </div>
  );
};

export default GeneratePost;
