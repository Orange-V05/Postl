import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  addDoc, collection, serverTimestamp, getDocs,
  query, where, orderBy, updateDoc, deleteDoc, doc
} from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaFingerprint, FaPlus, FaEdit, FaTrash, FaSave, FaTimes,
  FaCheck, FaExclamationTriangle
} from 'react-icons/fa';

interface BrandProfile {
  id?: string;
  brandName: string;
  description: string;
  audience: string;
  industry: string;
  vocabularyUse: string;
  vocabularyAvoid: string;
  ctaStyle: string;
  sampleContent: string;
  complianceNotes: string;
}

const empty: BrandProfile = {
  brandName: '', description: '', audience: '', industry: '',
  vocabularyUse: '', vocabularyAvoid: '', ctaStyle: '',
  sampleContent: '', complianceNotes: '',
};

const fields: { key: keyof BrandProfile; label: string; hint: string; textarea?: boolean }[] = [
  { key: 'brandName', label: 'Brand Name', hint: 'The name of this brand voice profile' },
  { key: 'description', label: 'Brand Description', hint: 'What does this brand do and stand for?' },
  { key: 'audience', label: 'Target Audience', hint: 'Who are you speaking to? Age, interests, role' },
  { key: 'industry', label: 'Industry / Niche', hint: 'e.g. SaaS, fitness, fintech, lifestyle' },
  { key: 'vocabularyUse', label: 'Vocabulary to Use', hint: 'Preferred words, phrases, power words' },
  { key: 'vocabularyAvoid', label: 'Vocabulary to Avoid', hint: 'Off-brand words or phrases to never use' },
  { key: 'ctaStyle', label: 'CTA Style', hint: 'e.g. "Start free", "Join the movement", "Book a demo"' },
  { key: 'complianceNotes', label: 'Compliance Notes', hint: 'Legal / regulatory disclaimers or restrictions' },
  { key: 'sampleContent', label: 'Sample Content', hint: 'Paste 3–10 representative posts or copy samples', textarea: true },
];

function analyzeVoice(sample: string) {
  const words = sample.trim().split(/\s+/).filter(Boolean);
  return {
    status: sample ? 'draft-analysis' : 'needs-samples',
    averageWordsPerSample: words.length,
    suggestedAttributes: words.length > 80 ? ['detailed', 'context-rich'] : ['concise'],
    caveat: 'Heuristic draft only. Edit before using as Brand Voice DNA.',
  };
}

export default function BrandVoiceForm() {
  const auth = useContext(AuthContext);
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [selected, setSelected] = useState<BrandProfile | null>(null);
  const [form, setForm] = useState<BrandProfile>(empty);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    if (!auth?.user || !db) { setLoading(false); return; }
    try {
      const q = query(
        collection(db, 'brands'),
        where('userId', '==', auth.user.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const result = snap.docs.map(d => ({ id: d.id, ...d.data() } as BrandProfile));
      setProfiles(result);
    } catch (err) {
      console.error('Failed to load brand profiles:', err);
    } finally {
      setLoading(false);
    }
  }, [auth?.user]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const update = (key: keyof BrandProfile, value: string) =>
    setForm(cur => ({ ...cur, [key]: value }));

  const startNew = () => {
    setSelected(null);
    setForm(empty);
    setIsEditing(true);
    setStatus(null);
  };

  const startEdit = (profile: BrandProfile) => {
    setSelected(profile);
    setForm(profile);
    setIsEditing(true);
    setStatus(null);
  };

  const cancel = () => {
    setIsEditing(false);
    setSelected(null);
    setForm(empty);
    setStatus(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.user || !db) {
      setStatus({ type: 'error', message: 'Firebase is not configured. Brand profiles cannot be saved.' });
      return;
    }
    if (!form.brandName.trim()) {
      setStatus({ type: 'error', message: 'Brand Name is required.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        userId: auth.user.uid,
        brandName: form.brandName.trim(),
        description: form.description,
        audience: form.audience,
        industry: form.industry,
        vocabularyUse: form.vocabularyUse,
        vocabularyAvoid: form.vocabularyAvoid,
        ctaStyle: form.ctaStyle,
        sampleContent: form.sampleContent,
        complianceNotes: form.complianceNotes,
        preferredToneDimensions: ['clear', 'credible', 'useful'],
        formattingPreferences: { paragraphLength: 'short', emojiPreference: 'moderate', sentenceLength: 'mixed' },
        voiceAnalysis: analyzeVoice(form.sampleContent),
        updatedAt: serverTimestamp(),
      };

      if (selected?.id) {
        await updateDoc(doc(db, 'brands', selected.id), payload);
        setStatus({ type: 'success', message: `"${form.brandName}" updated.` });
      } else {
        await addDoc(collection(db, 'brands'), { ...payload, createdAt: serverTimestamp() });
        setStatus({ type: 'success', message: `"${form.brandName}" profile created.` });
      }
      await fetchProfiles();
      cancel();
    } catch (err) {
      console.error('Brand save failed:', err);
      setStatus({ type: 'error', message: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'brands', id));
      setProfiles(ps => ps.filter(p => p.id !== id));
      if (selected?.id === id) cancel();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar — Profile List */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-3">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--hairline)] p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-medium text-accent mb-1">Brand Voice DNA</p>
              <h3 className="font-display text-lg font-medium text-[var(--text-color)]">Profiles</h3>
            </div>
            <motion.button
              onClick={startNew}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-on-accent text-xs font-medium "
            >
              <FaPlus size={9} />
              New
            </motion.button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="shimmer-loading h-16 rounded-xl" />)}
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)] flex items-center justify-center mx-auto mb-3">
                <FaFingerprint className="text-[var(--muted-color)] text-lg" />
              </div>
              <p className="text-xs font-medium text-[var(--muted-color)]">No profiles yet</p>
              <p className="text-xs text-[var(--muted-color)] mt-1 opacity-70">Create your first brand voice</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {profiles.map(profile => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={`group relative rounded-xl border p-3.5 cursor-pointer transition-colors ${
                      selected?.id === profile.id
                        ? 'bg-accent/10 border-accent/30'
                        : 'border-[var(--input-border)] bg-[var(--input-bg)] hover:border-accent/20'
                    }`}
                    onClick={() => !isEditing && startEdit(profile)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-color)] truncate">
                          {profile.brandName || 'Untitled Profile'}
                        </p>
                        {profile.industry && (
                          <p className="text-xs text-[var(--muted-color)] mt-0.5 truncate">
                            {profile.industry}
                          </p>
                        )}
                        {profile.audience && (
                          <p className="text-xs text-[var(--muted-color)] mt-1 line-clamp-1 opacity-80">
                            {profile.audience}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); startEdit(profile); }}
                          className="p-1.5 rounded-lg hover:bg-accent/10 text-[var(--muted-color)] hover:text-accent transition-colors"
                        >
                          <FaEdit size={10} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDelete(profile.id!); }}
                          className="p-1.5 rounded-lg hover:bg-danger/10 text-[var(--muted-color)] hover:text-danger transition-colors"
                        >
                          <FaTrash size={10} />
                        </button>
                      </div>
                    </div>

                    {/* Delete confirm overlay */}
                    <AnimatePresence>
                      {confirmDelete === profile.id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 rounded-xl bg-surface/95 flex items-center justify-center gap-2 p-2"
                          onClick={e => e.stopPropagation()}
                        >
                          <span className="text-xs font-medium text-[var(--text-color)] mr-1">Delete?</span>
                          <button
                            onClick={() => handleDelete(profile.id!)}
                            disabled={deletingId === profile.id}
                            className="px-2.5 py-1.5 rounded-lg bg-danger text-on-danger text-xs font-medium hover:opacity-85 transition-colors"
                          >
                            {deletingId === profile.id ? '...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2.5 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--muted-color)] text-xs font-medium hover:text-[var(--text-color)] transition-colors"
                          >
                            No
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Main — Form or Empty State */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.form
              key="form"
              onSubmit={save}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[var(--surface)] rounded-2xl border border-[var(--hairline)] p-7 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-accent mb-1">
                    {selected?.id ? 'Edit Profile' : 'New Profile'}
                  </p>
                  <h3 className="font-display text-2xl font-medium text-[var(--text-color)]">
                    {selected?.brandName || 'Brand Voice DNA'}
                  </h3>
                  <p className="mt-1.5 text-sm text-[var(--muted-color)]">
                    Build an editable voice profile. POSTL stores structured guidance, not unquestionable truth.
                  </p>
                </div>
                <button type="button" onClick={cancel} className="p-2.5 rounded-xl hover:bg-[var(--input-bg)] text-[var(--muted-color)] hover:text-[var(--text-color)] transition-colors border border-transparent hover:border-[var(--input-border)]">
                  <FaTimes size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(({ key, label, hint, textarea }) => (
                  <div key={key} className={textarea ? 'md:col-span-2' : ''}>
                    <label className="block text-xs font-medium text-[var(--muted-color)] mb-1.5">
                      {label}
                      {key === 'brandName' && <span className="text-danger ml-0.5">*</span>}
                    </label>
                    <p className="text-xs text-[var(--muted-color)] opacity-70 mb-2">{hint}</p>
                    {textarea ? (
                      <textarea
                        value={form[key] as string}
                        onChange={e => update(key, e.target.value)}
                        rows={5}
                        placeholder={hint}
                        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--text-color)] placeholder:text-muted/40 focus:outline-none focus:border-accent/50 transition-colors resize-none"
                      />
                    ) : (
                      <input
                        value={form[key] as string}
                        onChange={e => update(key, e.target.value)}
                        placeholder={hint}
                        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--text-color)] placeholder:text-muted/40 focus:outline-none focus:border-accent/50 transition-colors"
                      />
                    )}
                  </div>
                ))}
              </div>

              <AnimatePresence>
                {status && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${
                      status.type === 'success'
                        ? 'bg-accent/10 border-accent/25 text-accent'
                        : 'bg-danger/10 border-danger/25 text-danger dark:text-danger'
                    }`}
                    role="status"
                  >
                    {status.type === 'success' ? <FaCheck size={12} /> : <FaExclamationTriangle size={12} />}
                    {status.message}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3 pt-2">
                <motion.button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-on-accent text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-on-accent/30 border-t-on-accent rounded-full animate-spin" />
                  ) : (
                    <FaSave size={12} />
                  )}
                  {saving ? 'Saving...' : selected?.id ? 'Update Profile' : 'Save Profile'}
                </motion.button>
                <button type="button" onClick={cancel} className="px-4 py-3 rounded-xl border border-[var(--input-border)] text-[var(--muted-color)] text-xs font-medium hover:text-[var(--text-color)] hover:border-accent/20 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-[var(--surface)] rounded-2xl border-2 border-dashed border-[var(--hairline)] p-12 flex flex-col items-center justify-center text-center min-h-[400px]"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)] flex items-center justify-center mb-6"
              >
                <FaFingerprint className="text-3xl text-accent" />
              </motion.div>
              <h3 className="font-display text-xl font-medium text-[var(--text-color)] mb-3">
                {profiles.length > 0 ? 'Select a Profile' : 'Build Your Brand DNA'}
              </h3>
              <p className="text-[var(--muted-color)] text-sm max-w-sm leading-relaxed mb-6">
                {profiles.length > 0
                  ? 'Click a profile on the left to view or edit it, or create a new one.'
                  : 'Define your brand voice, audience, vocabulary, and content style. POSTL uses this to generate content that sounds authentically like you.'}
              </p>
              {profiles.length === 0 && (
                <motion.button
                  onClick={startNew}
                  className="px-6 py-3 rounded-xl bg-accent text-on-accent text-xs font-medium flex items-center gap-2"
                >
                  <FaPlus size={10} />
                  Create First Profile
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
