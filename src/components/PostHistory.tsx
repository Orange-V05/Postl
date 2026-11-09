import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, query, where, orderBy, getDocs,
  deleteDoc, doc, updateDoc, serverTimestamp,
  startAfter, limit, QueryDocumentSnapshot, DocumentData
} from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHistory, FaCopy, FaClock, FaCheck, FaSearch, FaFilter,
  FaTrash, FaChevronDown, FaChevronUp, FaStar, FaSort,
  FaChevronLeft, FaChevronRight, FaCheckSquare, FaSquare,
  FaArchive, FaCircle
} from 'react-icons/fa';

type PostStatus = 'draft' | 'published' | 'archived';

interface Post {
  id: string;
  content: string;
  category: string;
  platform?: string;
  timestamp: any;
  imagePrompt?: string;
  tone?: string;
  engagementScore?: number;
  favorite?: boolean;
  status?: PostStatus;
}

const PAGE_SIZE = 12;

const platformLabels: Record<string, string> = {
  twitter: 'Twitter / X', instagram: 'Instagram', linkedin: 'LinkedIn',
  tiktok: 'TikTok', email: 'Email', blog: 'Blog', ad: 'Ad Copy',
};

const statusConfig: Record<PostStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',     color: 'text-muted',       bg: 'bg-surface-2' },
  published: { label: 'Published', color: 'text-accent', bg: 'bg-accent/10' },
  archived:  { label: 'Archived',  color: 'text-faint',       bg: 'bg-surface-2' },
};

type SortKey = 'timestamp_desc' | 'timestamp_asc' | 'platform' | 'score';

const PostHistory: React.FC = () => {
  const auth = useContext(AuthContext);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterStatus, setFilterStatus] = useState<PostStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp_desc');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const loadPosts = useCallback(async (cursor: QueryDocumentSnapshot<DocumentData> | null = null) => {
    if (!auth?.user || !db) { setLoading(false); return; }
    const isFirst = cursor === null;
    if (isFirst) setLoading(true); else setLoadingMore(true);

    try {
      const constraints: any[] = [
        where('userId', '==', auth.user.uid),
        orderBy('timestamp', 'desc'),
        limit(PAGE_SIZE + 1),
      ];
      if (cursor) constraints.push(startAfter(cursor));
      const q = query(collection(db, 'posts'), ...constraints);
      const snap = await getDocs(q);
      const docs = snap.docs;
      const hasMoreDocs = docs.length > PAGE_SIZE;
      const pageDocs = hasMoreDocs ? docs.slice(0, PAGE_SIZE) : docs;
      const result = pageDocs.map(d => ({ id: d.id, ...d.data() } as Post));

      if (isFirst) {
        setPosts(result);
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...result.filter(p => !existingIds.has(p.id))];
        });
      }
      setLastDoc(pageDocs[pageDocs.length - 1] || null);
      setHasMore(hasMoreDocs);
    } catch (error) {
      console.error('PostHistory load error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [auth?.user]);

  useEffect(() => { loadPosts(null); }, [loadPosts]);

  const applySort = (list: Post[]): Post[] => {
    switch (sortKey) {
      case 'timestamp_asc': return [...list].sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      case 'platform': return [...list].sort((a, b) => (a.platform || '').localeCompare(b.platform || ''));
      case 'score': return [...list].sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0));
      default: return [...list].sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    }
  };

  const filteredPosts = applySort(posts.filter(post => {
    if (searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterPlatform !== 'all' && post.platform !== filterPlatform) return false;
    if (filterFavorites && !post.favorite) return false;
    if (filterStatus !== 'all' && (post.status || 'draft') !== filterStatus) return false;
    return true;
  }));

  const copyToClipboard = (text: string, postId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(postId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleFavorite = async (post: Post) => {
    if (!db) return;
    const newVal = !post.favorite;
    setPosts(ps => ps.map(p => p.id === post.id ? { ...p, favorite: newVal } : p));
    try {
      await updateDoc(doc(db!, 'posts', post.id), { favorite: newVal, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error('Favorite toggle failed:', err);
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, favorite: !newVal } : p));
    }
  };

  const cycleStatus = async (post: Post) => {
    if (!db) return;
    const statuses: PostStatus[] = ['draft', 'published', 'archived'];
    const current = (post.status || 'draft') as PostStatus;
    const next = statuses[(statuses.indexOf(current) + 1) % statuses.length];
    setPosts(ps => ps.map(p => p.id === post.id ? { ...p, status: next } : p));
    try {
      await updateDoc(doc(db!, 'posts', post.id), { status: next, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error('Status update failed:', err);
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, status: current } : p));
    }
  };

  const deletePost = async (postId: string) => {
    if (!db) return;
    setPosts(ps => ps.filter(p => p.id !== postId));
    setSelected(sel => { const s = new Set(sel); s.delete(postId); return s; });
    try {
      await deleteDoc(doc(db!, 'posts', postId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const bulkDelete = async () => {
    if (!db || selected.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selected);
    setPosts(ps => ps.filter(p => !ids.includes(p.id)));
    setSelected(new Set());
    setConfirmBulkDelete(false);
    try {
      await Promise.all(ids.map(id => deleteDoc(doc(db!, 'posts', id))));
    } catch (err) {
      console.error('Bulk delete failed:', err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(sel => {
      const s = new Set(sel);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredPosts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredPosts.map(p => p.id)));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="shimmer-loading h-36 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-medium text-[var(--text-color)] flex items-center gap-3">
            <FaHistory className="text-accent" />
            CONTENT LIBRARY
          </h3>
          <span className="text-xs font-medium text-[var(--muted-color)] bg-[var(--input-bg)] border border-[var(--input-border)] px-3 py-1 rounded-full">
            {filteredPosts.length}
            {hasMore && '+'} Posts
          </span>
          {filterFavorites && (
            <span className="text-xs font-medium text-warm bg-warm/10 border border-warm/20 px-3 py-1 rounded-full flex items-center gap-1">
              <FaStar size={8} /> Favorites
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Favorites toggle */}
          <button
            onClick={() => setFilterFavorites(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              filterFavorites
                ? 'bg-warm/15 border-warm/30 text-warm'
                : 'bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--muted-color)] hover:border-warm/20'
            }`}
          >
            <FaStar size={9} />
            Favorites
          </button>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => { setShowSort(s => !s); setShowFilters(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-xs font-medium text-[var(--muted-color)] hover:border-accent/30 transition-colors"
            >
              <FaSort className="text-accent" />
              Sort
            </button>
            <AnimatePresence>
              {showSort && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 top-full mt-2 z-30 bg-[var(--surface)] border border-[var(--hairline)] rounded-2xl p-2 min-w-[180px] "
                >
                  {[
                    { key: 'timestamp_desc', label: 'Newest first' },
                    { key: 'timestamp_asc', label: 'Oldest first' },
                    { key: 'platform', label: 'By platform' },
                    { key: 'score', label: 'By engagement score' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => { setSortKey(key as SortKey); setShowSort(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                        sortKey === key
                          ? 'bg-accent/10 text-accent'
                          : 'text-[var(--muted-color)] hover:text-[var(--text-color)] hover:bg-[var(--input-bg)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filters */}
          <button
            onClick={() => { setShowFilters(f => !f); setShowSort(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-xs font-medium text-[var(--muted-color)] hover:border-accent/30 transition-colors"
          >
            <FaFilter className="text-accent" />
            Filters
            {showFilters ? <FaChevronUp size={8} /> : <FaChevronDown size={8} />}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)]">
              {/* Search */}
              <div className="relative flex-1">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-color)]" size={12} />
                <input
                  type="text"
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--panel-bg)] border border-[var(--input-border)] rounded-xl py-3 pl-10 pr-4 text-sm text-[var(--text-color)] placeholder:text-muted/50 focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
              {/* Platform */}
              <select
                value={filterPlatform}
                onChange={e => setFilterPlatform(e.target.value)}
                className="bg-[var(--panel-bg)] border border-[var(--input-border)] rounded-xl px-4 py-3 text-sm text-[var(--text-color)] focus:outline-none focus:border-accent/50 cursor-pointer"
              >
                <option value="all">All Platforms</option>
                {Object.entries(platformLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              {/* Status */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="bg-[var(--panel-bg)] border border-[var(--input-border)] rounded-xl px-4 py-3 text-sm text-[var(--text-color)] focus:outline-none focus:border-accent/50 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                {(Object.keys(statusConfig) as PostStatus[]).map(s => (
                  <option key={s} value={s}>{statusConfig[s].label}</option>
                ))}
              </select>
              {(searchQuery || filterPlatform !== 'all' || filterStatus !== 'all') && (
                <button
                  onClick={() => { setSearchQuery(''); setFilterPlatform('all'); setFilterStatus('all'); }}
                  className="px-3 py-2 rounded-xl border border-[var(--input-border)] text-xs font-medium text-[var(--muted-color)] hover:text-[var(--text-color)] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {filteredPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 flex-wrap"
          >
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-color)] hover:text-[var(--text-color)] transition-colors"
            >
              {selected.size === filteredPosts.length && filteredPosts.length > 0
                ? <FaCheckSquare size={12} className="text-accent" />
                : <FaSquare size={12} />}
              {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
            </button>

            <AnimatePresence>
              {selected.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2"
                >
                  {!confirmBulkDelete ? (
                    <button
                      onClick={() => setConfirmBulkDelete(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium hover:bg-danger hover:text-on-danger transition-colors"
                    >
                      <FaTrash size={9} />
                      Delete {selected.size}
                    </button>
                  ) : (
                    <>
                      <span className="text-xs font-medium text-[var(--text-color)]">Confirm?</span>
                      <button
                        onClick={bulkDelete}
                        disabled={bulkDeleting}
                        className="px-3 py-1.5 rounded-xl bg-danger text-on-danger text-xs font-medium "
                      >
                        {bulkDeleting ? '...' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmBulkDelete(false)}
                        className="px-3 py-1.5 rounded-xl border border-[var(--input-border)] text-[var(--muted-color)] text-xs font-medium "
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelected(new Set())}
                    className="text-xs font-medium text-[var(--muted-color)] hover:text-[var(--text-color)] transition-colors"
                  >
                    Deselect
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post, i) => {
              const isExpanded = expandedPost === post.id;
              const isSelected = selected.has(post.id);
              const postStatus = (post.status || 'draft') as PostStatus;
              const sc = statusConfig[postStatus];
              return (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className={`bg-[var(--surface)] p-5 rounded-2xl border transition-colors group relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-accent/40 bg-accent/5'
                      : 'border-[var(--hairline)] hover:border-accent/20'
                  }`}
                >
                  {/* Selection checkbox */}
                  <button
                    onClick={() => toggleSelect(post.id)}
                    className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    {isSelected
                      ? <FaCheckSquare size={14} className="text-accent" />
                      : <FaSquare size={14} className="text-[var(--muted-color)]" />}
                  </button>

                  <div>
                    {/* Top Row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap ml-5">
                        {post.platform && (
                          <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/15 text-xs text-accent">
                            {platformLabels[post.platform] || post.platform}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-[var(--muted-color)]">
                          {post.category}
                        </span>
                        {post.tone && (
                          <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/15 text-xs text-accent">
                            {post.tone}
                          </span>
                        )}
                      </div>
                      {/* Favorite + engagement */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleFavorite(post)}
                          className={`transition-colors ${post.favorite ? 'text-warm' : 'text-[var(--muted-color)] hover:text-warm opacity-0 group-hover:opacity-100'}`}
                        >
                          <FaStar size={12} />
                        </button>
                        {post.engagementScore && (
                          <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-md ${
                            post.engagementScore >= 75 ? 'text-success bg-success/10' :
                            post.engagementScore >= 50 ? 'text-warm bg-warm/10' :
                            'text-danger bg-danger/10'
                          }`}>
                            {post.engagementScore}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className={`text-[var(--text-color)] text-xs font-medium leading-relaxed mb-3 ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {post.content}
                    </p>

                    {post.content.length > 150 && (
                      <button
                        onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                        className="text-xs font-medium text-accent mb-3 hover:text-accent transition-colors"
                      >
                        {isExpanded ? 'Show Less' : 'Show More'}
                      </button>
                    )}
                  </div>

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--hairline)]">
                    <div className="flex items-center gap-2">
                      {/* Status cycle button */}
                      <button
                        onClick={() => cycleStatus(post)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${sc.bg} ${sc.color} border border-transparent transition-colors hover:opacity-70`}
                        title="Click to cycle status"
                      >
                        <FaCircle size={4} />
                        {sc.label}
                      </button>
                      <div className="flex items-center gap-1 text-[var(--muted-color)]">
                        <FaClock size={9} />
                        <span className="text-xs font-medium tracking-tighter">
                          {post.timestamp?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'Just now'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyToClipboard(post.content, post.id)}
                        className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent hover:text-on-accent transition-colors"
                        title="Copy"
                      >
                        {copiedId === post.id ? <FaCheck size={10} /> : <FaCopy size={10} />}
                      </button>
                      <button
                        onClick={() => deletePost(post.id)}
                        className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-on-danger transition-colors"
                        title="Delete"
                      >
                        <FaTrash size={10} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-24 flex flex-col items-center justify-center text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)] flex items-center justify-center mb-8">
                {filterFavorites ? <FaStar className="text-3xl text-warm" /> : <FaHistory className="text-3xl text-[var(--muted-color)]" />}
              </div>
              <h4 className="text-[var(--text-color)] font-medium text-sm mb-4">
                {searchQuery || filterPlatform !== 'all' || filterFavorites || filterStatus !== 'all'
                  ? 'No matching results'
                  : 'The Canvas Awaits'}
              </h4>
              <p className="text-[var(--muted-color)] text-xs max-w-[280px] leading-relaxed mb-8">
                {filterFavorites
                  ? 'No favorites yet. Star posts you want to find quickly.'
                  : searchQuery || filterPlatform !== 'all' || filterStatus !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Your content library is empty. Start generating insights to populate your vault.'}
              </p>
              {(searchQuery || filterPlatform !== 'all' || filterFavorites || filterStatus !== 'all') && (
                <button
                  onClick={() => { setSearchQuery(''); setFilterPlatform('all'); setFilterFavorites(false); setFilterStatus('all'); }}
                  className="px-8 py-3 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent hover:text-on-accent transition-colors"
                >
                  CLEAR FILTERS
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      <AnimatePresence>
        {hasMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center pt-2"
          >
            <motion.button
              onClick={() => loadPosts(lastDoc)}
              disabled={loadingMore}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--muted-color)] text-xs font-medium hover:text-[var(--text-color)] hover:border-accent/30 transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <div className="w-4 h-4 border-2 border-muted/30 border-t-accent rounded-full animate-spin" />
              ) : (
                <FaChevronDown size={10} className="text-accent" />
              )}
              {loadingMore ? 'Loading...' : 'Load More'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PostHistory;
