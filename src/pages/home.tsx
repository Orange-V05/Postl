import React, { useRef } from "react";
import { FaChevronRight, FaChevronDown, FaRocket, FaTwitter, FaInstagram, FaLinkedin, FaEnvelope, FaPen, FaBullhorn, FaCheck, FaBolt, FaMagic, FaArrowRight } from "react-icons/fa";
import { SiTiktok } from "react-icons/si";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

/* ─── Reusable scroll-reveal wrapper ─────────────────────────────────────────── */
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; direction?: "up" | "left" | "right" }> = ({
  children, delay = 0, direction = "up"
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-80px" });
  const x = direction === "left" ? -60 : direction === "right" ? 60 : 0;
  const y = direction === "up" ? 50 : 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x, y, filter: "blur(10px)" }}
      animate={isInView ? { opacity: 1, x: 0, y: 0, filter: "blur(0px)" } : { opacity: 0, x, y, filter: "blur(10px)" }}
      transition={{ type: "spring", bounce: 0.35, duration: 1, delay }}
    >
      {children}
    </motion.div>
  );
};

/* ─── Animated Counter ───────────────────────────────────────────────────────── */
const Counter: React.FC<{ target: number; suffix: string; label: string }> = ({ target, suffix, label }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-50px" });
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target]);

  return (
    <div ref={ref} className="text-center">
      <span className="font-display text-6xl md:text-8xl font-bold text-[var(--text-color)] tracking-tight">
        {count}{suffix}
      </span>
      <p className="text-[var(--muted-color)] text-sm font-bold uppercase tracking-[0.3em] mt-4">{label}</p>
    </div>
  );
};

/* ─── Platform Card Data ─────────────────────────────────────────────────────── */
const platforms = [
  { icon: <FaTwitter />, name: "Twitter / X", desc: "280 chars • Punchy hooks • Thread mastery", color: "#1DA1F2" },
  { icon: <FaInstagram />, name: "Instagram", desc: "Captions • 20 hashtags • Story scripts", color: "#E4405F" },
  { icon: <FaLinkedin />, name: "LinkedIn", desc: "Thought leadership • Professional narrative", color: "#0A66C2" },
  { icon: <SiTiktok />, name: "TikTok", desc: "Video scripts • Hook-body-CTA • Trending", color: "#00F2EA" },
  { icon: <FaEnvelope />, name: "Email", desc: "Subject lines • Open rate optimization", color: "#F59E0B" },
  { icon: <FaPen />, name: "Blog", desc: "SEO outlines • Long-form content", color: "#8B5CF6" },
  { icon: <FaBullhorn />, name: "Ad Copy", desc: "Direct response • Conversion-focused", color: "#EF4444" },
];

/* ─── Feature Data ───────────────────────────────────────────────────────────── */
const features = [
  { emoji: "🧠", title: "Strategy Engine", desc: "AI-powered content plans with platform-specific growth frameworks and real engagement data." },
  { emoji: "🧬", title: "Brand Voice DNA", desc: "8 distinct tones from Professional to Bold. Every output matches your unique voice." },
  { emoji: "🔬", title: "Content Lab", desc: "One idea → threads, captions, emails, scripts, ad copy. 7 platforms, infinite formats." },
];

/* ─── How It Works Data ──────────────────────────────────────────────────────── */
const steps = [
  { num: "01", title: "Choose Platform", desc: "Select your target platform. POSTL knows the rules, character limits, and viral patterns for each.", icon: "📱" },
  { num: "02", title: "Describe Your Vision", desc: "Type a rough idea — even 2 words work. Our AI expands short prompts into detailed creative briefs.", icon: "✍️" },
  { num: "03", title: "Get Content + Strategy", desc: "Receive platform-optimized content with engagement scores, best posting times, and pro tips.", icon: "🚀" },
];

/* ─── Comparison Data ────────────────────────────────────────────────────────── */
const comparison = [
  { feature: "Platform Optimization", postl: true, chatgpt: false, manual: false },
  { feature: "Engagement Scoring", postl: true, chatgpt: false, manual: false },
  { feature: "Strategy Brief", postl: true, chatgpt: false, manual: true },
  { feature: "Multi-Variant Output", postl: true, chatgpt: false, manual: false },
  { feature: "Brand Tone Control", postl: true, chatgpt: true, manual: true },
  { feature: "Content in < 10 seconds", postl: true, chatgpt: true, manual: false },
  { feature: "Posting Time Insights", postl: true, chatgpt: false, manual: false },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen aurora-bg flex flex-col selection:bg-emerald-500/30 overflow-x-hidden">
      {/* ═══ SECTION 1: HERO ════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6">
        {/* Animated aurora orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.2, 0.08] }}
            transition={{ duration: 12, repeat: Infinity }}
            className="absolute top-[-15%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[150px]"
          />
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 18, repeat: Infinity, delay: 3 }}
            className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[150px]"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.1, 0.03] }}
            transition={{ duration: 15, repeat: Infinity, delay: 6 }}
            className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-cyan-400/8 rounded-full blur-[120px]"
          />
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity as any }} className="relative z-10 text-center max-w-6xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center space-x-3 px-6 py-2 rounded-full glass-panel border-emerald-500/30 shadow-emerald-500/10 mb-6"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Content Intelligence OS v4.0</span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.3 }}
            className="text-[10px] font-bold text-[var(--muted-color)] uppercase tracking-[0.5em] mb-10"
          >
            Imagined by <span className="text-emerald-400">Vardaan</span>
          </motion.p>

          {/* Main headline */}
          <div className="overflow-hidden mb-4">
            <motion.h1
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-[9rem] font-bold text-[var(--text-color)] tracking-tighter leading-[0.85]"
            >
              YOUR CONTENT.
            </motion.h1>
          </div>
          <div className="overflow-hidden mb-12">
            <motion.h1
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-[9rem] font-bold tracking-tighter leading-[0.85]"
            >
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                THEIR ATTENTION.
              </span>
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="text-base sm:text-lg md:text-xl text-[var(--muted-color)] max-w-2xl mx-auto mb-14 leading-relaxed font-medium"
          >
            AI-powered content strategy for every platform.
            From single tweets to viral threads — <span className="text-[var(--text-color)] italic">one engine, infinite formats.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
          >
            <button
              onClick={() => navigate("/signup")}
              className="group relative px-10 sm:px-12 py-5 bg-white text-black rounded-2xl font-bold text-base overflow-hidden transition-all shadow-2xl hover:scale-105 active:scale-95 shadow-white/10 w-full sm:w-auto"
            >
              <span className="relative z-10 flex items-center justify-center font-display">
                GET STARTED FREE
                <FaChevronRight className="ml-3 group-hover:translate-x-2 transition-transform" />
              </span>
              <motion.div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-10 sm:px-12 py-5 glass-panel text-[var(--text-color)] rounded-2xl font-bold text-base hover:bg-[var(--text-color)]/5 transition-all border border-[var(--glass-border)] group font-display w-full sm:w-auto text-center"
            >
              OPEN STUDIO
              <FaRocket className="inline-block ml-3 text-emerald-500 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          style={{ opacity: heroOpacity as any }}
          className="absolute bottom-10 flex flex-col items-center gap-2 pointer-events-none"
        >
          <span className="text-[9px] font-black text-[var(--muted-color)] uppercase tracking-[0.4em]">Scroll</span>
          <FaChevronDown className="text-emerald-500 animate-scroll-bounce" />
        </motion.div>
      </section>

      {/* ═══ SECTION 2: PLATFORM TICKER ═════════════════════════════════════════ */}
      <section className="relative py-8 overflow-hidden border-y border-[var(--glass-border)]">
        <div className="flex animate-ticker whitespace-nowrap">
          {[...platforms, ...platforms].map((p, i) => (
            <div key={i} className="flex items-center gap-3 px-8 text-[var(--muted-color)]">
              <span style={{ color: p.color }} className="text-lg">{p.icon}</span>
              <span className="text-xs font-black uppercase tracking-widest">{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SECTION 3: THE PROBLEM ════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-40 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <Reveal direction="left">
            <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-[var(--text-color)] tracking-tighter leading-[0.9]">
              Every creator<br />
              <span className="text-[var(--muted-color)]">faces the same</span><br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">wall.</span>
            </h2>
          </Reveal>
          <div className="space-y-4">
            {[
              "What do I post today?",
              "How do I grow on this platform?",
              "One idea, but 5 platforms need different formats.",
              "My content sounds generic, not like me.",
              "I don't know the optimal time to post.",
            ].map((pain, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="flex items-start gap-4 p-4 rounded-2xl glass-panel border border-[var(--glass-border)] hover:border-emerald-500/30 transition-all group">
                  <span className="text-emerald-500 font-display font-bold text-lg mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <p className="text-[var(--text-color)] font-medium text-sm sm:text-base leading-relaxed group-hover:text-emerald-400 transition-colors">{pain}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 4: HOW IT WORKS ═══════════════════════════════════════════ */}
      <section className="relative py-24 md:py-40 px-6 bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.5em] mb-4 text-center">How It Works</p>
            <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-[var(--text-color)] tracking-tighter leading-[0.9] text-center mb-16 sm:mb-20">
              Three steps.<br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Infinite content.</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <Reveal key={i} delay={i * 0.15}>
                <motion.div
                  whileHover={{ y: -8 }}
                  className="glass-panel p-8 rounded-[2rem] border border-[var(--glass-border)] hover:border-emerald-500/30 transition-all group relative overflow-hidden h-full"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-3xl">{step.icon}</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">{step.num}</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[var(--text-color)] mb-3 tracking-tight">{step.title}</h3>
                  <p className="text-[var(--muted-color)] text-sm leading-relaxed font-medium">{step.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 5: PLATFORM GRID ══════════════════════════════════════════ */}
      <section className="relative py-24 md:py-40 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.5em] mb-4 text-center">Platform Intelligence</p>
            <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-[var(--text-color)] tracking-tighter leading-[0.9] text-center mb-16 sm:mb-20">
              One engine.<br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Every platform.</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {platforms.map((p, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="glass-panel p-6 sm:p-8 rounded-3xl border border-[var(--glass-border)] hover:border-opacity-50 transition-all group cursor-pointer relative overflow-hidden"
                  style={{ "--platform-color": p.color } as React.CSSProperties}
                >
                  <div className="absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(to right, transparent, ${p.color}40, transparent)` }} />
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all group-hover:scale-110"
                      style={{ background: `${p.color}12`, color: p.color }}>
                      {p.icon}
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--text-color)] tracking-tight">{p.name}</h3>
                  </div>
                  <p className="text-[var(--muted-color)] text-sm font-medium leading-relaxed">{p.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 6: INTELLIGENCE FEATURES ══════════════════════════════════ */}
      <section className="relative py-24 md:py-40 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.5em] mb-4 text-center">Beyond Generation</p>
            <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-[var(--text-color)] tracking-tighter leading-[0.9] text-center mb-16 sm:mb-20">
              True content<br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">intelligence.</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 0.15}>
                <motion.div
                  whileHover={{ y: -10 }}
                  className="glass-panel p-8 sm:p-10 rounded-[2rem] border border-[var(--glass-border)] hover:border-emerald-500/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="text-4xl sm:text-5xl mb-6">{f.emoji}</div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-color)] mb-3 tracking-tight">{f.title}</h3>
                  <p className="text-[var(--muted-color)] text-sm leading-relaxed font-medium">{f.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 7: COMPARISON TABLE ════════════════════════════════════════ */}
      <section className="relative py-24 md:py-40 px-6 bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.5em] mb-4 text-center">Why POSTL</p>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--text-color)] tracking-tighter leading-[0.9] text-center mb-16">
              Built different.
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="glass-panel rounded-3xl border border-[var(--glass-border)] overflow-hidden">
              <div className="grid grid-cols-4 gap-0 text-center">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-[var(--glass-border)]">
                  <span className="text-[9px] font-black text-[var(--muted-color)] uppercase tracking-widest">Feature</span>
                </div>
                <div className="p-4 sm:p-5 border-b border-[var(--glass-border)] bg-emerald-500/5">
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">POSTL</span>
                </div>
                <div className="p-4 sm:p-5 border-b border-[var(--glass-border)]">
                  <span className="text-[9px] font-black text-[var(--muted-color)] uppercase tracking-widest">ChatGPT</span>
                </div>
                <div className="p-4 sm:p-5 border-b border-[var(--glass-border)]">
                  <span className="text-[9px] font-black text-[var(--muted-color)] uppercase tracking-widest">Manual</span>
                </div>

                {/* Rows */}
                {comparison.map((row, i) => (
                  <React.Fragment key={i}>
                    <div className={`p-3 sm:p-4 text-left ${i < comparison.length - 1 ? 'border-b border-[var(--glass-border)]' : ''}`}>
                      <span className="text-xs font-medium text-[var(--text-color)]">{row.feature}</span>
                    </div>
                    <div className={`p-3 sm:p-4 bg-emerald-500/5 ${i < comparison.length - 1 ? 'border-b border-[var(--glass-border)]' : ''}`}>
                      {row.postl ? <FaCheck className="text-emerald-500 mx-auto" /> : <span className="text-[var(--muted-color)]">—</span>}
                    </div>
                    <div className={`p-3 sm:p-4 ${i < comparison.length - 1 ? 'border-b border-[var(--glass-border)]' : ''}`}>
                      {row.chatgpt ? <FaCheck className="text-[var(--muted-color)] mx-auto" /> : <span className="text-[var(--muted-color)]">—</span>}
                    </div>
                    <div className={`p-3 sm:p-4 ${i < comparison.length - 1 ? 'border-b border-[var(--glass-border)]' : ''}`}>
                      {row.manual ? <FaCheck className="text-[var(--muted-color)] mx-auto" /> : <span className="text-[var(--muted-color)]">—</span>}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ SECTION 8: STATS ══════════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-40 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-16">
              <Counter target={10} suffix="K+" label="Posts Generated" />
              <Counter target={7} suffix="" label="Platforms Supported" />
              <Counter target={20} suffix="+" label="Content Formats" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ SECTION 9: FINAL CTA ══════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-40 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <h2 className="font-display text-5xl sm:text-6xl md:text-8xl font-bold text-[var(--text-color)] tracking-tighter leading-[0.85] mb-8">
              Ready to<br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_200%]">
                evolve?
              </span>
            </h2>
            <p className="text-[var(--muted-color)] text-base sm:text-lg mb-12 max-w-xl mx-auto font-medium">
              Stop writing posts. Start building a content empire.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                onClick={() => navigate("/signup")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-12 sm:px-16 py-6 bg-emerald-500 text-white rounded-2xl font-display font-bold text-lg shadow-2xl shadow-emerald-500/30 hover:bg-emerald-400 transition-colors w-full sm:w-auto"
              >
                START FOR FREE
              </motion.button>
              <motion.button
                onClick={() => navigate("/dashboard")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-12 sm:px-16 py-6 glass-panel text-[var(--text-color)] rounded-2xl font-display font-bold text-lg hover:bg-emerald-500/5 transition-colors border border-[var(--glass-border)] w-full sm:w-auto flex items-center justify-center gap-3"
              >
                <FaArrowRight className="text-emerald-500" />
                TRY THE STUDIO
              </motion.button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 py-10 sm:py-12 px-6 sm:px-8 border-t border-[var(--glass-border)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-3 opacity-50">
            <FaRocket className="text-emerald-500" />
            <span className="font-display font-bold tracking-tighter text-[var(--text-color)]">POSTL ENGINE v4.0</span>
          </div>
          <p className="text-[10px] font-black text-[var(--muted-color)] uppercase tracking-[0.4em] text-center">Content Intelligence OS — 2026</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
