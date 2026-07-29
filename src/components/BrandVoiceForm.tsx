import React, { useContext, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebase';

const emptyProfile = {
  brandName: '',
  description: '',
  audience: '',
  industry: '',
  vocabularyUse: '',
  vocabularyAvoid: '',
  ctaStyle: '',
  sampleContent: '',
  complianceNotes: '',
};

export default function BrandVoiceForm() {
  const auth = useContext(AuthContext);
  const [profile, setProfile] = useState(emptyProfile);
  const [status, setStatus] = useState('');

  const update = (key: keyof typeof emptyProfile, value: string) => setProfile((current) => ({ ...current, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!auth?.user || !db) {
      setStatus('Firebase is not configured for this deployment. Brand profiles cannot be saved yet.');
      return;
    }
    await addDoc(collection(db, 'brands'), {
      userId: auth.user.uid,
      ...profile,
      preferredToneDimensions: ['clear', 'credible', 'useful'],
      formattingPreferences: { paragraphLength: 'short', emojiPreference: 'moderate', sentenceLength: 'mixed' },
      voiceAnalysis: analyzeVoice(profile.sampleContent),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setStatus('Brand Voice profile saved. Review AI-extracted attributes before using them in production workflows.');
    setProfile(emptyProfile);
  };

  return (
    <form onSubmit={save} className="glass-panel rounded-[2rem] border border-[var(--glass-border)] p-7 space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Brand Voice DNA</p>
        <h3 className="font-display text-2xl font-black text-[var(--text-color)]">Create an editable voice profile</h3>
        <p className="mt-2 text-sm text-[var(--muted-color)]">Paste 3 to 10 representative samples over time. POSTL stores editable guidance, not unquestionable truth.</p>
      </div>
      {(['brandName', 'description', 'audience', 'industry', 'vocabularyUse', 'vocabularyAvoid', 'ctaStyle', 'complianceNotes'] as const).map((key) => (
        <label key={key} className="block text-xs font-bold uppercase tracking-widest text-[var(--muted-color)]">
          {key.replace(/([A-Z])/g, ' $1')}
          <input value={profile[key]} onChange={(e) => update(key, e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm normal-case tracking-normal text-[var(--text-color)]" />
        </label>
      ))}
      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted-color)]">
        Sample content
        <textarea value={profile.sampleContent} onChange={(e) => update('sampleContent', e.target.value)} rows={6} className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm normal-case tracking-normal text-[var(--text-color)]" />
      </label>
      <button className="rounded-xl bg-emerald-500 px-5 py-3 text-xs font-black uppercase tracking-widest text-white">Save Brand Profile</button>
      {status && <p role="status" className="text-sm font-semibold text-emerald-500">{status}</p>}
    </form>
  );
}

function analyzeVoice(sample: string) {
  const words = sample.trim().split(/\s+/).filter(Boolean);
  return {
    status: sample ? 'draft-analysis' : 'needs-samples',
    averageWordsPerSample: words.length,
    suggestedAttributes: words.length > 80 ? ['detailed', 'context-rich'] : ['concise'],
    caveat: 'Heuristic draft only. User should edit before using as Brand Voice DNA.',
  };
}
