import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Layers, PenLine, Gauge, Repeat2, Mic2, Clock, Sparkles } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const idea = "We cut our onboarding from 14 steps to 4 and activation went up.";

const outputs = [
  {
    key: "x",
    label: "X",
    meta: "238 / 280",
    body: "We deleted 10 of our 14 onboarding steps.\n\nNobody missed them. Activation went up.\n\nIf a step doesn't change what someone does next, it's a speed bump.",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    meta: "1,140 chars",
    body: "Our onboarding had 14 steps. Each one made sense on its own, and together they lost us people.\n\nWe asked one question of every step: does this change what the user does next? Ten didn't. We removed them.\n\nActivation went up the following week. The lesson wasn't about onboarding. It was about how easily reasonable decisions stack into an unreasonable experience.",
  },
  {
    key: "email",
    label: "Email",
    meta: "Subject + body",
    body: "Subject: The 10 steps we deleted\n\nHi there,\n\nLast month we cut onboarding from 14 steps to 4. Here is how we decided which ones to keep, and what happened to activation after.",
  },
  {
    key: "tiktok",
    label: "TikTok",
    meta: "Hook · body · CTA",
    body: "Hook: We deleted most of our product's onboarding.\n\nBody: 14 steps down to 4. Here's the one question we asked of every step.\n\nCTA: Follow for part two, where we show the numbers.",
  },
];

const platforms = ["X", "LinkedIn", "Instagram", "TikTok", "Email", "Blog", "Ad copy"];

const features = [
  { icon: PenLine, title: "Written for the platform", body: "Length, format and hook are set per platform, so a thread reads like a thread and an email reads like an email." },
  { icon: Mic2, title: "Your voice, saved", body: "Describe how you write once. Every draft after that starts from it." },
  { icon: Repeat2, title: "Repurpose in one pass", body: "Paste a post or an article and get versions for the other platforms you use." },
  { icon: Gauge, title: "A second opinion", body: "Each draft gets a short read on its hook, clarity and length before you post it." },
  { icon: Clock, title: "When to post", body: "A suggested time for each platform, based on when your audience tends to read." },
  { icon: Layers, title: "Campaigns, not one-offs", body: "Plan a run of posts around one launch or idea and keep them consistent." },
];

const steps = [
  { title: "Write the idea", body: "A sentence or two is enough. Say what happened and why it matters." },
  { title: "Pick the platforms", body: "Choose where it should go and the tone it should take." },
  { title: "Edit and post", body: "Adjust the drafts, copy them out, and keep the ones you like in your library." },
];

const tone = ["1", "2", "3"] as const;

/* ---------- Hero graphic: one idea fanning out into three drafts ---------- */

const fanPaths = [
  "M200 92 C200 150, 70 150, 70 214",
  "M200 92 C200 150, 200 150, 200 214",
  "M200 92 C200 150, 330 150, 330 214",
];

const fanCards = [
  { label: "X", meta: "238 / 280", line: "We deleted 10 of our 14 onboarding steps." },
  { label: "LinkedIn", meta: "1,140 chars", line: "Each step made sense on its own." },
  { label: "Email", meta: "Subject", line: "The 10 steps we deleted" },
];

const FanOut: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto aspect-[400/380] w-full max-w-[520px]" aria-hidden="true">
      <svg viewBox="0 0 400 380" className="absolute inset-0 h-full w-full overflow-visible">
        {fanPaths.map((d, i) => (
          <g key={d}>
            <motion.path
              d={d}
              fill="none"
              stroke={`var(--c${i + 1})`}
              strokeWidth={3}
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease, delay: 0.5 + i * 0.15 }}
            />
            {!reduce && (
              <circle r={5} fill={`var(--c${i + 1})`} stroke="var(--surface-solid)" strokeWidth={2}>
                <animateMotion dur="2.6s" begin={`${1.4 + i * 0.45}s`} repeatCount="indefinite" path={d} />
              </circle>
            )}
          </g>
        ))}
      </svg>

      {/* Idea card */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.2 }}
        className="glass-panel absolute left-1/2 top-0 w-[78%] -translate-x-1/2 overflow-hidden rounded-2xl"
      >
        <div className="tri-edge h-1.5 w-full" />
        <div className="p-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs text-[var(--faint-color)]">
            <Sparkles size={13} strokeWidth={1.75} /> Idea
          </p>
          <p className="text-sm leading-snug text-[var(--text-color)]">{idea}</p>
        </div>
      </motion.div>

      {/* Draft cards */}
      <div className="absolute inset-x-0 top-[56.5%] grid grid-cols-3 gap-2.5 sm:gap-3">
        {fanCards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -6, 0] }}
            transition={
              reduce
                ? undefined
                : {
                    opacity: { duration: 0.5, delay: 1.1 + i * 0.15 },
                    y: { duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: 1.1 + i * 0.15 },
                  }
            }
            className={`tile-${i + 1} rounded-xl p-3 shadow-[var(--shadow-card)] sm:p-3.5`}
          >
            <div className="mb-2 flex items-center justify-between gap-1">
              <span className="text-xs font-semibold sm:text-[13px]">{c.label}</span>
              <span className="hidden font-mono text-[11px] opacity-80 sm:inline">{c.meta}</span>
            </div>
            <p className="text-[12px] leading-snug sm:text-[13px]">{c.line}</p>
            <div className="mt-3 space-y-1.5">
              <span className="block h-1.5 w-full rounded-full bg-current opacity-20" />
              <span className="block h-1.5 w-2/3 rounded-full bg-current opacity-20" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Studio preview ---------- */

const Preview: React.FC = () => {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % outputs.length), 4200);
    return () => window.clearInterval(id);
  }, [reduce, paused]);

  const current = outputs[active];
  const t = tone[active % 3];

  return (
    <div
      className="glass-panel overflow-hidden rounded-2xl text-left"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="frost flex items-center gap-2 border-b border-[var(--hairline)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--c1)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--c2)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--c3)]" />
        <span className="ml-3 font-mono text-xs text-[var(--faint-color)]">postl / studio</span>
      </div>

      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-5 border-b border-[var(--hairline)] p-5 md:border-b-0 md:border-r">
          <div>
            <p className="mb-2 text-xs text-[var(--faint-color)]">Idea</p>
            <p className="text-sm leading-relaxed text-[var(--text-color)]">{idea}</p>
          </div>
          <div>
            <p className="mb-2 text-xs text-[var(--faint-color)]">Platforms</p>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Preview platform">
              {outputs.map((o, i) => (
                <button
                  key={o.key}
                  role="tab"
                  aria-selected={i === active}
                  onClick={() => setActive(i)}
                  className={`relative h-8 rounded-lg px-3 text-sm transition-colors duration-150 ${
                    i === active ? `tile-${tone[i % 3]}` : "text-[var(--muted-color)] hover:bg-[var(--surface-2)] hover:text-[var(--text-color)]"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-[var(--faint-color)]">Tone</p>
            <p className="text-sm text-[var(--muted-color)]">Plain, specific, a little dry</p>
          </div>
          {/* progress through the drafts */}
          <div className="flex gap-1.5" aria-hidden="true">
            {outputs.map((o, i) => (
              <span key={o.key} className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--hairline)]">
                {i === active && (
                  <motion.span
                    key={`${o.key}-${paused}`}
                    className="block h-full rounded-full"
                    style={{ background: `var(--c${tone[i % 3]})` }}
                    initial={{ width: reduce || paused ? "100%" : "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: reduce || paused ? 0 : 4.2, ease: "linear" }}
                  />
                )}
                {i < active && <span className="block h-full w-full rounded-full" style={{ background: `var(--c${tone[i % 3]})`, opacity: 0.5 }} />}
              </span>
            ))}
          </div>
        </div>

        <div className="flex min-h-[300px] flex-col p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className={`rounded-md px-2 py-0.5 text-xs soft-${t}`}>Draft · {current.label}</p>
            <p className="font-mono text-xs tabular-nums text-[var(--faint-color)]">{current.meta}</p>
          </div>
          <div className="relative flex-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={current.key}
                initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? undefined : { opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease }}
                className="whitespace-pre-line text-[15px] leading-relaxed text-[var(--text-color)]"
              >
                {current.body}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-[var(--hairline)] pt-4 text-xs text-[var(--muted-color)]">
            <span className="tile-2 grid h-5 w-5 place-items-center rounded-full">
              <Check size={12} strokeWidth={2.5} />
            </span>
            Hook, length and format checked
          </div>
        </div>
      </div>
    </div>
  );
};

// Scroll reveals are drawn by the Meridian engine (src/hooks/useMeridian.ts),
// so this wrapper only groups content into one scan target.
const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className }) => (
  <div className={className}>{children}</div>
);

const headlineA = ["Write", "it"];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const word = (w: string, i: number) => (
    <motion.span
      key={w + i}
      className="inline-block"
      initial={reduce ? false : { opacity: 0, y: "0.4em" }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease, delay: 0.08 * i }}
    >
      {w}
    </motion.span>
  );

  return (
    <div className="min-h-screen text-[var(--text-color)]">
      {/* Hero */}
      <section data-meridian-ignore className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-28 sm:px-6 md:pt-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <div>
          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--hairline-strong)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--muted-color)] backdrop-blur"
          >
            <span className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-[var(--c1)]" />
              <span className="h-2 w-2 rounded-full bg-[var(--c2)]" />
              <span className="h-2 w-2 rounded-full bg-[var(--c3)]" />
            </span>
            One idea, seven platforms
          </motion.p>
          <h1 className="text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
            <span className="flex flex-wrap gap-x-[0.25em]">
              {headlineA.map(word)}
              <motion.span
                className="inline-block"
                initial={reduce ? false : { opacity: 0, y: "0.4em" }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease, delay: 0.16 }}
              >
                <span className="proof-mark">once</span>.
              </motion.span>
            </span>
            <motion.span
              className="mt-1 block text-[var(--muted-color)]"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease, delay: 0.3 }}
            >
              Post it everywhere it belongs.
            </motion.span>
          </h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.4 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-[var(--muted-color)] sm:text-lg"
          >
            POSTL turns one idea into drafts for X, LinkedIn, email and more, each shaped for where it will be read and written in your voice.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.5 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <button
              onClick={() => navigate("/signup")}
              className="btn-shine inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 text-sm font-medium text-[var(--accent-contrast)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[var(--accent-hover)]"
            >
              Start writing, free
              <ArrowRight size={16} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-2)] px-5 text-sm text-[var(--text-color)] backdrop-blur transition-colors duration-150 hover:bg-[var(--surface)]"
            >
              Open the studio
            </button>
          </motion.div>
        </div>

        <FanOut />
      </section>

      {/* Platforms ticker: three equal bands */}
      <section data-meridian-ignore className="relative overflow-hidden" aria-label="Writes for">
        <div className="grid grid-cols-3 text-sm">
          {tone.map((t) => (
            <div key={t} className={`tile-${t} h-12`} />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center overflow-hidden">
          <div className="animate-ticker flex shrink-0 gap-10 whitespace-nowrap pl-10">
            {[...platforms, ...platforms, ...platforms, ...platforms].map((p, i) => (
              <span key={p + i} className="flex items-center gap-10 font-medium text-[var(--text-color)] mix-blend-normal">
                <span className="rounded-md bg-[var(--surface-solid)] px-2.5 py-1 shadow-sm">{p}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Studio preview */}
      <section className="mx-auto max-w-5xl px-4 pt-20 sm:px-6">
        <Reveal className="mb-8 max-w-xl">
          <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">The same idea, four ways</h2>
          <p className="mt-3 text-[var(--muted-color)]">Pick a platform to see its draft. Hover to pause.</p>
        </Reveal>
        <Reveal>
          <Preview />
        </Reveal>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
        <Reveal className="mb-12 max-w-xl">
          <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">The parts of posting that take the longest</h2>
          <p className="mt-3 text-[var(--muted-color)]">Rewriting the same thing four times, keeping it sounding like you, and deciding when it should go out.</p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const t = tone[i % 3];
            return (
              <Reveal key={f.title} delay={i * 0.05}>
                <div className="glass-panel lift-card relative h-full overflow-hidden rounded-2xl p-6">
                  <span className="lift-edge absolute inset-x-0 top-0 h-1" style={{ background: `var(--c${t})` }} />
                  <span className={`tile-${t} grid h-10 w-10 place-items-center rounded-xl`}>
                    <f.icon size={18} strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 text-[15px] font-medium">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-color)]">{f.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <Reveal className="mb-10">
          <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">How it works</h2>
        </Reveal>
        <ol className="relative grid gap-8 md:grid-cols-3">
          <motion.span
            aria-hidden="true"
            className="tri-edge absolute left-0 right-0 top-[18px] hidden h-1 origin-left rounded-full md:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.2, ease }}
          />
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={0.2 + i * 0.25}>
              <li className="relative">
                <span className={`tile-${tone[i]} relative grid h-10 w-10 place-items-center rounded-full font-mono text-sm font-medium tabular-nums ring-4 ring-[var(--bg-color)]`}>
                  {i + 1}
                </span>
                <h3 className="mt-4 text-[15px] font-medium">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-color)]">{s.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <Reveal className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 grid grid-cols-3" aria-hidden="true">
            <div className="bg-[var(--c1)]" />
            <div className="bg-[var(--c2)]" />
            <div className="bg-[var(--c3)]" />
          </div>
          <div className="relative m-2 rounded-[20px] bg-[var(--surface-solid)] px-6 py-14 text-center sm:m-3 sm:px-12">
            <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
              Bring the idea you've been <span className="proof-mark">sitting on</span>.
            </h2>
            <p className="mt-3 text-[var(--muted-color)]">Free to start. No card needed.</p>
            <button
              onClick={() => navigate("/signup")}
              className="btn-shine mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 text-sm font-medium text-[var(--accent-contrast)] transition-transform duration-150 hover:-translate-y-0.5"
            >
              Create an account
              <ArrowRight size={16} strokeWidth={1.75} />
            </button>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="frost border-t border-[var(--hairline)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-8 text-sm text-[var(--faint-color)] sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="relative grid h-6 w-6 place-items-center overflow-hidden rounded-md font-mono text-xs font-medium">
              <span className="absolute inset-0 grid grid-cols-3">
                <span className="bg-[var(--c1)]" />
                <span className="bg-[var(--c2)]" />
                <span className="bg-[var(--c3)]" />
              </span>
              <span className="relative rounded-sm bg-[var(--surface-solid)] px-1 leading-4 text-[var(--text-color)]">P</span>
            </span>
            <span className="text-[var(--text-color)]">POSTL</span>
          </div>
          <span>Made by Vardaan</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;
