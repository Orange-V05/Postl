const CHECKS = [
  { key: 'subject', max: 20, test: (r) => r.prompt.trim().split(/\s+/).length >= 2, missing: 'clear subject', suggestion: 'State the exact subject or idea you want to communicate.' },
  { key: 'audience', max: 15, test: (r) => Boolean(r.audience), missing: 'target audience', suggestion: 'Name who this content is for.' },
  { key: 'outcome', max: 15, test: (r) => Boolean(r.objective), missing: 'desired outcome', suggestion: 'Choose the business or content objective.' },
  { key: 'context', max: 15, test: (r) => r.prompt.length > 80 || Boolean(r.constraints), missing: 'relevant context', suggestion: 'Add background, offer details, or constraints.' },
  { key: 'differentiator', max: 10, test: (r) => /unique|different|unlike|only|because|advantage/i.test(`${r.prompt} ${r.constraints}`), missing: 'differentiator', suggestion: 'Explain what makes this perspective, brand, or offer different.' },
  { key: 'evidence', max: 10, test: (r) => /\d|case study|example|proof|data|result/i.test(r.prompt), missing: 'evidence or example', suggestion: 'Add a number, example, proof point, or lived experience.' },
  { key: 'cta', max: 10, test: (r) => Boolean(r.callToAction), missing: 'call to action', suggestion: 'Add what the reader should do next.' },
  { key: 'constraints', max: 5, test: (r) => Boolean(r.constraints), missing: 'constraints', suggestion: 'Mention required words, avoided claims, length, or compliance notes.' },
];

export function analyzeBrief(request) {
  const factors = CHECKS.map((check) => {
    const passed = check.test(request);
    return { key: check.key, score: passed ? check.max : 0, max: check.max, explanation: passed ? 'Present in the brief.' : `Missing ${check.missing}.` };
  });
  const score = factors.reduce((sum, f) => sum + f.score, 0);
  const missing = CHECKS.filter((c) => !c.test(request)).map((c) => c.missing);
  const suggestions = CHECKS.filter((c) => !c.test(request)).map((c) => c.suggestion).slice(0, 4);
  const status = score >= 85 ? 'complete' : score >= 65 ? 'strong' : score >= 40 ? 'usable' : 'idea';
  return { score, maxScore: 100, status, missing, suggestions, factors };
}
