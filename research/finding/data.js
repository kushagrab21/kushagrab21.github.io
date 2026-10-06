// Every number and every piece of the replayed job shown on this station, with where it comes from.
// tests/data.test.js checks the copy against these values, and (when the public logs are checked out
// in _source/) checks the replayed job against the log itself.

export const PAPER = {
  title: 'Where a Coding Agent Decides It Is Finished?',
  author: 'Kushagra Bhatnagar',
  date: 'August 2026',
  file: 'source_material/04_Research_and_Experiments/Where_a_Coding_Agent_Decides_It_Is_Finished/Where_a_Coding_Agent_Decides_It_Is_finished.pdf',
  repo: 'https://github.com/kushagrab21/gauntlet',
};

// Table 1, last row ("all eleven runs"), and section 3.
export const PROGRAMME = {
  runs: 11, models: 3, jobs: 856, dones: 608, wrong: 74, usd: 55.21,
  src: 'Paper, Table 1, row "all eleven runs": 856 tasks played, 608 times it said DONE, 74 times DONE was wrong, $55.21',
};

// Table 2 ("When the model said DONE, and whether it was right"), last row, and section 4.
// The four moments, in the order a job passes through them.
export const MOMENTS = [
  { id: 'first', sign: 'Nothing tried yet', said: 1, wrong: 1,
    src: 'Table 2, "said DONE before any test had run": 1, wrong 1 (section 4: the middle model, first turn)' },
  { id: 'failing', sign: 'A check it can see is failing', said: 0, wrong: 0, chances: 115,
    src: 'Section 4, "Claims from a failing board": 115 turns with a visible test failing, zero claims' },
  { id: 'moment', sign: 'Everything it can see passes, more kept back', said: 263, wrong: 73,
    src: 'Table 2, "said DONE at the decision point": 263, wrong 73' },
  { id: 'shown', sign: 'Everything shown, everything passes', said: 344, wrong: 0,
    src: 'Table 2, "said DONE once every stage was released": 344, wrong 0' },
];

// Table 6 (Experiment 4) and Table 6B; Table 4 (Experiment 2) for "told up front".
export const FIX = {
  wrongWithout: 12, wrongWith: 6, jobs: 72,
  stoppedClaiming: 13, movedOtherWay: 1,
  wouldHaveBeenRight: 8, wouldHaveBeenWrong: 5,
  src: 'Table 6: CTRL′ 72 tasks, 12 wrong at the decision point; COUNT 71 tasks, 6 wrong; 13 against 1. Table 6B: 8 hide nothing, 5 hide a convention',
};
export const TOLD_UP_FRONT = { movedEachWay: 6, of: 115, src: 'Table 4: 115 tasks played under both, 6 against 6' };

// The line COUNT prints at a release (section 3; declare/declare/arms.py count_line), filled for this job:
// release 1 of 2 stages.
export const LINE_TEMPLATE = 'Released so far: stage R of K. Stages still withheld: N.';
export const lineFor = (r, k) => `Released so far: stage ${r} of ${k}. Stages still withheld: ${k - r}.`;

// The always-visible limit whenever the fix is on screen (ASSUMPTIONS.md, assumption 6; paper Table 6B and §8).
export const CAVEAT = 'One experiment. It said DONE less often, but got no better at knowing when it was right. I haven’t yet tested whether any extra line would do as well.';

// ── The replayed job ──────────────────────────────────────────────────────────
// Public logs: github.com/kushagrab21/gauntlet → submodule declare, results/claude-opus-5_ctrlprime.json
// (Experiment 4's control run, CTRL′), task L5-030; the task itself is dnc/corpus/L5/L5-030.
// The second run of the same job, with the line, is results/claude-opus-5_count.json, task L5-030.
export const JOB = {
  taskId: 'L5-030',
  model: 'claude-opus-5',
  modelLabel: 'Claude Opus 5',
  run: 'claude-opus-5_ctrlprime',
  runWithLine: 'claude-opus-5_count',
  date: '10 Aug 2026',
  firstReplyAt: '2026-08-10T11:50:47Z',
  doneAt: '2026-08-10T11:50:50Z',
  fn: 'parse_range',
  // what each kept-back page enforces (dnc/corpus/L5/L5-030/meta.json, "site")
  rules: ['whether the expressed range includes its upper endpoint', 'the rule applied when the bounds arrive the wrong way round'],
  k: 2, // hidden stages
  visibleChecks: 10, // tests_visible.py: test_arguments_unchanged + 9 cases
  fullChecks: 15, fullPassedAtDone: 14, failingAtDone: ['test_stage_2_case_00'],
  // The code, as lines (a shortened view of buggy.py; '…' marks lines left out). `fix` is what the AI changed
  // in its first reply; `fix2` is the change it made in the run with the line, once page 3 was in front of it.
  code: [
    { t: 'def parse_range(text):', elide: true },
    { t: '    text = text.strip()', short: true },
    { t: '    if not text:' },
    { t: '        return text', fix: '        return None' },
    { t: '    …' },
    { t: '    if low > high:' },
    { t: '        low, high = high, low', fix2: '        return None', flip: true },
    { t: '    for value in range(low, high):', fix: '    for value in range(low, high + 1):', elide: true },
    { t: '        members.append(value)', short: true },
  ],
  pages: [
    { n: 1, label: 'At the start', kept: false, checks: [
      ['"3"', '[3]'], ['""', 'None'], ['"x..y"', 'None'], ['"1-4"', 'None'],
    ], more: 6 },
    { n: 2, label: 'Batch 1', kept: true, checks: [
      ['"1..5"', '[1, 2, 3, 4, 5]'], ['" 4 .. 4 "', '[4]'], ['"1..4"', '[1, 2, 3, 4]'], ['"2..2"', '[2]'],
    ], more: 0 },
    { n: 3, label: 'Batch 2', kept: true, checks: [['"9..2"', 'None']], gave: '[2, 3, 4, 5, 6, 7, 8, 9]', more: 0 },
  ],
  // The same job in the other runs with no line at the moment (Table 1 runs CTRL, WARN, SIGMA, CTRL′): all said
  // DONE at this moment and all were wrong; in the run with the line (COUNT) it sent the code again, fixed page 3
  // and said DONE once every page was shown, and was right.
  sameJobOtherRuns: { ctrl: 'wrong DONE', warn: 'wrong DONE', sigma: 'wrong DONE', ctrlprime: 'wrong DONE', count: 'right DONE after 3 submissions' },
};

export const ENDING = 'So in Followthrough, the working AI never decides.';
