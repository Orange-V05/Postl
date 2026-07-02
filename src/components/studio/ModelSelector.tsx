import React from 'react';
import { motion } from 'framer-motion';

export const OPEN_MODELS = [
  { id: 'gemma4:e2b', name: 'Gemma 4 (e2b) - Local', type: 'Local' },
];

interface ModelSelectorProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, setSelectedModel }) => {
  return (
    <div className="space-y-3 mb-6">
      <div className="grid grid-cols-1 gap-2 p-2 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)]">
        {OPEN_MODELS.map((model) => (
          <button
            key={model.id}
            onClick={() => setSelectedModel(model.id)}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
              selectedModel === model.id
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'hover:bg-white/5 text-[var(--muted-color)]'
            }`}
          >
            <div className="flex flex-col items-start">
              <span className="text-[11px] font-bold">{model.name}</span>
              <span className="text-[8px] opacity-50 uppercase tracking-tighter">{model.type}</span>
            </div>
            {selectedModel === model.id && (
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModelSelector;
