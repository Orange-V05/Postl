import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import { repurposeContent, ApiClientError, RepurposeAsset } from '../api/client';
import {
  FaSyncAlt, FaCheck, FaRegCopy, FaSpinner, FaChevronDown,
  FaHashtag, FaLightbulb, FaLayerGroup, FaSave, FaExclamationTriangle
} from 'react-icons/fa';

/* ─── Constants ────────────────────────────────────────────────────────────── */
const sourceTypes = [
  { value: 'blog',      label: 'Blog post' },
  { value: 'tweet',     label: 'Tweet or thread' },
  { value: 'linkedin',  label: 'LinkedIn post' },
  { value: 'notes',     label: 'Raw notes' },
  { value: 'email',     label: 'Email' },
  { value: 'script',    label: 'Video script' },
  { value: 'podcast',   label: 'Podcast excerpt' },
  { value: 'interview', label: 'Interview' },
];

const targetPlatforms = [
  { value: 'twitter-single',   label: 'Twitter / X' },
  { value: 'linkedin-single',  label: 'LinkedIn' },
  { value: 'instagram-single', label: 'Instagram' },
  { value: 'tiktok-script',    label: 'TikTok script' },
  { value: 'email-single',     label: 'Email copy' },
  { value: 'blog-single',      label: 'Blog snippet' },
];

const objectiveOptions = [
  { value: 'engagement',    label: 'Drive engagement' },
  { value: 'education',     label: 'Educate Audience' },
  { value: 'lead_gen',      label: 'Generate Leads' },
  { value: 'brand_awareness', label: 'Build Awareness' },
  { value: 'conversion',    label: 'Convert Prospects' },
];

const toneOptions = [
  'professional', 'casual', 'witty', 'inspirational', 'educational',
  'bold', 'empathetic', 'authoritative',
];

/* ─── Platform colour chip for result cards ────────────────────────────────── */
const platformMeta = Object.fromEntries(targetPlatforms.map(p => [p.value, p]));

/* ─── Result Card ──────────────────────────────────────────────────────────── */
interface AssetCardProps {
  asset: RepurposeAsset;
  onSave: (asset: RepurposeAsset) => void;
  saving: boolean;
  saved: boolean;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onSave, saving, saved }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const meta = platformMeta[asset.output];
  const score = asset.analysis?.score;
  const hashtags = asset.hashtags
    ? Object.values(asset.hashtags).flat().map(t => `#${t}`).join(' ')
    : null;

  const copy = () => {
    navigator.clipboard.writeText(asset.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--surface)] rounded-2xl border border-[var(--hairline)] overflow-hidden"
    >
      {/* Header */}
      <div className="border-b border-[var(--hairline)]">
        <div className="bg-[var(--surface)]">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div>
                <p className="text-xs font-medium text-[var(--muted-color)]">Repurposed for</p>
                <p className="text-sm font-medium text-[var(--text-color)]">{meta?.label || asset.output}</p>
              </div>
              {score !== undefined && (
                <span className={`ml-2 px-2 py-0.5 rounded-lg text-xs font-mono font-medium ${
                  score >= 75 ? 'text-green-500 bg-green-500/10 border border-green-500/20' :
                  score >= 50 ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20' :
                  'text-danger bg-danger/10 border border-danger/20'
                }`}>
                  {score}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={copy}
                className="p-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--muted-color)] hover:text-accent hover:border-accent/30 transition-colors"
                title="Copy"
              >
                {copied ? <FaCheck size={11} className="text-accent" /> : <FaRegCopy size={11} />}
              </button>
              <button
                onClick={() => onSave(asset)}
                disabled={saving || saved}
                className={`p-2 rounded-lg border transition-colors ${
                  saved
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--muted-color)] hover:text-accent hover:border-accent/30'
                } disabled:opacity-50`}
                title="Save to library"
              >
                {saving ? <FaSpinner size={11} className="animate-spin" /> : saved ? <FaCheck size={11} /> : <FaSave size={11} />}
              </button>
              <button
                onClick={() => setExpanded(e => !e)}
                className="p-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--muted-color)] transition-colors"
              >
                <FaChevronDown size={11} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 space-y-4">
              {/* Content */}
              <p className="text-[var(--text-color)] text-sm leading-relaxed whitespace-pre-wrap">
                {asset.content}
              </p>

              {/* Insights row */}
              {(hashtags || asset.rationale || asset.strategy?.framework) && (
                <div className="space-y-2 pt-2 border-t border-[var(--hairline)]">
                  {hashtags && (
                    <div className="flex items-start gap-2">
                      <FaHashtag size={10} className="text-accent mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-[var(--muted-color)] leading-relaxed">{hashtags}</p>
                    </div>
                  )}
                  {asset.strategy?.framework && (
                    <div className="flex items-start gap-2">
                      <FaLayerGroup size={10} className="text-accent mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-[var(--muted-color)]">
                        <span className="font-medium text-[var(--text-color)]">Framework: </span>
                        {asset.strategy.framework}
                      </p>
                    </div>
                  )}
                  {asset.rationale && (
                    <div className="flex items-start gap-2">
                      <FaLightbulb size={10} className="text-accent mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-[var(--muted-color)] leading-relaxed">{asset.rationale}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ─── RepurposeStudio ──────────────────────────────────────────────────────── */
const RepurposeStudio: React.FC = () => {
  const auth = useContext(AuthContext);
  const store = useStore();
  const prefs = store?.prefs;

  const [sourceText, setSourceText] = useState('');
  const [sourceType, setSourceType] = useState('notes');
  const [selectedOutputs, setSelectedOutputs] = useState<Set<string>>(new Set(['linkedin-single', 'twitter-single']));
  const [objective, setObjective] = useState('engagement');
  const [tone, setTone] = useState<string>(prefs?.tone || 'professional');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RepurposeAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [genTimer, setGenTimer] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleOutput = (value: string) => {
    setSelectedOutputs(sel => {
      const s = new Set(sel);
      if (s.has(value)) {
        if (s.size === 1) return s; // keep at least one selected
        s.delete(value);
      } else {
        if (s.size >= 6) return s; // max 6
        s.add(value);
      }
      return s;
    });
  };

  const handleGenerate = async () => {
    if (!sourceText.trim() || !auth?.user || selectedOutputs.size === 0) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setGenTimer(0);
    setSavedIds(new Set());

    timerRef.current = setInterval(() => setGenTimer(t => t + 100), 100);

    try {
      const token = await auth.getToken();
      const data = await repurposeContent(token, {
        sourceText: sourceText.trim(),
        sourceType,
        outputs: Array.from(selectedOutputs),
        objective,
        tone,
        modelId: prefs?.selectedModel || 'balanced-cloud',
      });

      if (data.message && data.assets.length === 0) {
        setError(data.message);
      } else {
        setResults(data.assets);
      }
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[Repurpose Error]', err);
      if (err instanceof ApiClientError) {
        const msg = err.code === 'quota_exceeded'
          ? 'Your daily repurpose quota is full. Try again tomorrow.'
          : err.code === 'free_models_temporarily_unavailable'
            ? 'The free AI engine is temporarily unavailable. Please try again in a moment.'
            : `${err.message} (${err.code})`;
        setError(msg);
      } else {
        setError('Could not reach the backend. Check the API configuration.');
      }
    } finally {
      setLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSave = async (asset: RepurposeAsset) => {
    if (!auth?.user || !db) return;
    const key = asset.output;
    setSavingId(key);
    try {
      const [platform] = asset.output.split('-');
      await addDoc(collection(db, 'posts'), {
        userId: auth.user.uid,
        content: asset.content,
        platform: platform === 'x' ? 'twitter' : platform,
        category: asset.output.split('-')[1] || 'single',
        tone,
        engagementScore: asset.analysis?.score ?? null,
        repurposedFrom: sourceType,
        timestamp: serverTimestamp(),
        status: 'draft',
      });
      setSavedIds(s => new Set([...s, key]));
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSavingId(null);
    }
  };

  const wordCount = sourceText.trim().split(/\s+/).filter(Boolean).length;
  const isReady = sourceText.trim().length >= 20 && selectedOutputs.size > 0 && auth?.user;

  return (
    <div className="space-y-8">
      {/* ── Input Panel ── */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Source Input */}
        <div className="flex-1 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--surface)] rounded-2xl border border-[var(--hairline)] p-7 space-y-6"
          >
            <div>
              <p className="text-xs font-medium text-accent mb-2">Repurpose Studio</p>
              <h3 className="font-display text-2xl font-medium text-[var(--text-color)]">Transform Your Content</h3>
              <p className="text-sm text-[var(--muted-color)] mt-1.5">
                Paste existing content and instantly repurpose it for multiple platforms.
              </p>
            </div>

            {/* Source Type */}
            <div>
              <p className="text-xs font-medium text-[var(--muted-color)] mb-3">Source Type</p>
              <div className="flex flex-wrap gap-2">
                {sourceTypes.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setSourceType(s.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      sourceType === s.value
                        ? 'bg-accent/15 border-accent/30 text-accent'
                        : 'border-[var(--input-border)] text-[var(--muted-color)] hover:border-accent/20 hover:text-[var(--text-color)]'
                    }`}
                  >
                    
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Text */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[var(--muted-color)]">Source Content</p>
                <span className={`text-xs font-mono font-medium ${wordCount < 20 ? 'text-danger' : wordCount > 500 ? 'text-amber-500' : 'text-accent'}`}>
                  {wordCount} words {wordCount < 20 ? '(min 20)' : ''}
                </span>
              </div>
              <textarea
                value={sourceText}
                onChange={e => setSourceText(e.target.value)}
                placeholder="Paste your blog post, notes, tweet thread, email, or script here..."
                rows={10}
                className="w-full rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] p-4 text-sm text-[var(--text-color)] placeholder:text-muted/40 focus:outline-none focus:border-accent/50 transition-colors resize-none leading-relaxed"
              />
            </div>
          </motion.div>
        </div>

        {/* Settings Sidebar */}
        <div className="xl:w-80 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--surface)] rounded-2xl border border-[var(--hairline)] p-6 space-y-6"
          >
            {/* Target Platforms */}
            <div>
              <p className="text-xs font-medium text-[var(--muted-color)] mb-3">
                Target Platforms
                <span className="ml-1.5 text-accent">({selectedOutputs.size} selected)</span>
              </p>
              <div className="space-y-2">
                {targetPlatforms.map(p => {
                  const isSelected = selectedOutputs.has(p.value);
                  return (
                    <button
                      key={p.value}
                      onClick={() => toggleOutput(p.value)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                        isSelected
                          ? 'border-accent/30 bg-accent/8'
                          : 'border-[var(--input-border)] hover:border-accent/20'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                        isSelected ? 'bg-accent border-accent' : 'border-muted/50'
                      }`}>
                        {isSelected && <FaCheck size={8} className="text-canvas" />}
                      </div>
                      
                      <span className={`text-xs font-medium transition-colors ${
                        isSelected ? 'text-[var(--text-color)]' : 'text-[var(--muted-color)]'
                      }`}>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Objective */}
            <div>
              <p className="text-xs font-medium text-[var(--muted-color)] mb-2">Objective</p>
              <select
                value={objective}
                onChange={e => setObjective(e.target.value)}
                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--text-color)] focus:outline-none focus:border-accent/50"
              >
                {objectiveOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Tone */}
            <div>
              <p className="text-xs font-medium text-[var(--muted-color)] mb-2">Tone</p>
              <div className="flex flex-wrap gap-1.5">
                {toneOptions.map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      tone === t
                        ? 'bg-accent/15 border-accent/30 text-accent'
                        : 'border-[var(--input-border)] text-[var(--muted-color)] hover:border-accent/20'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!isReady || loading}
              aria-busy={loading}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-[var(--text-color)] text-[15px] font-medium text-[var(--bg-color)] transition-opacity duration-150 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Repurposing…</span>
                  <span className="font-mono text-xs tabular-nums opacity-70">{(genTimer / 1000).toFixed(1)}s</span>
                </>
              ) : (
                <>
                  <FaSyncAlt className="text-sm" />
                  <span>Repurpose content</span>
                </>
              )}
            </button>

            {!auth?.user && (
              <p className="text-xs text-[var(--muted-color)] text-center">Sign in to use Repurpose Studio</p>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium"
          >
            <FaExclamationTriangle className="flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results ── */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-accent mb-1">Repurposed Assets</p>
                <h4 className="font-display text-xl font-medium text-[var(--text-color)]">
                  {results.length} Platform{results.length > 1 ? 's' : ''} Ready
                </h4>
              </div>
              <button
                onClick={() => {
                  results.forEach(a => handleSave(a));
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent hover:text-canvas transition-colors"
              >
                <FaSave size={10} />
                Save All to Library
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {results.map(asset => (
                <AssetCard
                  key={asset.output}
                  asset={asset}
                  onSave={handleSave}
                  saving={savingId === asset.output}
                  saved={savedIds.has(asset.output)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state (pre-generate) ── */}
      {!loading && results.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)] flex items-center justify-center mb-6"
          >
            <FaSyncAlt className="text-2xl text-accent" />
          </motion.div>
          <h4 className="font-display text-[var(--text-color)] font-medium text-sm mb-3">
            Ready to Transform
          </h4>
          <p className="text-[var(--muted-color)] text-xs max-w-xs leading-relaxed">
            Paste your source content, select target platforms, and click Repurpose to generate platform-optimized versions.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default RepurposeStudio;
