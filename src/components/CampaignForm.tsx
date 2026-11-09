import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  addDoc, collection, serverTimestamp, getDocs,
  query, where, orderBy, updateDoc, deleteDoc, doc
} from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBullseye, FaPlus, FaEdit, FaTrash, FaSave, FaTimes,
  FaCheck, FaExclamationTriangle, FaCircle
} from 'react-icons/fa';

type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

interface Campaign {
  id?: string;
  name: string;
  objective: string;
  audience: string;
  offer: string;
  keyMessage: string;
  CTA: string;
  channels: string;
  tags: string;
  status: CampaignStatus;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

const empty: Campaign = {
  name: '', objective: 'engagement', audience: '', offer: '',
  keyMessage: '', CTA: '', channels: '', tags: '',
  status: 'draft', startDate: '', endDate: '', notes: '',
};

const statusConfig: Record<CampaignStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Draft',     color: 'text-muted',       bg: 'bg-surface-2',      border: 'border-hairline-strong' },
  active:    { label: 'Active',    color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' },
  paused:    { label: 'Paused',    color: 'text-warm',   bg: 'bg-warm/10',   border: 'border-warm/20' },
  completed: { label: 'Completed', color: 'text-accent',    bg: 'bg-accent/10',    border: 'border-accent/20' },
  archived:  { label: 'Archived',  color: 'text-faint',       bg: 'bg-surface-2',      border: 'border-hairline' },
};

const objectiveOptions = [
  'engagement', 'lead_generation', 'brand_awareness', 'conversions',
  'retention', 'education', 'product_launch', 'event_promotion',
];

const fields: { key: keyof Campaign; label: string; hint: string; type?: string; textarea?: boolean; select?: boolean; options?: string[] }[] = [
  { key: 'name', label: 'Campaign Name', hint: 'A clear, memorable name for this campaign' },
  { key: 'objective', label: 'Primary Objective', hint: 'What should this campaign achieve?', select: true, options: objectiveOptions },
  { key: 'audience', label: 'Target Audience', hint: 'Who is this campaign for?' },
  { key: 'offer', label: 'Offer / Hook', hint: 'What value proposition or offer are you leading with?' },
  { key: 'keyMessage', label: 'Key Message', hint: 'The single most important thing to communicate' },
  { key: 'CTA', label: 'Call to Action', hint: 'e.g. "Sign up free", "Shop now", "Register today"' },
  { key: 'channels', label: 'Channels (comma-separated)', hint: 'e.g. LinkedIn, Instagram, Email' },
  { key: 'tags', label: 'Tags (comma-separated)', hint: 'Internal labels e.g. Q4-2026, product-launch' },
  { key: 'startDate', label: 'Start Date', hint: '', type: 'date' },
  { key: 'endDate', label: 'End Date', hint: '', type: 'date' },
  { key: 'notes', label: 'Notes', hint: 'Strategy notes, creative direction, or links', textarea: true },
];

export default function CampaignForm() {
  const auth = useContext(AuthContext);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [form, setForm] = useState<Campaign>(empty);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | 'all'>('all');

  const fetchCampaigns = useCallback(async () => {
    if (!auth?.user || !db) { setLoading(false); return; }
    try {
      const q = query(
        collection(db, 'campaigns'),
        where('userId', '==', auth.user.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const result = snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign));
      setCampaigns(result);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [auth?.user]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const update = (key: keyof Campaign, value: string) =>
    setForm(cur => ({ ...cur, [key]: value }));

  const startNew = () => {
    setSelected(null);
    setForm(empty);
    setIsEditing(true);
    setStatus(null);
  };

  const startEdit = (campaign: Campaign) => {
    setSelected(campaign);
    setForm({
      ...campaign,
      channels: Array.isArray((campaign as any).channels)
        ? (campaign as any).channels.join(', ')
        : campaign.channels || '',
      tags: Array.isArray((campaign as any).tags)
        ? (campaign as any).tags.join(', ')
        : campaign.tags || '',
    });
    setIsEditing(true);
    setStatus(null);
  };

  const cancel = () => {
    setIsEditing(false);
    setSelected(null);
    setForm(empty);
    setStatus(null);
  };

  const cycleStatus = async (campaign: Campaign, newStatus: CampaignStatus) => {
    if (!db || !campaign.id) return;
    try {
      await updateDoc(doc(db, 'campaigns', campaign.id), { status: newStatus, updatedAt: serverTimestamp() });
      setCampaigns(cs => cs.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c));
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.user || !db) {
      setStatus({ type: 'error', message: 'Firebase is not configured. Campaigns cannot be saved.' });
      return;
    }
    if (!form.name.trim()) {
      setStatus({ type: 'error', message: 'Campaign Name is required.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const payload: any = {
        userId: auth.user.uid,
        name: form.name.trim(),
        objective: form.objective,
        audience: form.audience,
        offer: form.offer,
        keyMessage: form.keyMessage,
        CTA: form.CTA,
        channels: form.channels.split(',').map(s => s.trim()).filter(Boolean),
        tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        status: form.status || 'draft',
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        notes: form.notes || '',
        updatedAt: serverTimestamp(),
      };

      if (selected?.id) {
        await updateDoc(doc(db, 'campaigns', selected.id), payload);
        setStatus({ type: 'success', message: `"${form.name}" updated.` });
      } else {
        await addDoc(collection(db, 'campaigns'), { ...payload, createdAt: serverTimestamp() });
        setStatus({ type: 'success', message: `"${form.name}" created as draft.` });
      }
      await fetchCampaigns();
      cancel();
    } catch (err) {
      console.error('Campaign save failed:', err);
      setStatus({ type: 'error', message: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'campaigns', id));
      setCampaigns(cs => cs.filter(c => c.id !== id));
      if (selected?.id === id) cancel();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const filtered = filterStatus === 'all' ? campaigns : campaigns.filter(c => c.status === filterStatus);

  const statusCounts = campaigns.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-3">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-medium text-accent mb-1">Campaign Workspace</p>
              <h3 className="font-display text-lg font-medium text-[var(--text-color)]">Campaigns</h3>
            </div>
            <motion.button
              onClick={startNew}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-on-accent text-xs font-medium "
            >
              <FaPlus size={9} />
              New
            </motion.button>
          </div>

          {/* Status Filter Tabs */}
          {campaigns.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(['all', ...Object.keys(statusConfig)] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors border ${
                    filterStatus === s
                      ? 'bg-accent text-on-accent border-accent'
                      : 'border-[var(--input-border)] text-[var(--muted-color)] hover:text-[var(--text-color)] hover:border-accent/20'
                  }`}
                >
                  {s === 'all' ? `All (${campaigns.length})` : `${statusConfig[s as CampaignStatus].label} ${statusCounts[s] ? `(${statusCounts[s]})` : ''}`}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="shimmer-loading h-20 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)] flex items-center justify-center mx-auto mb-3">
                <FaBullseye className="text-[var(--muted-color)] text-lg" />
              </div>
              <p className="text-xs font-medium text-[var(--muted-color)]">
                {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns in this status'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filtered.map(campaign => {
                  const sc = statusConfig[campaign.status] || statusConfig.draft;
                  const statuses: CampaignStatus[] = ['draft', 'active', 'paused', 'completed', 'archived'];
                  const nextStatus = statuses[(statuses.indexOf(campaign.status) + 1) % statuses.length];
                  return (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className={`group relative rounded-xl border p-3.5 cursor-pointer transition-colors ${
                        selected?.id === campaign.id
                          ? 'bg-accent/10 border-accent/30'
                          : 'border-[var(--input-border)] bg-[var(--input-bg)] hover:border-accent/20'
                      }`}
                      onClick={() => !isEditing && startEdit(campaign)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-color)] truncate">{campaign.name}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                              onClick={e => { e.stopPropagation(); cycleStatus(campaign, nextStatus); }}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border transition-colors ${sc.bg} ${sc.border} ${sc.color} hover:opacity-80`}
                              title={`Click to advance to ${nextStatus}`}
                            >
                              <FaCircle size={5} />
                              {sc.label}
                            </button>
                            <span className="text-xs text-[var(--muted-color)]">
                              {campaign.objective?.replace('_', ' ')}
                            </span>
                          </div>
                          {campaign.audience && (
                            <p className="text-xs text-[var(--muted-color)] mt-1 line-clamp-1 opacity-80">{campaign.audience}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={e => { e.stopPropagation(); startEdit(campaign); }} className="p-1.5 rounded-lg hover:bg-accent/10 text-[var(--muted-color)] hover:text-accent transition-colors">
                            <FaEdit size={10} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDelete(campaign.id!); }} className="p-1.5 rounded-lg hover:bg-danger/10 text-[var(--muted-color)] hover:text-danger transition-colors">
                            <FaTrash size={10} />
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {confirmDelete === campaign.id && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 rounded-xl bg-surface/95 flex items-center justify-center gap-2 p-2"
                            onClick={e => e.stopPropagation()}
                          >
                            <span className="text-xs font-medium text-[var(--text-color)] mr-1">Delete?</span>
                            <button onClick={() => handleDelete(campaign.id!)} disabled={deletingId === campaign.id} className="px-2.5 py-1.5 rounded-lg bg-danger text-on-danger text-xs font-medium">
                              {deletingId === campaign.id ? '...' : 'Yes'}
                            </button>
                            <button onClick={() => setConfirmDelete(null)} className="px-2.5 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--muted-color)] text-xs font-medium">
                              No
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
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
              className="glass-panel rounded-2xl p-7 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-accent mb-1">
                    {selected?.id ? 'Edit Campaign' : 'New Campaign'}
                  </p>
                  <h3 className="font-display text-2xl font-medium text-[var(--text-color)]">
                    {selected?.name || 'Campaign Workspace'}
                  </h3>
                  <p className="mt-1.5 text-sm text-[var(--muted-color)]">
                    Capture objective, audience, offer, key message, CTA, channels, and timeline.
                  </p>
                </div>
                <button type="button" onClick={cancel} className="p-2.5 rounded-xl hover:bg-[var(--input-bg)] text-[var(--muted-color)] hover:text-[var(--text-color)] transition-colors border border-transparent hover:border-[var(--input-border)]">
                  <FaTimes size={14} />
                </button>
              </div>

              {/* Status selector */}
              <div>
                <p className="text-xs font-medium text-[var(--muted-color)] mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(statusConfig) as CampaignStatus[]).map(s => {
                    const sc = statusConfig[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => update('status', s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                          form.status === s
                            ? `${sc.bg} ${sc.border} ${sc.color}`
                            : 'border-[var(--input-border)] text-[var(--muted-color)] hover:border-accent/20'
                        }`}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(({ key, label, hint, type, textarea, select, options }) => (
                  <div key={key} className={textarea ? 'md:col-span-2' : ''}>
                    <label className="block text-xs font-medium text-[var(--muted-color)] mb-1.5">
                      {label}
                      {key === 'name' && <span className="text-danger ml-0.5">*</span>}
                    </label>
                    {hint && <p className="text-xs text-[var(--muted-color)] opacity-70 mb-2">{hint}</p>}
                    {select ? (
                      <select
                        value={form[key] as string}
                        onChange={e => update(key, e.target.value)}
                        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--text-color)] focus:outline-none focus:border-accent/50 transition-colors"
                      >
                        {options?.map(o => (
                          <option key={o} value={o}>{o.replace('_', ' ')}</option>
                        ))}
                      </select>
                    ) : textarea ? (
                      <textarea
                        value={form[key] as string || ''}
                        onChange={e => update(key, e.target.value)}
                        rows={4}
                        placeholder={hint}
                        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--text-color)] placeholder:text-muted/40 focus:outline-none focus:border-accent/50 transition-colors resize-none"
                      />
                    ) : (
                      <input
                        type={type || 'text'}
                        value={form[key] as string || ''}
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
                  {saving ? <div className="w-4 h-4 border-2 border-on-accent/30 border-t-on-accent rounded-full animate-spin" /> : <FaSave size={12} />}
                  {saving ? 'Saving...' : selected?.id ? 'Update Campaign' : 'Save Campaign'}
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
              className="frost rounded-2xl border-2 border-dashed border-[var(--hairline)] p-12 flex flex-col items-center justify-center text-center min-h-[400px]"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)] flex items-center justify-center mb-6"
              >
                <FaBullseye className="text-3xl text-accent" />
              </motion.div>
              <h3 className="font-display text-xl font-medium text-[var(--text-color)] mb-3">
                {campaigns.length > 0 ? 'Select a Campaign' : 'Plan a Campaign'}
              </h3>
              <p className="text-[var(--muted-color)] text-sm max-w-sm leading-relaxed mb-6">
                {campaigns.length > 0
                  ? 'Click a campaign on the left to view or edit it, or create a new one.'
                  : 'Organize your content around objectives and audiences. Track campaign status from draft to completion.'}
              </p>
              {campaigns.length === 0 && (
                <motion.button
                  onClick={startNew}
                  className="px-6 py-3 rounded-xl bg-accent text-on-accent text-xs font-medium flex items-center gap-2"
                >
                  <FaPlus size={10} />
                  Create First Campaign
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
