import React, { useEffect, useState } from 'react';
import { getModels } from '../../api/client';

const FALLBACK_MODELS = [
  { id: 'local-gemma', label: 'Local Ollama (configured by backend)', capabilities: ['generation'], local: true },
];

interface ModelSelectorProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, setSelectedModel }) => {
  const [models, setModels] = useState(FALLBACK_MODELS);
  const [status, setStatus] = useState<'loading' | 'ready' | 'offline'>('loading');

  useEffect(() => {
    let mounted = true;
    getModels()
      .then((data) => {
        if (!mounted) return;
        const available = data.models.length > 0 ? data.models : FALLBACK_MODELS;
        setModels(available);
        setStatus(data.models.length > 0 ? 'ready' : 'offline');
        if (!available.some((model) => model.id === selectedModel)) setSelectedModel(available[0].id);
      })
      .catch(() => {
        if (!mounted) return;
        setModels(FALLBACK_MODELS);
        setStatus('offline');
      });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black text-[var(--muted-color)] uppercase tracking-widest">AI Engine</label>
        <span className={`text-[8px] font-black uppercase tracking-widest ${status === 'ready' ? 'text-emerald-500' : 'text-amber-500'}`}>
          {status === 'loading' ? 'Checking' : status === 'ready' ? 'Live models' : 'Fallback list'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 p-2 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)]">
        {models.map((model) => (
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
              <span className="text-[11px] font-bold">{model.label}</span>
              <span className="text-[8px] opacity-50 uppercase tracking-tighter">
                {model.local ? 'Local' : 'Cloud'} • {model.capabilities.join(', ')}
              </span>
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
