import React from 'react';
import { motion } from 'framer-motion';
import { FaFileAlt, FaStream, FaHashtag, FaFilm, FaNewspaper, FaEnvelopeOpenText, FaBullhorn, FaUserTie } from 'react-icons/fa';

const contentTypes = [
  { id: 'single', label: 'Single Post', icon: <FaFileAlt /> },
  { id: 'thread', label: 'Thread', icon: <FaStream /> },
  { id: 'caption', label: 'Caption + Tags', icon: <FaHashtag /> },
  { id: 'script', label: 'Video Script', icon: <FaFilm /> },
  { id: 'blog', label: 'Blog Outline', icon: <FaNewspaper /> },
  { id: 'email', label: 'Email Subject', icon: <FaEnvelopeOpenText /> },
  { id: 'ad', label: 'Ad Copy', icon: <FaBullhorn /> },
  { id: 'pitch', label: 'Elevator Pitch', icon: <FaUserTie /> },
] as const;

export type ContentType = typeof contentTypes[number]['id'];

interface ContentTypeSelectorProps {
  contentType: ContentType;
  setContentType: (c: ContentType) => void;
}

const ContentTypeSelector: React.FC<ContentTypeSelectorProps> = ({ contentType, setContentType }) => {
  return (
    <div>
      <label className="block text-[10px] font-black text-[var(--muted-color)] uppercase tracking-widest mb-4 ml-1">
        Content Type
      </label>
      <div className="flex flex-wrap gap-2">
        {contentTypes.map((ct) => (
          <motion.button
            key={ct.id}
            onClick={() => setContentType(ct.id)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
              contentType === ct.id
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10'
                : 'bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--muted-color)] hover:bg-[var(--input-border)]/50'
            }`}
          >
            <span className={`text-sm ${contentType === ct.id ? 'text-emerald-500' : 'text-[var(--muted-color)]'}`}>{ct.icon}</span>
            {ct.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ContentTypeSelector;
