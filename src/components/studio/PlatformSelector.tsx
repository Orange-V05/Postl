import React from 'react';
import { motion } from 'framer-motion';
import { FaTwitter, FaInstagram, FaLinkedin, FaEnvelope, FaPen, FaBullhorn } from 'react-icons/fa';
import { SiTiktok } from 'react-icons/si';

export type Platform = 'twitter' | 'instagram' | 'linkedin' | 'tiktok' | 'email' | 'blog' | 'ad';

interface PlatformOption {
  id: Platform;
  name: string;
  icon: React.ReactNode;
  hint: string;
  color: string;
}

const platformOptions: PlatformOption[] = [
  { id: 'twitter', name: 'Twitter / X', icon: <FaTwitter />, hint: '280 chars • Punchy • Threads', color: '#1DA1F2' },
  { id: 'instagram', name: 'Instagram', icon: <FaInstagram />, hint: 'Captions • Hashtags • Reels', color: '#E4405F' },
  { id: 'linkedin', name: 'LinkedIn', icon: <FaLinkedin />, hint: 'Thought Leadership • B2B', color: '#0A66C2' },
  { id: 'tiktok', name: 'TikTok', icon: <SiTiktok />, hint: 'Scripts • Hooks • Trends', color: '#00F2EA' },
  { id: 'email', name: 'Email', icon: <FaEnvelope />, hint: 'Subject Lines • Campaigns', color: '#F59E0B' },
  { id: 'blog', name: 'Blog', icon: <FaPen />, hint: 'SEO Outlines • Long-form', color: '#8B5CF6' },
  { id: 'ad', name: 'Ad Copy', icon: <FaBullhorn />, hint: 'Direct Response • CTAs', color: '#EF4444' },
];

interface PlatformSelectorProps {
  platform: Platform;
  setPlatform: (p: Platform) => void;
}

const PlatformSelector: React.FC<PlatformSelectorProps> = ({ platform, setPlatform }) => {
  return (
    <div className="mb-6">
      <label className="block text-[10px] font-black text-[var(--muted-color)] uppercase tracking-widest mb-3 ml-1">
        Target Platform
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {platformOptions.map((p) => {
          const isActive = platform === p.id;
          return (
            <motion.button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all border overflow-hidden ${
                isActive
                  ? 'border-opacity-60 shadow-lg'
                  : 'bg-[var(--input-bg)] border-[var(--input-border)] hover:border-opacity-40'
              }`}
              style={isActive ? {
                background: `${p.color}10`,
                borderColor: `${p.color}50`,
                boxShadow: `0 8px 25px ${p.color}15`,
              } : {}}
            >
              {isActive && (
                <motion.div
                  layoutId="platform-glow"
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: `${p.color}06`, border: `1px solid ${p.color}25` }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {/* Active pulse ring */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  animate={{ boxShadow: [`0 0 0 0 ${p.color}30`, `0 0 0 6px ${p.color}00`] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              <span
                className={`relative z-10 text-lg transition-all ${isActive ? 'scale-110' : ''}`}
                style={{ color: isActive ? p.color : 'var(--muted-color)' }}
              >
                {p.icon}
              </span>
              <span className={`relative z-10 text-[8px] font-black uppercase tracking-wider leading-tight ${
                isActive ? 'text-[var(--text-color)]' : 'text-[var(--muted-color)]'
              }`}>
                {p.name}
              </span>
              {/* Hint tooltip on hover */}
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative z-10 text-[7px] font-bold opacity-60 leading-tight mt-0.5"
                  style={{ color: p.color }}
                >
                  {p.hint}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default PlatformSelector;
