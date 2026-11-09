import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Layers, PenLine, Gauge, Repeat2, Mic2, Clock } from "lucide-react";

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

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[var(--hairline-strong)] bg-[var(--surface)] text-left"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center gap-2 border-b border-[var(--hairline)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--hairline-strong)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--hairline-strong)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--hairline-strong)]" />
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
                  className={`h-8 rounded-lg border px-3 text-sm transition-colors duration-150 ${
                    i === active
                      ? "border-[var(--hairline-strong)] bg-[var(--surface-2)] text-[var(--text-color)]"
                      : "border-transparent text-[var(--muted-color)] hover:text-[var(--text-color)]"
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
        </div>

        <div className="flex min-h-[300px] flex-col p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-[var(--faint-color)]">Draft · {current.label}</p>
            <p className="font-mono text-xs tabular-nums text-[var(--faint-color)]">{current.meta}</p>
          </div>
          <div className="relative flex-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={current.key}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease }}
                className="whitespace-pre-line text-[15px] leading-relaxed text-[var(--text-color)]"
              >
                {current.body}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-[var(--hairline)] pt-4 text-xs text-[var(--muted-color)]">
            <Check size={14} strokeWidth={2} className="text-[var(--accent-primary)]" />
            Hook, length and format checked
          </div>
        </div>
      </div>
    </div>
  );
};

const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.5, ease, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)]">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-32 sm:px-6 md:pt-40">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <h1 className="text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            Write it <span className="proof-mark">once</span>.
            <span className="block text-[var(--muted-color)]">Post it everywhere it belongs.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--muted-color)] sm:text-lg">
            POSTL turns one idea into drafts for X, LinkedIn, email and more, each shaped for where it will be read and written in your voice.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/signup")}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--text-color)] px-5 text-sm font-medium text-[var(--bg-color)] transition-opacity duration-150 hover:opacity-85"
            >
              Start writing, free
              <ArrowRight size={16} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex h-11 items-center rounded-lg border border-[var(--hairline-strong)] px-5 text-sm text-[var(--text-color)] transition-colors duration-150 hover:bg-[var(--surface-2)]"
            >
              Open the studio
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
          className="mt-16"
        >
          <Preview />
        </motion.div>
      </section>

      {/* Platforms */}
      <section className="border-y border-[var(--hairline)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm sm:px-6">
          <span className="text-[var(--faint-color)]">Writes for</span>
          {platforms.map((p) => (
            <span key={p} className="text-[var(--muted-color)]">{p}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
        <Reveal className="mb-12 max-w-xl">
          <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">The parts of posting that take the longest</h2>
          <p className="mt-3 text-[var(--muted-color)]">Rewriting the same thing four times, keeping it sounding like you, and deciding when it should go out.</p>
        </Reveal>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--hairline)] sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.04} className="bg-[var(--surface)] p-6">
              <f.icon size={18} strokeWidth={1.75} className="text-[var(--accent-primary)]" />
              <h3 className="mt-4 text-[15px] font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-color)]">{f.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <Reveal className="mb-10">
          <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">How it works</h2>
        </Reveal>
        <ol className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <li className="border-t border-[var(--hairline-strong)] pt-5">
                <span className="font-mono text-xs tabular-nums text-[var(--faint-color)]">0{i + 1}</span>
                <h3 className="mt-3 text-[15px] font-medium">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-color)]">{s.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <Reveal className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">Bring the idea you've been sitting on.</h2>
          <p className="mt-3 text-[var(--muted-color)]">Free to start. No card needed.</p>
          <button
            onClick={() => navigate("/signup")}
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 text-sm font-medium text-[var(--accent-contrast)] transition-colors duration-150 hover:bg-[var(--accent-hover)]"
          >
            Create an account
            <ArrowRight size={16} strokeWidth={1.75} />
          </button>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--hairline)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-8 text-sm text-[var(--faint-color)] sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--accent-primary)] font-mono text-xs font-medium text-[var(--accent-contrast)]">P</span>
            <span className="text-[var(--text-color)]">POSTL</span>
          </div>
          <span>Made by Vardaan</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;
