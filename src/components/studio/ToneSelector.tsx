import React from 'react';
import { motion } from 'framer-motion';

const tones = [
  { id: 'professional', label: 'Professional', emoji: '🎯', desc: 'Authority & credibility' },
  { id: 'casual', label: 'Casual', emoji: '☕', desc: 'Relaxed & conversational' },
  { id: 'witty', label: 'Witty', emoji: '⚡', desc: 'Sharp & clever' },
  { id: 'enthusiastic', label: 'Enthusiastic', emoji: '🔥', desc: 'High energy' },
  { id: 'bold', label: 'Bold', emoji: '💪', desc: 'Provocative & strong' },
  { id: 'minimal', label: 'Minimal', emoji: '✨', desc: 'Less is more' },
  { id: 'storytelling', label: 'Storytelling', emoji: '📖', desc: 'Narrative-driven' },
  { id: 'data-driven', label: 'Data-Driven', emoji: '📊', desc: 'Stats & evidence' },
] as const;

export type Tone = typeof tones[number]['id'];

interface ToneSelectorProps {
  tone: Tone;
  setTone: (tone: Tone) => void;
}

const ToneSelector: React.FC<ToneSelectorProps> = ({ tone, setTone }) => {
  return (
    <div>
      <label className="block text-[10px] font-black text-[var(--muted-color)] uppercase tracking-widest mb-3 ml-1">
        Tone
      </label>
      <div className="flex flex-wrap gap-2">
        {tones.map((t) => {
          const isActive = tone === t.id;
          return (
            <motion.button
              key={t.id}
              onClick={() => setTone(t.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border overflow-hidden ${
                isActive
                  ? 'bg-teal-500/15 border-teal-500/40 text-teal-600 dark:text-teal-400 shadow-lg shadow-teal-500/10'
                  : 'bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--muted-color)] hover:bg-[var(--input-border)]/50'
              }`}
              title={t.desc}
            >
              <span className="text-sm">{t.emoji}</span>
              {t.label}
              {isActive && (
                <motion.div
                  layoutId="tone-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ToneSelector;
