import React from 'react';
import { motion } from 'framer-motion';
import { FaHashtag, FaRocket, FaLaptopCode, FaGlobeAmericas, FaLaughBeam, FaGraduationCap, FaNetworkWired } from 'react-icons/fa';

export type Topic = 'general' | 'motivational' | 'tech' | 'travel' | 'funny' | 'educational' | 'startup';

interface TopicOption {
  id: Topic;
  label: string;
  icon: React.ReactNode;
}

const topics: TopicOption[] = [
  { id: 'general', label: 'General', icon: <FaHashtag /> },
  { id: 'motivational', label: 'Motivational', icon: <FaRocket /> },
  { id: 'tech', label: 'Tech & AI', icon: <FaLaptopCode /> },
  { id: 'startup', label: 'Startup & B2B', icon: <FaNetworkWired /> },
  { id: 'travel', label: 'Travel', icon: <FaGlobeAmericas /> },
  { id: 'funny', label: 'Humor', icon: <FaLaughBeam /> },
  { id: 'educational', label: 'Educational', icon: <FaGraduationCap /> },
];

interface TopicSelectorProps {
  topic: Topic;
  setTopic: (t: Topic) => void;
}

const TopicSelector: React.FC<TopicSelectorProps> = ({ topic, setTopic }) => {
  return (
    <div>
      <label className="block text-[10px] font-black text-[var(--muted-color)] uppercase tracking-widest mb-4 ml-1">
        Post Topic
      </label>
      <div className="flex flex-wrap gap-2">
        {topics.map((t) => (
          <motion.button
            key={t.id}
            onClick={() => setTopic(t.id)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
              topic === t.id
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-600 dark:text-cyan-400 shadow-lg shadow-cyan-500/10'
                : 'bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--muted-color)] hover:bg-[var(--input-border)]/50'
            }`}
          >
            <span className={`text-sm ${topic === t.id ? 'text-cyan-500' : 'text-[var(--muted-color)]'}`}>
              {t.icon}
            </span>
            {t.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default TopicSelector;
