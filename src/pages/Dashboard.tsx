import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GeneratePost from "../components/GeneratePost";
import PostHistory from "../components/PostHistory";
import { FaSignature, FaHistory, FaChartBar, FaRocket } from "react-icons/fa";
import { useStore } from "../store/useStore";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const tabs = [
  { id: 'generate' as const, label: 'Studio', icon: <FaSignature /> },
  { id: 'history' as const, label: 'History', icon: <FaHistory /> },
  { id: 'analytics' as const, label: 'Analytics', icon: <FaChartBar /> },
];

/* ─── Analytics Panel ──────────────────────────────────────────────────────── */
const AnalyticsPanel: React.FC = () => {
  const { usageStats } = useStore();
  const topPlatform = Object.entries(usageStats.platformCounts).sort((a, b) => b[1] - a[1])[0];
  const topTone = Object.entries(usageStats.toneCounts).sort((a, b) => b[1] - a[1])[0];

  const platformLabels: Record<string, string> = {
    twitter: 'Twitter / X', instagram: 'Instagram', linkedin: 'LinkedIn',
    tiktok: 'TikTok', email: 'Email', blog: 'Blog', ad: 'Ad Copy',
  };

  const statCards = [
    { label: 'Total Generations', value: usageStats.totalGenerations.toString(), icon: '🚀', color: 'emerald' },
    { label: 'Top Platform', value: topPlatform ? (platformLabels[topPlatform[0]] || topPlatform[0]) : '—', sub: topPlatform ? `${topPlatform[1]} posts` : '', icon: '📱', color: 'cyan' },
    { label: 'Favorite Tone', value: topTone ? topTone[0].charAt(0).toUpperCase() + topTone[0].slice(1) : '—', sub: topTone ? `${topTone[1]} uses` : '', icon: '🎭', color: 'violet' },
    { label: 'Last Created', value: usageStats.lastGeneratedAt ? new Date(usageStats.lastGeneratedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never', icon: '📅', color: 'amber' },
  ];

  const platformBreakdown = Object.entries(usageStats.platformCounts).sort((a, b) => b[1] - a[1]);
  const totalCount = usageStats.totalGenerations || 1;

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 rounded-2xl border border-[var(--glass-border)] hover:border-emerald-500/20 transition-all"
          >
            <div className="text-3xl mb-4">{stat.icon}</div>
            <p className="text-[9px] font-black text-[var(--muted-color)] uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="font-display text-2xl font-bold text-[var(--text-color)] tracking-tight">{stat.value}</p>
            {stat.sub && <p className="text-[10px] text-[var(--muted-color)] mt-1">{stat.sub}</p>}
          </motion.div>
        ))}
      </div>

      {/* Platform Breakdown */}
      {platformBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel p-8 rounded-2xl border border-[var(--glass-border)]"
        >
          <h4 className="text-sm font-black text-[var(--text-color)] uppercase tracking-widest mb-6 flex items-center gap-2">
            <FaChartBar className="text-emerald-500" />
            Platform Distribution
          </h4>
          <div className="space-y-4">
            {platformBreakdown.map(([platform, count], i) => {
              const percentage = Math.round((count / totalCount) * 100);
              return (
                <div key={platform}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-[var(--text-color)]">
                      {platformLabels[platform] || platform}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[var(--muted-color)]">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--input-bg)] rounded-full overflow-hidden border border-[var(--input-border)]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {usageStats.totalGenerations === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-[var(--input-bg)] border border-[var(--input-border)] flex items-center justify-center mb-6">
            <FaChartBar className="text-3xl text-[var(--muted-color)]" />
          </div>
          <h4 className="font-display text-[var(--text-color)] font-bold uppercase tracking-[0.2em] text-sm mb-3">No Data Yet</h4>
          <p className="text-[var(--muted-color)] text-xs max-w-xs leading-relaxed">
            Start generating content and your analytics will appear here automatically.
          </p>
        </div>
      )}
    </div>
  );
};

/* ─── Dashboard Page ───────────────────────────────────────────────────────── */
const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'analytics'>('generate');
  const auth = useContext(AuthContext);
  const { usageStats } = useStore();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen aurora-bg page-container flex flex-col selection:bg-emerald-500/30">
      {/* Subtle animated background orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute top-[5%] right-[10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.02, 0.06, 0.02] }}
          transition={{ duration: 20, repeat: Infinity, delay: 5 }}
          className="absolute bottom-[10%] left-[5%] w-80 h-80 bg-teal-500/10 rounded-full blur-[100px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex-grow flex flex-col"
      >
        <header className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.5em] mb-3">Content Intelligence OS</p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-[var(--text-color)] tracking-tighter mb-2">
              {greeting()}{auth?.user?.email ? `, ${auth.user.email.split('@')[0]}` : ''} 👋
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-[var(--muted-color)] font-medium text-sm">
                Generate, strategize, and dominate every platform.
              </p>
              {usageStats.totalGenerations > 0 && (
                <span className="text-[9px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/15">
                  {usageStats.totalGenerations} generated
                </span>
              )}
            </div>
          </motion.div>

          {/* Animated Tab Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex bg-[var(--input-bg)] p-1.5 rounded-2xl border border-[var(--input-border)] self-start lg:self-auto"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-5 sm:px-7 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors z-10 ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-[var(--muted-color)] hover:text-[var(--text-color)]'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/30"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.icon}</span>
                <span className="relative z-10 hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </motion.div>
        </header>

        <main className="flex-grow">
          <AnimatePresence mode="wait">
            {activeTab === 'generate' ? (
              <motion.div
                key="studio"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <GeneratePost />
              </motion.div>
            ) : activeTab === 'history' ? (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PostHistory />
              </motion.div>
            ) : (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AnalyticsPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="mt-16 pt-8 border-t border-[var(--glass-border)] text-center">
          <div className="flex items-center justify-center gap-6 mb-4 text-[var(--muted-color)]">
            <div className="flex items-center gap-2">
              <FaRocket className="text-emerald-500" size={10} />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50">POSTL v4.0</span>
            </div>
            <div className="w-1 h-1 bg-[var(--muted-color)] rounded-full opacity-30" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50">CONTENT INTELLIGENCE OS</span>
          </div>
        </footer>
      </motion.div>
    </div>
  );
};

export default Dashboard;
