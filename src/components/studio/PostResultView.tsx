import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheck, FaRegCopy, FaMagic, FaRedo, FaClock, FaHashtag, FaLightbulb, FaLayerGroup, FaChevronLeft, FaChevronRight, FaFire, FaChartLine, FaDownload } from 'react-icons/fa';

interface PostResultViewProps {
  result: string;
  allVariants?: string[];
  imagePrompt: string;
  category: string;
  platform: string;
  seed: number;
  fontSize: number;
  copied: boolean;
  handleCopy: (text?: string) => void;
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

const analyzeContent = (text: string) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const hashtags = text.match(/#[\w-]+/g) || [];
  const questions = text.match(/\?/g)?.length || 0;
  const readMinutes = Math.max(1, Math.ceil(words.length / 220));
  const momentum = Math.min(100, Math.round(45 + hashtags.length * 5 + questions * 10 + Math.min(words.length, 160) / 4));

  return {
    words: words.length,
    chars: text.length,
    sentences: sentences.length,
    hashtags: hashtags.length,
    readMinutes,
    momentum,
  };
};

const platformLimits: Record<string, number> = {
  twitter: 280, instagram: 2200, linkedin: 3000, tiktok: 2200, ad: 600,
};

const downloadMarkdown = (text: string, platform: string, category: string) => {
  const body = `# POSTL Export\n\n- Platform: ${platform}\n- Format: ${category}\n- Exported: ${new Date().toLocaleString()}\n\n---\n\n${text}\n`;
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `postl-${platform}-${Date.now()}.md`;
  link.click();
  URL.revokeObjectURL(url);
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
  const color = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--accent-warm)' : 'var(--danger)';
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
          <span className="text-sm font-medium" style={{ color }}>{score}</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-[var(--muted-color)] mb-0.5">Engagement</p>
        <p className="text-xs font-medium" style={{ color }}>{label}</p>
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
                <span className={`text-xs font-medium mb-1 block ${isVisual ? 'text-accent' : 'text-accent'}`}>
                  {isVisual ? 'Visual' : 'Audio'}
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
            return <h2 key={i} className="!text-xl !font-medium">{trimmed.replace('# ', '')}</h2>;
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
              <div key={i} className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                <span className="text-xs font-medium text-accent">Headline</span>
                <p className="text-[var(--text-color)] font-medium text-lg mt-1">{trimmed.replace(/^Headline:\s*/i, '')}</p>
              </div>
            );
          }
          if (/^CTA:/i.test(trimmed)) {
            return (
              <div key={i} className="p-4 rounded-xl bg-warm/5 border border-warm/20">
                <span className="text-xs font-medium text-warm">Call to Action</span>
                <p className="text-[var(--text-color)] font-medium mt-1">{trimmed.replace(/^CTA:\s*/i, '')}</p>
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
      className="font-display font-medium text-[var(--text-color)] leading-snug drop-shadow-2xl transition-colors duration-300 whitespace-pre-wrap"
    >
      {text}
    </p>
  );
};

const PostResultView: React.FC<PostResultViewProps> = ({
  result, allVariants, category, platform, fontSize,
  copied, handleCopy, feedbackStatus, handleFeedback,
  strategyBrief, onRegenerate, loading, elapsedMs, meta
}) => {
  const [activeVariant, setActiveVariant] = useState(0);
  const variants = allVariants && allVariants.length > 0 ? allVariants : (result ? [result] : []);
  const currentText = variants[activeVariant] || result || '';
  const { displayed, isTyping } = useTypewriter(currentText);
  const contentStats = analyzeContent(currentText);

  // Reset active variant on new results
  useEffect(() => {
    setActiveVariant(0);
  }, [result]);

  return (
    <AnimatePresence mode="wait">
      {result ? (
        <motion.div
          key="result"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col overflow-hidden rounded-2xl glass-panel"
        >
          {/* Content */}
          <div className="relative z-10 flex flex-col p-8 lg:p-12">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="rounded-md border border-[var(--hairline-strong)] px-2 py-1 text-xs text-[var(--text-color)]">
                  {platformLabels[platform] || platform}
                </span>
                <span className="text-muted/30 text-xs font-medium">/</span>
                <span className="text-[var(--muted-color)] text-xs font-medium">{category}</span>
                {meta?.engine && (
                  <>
                    <span className="text-muted/30 text-xs font-medium">/</span>
                    <span className="px-2 py-1 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-xs font-mono text-[var(--muted-color)]">
                      {meta.engine === 'cloud' ? 'Cloud' : 'Local'}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {elapsedMs && (
                  <span className="text-xs font-mono font-medium text-[var(--muted-color)] bg-[var(--input-bg)] border border-[var(--input-border)] px-2.5 py-1.5 rounded-lg">
                    {(elapsedMs / 1000).toFixed(1)}s
                  </span>
                )}
                {onRegenerate && (
                  <motion.button
                    onClick={onRegenerate}
                    disabled={loading}
                    transition={{ duration: 0.4 }}
                    className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted-color)] transition-colors duration-150 hover:text-[var(--text-color)] border border-[var(--hairline-strong)]"
                    title="Regenerate"
                  >
                    <FaRedo className={loading ? 'animate-spin' : ''} size={12} />
                  </motion.button>
                )}
                <button
                  onClick={() => handleCopy(currentText)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted-color)] transition-colors duration-150 hover:text-[var(--text-color)] border border-[var(--hairline-strong)]"
                  title="Copy to Clipboard"
                >
                  {copied ? <FaCheck size={12} /> : <FaRegCopy size={12} />}
                </button>
                <button
                  onClick={() => downloadMarkdown(currentText, platform, category)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted-color)] transition-colors duration-150 hover:text-[var(--text-color)] border border-[var(--hairline-strong)]"
                  title="Export Markdown"
                >
                  <FaDownload size={12} />
                </button>
              </div>
            </div>

            {!isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {[
                  ['Momentum', `${contentStats.momentum}%`],
                  ['Words', contentStats.words.toString()],
                  ['Hashtags', contentStats.hashtags.toString()],
                  ['Read', `${contentStats.readMinutes} min`],
                ].map(([label, value], si) => (
                  <div key={label} className={`soft-${(si % 3) + 1} rounded-lg p-3`}>
                    <p className="text-xs opacity-80">{label}</p>
                    <p className="mt-1 text-lg font-medium tabular-nums">{value}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {!isTyping && platformLimits[platform] && (() => {
              const limit = platformLimits[platform];
              const ratio = contentStats.chars / limit;
              const over = ratio > 1;
              return (
                <div className="mb-6">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-[var(--muted-color)]">
                      {over ? `${contentStats.chars - limit} characters over the ${platformLabels[platform] || platform} limit` : `Fits ${platformLabels[platform] || platform}`}
                    </span>
                    <span className="font-mono tabular-nums text-[var(--muted-color)]">{contentStats.chars} / {limit}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--hairline)]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: over ? 'var(--danger)' : 'linear-gradient(90deg, var(--c1), var(--c2), var(--c3))' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, ratio * 100)}%` }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Variant Tabs (if multiple) */}
            {variants.length > 1 && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <button
                  onClick={() => setActiveVariant(Math.max(0, activeVariant - 1))}
                  disabled={activeVariant === 0}
                  className="p-1.5 rounded-lg text-[var(--muted-color)] hover:text-[var(--text-color)] disabled:opacity-30 transition-colors"
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
                  className="p-1.5 rounded-lg text-[var(--muted-color)] hover:text-[var(--text-color)] disabled:opacity-30 transition-colors"
                >
                  <FaChevronRight size={10} />
                </button>
                <span className="text-xs font-medium text-[var(--muted-color)] ml-2">
                  Variant {activeVariant + 1} of {variants.length}
                </span>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-grow flex flex-col justify-center mb-8 overflow-y-auto max-h-[55vh] pr-2 scrollbar-thin scrollbar-thumb-[var(--glass-border)] scrollbar-track-transparent">
              <blockquote className="relative">
                <span className="absolute -top-6 -left-2 text-accent/10 text-6xl font-serif select-none">"</span>
                <div className={isTyping ? 'typewriter-cursor' : ''}>
                  {renderFormattedContent(displayed, category, fontSize)}
                </div>
                <span className="absolute -bottom-8 -right-2 text-accent/10 text-6xl font-serif rotate-180 select-none">"</span>
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
                      <p className="text-xs text-[var(--muted-color)] mb-1">Characters</p>
                      <p className={`font-mono font-medium text-sm ${strategyBrief.charCount > strategyBrief.maxChars ? 'text-danger' : 'text-accent'}`}>
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
                      <FaClock className="text-accent mt-0.5 flex-shrink-0" size={12} />
                      <div>
                        <p className="text-xs text-[var(--muted-color)] mb-1">Best Time</p>
                        <p className="text-[var(--text-color)] text-xs font-medium">{strategyBrief.bestTime}</p>
                      </div>
                    </div>
                  )}
                  {strategyBrief.hashtags && (
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)]">
                      <FaHashtag className="text-accent mt-0.5 flex-shrink-0" size={12} />
                      <div>
                        <p className="text-xs text-[var(--muted-color)] mb-1">Hashtags</p>
                        <p className="text-[var(--text-color)] text-xs font-medium line-clamp-2">{strategyBrief.hashtags}</p>
                      </div>
                    </div>
                  )}
                  {strategyBrief.framework && (
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)]">
                      <FaLayerGroup className="text-accent mt-0.5 flex-shrink-0" size={12} />
                      <div>
                        <p className="text-xs text-[var(--muted-color)] mb-1">Framework</p>
                        <p className="text-[var(--text-color)] text-xs font-medium">{strategyBrief.framework}</p>
                      </div>
                    </div>
                  )}
                  {strategyBrief.tip && (
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-accent/5 border border-accent/15">
                      <FaLightbulb className="text-accent mt-0.5 flex-shrink-0" size={12} />
                      <div>
                        <p className="text-xs text-accent mb-1">Pro Tip</p>
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
                <p className="text-xs text-[var(--muted-color)]">
                  {feedbackStatus === 'submitted' ? "Thanks for the feedback" : "Was this useful?"}
                </p>
                {feedbackStatus !== 'submitted' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleFeedback('helpful')} className="h-8 rounded-lg border border-[var(--hairline-strong)] px-3 text-xs text-[var(--muted-color)] transition-colors duration-150 hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]">Yes</button>
                    <button onClick={() => handleFeedback('unhelpful')} className="h-8 rounded-lg border border-[var(--hairline-strong)] px-3 text-xs text-[var(--muted-color)] transition-colors duration-150 hover:border-[var(--danger)] hover:text-[var(--danger)]">No</button>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleCopy(currentText)}
                className="flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--text-color)] px-4 text-sm font-medium text-[var(--bg-color)] transition-opacity duration-150 hover:opacity-85"
              >
                {copied ? <FaCheck /> : <FaRegCopy />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full min-h-[500px] border border-dashed border-[var(--hairline-strong)] rounded-2xl flex flex-col items-center justify-center text-center p-10 relative overflow-hidden"
        >
          <div className="mb-6 grid h-12 w-12 place-items-center rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface)]">
            <FaMagic className="text-base text-[var(--faint-color)]" />
          </div>
          <h3 className="text-[15px] font-medium text-[var(--text-color)]">Your draft will appear here</h3>
          <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-[var(--muted-color)]">
            Pick a platform, format and tone, then describe what you want to say.
          </p>
          <p className="mt-6 text-xs text-[var(--faint-color)]">Tip: ask for several variants and keep the best one.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PostResultView;
