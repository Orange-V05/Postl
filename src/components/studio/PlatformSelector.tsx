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
      <label className="block text-xs font-medium text-[var(--muted-color)] mb-3 ml-1">
        Target platform
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {platformOptions.map((p, idx) => {
          const isActive = platform === p.id;
          const tone = (idx % 3) + 1;
          return (
            <motion.button
              key={p.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setPlatform(p.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={`relative flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl border p-3 text-center transition-colors ${
                isActive
                  ? 'border-transparent'
                  : 'border-[var(--input-border)] bg-[var(--input-bg)] hover:border-[var(--hairline-strong)]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="platform-glow"
                  className={`tile-${tone} absolute inset-0 rounded-2xl`}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span
                className="relative z-10 text-lg"
                style={{ color: isActive ? `var(--c${tone}-on)` : 'var(--muted-color)' }}
              >
                {p.icon}
              </span>
              <span
                className="relative z-10 text-xs font-medium leading-tight"
                style={{ color: isActive ? `var(--c${tone}-on)` : 'var(--muted-color)' }}
              >
                {p.name}
              </span>
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative z-10 mt-0.5 text-[11px] leading-tight"
                  style={{ color: `var(--c${tone}-on)` }}
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
