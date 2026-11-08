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
      <label className="block text-xs font-medium text-[var(--muted-color)] mb-4 ml-1">
        Content Type
      </label>
      <div className="flex flex-wrap gap-2">
        {contentTypes.map((ct) => (
          <motion.button
            key={ct.id}
            onClick={() => setContentType(ct.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors border ${
              contentType === ct.id
                ? 'bg-accent/20 border-accent/50 text-accent  '
                : 'bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--muted-color)] hover:bg-input-border/50'
            }`}
          >
            <span className={`text-sm ${contentType === ct.id ? 'text-accent' : 'text-[var(--muted-color)]'}`}>{ct.icon}</span>
            {ct.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ContentTypeSelector;
