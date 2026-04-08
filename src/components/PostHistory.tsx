import React, { useEffect, useState, useContext } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, limit, deleteDoc, doc } from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHistory, FaCopy, FaClock, FaCheck, FaSearch, FaFilter, FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa';

interface Post {
  id: string;
  content: string;
  category: string;
  platform?: string;
  timestamp: any;
  imagePrompt?: string;
  tone?: string;
  engagementScore?: number;
}

const platformLabels: Record<string, string> = {
  twitter: 'Twitter / X', instagram: 'Instagram', linkedin: 'LinkedIn',
  tiktok: 'TikTok', email: 'Email', blog: 'Blog', ad: 'Ad Copy',
};

const PostHistory: React.FC = () => {
  const auth = useContext(AuthContext);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!auth?.user) return;

    const q = query(
      collection(db, 'posts'),
      where('userId', '==', auth.user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(fetchedPosts);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Listen Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth?.user]);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery || post.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || post.platform === filterPlatform;
    return matchesSearch && matchesPlatform;
  });

  const copyToClipboard = (text: string, postId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(postId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="shimmer-loading h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-black text-[var(--text-color)] flex items-center gap-3">
            <FaHistory className="text-emerald-500" />
            RECENT GENERATIONS
          </h3>
          <span className="text-[10px] font-black text-[var(--muted-color)] uppercase tracking-widest bg-[var(--input-bg)] border border-[var(--input-border)] px-3 py-1 rounded-full">
            {filteredPosts.length} Posts
          </span>
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[10px] font-black text-[var(--muted-color)] uppercase tracking-widest hover:border-emerald-500/30 transition-all"
        >
          <FaFilter className="text-emerald-500" />
          Filters
          {showFilters ? <FaChevronUp size={8} /> : <FaChevronDown size={8} />}
        </button>
      </div>

      {/* Search & Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)]">
              <div className="relative flex-1">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-color)]" size={12} />
                <input
                  type="text"
                  placeholder="Search your generations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--panel-bg)] border border-[var(--input-border)] rounded-xl py-3 pl-10 pr-4 text-sm text-[var(--text-color)] placeholder:text-[var(--muted-color)]/50 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="bg-[var(--panel-bg)] border border-[var(--input-border)] rounded-xl px-4 py-3 text-sm text-[var(--text-color)] focus:outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
              >
                <option value="all">All Platforms</option>
                {Object.entries(platformLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post, i) => {
              const isExpanded = expandedPost === post.id;
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-panel p-5 rounded-2xl border border-[var(--glass-border)] hover:border-emerald-500/20 transition-all group relative overflow-hidden flex flex-col justify-between"
                >
                  {/* Top Row */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.platform && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/15 text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                            {platformLabels[post.platform] || post.platform}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] text-[8px] font-black text-[var(--muted-color)] uppercase tracking-widest">
                          {post.category}
                        </span>
                        {post.tone && (
                          <span className="px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/15 text-[8px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest">
                            {post.tone}
                          </span>
                        )}
                      </div>
                      {post.engagementScore && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                          post.engagementScore >= 75 ? 'text-green-500 bg-green-500/10' :
                          post.engagementScore >= 50 ? 'text-amber-500 bg-amber-500/10' :
                          'text-red-500 bg-red-500/10'
                        }`}>
                          {post.engagementScore}
                        </span>
                      )}
                    </div>

                    <p className={`text-[var(--text-color)] text-xs font-medium leading-relaxed mb-4 ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {post.content}
                    </p>
                    
                    {post.content.length > 150 && (
                      <button
                        onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                        className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3 hover:text-emerald-400 transition-colors"
                      >
                        {isExpanded ? 'Show Less' : 'Show More'}
                      </button>
                    )}
                  </div>

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[var(--muted-color)]">
                      <FaClock size={10} />
                      <span className="text-[9px] font-bold uppercase tracking-tighter">
                        {post.timestamp?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'Just now'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyToClipboard(post.content, post.id)}
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
                        title="Copy"
                      >
                        {copiedId === post.id ? <FaCheck size={10} /> : <FaCopy size={10} />}
                      </button>
                      <button
                        onClick={() => deletePost(post.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
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
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-[var(--input-bg)] border border-[var(--input-border)] flex items-center justify-center mb-8">
                <FaHistory className="text-3xl text-[var(--muted-color)]" />
              </div>
              <h4 className="text-[var(--text-color)] font-black uppercase tracking-[0.3em] text-sm mb-4">
                {searchQuery || filterPlatform !== 'all' ? 'No matching results' : 'The Canvas awaits'}
              </h4>
              <p className="text-[var(--muted-color)] text-xs max-w-[280px] leading-relaxed mb-8">
                {searchQuery || filterPlatform !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Your neural orchestration history is empty. Start generating insights to populate your vault.'}
              </p>
              {searchQuery || filterPlatform !== 'all' ? (
                <button
                  onClick={() => { setSearchQuery(''); setFilterPlatform('all'); }}
                  className="px-8 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                >
                  CLEAR FILTERS
                </button>
              ) : (
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-8 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                >
                  GENERATE NOW
                </button>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PostHistory;
