import React, { useContext, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebase';

const emptyCampaign = { name: '', objective: 'engagement', audience: '', offer: '', keyMessage: '', CTA: '', channels: '', tags: '' };

export default function CampaignForm() {
  const auth = useContext(AuthContext);
  const [campaign, setCampaign] = useState(emptyCampaign);
  const [status, setStatus] = useState('');
  const update = (key: keyof typeof emptyCampaign, value: string) => setCampaign((current) => ({ ...current, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!auth?.user || !db) {
      setStatus('Firebase is not configured for this deployment. Campaigns cannot be saved yet.');
      return;
    }
    await addDoc(collection(db, 'campaigns'), {
      userId: auth.user.uid,
      ...campaign,
      channels: campaign.channels.split(',').map((item) => item.trim()).filter(Boolean),
      tags: campaign.tags.split(',').map((item) => item.trim()).filter(Boolean),
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setStatus('Campaign saved as draft.');
    setCampaign(emptyCampaign);
  };

  return (
    <form onSubmit={save} className="glass-panel rounded-[2rem] border border-[var(--glass-border)] p-7 space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500">Campaign Workspace</p>
        <h3 className="font-display text-2xl font-black text-[var(--text-color)]">Organize content by campaign</h3>
        <p className="mt-2 text-sm text-[var(--muted-color)]">Campaigns capture objective, audience, offer, key message, CTA, channels, status, and tags. POSTL does not claim direct publishing.</p>
      </div>
      {Object.keys(emptyCampaign).map((key) => (
        <label key={key} className="block text-xs font-bold uppercase tracking-widest text-[var(--muted-color)]">
          {key}
          <input value={campaign[key as keyof typeof emptyCampaign]} onChange={(e) => update(key as keyof typeof emptyCampaign, e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm normal-case tracking-normal text-[var(--text-color)]" />
        </label>
      ))}
      <button className="rounded-xl bg-cyan-500 px-5 py-3 text-xs font-black uppercase tracking-widest text-white">Save Campaign</button>
      {status && <p role="status" className="text-sm font-semibold text-cyan-500">{status}</p>}
    </form>
  );
}
