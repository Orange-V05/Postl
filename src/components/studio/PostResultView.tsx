import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheck, FaRegCopy, FaMagic, FaRedo, FaClock, FaHashtag, FaLightbulb, FaLayerGroup, FaChevronLeft, FaChevronRight, FaFire, FaChartLine } from 'react-icons/fa';

interface PostResultViewProps {
  result: string;
  allVariants?: string[];
  imagePrompt: string;
  category: string;
  platform: string;
  seed: number;
  fontSize: number;
  copied: boolean;
  handleCopy: () => void;
  feedbackStatus: 'submitted' | null;
  handleFeedback: (type: 'helpful' | 'unhelpful') => void;
  strategyBrief?: {
    hashtags?: string | null;
    bestTime?: string;
    tip?: string;
    framework?: string;
    engagementScore?: number | null;
    charCount?: number;
    maxChars?: number;
  } | null;
  onRegenerate?: () => void;
  loading?: boolean;
  elapsedMs?: number;
  meta?: { model?: string; engine?: string; variants?: number };
}

const platformLabels: Record<string, string> = {
  twitter: 'Twitter / X', instagram: 'Instagram', linkedin: 'LinkedIn',
  tiktok: 'TikTok', email: 'Email', blog: 'Blog', ad: 'Ad Copy',
};

/* ─── Typewriter Hook ────────────────────────────────────────────────────── */
const useTypewriter = (text: string, speed: number = 12) => {
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const prevTextRef = useRef('');

  useEffect(() => {
    if (!text || text === prevTextRef.current) return;
    prevTextRef.current = text;
    setIsTyping(true);
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayed, isTyping };
};

/* ─── Engagement Score Ring ───────────────────────────────────────────────── */
const EngagementScore: React.FC<{ score: number }> = ({ score }) => {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Work';

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="score-ring w-full h-full" viewBox="0 0 100 100">
          <circle className="score-track" cx="50" cy="50" r="45" />
          <motion.circle
            className="score-fill"
            cx="50" cy="50" r="45"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
            style={{ stroke: color }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black" style={{ color }}>{score}</span>
        </div>
      </div>
      <div>
        <p className="text-[8px] font-black text-[var(--muted-color)] uppercase tracking-widest mb-0.5">Engagement</p>
        <p className="text-xs font-bold" style={{ color }}>{label}</p>
      </div>
    </div>
  );
};

/* ─── Content Renderer ────────────────────────────────────────────────────── */
const renderFormattedContent = (text: string, category: string, fontSize: number) => {
  if (!text) return null;

  // Thread rendering
  if (category === 'thread') {
    const parts = text.split(/---+/).filter(p => p.trim());
    return (
      <div className="space-y-1">
        {parts.map((part, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="thread-part"
          >
            <p style={{ fontSize: `${Math.min(fontSize, 24)}px` }} className="text-[var(--text-color)] leading-relaxed whitespace-pre-wrap">
              {part.trim()}
            </p>
          </motion.div>
        ))}
      </div>
    );
  }

  // Script rendering
  if (category === 'script') {
    const lines = text.split('\n').filter(l => l.trim());
    return (
      <div className="space-y-2">
        {lines.map((line, i) => {
          const isVisual = /^\[VISUAL\]/i.test(line.trim());
          const isAudio = /^\[AUDIO|^\[VO\]/i.test(line.trim());
          const cleanLine = line.replace(/^\[(VISUAL|AUDIO|VO|AUDIO\/VO)\]\s*/i, '');
          
          if (isVisual || isAudio) {
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`script-block ${isVisual ? 'script-visual' : 'script-audio'}`}
              >
                <span className={`text-[9px] font-black uppercase tracking-widest mb-1 block ${isVisual ? 'text-violet-400' : 'text-emerald-400'}`}>
                  {isVisual ? '🎬 VISUAL' : '🎙️ AUDIO'}
                </span>
                <p style={{ fontSize: `${Math.min(fontSize, 20)}px` }} className="text-[var(--text-color)] leading-relaxed">
                  {cleanLine}
                </p>
              </motion.div>
            );
          }
          return (
            <p key={i} style={{ fontSize: `${Math.min(fontSize, 24)}px` }} className="text-[var(--text-color)] leading-relaxed">
              {line}
            </p>
          );
        })}
      </div>
    );
  }

  // Blog rendering
  if (category === 'blog') {
    const lines = text.split('\n');
    return (
      <div className="rendered-content space-y-1">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('### ')) {
            return <h3 key={i}>{trimmed.replace('### ', '')}</h3>;
          }
          if (trimmed.startsWith('## ')) {
            return <h2 key={i}>{trimmed.replace('## ', '')}</h2>;
          }
          if (trimmed.startsWith('# ')) {
            return <h2 key={i} className="!text-xl !font-bold">{trimmed.replace('# ', '')}</h2>;
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            return <li key={i} className="list-disc ml-4 text-[var(--text-color)] leading-relaxed">{trimmed.replace(/^[-•]\s/, '')}</li>;
          }
          if (!trimmed) return <div key={i} className="h-2" />;
          return <p key={i} style={{ fontSize: `${Math.min(fontSize, 22)}px` }} className="text-[var(--text-color)] leading-relaxed">{line}</p>;
        })}
      </div>
    );
  }

  // Ad rendering
  if (category === 'ad') {
    const lines = text.split('\n').filter(l => l.trim());
    return (
      <div className="space-y-4">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (/^Headline:/i.test(trimmed)) {
            return (
              <div key={i} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Headline</span>
                <p className="text-[var(--text-color)] font-bold text-lg mt-1">{trimmed.replace(/^Headline:\s*/i, '')}</p>
              </div>
            );
          }
          if (/^CTA:/i.test(trimmed)) {
            return (
              <div key={i} className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Call to Action</span>
                <p className="text-[var(--text-color)] font-bold mt-1">{trimmed.replace(/^CTA:\s*/i, '')}</p>
              </div>
            );
          }
          if (/^Body:/i.test(trimmed)) {
            return <p key={i} style={{ fontSize: `${Math.min(fontSize, 22)}px` }} className="text-[var(--text-color)] leading-relaxed">{trimmed.replace(/^Body:\s*/i, '')}</p>;
          }
          return <p key={i} style={{ fontSize: `${Math.min(fontSize, 22)}px` }} className="text-[var(--text-color)] leading-relaxed">{line}</p>;
        })}
      </div>
    );
  }

  // Default single/caption/pitch/email rendering
  return (
    <p
      style={{ fontSize: `${Math.min(fontSize, 36)}px` }}
      className="font-display font-bold text-[var(--text-color)] leading-snug drop-shadow-2xl transition-all duration-300 whitespace-pre-wrap"
    >
      {text}
    </p>
  );
};

const PostResultView: React.FC<PostResultViewProps> = ({
  result, allVariants, imagePrompt, category, platform, seed, fontSize,
  copied, handleCopy, feedbackStatus, handleFeedback,
  strategyBrief, onRegenerate, loading, elapsedMs, meta
}) => {
  const [activeVariant, setActiveVariant] = useState(0);
  const variants = allVariants && allVariants.length > 0 ? allVariants : (result ? [result] : []);
  const currentText = variants[activeVariant] || result || '';
  const { displayed, isTyping } = useTypewriter(currentText);

  // Reset active variant on new results
  useEffect(() => {
    setActiveVariant(0);
  }, [result]);

  return (
    <AnimatePresence mode="wait">
      {result ? (
        <motion.div
          key="result"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="glass-panel glass-inner-border overflow-hidden rounded-[2.5rem] border border-[var(--glass-border)] shadow-2xl flex flex-col relative group/result"
        >
          {/* Background Visual */}
          <div className="absolute inset-0 z-0">
            <motion.img
              initial={{ scale: 1.2, filter: "blur(20px)" }}
              animate={{ scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              src={`https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt || category)}?width=1200&height=1200&nologo=true&seed=${seed}`}
              alt="AI-generated visual"
              className="w-full h-full object-cover opacity-30 dark:opacity-20 group-hover/result:scale-105 transition-transform duration-[3s] ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--bg-color)] via-[var(--bg-color)]/95 dark:via-[#030712]/95 to-[var(--bg-color)]/40 dark:to-[#030712]/40" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.06),transparent_70%)]" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col p-8 lg:p-12">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">
                  {platformLabels[platform] || platform}
                </span>
                <span className="text-[var(--muted-color)]/30 text-xs font-black">/</span>
                <span className="text-[var(--muted-color)] text-[9px] font-black uppercase tracking-widest">{category}</span>
                {meta?.engine && (
                  <>
                    <span className="text-[var(--muted-color)]/30 text-xs font-black">/</span>
                    <span className="px-2 py-1 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[8px] font-mono font-bold text-[var(--muted-color)] uppercase">
                      {meta.engine === 'cloud' ? '☁️ Cloud' : '🖥️ Local'}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {elapsedMs && (
                  <span className="text-[9px] font-mono font-bold text-[var(--muted-color)] bg-[var(--input-bg)] border border-[var(--input-border)] px-2.5 py-1.5 rounded-lg">
                    {(elapsedMs / 1000).toFixed(1)}s
                  </span>
                )}
                {onRegenerate && (
                  <motion.button
                    onClick={onRegenerate}
                    disabled={loading}
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.4 }}
                    className="p-2.5 bg-[var(--input-bg)] backdrop-blur-md rounded-xl hover:bg-emerald-500 hover:text-white text-[var(--muted-color)] transition-all border border-[var(--input-border)]"
                    title="Regenerate"
                  >
                    <FaRedo className={loading ? 'animate-spin' : ''} size={12} />
                  </motion.button>
                )}
                <button
                  onClick={handleCopy}
                  className="p-2.5 bg-[var(--input-bg)] backdrop-blur-md rounded-xl hover:bg-emerald-500 hover:text-white text-emerald-500 dark:text-emerald-400 transition-all border border-[var(--input-border)] group/copy"
                  title="Copy to Clipboard"
                >
                  {copied ? <FaCheck size={12} /> : <FaRegCopy size={12} className="group-hover/copy:rotate-12 transition-transform" />}
                </button>
              </div>
            </div>

            {/* Variant Tabs (if multiple) */}
            {variants.length > 1 && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <button
                  onClick={() => setActiveVariant(Math.max(0, activeVariant - 1))}
                  disabled={activeVariant === 0}
                  className="p-1.5 rounded-lg text-[var(--muted-color)] hover:text-[var(--text-color)] disabled:opacity-30 transition-all"
                >
                  <FaChevronLeft size={10} />
                </button>
                <div className="flex items-center gap-1.5">
                  {variants.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveVariant(i)}
                      className={`variant-dot ${activeVariant === i ? 'active' : ''}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setActiveVariant(Math.min(variants.length - 1, activeVariant + 1))}
                  disabled={activeVariant === variants.length - 1}
                  className="p-1.5 rounded-lg text-[var(--muted-color)] hover:text-[var(--text-color)] disabled:opacity-30 transition-all"
                >
                  <FaChevronRight size={10} />
                </button>
                <span className="text-[9px] font-black text-[var(--muted-color)] uppercase tracking-widest ml-2">
                  Variant {activeVariant + 1} of {variants.length}
                </span>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-grow flex flex-col justify-center mb-8 overflow-y-auto max-h-[55vh] pr-2 scrollbar-thin scrollbar-thumb-[var(--glass-border)] scrollbar-track-transparent">
              <blockquote className="relative">
                <span className="absolute -top-6 -left-2 text-emerald-500/10 text-6xl font-serif select-none">"</span>
                <div className={isTyping ? 'typewriter-cursor' : ''}>
                  {renderFormattedContent(displayed, category, fontSize)}
                </div>
                <span className="absolute -bottom-8 -right-2 text-emerald-500/10 text-6xl font-serif rotate-180 select-none">"</span>
              </blockquote>
            </div>

            {/* Strategy Brief + Engagement Score */}
            {strategyBrief && !isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6"
              >
                {/* Engagement Score + Char Count Row */}
                <div className="flex items-center justify-between mb-4 p-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)]">
                  {strategyBrief.engagementScore && (
                    <EngagementScore score={strategyBrief.engagementScore} />
                  )}
                  {strategyBrief.charCount !== undefined && strategyBrief.maxChars && (
                    <div className="text-right">
                      <p className="text-[8px] font-black text-[var(--muted-color)] uppercase tracking-widest mb-1">Characters</p>
                      <p className={`font-mono font-bold text-sm ${strategyBrief.charCount > strategyBrief.maxChars ? 'text-red-500' : 'text-emerald-500'}`}>
                        {strategyBrief.charCount}
                        <span className="text-[var(--muted-color)]"> / {strategyBrief.maxChars}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Strategy Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {strategyBrief.bestTime && (
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)]">
                      <FaClock className="text-emerald-500 mt-0.5 flex-shrink-0" size={12} />
                      <div>
                        <p className="text-[8px] font-black text-[var(--muted-color)] uppercase tracking-widest mb-1">Best Time</p>
                        <p className="text-[var(--text-color)] text-xs font-medium">{strategyBrief.bestTime}</p>
                      </div>
                    </div>
                  )}
                  {strategyBrief.hashtags && (
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)]">
                      <FaHashtag className="text-emerald-500 mt-0.5 flex-shrink-0" size={12} />
                      <div>
                        <p className="text-[8px] font-black text-[var(--muted-color)] uppercase tracking-widest mb-1">Hashtags</p>
                        <p className="text-[var(--text-color)] text-xs font-medium line-clamp-2">{strategyBrief.hashtags}</p>
                      </div>
                    </div>
                  )}
                  {strategyBrief.framework && (
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)]">
                      <FaLayerGroup className="text-emerald-500 mt-0.5 flex-shrink-0" size={12} />
                      <div>
                        <p className="text-[8px] font-black text-[var(--muted-color)] uppercase tracking-widest mb-1">Framework</p>
                        <p className="text-[var(--text-color)] text-xs font-medium">{strategyBrief.framework}</p>
                      </div>
                    </div>
                  )}
                  {strategyBrief.tip && (
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
                      <FaLightbulb className="text-emerald-500 mt-0.5 flex-shrink-0" size={12} />
                      <div>
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Pro Tip</p>
                        <p className="text-[var(--text-color)] text-xs font-medium">{strategyBrief.tip}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Footer Controls */}
            <div className="pt-5 border-t border-[var(--input-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <p className="text-[10px] font-black text-[var(--muted-color)] uppercase tracking-widest opacity-60">
                  {feedbackStatus === 'submitted' ? "✓ FEEDBACK RECORDED" : "Quality check"}
                </p>
                {feedbackStatus !== 'submitted' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleFeedback('helpful')} className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/10">👍 YES</button>
                    <button onClick={() => handleFeedback('unhelpful')} className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-black hover:bg-red-500 hover:text-white transition-all border border-red-500/10">👎 NO</button>
                  </div>
                )}
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
              >
                {copied ? <FaCheck /> : <FaRegCopy />}
                {copied ? "COPIED!" : "COPY CONTENT"}
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full min-h-[500px] border-2 border-dashed border-[var(--glass-border)] rounded-[2.5rem] flex flex-col items-center justify-center text-center p-10 group hover:border-emerald-500/20 transition-all bg-[var(--panel-bg)] backdrop-blur-sm relative overflow-hidden"
        >
          {/* Shimmer decoration */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-emerald-500/5 rounded-full blur-[60px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-cyan-500/5 rounded-full blur-[50px] animate-float" style={{ animationDelay: '2s' }} />
          
          <motion.div
            animate={{
              y: [0, -10, 0],
              filter: ["drop-shadow(0 0 0px transparent)", "drop-shadow(0 0 20px #10b98144)", "drop-shadow(0 0 0px transparent)"]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-3xl bg-[var(--input-bg)] border border-[var(--input-border)] flex items-center justify-center mb-8 group-hover:bg-emerald-500/10 transition-colors"
          >
            <FaMagic className="text-3xl text-[var(--muted-color)] group-hover:text-emerald-500 transition-colors" />
          </motion.div>
          <h3 className="font-display text-[var(--text-color)] font-bold uppercase tracking-[0.3em] text-sm mb-4">
            READY FOR ORCHESTRATION
          </h3>
          <p className="text-[var(--muted-color)] text-xs max-w-[300px] leading-relaxed mb-8">
            Select your platform, content type, and tone — then describe your vision. The engine handles the rest.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="px-4 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-2">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">TIP</span>
              <span className="text-[10px] font-bold text-[var(--muted-color)]">Try "Witty" tone for peak engagement</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center gap-2">
              <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">NEW</span>
              <span className="text-[10px] font-bold text-[var(--muted-color)]">Multi-variant generation</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PostResultView;
