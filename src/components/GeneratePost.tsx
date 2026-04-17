import React, { useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaMagic, FaBolt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useStore } from '../store/useStore';

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

const GeneratePost: React.FC = () => {
  const auth = useContext(AuthContext);
  const { prefs, setPrefs, addRecentPrompt } = useStore();

  const [prompt, setPrompt] = useState('');
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

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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
      const response = await axios.post(`${API_BASE_URL}/generate-post`, {
        prompt,
        topic,
        platform,
        contentType,
        tone: prefs.tone,
        creativity: prefs.creativity,
        variants: 1,
        model: prefs.selectedModel,
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 60000,
      });

      const results = response.data.results || [];
      const primaryResult = results[0] || 'No content returned from AI Engine.';
      const imgP = response.data.image_prompt || prompt;

      setImagePrompt(imgP);
      setResult(primaryResult);
      setAllVariants(results);

      if (response.data.strategy) {
        setStrategyBrief(response.data.strategy);
      }

      if (response.data.meta) {
        setMeta(response.data.meta);
        setElapsedMs(response.data.meta.elapsedMs || 0);
      }

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
        engagementScore: response.data.strategy?.engagementScore || null,
        timestamp: serverTimestamp()
      };

      addDoc(collection(db, 'posts'), postData).catch(err => console.error("Firestore save failed:", err));

    } catch (error: any) {
      console.error("[Connectivity Error] Full Detail:", error);
      const errorMsg = error.response?.data?.error || error.message;
      const diagnostic = !error.response ? " (Server Unreachable - Is Backend Running?)" : "";
      setResult(`AI Engine Error: ${errorMsg}${diagnostic}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMore = async () => {
    if (!prompt.trim() || !auth?.user) return;

    setLoading(true);

    try {
      const token = await auth.getToken();
      const response = await axios.post(`${API_BASE_URL}/generate-post`, {
        prompt,
        topic,
        platform,
        contentType,
        tone: prefs.tone,
        creativity: prefs.creativity,
        variants: 3,
        model: prefs.selectedModel,
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 90000,
      });

      const results = response.data.results || [];
      if (results.length > 0) {
        setAllVariants(results);
        setResult(results[0]);
        if (response.data.strategy) setStrategyBrief(response.data.strategy);
        if (response.data.meta) {
          setMeta(response.data.meta);
          setElapsedMs(response.data.meta.elapsedMs || 0);
        }
      }
    } catch (error: any) {
      console.error("[Variants Error]:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = async (type: 'helpful' | 'unhelpful') => {
    if (!auth?.user || !result) return;
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: auth.user.uid,
        prompt,
        result,
        feedback: type,
        engine: prefs.aiModel,
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

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Input Side */}
      <div className="w-full lg:w-5/12 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-7 rounded-[2rem] border-[var(--glass-border)] shadow-2xl"
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
          />

          {/* Smart Suggestions */}
          {!prompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <p className="text-[9px] font-black text-[var(--muted-color)] uppercase tracking-widest mb-3 ml-1">
                💡 Try a prompt
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 3).map((s, i) => (
                  <motion.button
                    key={i}
                    onClick={() => setPrompt(s)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[10px] font-medium text-[var(--muted-color)] hover:text-[var(--text-color)] hover:border-emerald-500/30 transition-all text-left leading-snug"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Generate Button */}
          <motion.button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full relative group"
          >
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-1000 ${loading ? 'animate-pulse' : ''}`} />
            <div className={`relative w-full py-5 bg-[var(--panel-bg)] rounded-2xl font-black text-[var(--text-color)] group-hover:text-white flex items-center justify-center space-x-3 transition-all duration-300 ${loading ? 'opacity-50 cursor-not-allowed' : 'group-hover:bg-transparent'}`}>
              {loading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="font-display">GENERATING...</span>
                  <span className="font-mono text-xs opacity-70">{(genTimer / 1000).toFixed(1)}s</span>
                </div>
              ) : (
                <>
                  <FaMagic className="text-xl" />
                  <span className="font-display">GENERATE</span>
                </>
              )}
            </div>
          </motion.button>

          {/* Generate More Variants */}
          {result && !loading && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleGenerateMore}
              className="w-full mt-3 py-3 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--muted-color)] hover:text-[var(--text-color)] hover:border-emerald-500/30 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              <FaBolt className="text-emerald-500" />
              GENERATE 3 VARIANTS
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
