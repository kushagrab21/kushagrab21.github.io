// The sole store of factual copy. Paths are relative to Personal_Website.
import { spaceDots } from './typography.js';
export const sources = {
  resume: { path: 'source_material/01_Resume/Resume_Aug_2026.pdf', location: 'page 1, Systems and Research and Publications' },
  links: { path: 'source_material/LINKS_AND_PROFILES.md', location: 'Publications; Packages on PyPI; GitHub repositories worth citing' },
  assumptions: { path: 'research_line_drill/earlier/ASSUMPTIONS.md', location: 'assumptions 2–4 and accepted defaults' },
  bor: { path: 'source_material/04_Research_and_Experiments/Blockchain_of_Reasoning/Blockchain_of_reasoning_whitepaper.pdf', location: 'page 1 Figure 1; pages 2–4, replay and worked example' },
  ram: { path: 'source_material/04_Research_and_Experiments/RAM_Cognitive_Architecture/ram_cognitive_architecture_complete.pdf', location: 'page 1, author and October 2025 date' },
  spar: { path: 'source_material/04_Research_and_Experiments/SPAR_Incentive_Bias_in_LLM_Estimates/Study1_exec_summary.md', location: 'The setup; The finding' },
  packet: { path: 'source_material/04_Research_and_Experiments/SPAR_Incentive_Bias_in_LLM_Estimates/SPAR_combined_application_packet.md', location: 'opening line, dated 2026-09-05, Model Forensics SPAR take-home' },
  starter: { path: 'source_material/04_Research_and_Experiments/SPAR_Incentive_Bias_in_LLM_Estimates/README.md', location: 'Upstream harness: programme-provided code used unmodified' },
};
export const facts = {
  covidYear: { value: 2020, sources: ['resume', 'links'] },
  reads: { value: 50000, qualifier: 'over', sources: ['resume', 'links'], limit: 'Résumé-reported; not a live ResearchGate count.' },
  wirelessYear: { value: 2025, sources: ['resume', 'links'] },
  tradeYear: { value: 2025, sources: ['resume', 'links'] },
  scenarios: { value: 4, sources: ['assumptions'] },
  whitepapers: { value: 2, sources: ['resume', 'bor', 'ram'] },
  packages: { value: 3, sources: ['resume', 'links'] },
  replayYear: { value: 2025, sources: ['bor', 'ram'] },
  patentYear: { value: 2025, sources: ['resume'], qualifier: 'provisional patent filed in India, Nov' },
  findingYear: { value: 2026, sources: ['links'] },
  sparYear: { value: 2026, sources: ['packet'], qualifier: 'Sep' },
  models: { value: 10, sources: ['spar'] },
  award: { value: 'IEEE Best Paper Award', sources: ['resume', 'links'], limit: 'Recorded on the résumé; no award certificate is held locally.' },
};
const n = id => facts[id].value;
export const pieces = [
  {
    id: 'covid', field: 'COVID-19 model', short: 'An epidemic', year: String(n('covidYear')),
    badge: `${n('reads').toLocaleString('en-US')}+ reads`, badgeNote: 'ResearchGate',
    question: 'How fast would COVID-19 spread in India?',
    body: 'A model to predict how fast the cases would grow.',
    credit: `Read over ${n('reads').toLocaleString('en-US')} times on ResearchGate.`,
    title: 'Modeling and Predictions for COVID 19 Spread in India',
    links: [{ label: 'Open the paper', href: 'https://www.researchgate.net/publication/340362418_Modeling_and_Predictions_for_COVID_19_Spread_in_India' }],
    sketch: true, note: 'Sketch of the question · no paper data',
    sources: ['resume', 'links'], numericFacts: ['covidYear', 'reads'],
  },
  {
    id: 'wireless', field: 'Fading phone signals', short: 'Fading signals', year: String(n('wirelessYear')),
    badge: facts.award.value, badgeNote: 'IEEE AIC 2025',
    question: 'What shape does a fading phone signal take?',
    body: 'I let the measurements draw the curve, instead of assuming a textbook shape.',
    credit: 'IEEE AIC 2025 · Best Paper Award',
    title: 'Machine Learning Based Prediction of Wireless Fading Distribution Functions',
    links: [{ label: 'Open the paper', href: 'https://ieeexplore.ieee.org/document/11211944' }],
    sketch: true, note: 'Sketch of the method · no paper data',
    sources: ['resume', 'links', 'assumptions'], numericFacts: ['wirelessYear'],
  },
  {
    id: 'trade', field: 'Trade', short: 'Trade', year: String(n('tradeYear')),
    badge: 'Routledge chapter', badgeNote: 'with Prof. Somesh K. Mathur and co-authors',
    question: 'What if India and Japan joined ASEAN?',
    body: 'We compared four what-ifs for ASEAN, the Southeast Asian trade bloc.',
    credit: 'with Prof. Somesh K. Mathur and co-authors',
    title: 'Re-imagining ASEAN: Analysing the Trade Effects of India and Japan’s Participation in the ASEAN Framework Using a Structural Gravity Model',
    links: [{ label: 'Open the chapter', href: 'https://doi.org/10.4324/9781003628828-14' }],
    sketch: true, note: 'Sketch of the question · no trade volumes',
    sources: ['resume', 'links', 'assumptions'], numericFacts: ['tradeYear', 'scenarios'],
  },
  {
    id: 'replay', field: 'Replayable code', short: 'Replayable code', year: String(n('replayYear')),
    badge: `${n('whitepapers')} whitepapers · ${n('packages')} packages`, badgeNote: 'Provisional patent filed · India, Nov 2025',
    question: 'Can someone rerun my program, step for step?',
    body: 'I made each step leave a fingerprint. Replay the same inputs and rules, then compare the fingerprints.',
    dateLabel: 'Oct–Nov 2025 · replayable code',
    // H0 application answers, Sep 2026, (4): "I tried to freeze the reasoning rules ... real reasoning is too probabilistic ... now ... verify the output"
    credit: 'Later I found an AI’s reasoning too unpredictable for fixed rules, so now I check its output with them instead.',
    title: 'Blockchain of Reasoning; The RAM Cognitive Architecture',
    detailTitle: 'Blockchain of Reasoning; the Reasoning, Adaptive and Metacognitive Cognitive Architecture',
    links: [{ label: 'BoR', name: 'Blockchain of Reasoning', href: 'https://doi.org/10.5281/zenodo.17525451' }, { label: 'RAM', name: 'A design for repeatable machine reasoning', href: 'https://doi.org/10.5281/zenodo.17308295' }],
    sketch: false, note: 'Fingerprints identify the run. Its answer still needs checking.',
    sources: ['resume', 'links', 'bor', 'ram'], numericFacts: ['replayYear', 'whitepapers', 'packages', 'patentYear'],
  },
  {
    id: 'spar', field: 'A bet and an AI’s guess', short: 'A bet and a guess', year: String(n('sparYear')),
    badge: 'AI estimate study', badgeNote: 'Sep 2026 · alongside the papers on checking AI work',
    question: 'Does a charity bet move an AI’s guess?',
    body: `Asked for the total spots on living giraffes, all ${n('models')} models tested moved toward the side that paid the charity.`,
    credit: 'Application take-home for a research programme · built on provided starter code',
    title: 'Incentive bias in LLM estimates',
    detailTitle: 'Incentive bias in large language model estimates',
    links: [{ label: 'SPAR', name: 'Code for the estimate study', href: 'https://github.com/kushagrab21/incentive-bias-in-llm-estimates' }],
    sketch: true, note: 'The positions in this sketch are illustrative.',
    sources: ['spar', 'packet', 'starter', 'links'], numericFacts: ['sparYear', 'models'],
  },
].map(piece => Object.fromEntries(Object.entries(piece).map(([key, value]) => [key, typeof value === 'string' ? spaceDots(value) : value])));
export const finding = {
  id: 'finding', year: String(n('findingYear')), question: 'When an AI says “done”, is it?',
  label: 'The finding', href: '../finding/', sources: ['links'], numericFacts: ['findingYear'],
};
export const closing = 'The first three model the world. The last two check the machine.';
export const stepIds = ['covid', 'wireless', 'trade', 'replay', 'finding', 'spar', 'overview'];
// Count pieces separately from the bridge and closing view, everywhere in navigation.
export const pieceIds = pieces.map(piece => piece.id);
export const extraViews = [{ id: 'finding', label: 'The finding' }, { id: 'overview', label: 'All work' }];
