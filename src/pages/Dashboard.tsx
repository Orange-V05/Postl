import React, { useContext, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { PenLine, Library, Repeat2, Fingerprint, Target, BarChart3 } from "lucide-react";
import GeneratePost from "../components/GeneratePost";
import PostHistory from "../components/PostHistory";
import BrandVoiceForm from "../components/BrandVoiceForm";
import CampaignForm from "../components/CampaignForm";
import RepurposeStudio from "../components/RepurposeStudio";
import { useStore } from "../store/useStore";
import { AuthContext } from "../context/AuthContext";

const ease = [0.22, 1, 0.36, 1] as const;

const tabs = [
  { id: "generate" as const, label: "Studio", icon: PenLine },
  { id: "history" as const, label: "Library", icon: Library },
  { id: "repurpose" as const, label: "Repurpose", icon: Repeat2 },
  { id: "brand" as const, label: "Brand", icon: Fingerprint },
  { id: "campaign" as const, label: "Campaign", icon: Target },
  { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
];

type TabId = (typeof tabs)[number]["id"];

const platformLabels: Record<string, string> = {
  twitter: "X",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  email: "Email",
  blog: "Blog",
  ad: "Ad copy",
};

/* ─── Analytics ─────────────────────────────────────────────────────────────── */
const AnalyticsPanel: React.FC = () => {
  const { usageStats } = useStore();
  const topPlatform = Object.entries(usageStats.platformCounts).sort((a, b) => b[1] - a[1])[0];
  const topTone = Object.entries(usageStats.toneCounts).sort((a, b) => b[1] - a[1])[0];

  if (usageStats.totalGenerations === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--hairline-strong)] px-6 py-20 text-center">
        <BarChart3 size={20} strokeWidth={1.75} className="text-[var(--faint-color)]" />
        <h4 className="mt-4 text-[15px] font-medium text-[var(--text-color)]">Nothing to show yet</h4>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--muted-color)]">
          Once you generate a few posts, you'll see which platforms and tones you use most.
        </p>
      </div>
    );
  }

  const stats = [
    { label: "Posts generated", value: usageStats.totalGenerations.toLocaleString() },
    {
      label: "Most used platform",
      value: topPlatform ? platformLabels[topPlatform[0]] || topPlatform[0] : "—",
      sub: topPlatform ? `${topPlatform[1]} posts` : undefined,
    },
    {
      label: "Most used tone",
      value: topTone ? topTone[0].charAt(0).toUpperCase() + topTone[0].slice(1) : "—",
      sub: topTone ? `${topTone[1]} uses` : undefined,
    },
    {
      label: "Last generated",
      value: usageStats.lastGeneratedAt
        ? new Date(usageStats.lastGeneratedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "Never",
    },
  ];

  const breakdown = Object.entries(usageStats.platformCounts).sort((a, b) => b[1] - a[1]);
  const total = usageStats.totalGenerations || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--hairline)] lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-[var(--surface)] p-5">
            <p className="text-xs text-[var(--faint-color)]">{s.label}</p>
            <p className="mt-2 text-2xl font-medium tabular-nums tracking-tight text-[var(--text-color)]">{s.value}</p>
            {s.sub && <p className="mt-1 text-xs tabular-nums text-[var(--muted-color)]">{s.sub}</p>}
          </div>
        ))}
      </div>

      {breakdown.length > 0 && (
        <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-6">
          <h4 className="mb-5 text-sm font-medium text-[var(--text-color)]">By platform</h4>
          <div className="space-y-4">
            {breakdown.map(([platform, count], i) => {
              const pct = Math.round((count / total) * 100);
              return (
                <div key={platform}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-[var(--text-color)]">{platformLabels[platform] || platform}</span>
                    <span className="font-mono text-xs tabular-nums text-[var(--muted-color)]">
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05, ease }}
                      className="h-full rounded-full bg-[var(--accent-primary)]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const panels: Record<TabId, React.ReactNode> = {
  generate: <GeneratePost />,
  history: <PostHistory />,
  repurpose: <RepurposeStudio />,
  brand: <BrandVoiceForm />,
  campaign: <CampaignForm />,
  analytics: <AnalyticsPanel />,
};

/* ─── Dashboard ─────────────────────────────────────────────────────────────── */
const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("generate");
  const auth = useContext(AuthContext);
  const { usageStats } = useStore();
  const reduce = useReducedMotion();
  const active = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="page-container min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 sm:px-6">
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-[var(--text-color)] sm:text-3xl">{active.label}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-[var(--muted-color)]">
              {auth?.user?.email && <span className="truncate">{auth.user.email}</span>}
              {usageStats.totalGenerations > 0 && (
                <>
                  <span className="text-[var(--faint-color)]">·</span>
                  <span className="tabular-nums">{usageStats.totalGenerations.toLocaleString()} generated</span>
                </>
              )}
            </p>
          </div>

          <nav
            role="tablist"
            aria-label="Studio sections"
            className="-mx-4 flex overflow-x-auto px-4 sm:mx-0 sm:px-0"
          >
            <div className="flex gap-0.5 rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={tab.label}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors duration-150 ${
                      isActive ? "text-[var(--text-color)]" : "text-[var(--muted-color)] hover:text-[var(--text-color)]"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="tab-indicator"
                        className="absolute inset-0 rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-2)]"
                        transition={reduce ? { duration: 0 } : { duration: 0.25, ease }}
                      />
                    )}
                    <Icon size={15} strokeWidth={1.75} className="relative" />
                    <span className="relative hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </header>

        <main className="flex-grow">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease }}
            >
              {panels[activeTab]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
