import React, { useEffect, useState } from 'react';
import { getModels } from '../../api/client';

type ModelOption = { id: string; label: string; capabilities: string[]; local: boolean; privacy?: string; provider?: string };

interface ModelSelectorProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, setSelectedModel }) => {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'offline' | 'empty'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    getModels()
      .then((data) => {
        if (!mounted) return;
        const available = data.models;
        setModels(available);
        setStatus(data.models.length > 0 ? 'ready' : 'empty');
        setMessage(data.models.length > 0 ? '' : 'No AI models are enabled on the backend. Configure OpenRouter for production or Ollama for local development.');
        if (available.length > 0 && !available.some((model) => model.id === selectedModel)) setSelectedModel(available[0].id);
      })
      .catch((err) => {
        if (!mounted) return;
        setModels([]);
        setStatus('offline');
        setMessage(err?.message || 'POSTL backend is unavailable. Model discovery is disabled until the API is configured and reachable.');
      });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black text-[var(--muted-color)] uppercase tracking-widest">AI Engine</label>
        <span className={`text-[8px] font-black uppercase tracking-widest ${status === 'ready' ? 'text-emerald-500' : 'text-amber-500'}`}>
          {status === 'loading' ? 'Checking' : status === 'ready' ? 'Live models' : status === 'empty' ? 'No models' : 'Backend offline'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 p-2 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)]">
        {message && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[10px] font-bold leading-relaxed text-amber-500">
            {message}
          </div>
        )}
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
                {model.local ? 'Local' : 'Cloud'} • {model.privacy || (model.local ? 'local' : 'cloud')} • {model.capabilities.join(', ')}
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
