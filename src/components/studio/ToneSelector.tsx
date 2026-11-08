import React from 'react';

const tones = [
  { id: 'professional', label: 'Professional', desc: 'Authority and credibility' },
  { id: 'casual', label: 'Casual', desc: 'Relaxed and conversational' },
  { id: 'witty', label: 'Witty', desc: 'Sharp and clever' },
  { id: 'enthusiastic', label: 'Enthusiastic', desc: 'High energy' },
  { id: 'bold', label: 'Bold', desc: 'Provocative and strong' },
  { id: 'minimal', label: 'Minimal', desc: 'Less is more' },
  { id: 'storytelling', label: 'Storytelling', desc: 'Narrative-driven' },
  { id: 'data-driven', label: 'Data-driven', desc: 'Stats and evidence' },
] as const;

export type Tone = typeof tones[number]['id'];

interface ToneSelectorProps {
  tone: Tone;
  setTone: (tone: Tone) => void;
}

const ToneSelector: React.FC<ToneSelectorProps> = ({ tone, setTone }) => {
  return (
    <div>
      <label className="mb-3 ml-1 block text-xs text-[var(--muted-color)]">Tone</label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tone">
        {tones.map((t) => {
          const isActive = tone === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTone(t.id)}
              title={t.desc}
              className={`rounded-lg border px-3 py-2 text-xs transition-colors duration-150 ${
                isActive
                  ? 'border-accent/50 bg-accent/10 text-[var(--text-color)]'
                  : 'border-[var(--hairline-strong)] text-[var(--muted-color)] hover:text-[var(--text-color)]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ToneSelector;
