// The displayed numbers come from these primary sources, not the design drill.
// PDF text in evidence/ was extracted with pdftotext -layout. PDF copies are byte-identical.
export const sources = Object.freeze({
  paper1: 'source_material/04_Research_and_Experiments/Who_Decides_When_the_Task_Is_Done/Paper_Who_Decides_When_the_Task_Is_Done.pdf',
  paper2: 'source_material/04_Research_and_Experiments/Where_a_Coding_Agent_Decides_It_Is_Finished/Where_a_Coding_Agent_Decides_It_Is_finished.pdf',
  links: 'source_material/LINKS_AND_PROFILES.md',
});

export const papers = Object.freeze({
  first: {
    title: 'Who Decides When the Task Is Done?',
    subtitle: 'Measuring the Effect of Moving Completion Authority from LLMs to Checkers',
    date: 'July 2026', venue: 'Preprint, shared openly before peer review', pdf: './assets/paper-1.pdf',
    doi: 'https://doi.org/10.5281/zenodo.21698264',
    code: 'https://github.com/kushagrab21/binding-feedback-experiment',
    source: `${sources.paper1}, title page; venue: ASSUMPTIONS.md; DOI also in ${sources.links}`,
  },
  second: {
    title: 'Where a Coding Agent Decides It Is Finished?',
    date: 'August 2026', venue: 'Preprint, shared openly before peer review', pdf: './assets/paper-2.pdf',
    doi: 'https://doi.org/10.5281/zenodo.21917996',
    code: 'https://github.com/kushagrab21/gauntlet',
    source: `${sources.paper2}, title page; DOI and repository: ${sources.links}; venue: ASSUMPTIONS.md`,
  },
});

const fact = (value, source) => Object.freeze({ value, source });
export const facts = Object.freeze({
  firstRuns: fact(2862, `${sources.paper1}, abstract p.1 and conclusion p.18`),
  firstModels: fact(7, `${sources.paper1}, abstract p.1, Table 2 p.8`),
  firstProviders: fact(5, `${sources.paper1}, abstract p.1`),
  firstCostUpperBoundUSD: fact(1, `${sources.paper1}, abstract p.1: under one dollar`),
  firstTasks: fact(97, `${sources.paper1}, section 3 p.3; this is NOT GAUNTLET`),
  firstPredictions: fact(4, `${sources.paper1}, section 5 pp.8–10, confirmatory only`),
  firstFailed: fact(3, `${sources.paper1}, section 5 p.10, confirmatory only`),
  weakestP: fact(0.61, `${sources.paper1}, Table 2 p.8, not statistically significant`),
  gauntletTasks: fact(452, `${sources.paper2}, section 3 p.4; name: ASSUMPTIONS.md and ${sources.links}`),
  secondCorpusTasks: fact(159, `${sources.paper2}, section 3 p.4`),
  secondWorkingTasks: fact(119, `${sources.paper2}, section 3 p.4`),
  secondRuns: fact(856, `${sources.paper2}, abstract p.1 and Table 1 p.6`),
  secondModels: fact(3, `${sources.paper2}, abstract p.1`),
  secondCostUSD: fact(55.21, `${sources.paper2}, abstract p.1 and Table 1 p.6; excludes calibration`),
  wrongAtMoment: fact(73, `${sources.paper2}, abstract p.1, Table 2 p.8; across BOTH corpora`),
  wrongTotal: fact(74, `${sources.paper2}, abstract p.1, Table 2 p.8; across BOTH corpora`),
  secondPredictions: fact(14, `${sources.paper2}, Table 8 p.26`),
  secondHeld: fact(8, `${sources.paper2}, Table 8 p.26`),
  secondFailed: fact(5, `${sources.paper2}, Table 8 p.26`),
  secondNeither: fact(1, `${sources.paper2}, Table 8 p.26`),
});

// Exact order, labels, gains and task counts from paper 1 Table 2, p.8.
export const models = Object.freeze([
  { name: 'GPT-4.1', label: ['GPT-4.1'], gain: 0.0, advisory: 87, binding: 87 },
  { name: 'Gemini-2.5-Flash-Lite', label: ['Gemini 2.5', 'Flash-Lite'], gain: 9.2, advisory: 79, binding: 87 },
  { name: 'GPT-4o-mini', label: ['GPT-4o', 'mini'], gain: 9.2, advisory: 79, binding: 87 },
  { name: 'Claude-3-Haiku', label: ['Claude 3', 'Haiku'], gain: 11.5, advisory: 72, binding: 82 },
  { name: 'Qwen2.5-7B', label: ['Qwen2.5', '7B'], gain: 14.9, advisory: 71, binding: 84 },
  { name: 'Llama-3.1-8B', label: ['Llama 3.1', '8B'], gain: 2.3, advisory: 80, binding: 82 },
  { name: 'Llama-3.2-3B', label: ['Llama 3.2', '3B'], gain: -3.4, advisory: 66, binding: 63 },
].map(model => Object.freeze({ ...model, total: 87, source: `${sources.paper1}, Table 2 p.8` })));

export const copy = Object.freeze({
  opening: "Who should get to say the job is finished: the AI, or the tests that check its work?",
  chartCue: `First, my prediction. Then, results from ${facts.firstModels.value} models.`,
  firstPrediction: 'I expected weaker models to gain more.',
  firstOutcome: 'That didn’t hold. The middle gained most.',
  firstClaim: 'Letting the tests decide helped the middle models most.',
  firstCaveat: 'The strongest model didn’t change. The weakest did slightly worse, but by so little it could be chance.',
  firstBridge: "But I couldn’t see the moment it went wrong.",
  gauntletHeading: 'So I built a test where I control what the AI can see.',
  gauntletBridge: 'Now I could ask where it goes wrong.',
  secondClaim: `${facts.wrongAtMoment.value} of ${facts.wrongTotal.value} wrong “finished” replies came when everything visible passed and more was still hidden.`,
  secondSummary: `${facts.wrongAtMoment.value} of ${facts.wrongTotal.value} wrong claims came after visible tests passed, with more hidden.`,
  counterEffect: 'Printing how many batches of tests were still hidden made the AI say “finished” less often, but it got no better at knowing when it really was.',
  openHeading: 'Still open: one experiment I haven’t run yet.',
  openQuestion: 'Does the hidden-test reminder work because of its words, or just because an extra line is there?',
  lock: 'Before each experiment I saved my predictions, dated, in the project’s public history on GitHub.',
});

// Plain data stays readable; the DOM renderer replaces each dot with a CSS circle.
export const separator = ' · ';
export const separate = (...parts) => parts.join(separator);
export const firstStats = () => separate(`${facts.firstRuns.value.toLocaleString('en-US')} tries`, `${facts.firstModels.value} models from ${facts.firstProviders.value} companies`, `under $${facts.firstCostUpperBoundUSD.value}`);
export const firstMisses = () => `For the main experiment I wrote down ${facts.firstPredictions.value} predictions first, and ${facts.firstFailed.value} turned out wrong.`;
export const secondStats = () => separate(`${facts.secondRuns.value} tries`, `${facts.secondModels.value} models`, `$${facts.secondCostUSD.value.toFixed(2)}`);
export const secondMisses = () => `I wrote down ${facts.secondPredictions.value} predictions first: ${facts.secondHeld.value} came true, ${facts.secondFailed.value} didn’t, and ${facts.secondNeither.value} fell outside what I’d written down.`;
export const gainLabel = gain => gain === 0 ? '0.0' : `${gain > 0 ? '+' : '−'}${Math.abs(gain).toFixed(1)}`;
