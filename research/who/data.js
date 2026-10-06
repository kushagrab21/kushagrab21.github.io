// Every word and number this station shows, each with the file it comes from.
// Paths are relative to Personal_Website/. Nothing here is invented; the tests check the page against it.
// RES = source_material/01_Resume/Resume_Aug_2026.pdf
// LNK = source_material/LINKS_AND_PROFILES.md
// LI  = source_material/08_LinkedIn/all_posts.txt
// SITE = build/site/data.js (the ride's own one-line glosses)

export const SOURCES = {
  RES: 'source_material/01_Resume/Resume_Aug_2026.pdf',
  LNK: 'source_material/LINKS_AND_PROFILES.md',
  LI: 'source_material/08_LinkedIn/all_posts.txt',
  SITE: 'build/site/data.js',
  USER: 'build/research/DECISIONS.md ("Use the defaults")',
  SPEC: 'research_line_drill/who/ASSUMPTIONS.md',
};

export const HEAD = {
  eyebrow: 'Last stop', // SPEC assumption 1
  title: 'Who made this', // content_style_drill ASSUMPTIONS 6 (accepted 6 Oct as a default): the slogan contradicted PERSON.made. Was: 'Everything this ride stopped at was made by one person.' // SPEC assumption 1, narrowed at stage 1 review (DECISIONS.md, "Stage 1 feedback") so it sits honestly beside PERSON.made. source_material/INDEX.md: Tome, ADSP, Followthrough "Sole author"; the August 2026 paper lists one author.
  src: 'SPEC',
};

export const PERSON = {
  name: 'Kushagra Bhatnagar', // RES line 1
  line: 'I build AI tools that do real work, and test when an AI’s “finished” can be trusted.', // the site's own line (build/site top bar); RES summary: "tested when an AI coding agent can be trusted to judge that its own task is complete"
  now: 'Now: MSc, Data Science and Machine Learning, NUS.', // RES Education: "National University of Singapore · MSc, Data Science and Machine Learning · Aug 2026 to Dec 2027 (expected)"
  before: 'Before: Economics at IIT Kanpur, research scientist at CIFDAQ, consulting intern at EY.', // RES: "IIT Kanpur · BS, Economics"; "CIFDAQ · Research Scientist"; "Ernst & Young · Government Consulting Intern"
  made: '', // his own sentence on what he did and what the AI coding agents did (content_style_drill, assumption 6); empty until he writes it. Was: 'This site was built with AI coding agents that I directed and checked.'
  src: ['RES', 'LI', 'USER'],
};

export const CONTACT = {
  resumePdf: '../../site/resume.pdf', // the site's PDF (no phone number in it)
  resumePage: '../../site/resume.html',
  email: 'bhatnagar.kushagra.m@u.nus.edu', // RES line 2 and LNK
  linkedin: 'https://www.linkedin.com/in/kushagra-bhatnagar-6624b410b', // LNK (the resume's visible text is shorter; LNK is the real address)
  github: 'https://github.com/kushagrab21', // RES line 2 and LNK
  src: ['RES', 'LNK'],
};

// The cast, in ride order (SITE RIDE: tome, adsp, followthrough, finding, who).
// `numbers` lists every number the card shows, so the tests can trace each one.
export const CAST = [
  { id: 'tome', name: 'Tome', gloss: 'textbook → lesson', proof: 'code is public',
    what: 'Turns a textbook section into a narrated lesson.', // RES "Upload a book and it produces narrated slide lessons"; the Tome station's own heading
    href: '../../site/#tome', numbers: [],
    src: 'SITE gloss; LNK "https://github.com/kushagrab21/tome (public)"; RES "Tome, an AI tutor · demo · code"' },
  { id: 'adsp', name: 'ADSP', gloss: 'spreadsheet → answer', proof: 'deployed in a commercial product',
    what: 'Ask a question about a spreadsheet, and it works out the answer and shows the working.', // RES "An AI assistant built into a data analysis platform. It chooses and runs the right analysis steps for a request ... logs every action so the work can be reviewed"
    // proof: RES "(deployed)"; LI "ADSP, a data analysis agent that is now part of a commercial product"
    href: '../../site/#adsp', numbers: [],
    src: 'SITE gloss; RES "ADSP, a data analysis agent (deployed)"' },
  { id: 'followthrough', name: 'Followthrough', gloss: 'email → updated documents',
    what: 'When an email changes a plan, it updates the project’s documents to match.', // LI "an agent that lives inside your email and documents and keeps a project consistent when something changes"
    proof: 'one of 10 projects picked out at the AI Tinkerers × OpenAI hackathon, Sept 2026',
    href: '../../site/#followthrough', numbers: [10, 2026],
    src: 'SITE gloss; LI "AI Tinkerers Singapore’s Agents, Everywhere hackathon with OpenAI on 12 September ... Here are 10 projects to check out (in no particular order): ... 4. FollowThrough"; LNK "AI Tinkerers SG × OpenAI hackathon, 12 Sep 2026"' },
  { id: 'finding', name: 'The finding', gloss: 'when an AI says “done”, is it?', proof: 'paper shared August 2026',
    what: 'Research on when an AI that says “done” has really finished.', // LNK paper "Where a Coding Agent Decides It Is Finished?"; RES "tested when an AI coding agent can be trusted to judge that its own task is complete"
    href: '../../site/#finding', numbers: [2026],
    src: 'SITE gloss (extended as in the SPEC); LNK "Where a Coding Agent Decides It Is Finished? | Zenodo, 13 Aug 2026"' },
];

// Every other visible word: buttons, links and the skip bar. Kept here so one count covers the whole page.
export const UI = {
  resumePdf: 'Resume (PDF)', resumePage: 'Web page', email: 'Email', copy: 'Copy', copied: 'Copied',
  linkedin: 'LinkedIn', github: 'GitHub',
  skip: 'Resume and contacts', // shown with PERSON.name from the first second, so the way to the name is never hidden
  pause: 'Pause', play: 'Keep playing', again: 'Watch again', maker: 'Contacts',
};

// The line on how the site was made: his own sentence once he writes it in PERSON.made, and nothing at all
// until then. Visitors never see a placeholder.
export function madeLine(person) {
  const t = (person.made || '').trim();
  return t ? t : null;
}

// The words a visitor can read once everything holds still. The tests and the browser check both count this.
export function settledTexts() {
  return [HEAD.eyebrow, HEAD.title, PERSON.name, PERSON.line, PERSON.now, PERSON.before,
    UI.resumePdf, UI.resumePage, UI.email, CONTACT.email, UI.copy, UI.linkedin, UI.github, ...(madeLine(PERSON) ? [madeLine(PERSON)] : []),
    ...CAST.map((c) => c.name)];
}

// Facts the tests hold the page to, in the form the source gives them.
export const FACTS = {
  hackathonProjects: { value: 10, src: 'LI "Here are 10 projects to check out (in no particular order)"' },
  hackathonDate: { value: '2026-09-12', src: 'LI "on 12 September"; LNK "12 Sep 2026"' },
  findingPaper: { value: '2026-08-13', src: 'LNK "Zenodo, 13 Aug 2026"' },
};
