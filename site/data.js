// Every line, stop and flag on the site. Facts come from source_material/; nothing here is invented.

const GH = 'https://github.com/kushagrab21/';
const LI = 'https://www.linkedin.com/feed/update/urn:li:activity:';
// Screen sizes each product block has been checked at by its own builder. The shell renders a block at one of these and scales it.
const LAPTOPS = [[1209, 628], [1366, 768], [1440, 900]];

export const LINES = {
  built:    { name: 'Things I built', colour: '#e07a5f', stops: ['intro', 'tome', 'adsp', 'followthrough'] },
  research: { name: 'Research',       colour: '#4fb0a5', stops: ['followthrough', 'finding', 'papers', 'earlier', 'who'] },
  writing:  { name: 'Writing',        colour: '#a98bd8', stops: ['followthrough', 'w-articles', 'w-all'] },
};

// The ride the site takes by itself. A change of line happens only where the two lines really meet.
export const TOUR = [
  { stop: 'intro', line: 'built' },
  { stop: 'tome', line: 'built' },
  { stop: 'adsp', line: 'built' },
  { stop: 'followthrough', line: 'built' },
  { stop: 'finding', line: 'research' },
  { stop: 'who', line: 'research' },
];

export const STOPS = {
  // The journey begins in a cinema with the user's introduction film (85 s, from video_build/intro/), built in ../cinema/.
  // Dwell: the 5 s arrival, the film, and a few seconds for the end.
  intro: {
    name: 'Introduction', gloss: 'a short film', kind: 'block', src: '../cinema/?stop=intro', sizes: LAPTOPS, dwell: 96, poster: 'img/poster-intro.jpg',
    flags: [],
  },
  tome: {
    name: 'Tome', gloss: 'textbook → lesson', kind: 'block', src: '../tome/', sizes: [[1440, 900]], dwell: 70, poster: 'img/poster-tome.jpg',
    flags: [
      { label: 'Watch the whole app', href: 'https://youtu.be/3Ndfqpeo_8o' },
      { label: 'Code', href: GH + 'tome' },
    ],
  },
  adsp: {
    name: 'ADSP', gloss: 'spreadsheet → answer', kind: 'block', src: '../adsp/', sizes: LAPTOPS, dwell: 48, poster: 'img/poster-adsp.jpg',
    flags: [
      { label: 'Watch the deployed version', href: 'https://www.youtube.com/watch?v=K23TB9MUVrQ' },
      { label: 'On my resume', href: 'resume.html#adsp', line: 'resume' },
    ],
  },
  followthrough: {
    name: 'Followthrough', gloss: 'email → updated documents', kind: 'block', src: '../followthrough/', sizes: LAPTOPS, dwell: 70, poster: 'img/poster-followthrough.jpg',
    flags: [
      { label: 'Why it was sent back: my research', to: 'finding', line: 'research' },
      { label: 'My post about building it', href: LI + '7504440629138116608/' },
      { label: 'Posts and articles', to: 'w-articles', line: 'writing' },
      { label: 'Code', href: GH + 'followthrough' },
      { label: 'Also built', flap: 'also' },
    ],
  },
  // The four research stations are blocks built in ../research/<station>/; dwell and band links come from each one's stage-3 "For the shell".
  finding: {
    name: 'The finding', gloss: 'when an AI says "done"', kind: 'block', src: '../research/finding/', sizes: LAPTOPS, dwell: 50, poster: 'img/poster-finding.jpg',
    lines: ['73 of 74 wrong "done" claims', 'came at the same moment'],
    flags: [
      { label: 'The papers', to: 'papers' },
      { label: 'The paper (PDF)', href: '../research/papers/assets/paper-2.pdf' },
      { label: 'My posts about it', to: 'w-all', line: 'writing' },
    ],
  },
  papers: {
    name: 'The papers', gloss: '2026', kind: 'block', src: '../research/papers/', sizes: LAPTOPS, dwell: 52, poster: 'img/poster-papers.jpg',
    lines: ['Two papers and a benchmark', 'on when an AI is really finished'],
    flags: [
      { label: 'Paper 1', href: '../research/papers/assets/paper-1.pdf' },
      { label: 'Paper 2', href: '../research/papers/assets/paper-2.pdf' },
      { label: 'Earlier work', to: 'earlier' },
    ],
  },
  earlier: {
    name: 'Earlier work', gloss: '2020–2026', kind: 'block', src: '../research/earlier/', sizes: LAPTOPS, dwell: 68, poster: 'img/poster-earlier.jpg',
    lines: ['IEEE Best Paper 2025', 'a Routledge chapter, and more'],
    flags: [{ label: 'The finding', to: 'finding' }],
  },
  who: {
    name: 'Who made this', gloss: 'Kushagra Bhatnagar', kind: 'block', src: '../research/who/?v=20261006-who-copy', sizes: LAPTOPS, dwell: 0, poster: 'img/poster-who.jpg',
    lines: ['MSc at NUS · Economics at IIT Kanpur', 'the resume is here'],
    flags: [
      { label: 'Resume', href: 'resume.html', line: 'resume' },
      { label: 'Writing', to: 'w-all', line: 'writing' },
      { label: 'GitHub', href: 'https://github.com/kushagrab21' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kushagra-bhatnagar-6624b410b' },
    ],
  },
  // The Writing line opens with the finished perspective film; every article and post remains in All writing.
  'w-articles': { name: 'Articles', gloss: 'a short film', kind: 'block', src: '../cinema/?stop=w-articles&v=20261006-arrival-audio', sizes: LAPTOPS, dwell: 54, poster: 'img/poster-articles.jpg', lines: ['How I think about AI'], flags: [{ label: 'All my writing', to: 'w-all' }] },
  'w-all':      { name: 'All writing', gloss: 'articles and posts', kind: 'panel', dwell: 25, lines: ['Articles and posts on LinkedIn'], flags: [{ label: 'The finding', to: 'finding', line: 'research' }, { label: 'The packages', flap: 'also' }] },
};

// Which lines each stop sits on, for interchange rings.
export function linesAt(id) {
  return Object.entries(LINES).filter(([, l]) => l.stops.includes(id)).map(([k]) => k);
}

export const PANELS = {
  // The finding, The papers, Earlier work and Who made this are now blocks (../research/); only the "Also built" flap stays a panel.
  also: () => `
    <h3>Also built</h3>
    <ul class="list">
      <li><a href="${GH}SnapRecord" target="_blank" rel="noopener">SnapRecord</a><span>a photo of a form becomes a checked record</span></li>
      <li><a href="https://pypi.org/project/rlang-compiler/" target="_blank" rel="noopener">rlang-compiler</a>, <a href="https://pypi.org/project/semantic-compiler-core/" target="_blank" rel="noopener">semantic-compiler-core</a>, <a href="https://pypi.org/project/bor-sdk/" target="_blank" rel="noopener">bor-sdk</a><span>three Python packages that record every step of a run, so anyone can replay it and check the result · provisional patent filed, Nov 2025</span></li>
      <li>Text to 3D<span>a written description becomes a rendered 3D scene</span></li>
    </ul>`,
};
