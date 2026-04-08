import React from 'react';
import { FaCloud, FaServer } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface ModelSelectorProps {
  aiModel: 'cloud' | 'local';
  setAiModel: (model: 'cloud' | 'local') => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ aiModel, setAiModel }) => {
  return (
    <div className="flex bg-[var(--input-bg)] p-1.5 rounded-2xl mb-6 border border-[var(--input-border)]" role="radiogroup" aria-label="Select AI model">
      <button
        onClick={() => setAiModel('cloud')}
        className={`relative flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all overflow-hidden ${
          aiModel === 'cloud' ? 'text-white shadow-lg' : 'text-[var(--muted-color)] hover:text-[var(--text-color)]'
        }`}
      >
        {aiModel === 'cloud' && (
          <motion.div
            layoutId="model-bg"
            className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <FaCloud /> Cloud AI
        </span>
      </button>
      <button
        onClick={() => setAiModel('local')}
        className={`relative flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all overflow-hidden ${
          aiModel === 'local' ? 'text-white shadow-lg' : 'text-[var(--muted-color)] hover:text-[var(--text-color)]'
        }`}
      >
        {aiModel === 'local' && (
          <motion.div
            layoutId="model-bg"
            className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <FaServer /> Local GPU
        </span>
      </button>
    </div>
  );
};

export default ModelSelector;
