import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserPreferences {
  selectedModel: string;
  creativity: number;
  tone: 'professional' | 'casual' | 'witty' | 'enthusiastic' | 'bold' | 'minimal' | 'storytelling' | 'data-driven';
  fontSize: number;
  darkMode: boolean;
}

interface UsageStats {
  totalGenerations: number;
  platformCounts: Record<string, number>;
  toneCounts: Record<string, number>;
  lastGeneratedAt: string | null;
}

interface AppState {
  prefs: UserPreferences;
  setPrefs: (newPrefs: Partial<UserPreferences>) => void;
  resetPrefs: () => void;
  recentPrompts: string[];
  addRecentPrompt: (prompt: string) => void;
  clearRecentPrompts: () => void;
  usageStats: UsageStats;
  incrementUsage: (platform: string, tone: string) => void;
}

const defaultPrefs: UserPreferences = {
  selectedModel: 'google/gemma-3-27b-it:free',
  creativity: 0.7,
  tone: 'professional',
  fontSize: 28,
  darkMode: true,
};

const defaultUsageStats: UsageStats = {
  totalGenerations: 0,
  platformCounts: {},
  toneCounts: {},
  lastGeneratedAt: null,
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      prefs: defaultPrefs,
      setPrefs: (newPrefs) =>
        set((state) => ({
          prefs: { ...state.prefs, ...newPrefs },
        })),
      resetPrefs: () => set({ prefs: defaultPrefs }),

      recentPrompts: [],
      addRecentPrompt: (prompt) =>
        set((state) => {
          const filtered = state.recentPrompts.filter(p => p !== prompt);
          return { recentPrompts: [prompt, ...filtered].slice(0, 8) };
        }),
      clearRecentPrompts: () => set({ recentPrompts: [] }),

      usageStats: defaultUsageStats,
      incrementUsage: (platform, tone) =>
        set((state) => ({
          usageStats: {
            totalGenerations: state.usageStats.totalGenerations + 1,
            platformCounts: {
              ...state.usageStats.platformCounts,
              [platform]: (state.usageStats.platformCounts[platform] || 0) + 1,
            },
            toneCounts: {
              ...state.usageStats.toneCounts,
              [tone]: (state.usageStats.toneCounts[tone] || 0) + 1,
            },
            lastGeneratedAt: new Date().toISOString(),
          },
        })),
    }),
    {
      name: 'postl-v4-store',
    }
  )
);
