import React, { useRef, useEffect, useState } from 'react';

interface PromptInputAreaProps {
  prompt: string;
  setPrompt: (p: string) => void;
  creativity: number;
  setCreativity: (c: number) => void;
  fontSize: number;
  setFontSize: (s: number) => void;
}

const placeholders = [
  "Describe your creative vision...",
  "e.g. 'Why hustle culture is a trap'",
  "e.g. 'AI replacing creative jobs in 2026'",
  "e.g. 'Morning routine for peak productivity'",
  "e.g. 'The truth about passive income'",
  "e.g. 'How we scaled from 0 to 10K users'",
];

const PromptInputArea: React.FC<PromptInputAreaProps> = ({
  prompt, setPrompt,
  creativity, setCreativity,
  fontSize, setFontSize
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Auto-expand textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 100)}px`;
    }
    setCharCount(prompt.length);
  }, [prompt]);

  // Rotate placeholders
  useEffect(() => {
    if (prompt) return;
    const interval = setInterval(() => {
      setPlaceholderIdx(prev => (prev + 1) % placeholders.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [prompt]);

  // AI assist chips
  const assistChips = [
    { label: '+ Hook', text: 'Start with a powerful hook: ' },
    { label: '+ CTA', text: '\n\nCall to action: ' },
    { label: '+ Data', text: 'Include a surprising statistic about ' },
    { label: '+ Story', text: 'Tell a personal story about ' },
  ];

  const insertChip = (text: string) => {
    setPrompt(prompt + text);
    textareaRef.current?.focus();
  };

  const creativityLabel = creativity <= 0.3 ? 'Conservative' : creativity <= 0.6 ? 'Balanced' : creativity <= 0.8 ? 'Creative' : 'Wild';

  return (
    <>
      <div className="flex items-center justify-between mb-3 ml-1">
        <label className="text-[10px] font-black text-[var(--muted-color)] uppercase tracking-widest">
          Prompt
        </label>
        <span className={`text-[10px] font-mono font-bold transition-colors ${charCount > 400 ? 'text-red-500' : charCount > 300 ? 'text-amber-500' : 'text-[var(--muted-color)]'}`}>
          {charCount > 0 ? `${charCount} / 500` : ''}
        </span>
      </div>
      
      <div className="relative group mb-4">
        <textarea
          ref={textareaRef}
          rows={3}
          maxLength={500}
          className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-2xl p-5 text-[var(--text-color)] placeholder:text-[var(--muted-color)]/40 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium resize-none relative z-10 min-h-[100px]"
          placeholder={placeholders[placeholderIdx]}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        {/* AI Attention Glow */}
        <div className={`absolute inset-0 rounded-2xl blur-xl bg-emerald-500/10 transition-opacity duration-700 pointer-events-none ${prompt.length > 5 ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* AI Assist Chips */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {assistChips.map((chip, i) => (
          <button
            key={i}
            onClick={() => insertChip(chip.text)}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[9px] font-bold text-[var(--muted-color)] hover:text-emerald-500 hover:border-emerald-500/30 transition-all"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="space-y-5 mb-6">
        <div className="px-1">
          <div className="flex justify-between items-center mb-3">
            <label className="text-[10px] font-black text-[var(--muted-color)] uppercase tracking-widest">Creativity</label>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-emerald-500 uppercase">{creativityLabel}</span>
              <span className="text-emerald-400 text-[10px] font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">{Math.round(creativity * 100)}%</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={creativity * 100}
            onChange={(e) => setCreativity(parseInt(e.target.value) / 100)}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="px-1">
          <div className="flex justify-between items-center mb-3">
            <label className="text-[10px] font-black text-[var(--muted-color)] uppercase tracking-widest">Visual Size</label>
            <span className="text-emerald-400 text-[10px] font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">{fontSize}px</span>
          </div>
          <input
            type="range"
            min="16"
            max="80"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </>
  );
};

export default PromptInputArea;
