import { FaCloud, FaServer, FaChevronDown } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export const OPEN_MODELS = [
  { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B (Free)', type: 'Reliable' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', type: 'Fast' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 (Pro)', type: 'Advanced' },
];

interface ModelSelectorProps {
  aiModel: 'cloud' | 'local';
  setAiModel: (model: 'cloud' | 'local') => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ aiModel, setAiModel, selectedModel, setSelectedModel }) => {
  const currentModelName = OPEN_MODELS.find(m => m.id === selectedModel)?.name || 'Select Model';

  return (
    <div className="space-y-3 mb-6">
      <div className="flex bg-[var(--input-bg)] p-1.5 rounded-2xl border border-[var(--input-border)]" role="radiogroup" aria-label="Select AI model">
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

      <AnimatePresence mode="wait">
        {aiModel === 'cloud' ? (
          <motion.div
            key="cloud-models"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
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
          </motion.div>
        ) : (
          <motion.div
            key="local-status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center">
              <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest leading-relaxed">
                Local Neural Engine requires LocalAIServer running on port 5000
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModelSelector;
