// Every sentence the visitor reads that is not itself a recorded email, document or decision.
// Written for someone with no context, then passed through the human-rewrite skill (5 Oct 2026).
// Recorded material is never rewritten; it is shown exactly as it was stored.

export const BAND = {
  title: 'Followthrough',
  lead: 'A client moved a workshop to a new date. Followthrough, an AI, updated the event documents, and plain code and a second AI checked its work. This is a recording of that job, one step at a time.',
  recorded: 'A recorded example from 12 September 2026',
  research: 'My research →',
};

export const AREAS = {
  documents: { name: 'The documents', status: 'Room for October 27: not confirmed yet' },
  review: { name: 'The review' },
  later: { name: 'A later job', status: 'Draft, not sent' },
};

export const ACTORS = {
  worker: { name: 'Followthrough', role: 'the AI doing the work' },
  reviewer: { name: 'The reviewer', role: 'a second AI. It reads and judges, but can’t edit.' },
  code: { name: 'The code check', role: 'ordinary code, not an AI. It compares text word for word.' },
};

// Per step: the label in the map, the title while reading, the arrow words, and the explanation.
export const STEPS = {
  'brief-edit': {
    map: 'edit', group: 'Brief', title: 'Editing the Brief', read: 'reads', write: 'writes',
    say: 'The client asked to move the workshop to October 27, at the same time. The only room booking is for October 20. So Followthrough changes the date in the Brief and marks the room “to be confirmed”.',
  },
  'brief-check': {
    map: 'check', group: 'Brief', title: 'Checking the Brief edit', read: 'compares', write: 'reports',
    say: 'The check compares the saved Brief with the version before the edit. Only the date line and the room line changed, and the formatting stayed the same.',
  },
  'inv-date-edit': {
    map: 'edit', group: 'Invitation date', title: 'Changing the Invitation’s date', read: 'reads', write: 'writes',
    say: 'The Invitation needs the new date too. Followthrough changes October 20 to October 27 and leaves the time as it was.',
  },
  'inv-date-check': {
    map: 'check', group: 'Invitation date', title: 'Checking the Invitation’s new date', read: 'compares', write: 'reports',
    say: 'The check compares the Invitation with its earlier version. Only the date line changed, and the formatting stayed the same.',
  },
  'inv-venue-edit': {
    map: 'edit', group: 'Invitation room', title: 'Marking the Invitation’s room', read: 'reads', write: 'writes',
    say: 'The only room booking is for October 20, not October 27. Followthrough marks the Invitation’s room “to be confirmed”. Booking the room is left to a person.',
  },
  'inv-venue-check': {
    map: 'check', group: 'Invitation room', title: 'Checking the room line', read: 'compares', write: 'reports',
    say: 'The check compares the Invitation once more. Only the room line changed, and the formatting stayed the same.',
  },
  'quote-check': {
    map: 'Quotes checked', title: 'Checking the copied quotes', read: 'looks up', write: 'reports',
    say: 'Followthrough backs each statement with a quote from an email. The check confirms that each quoted sentence really appears in the email it names. It can’t tell whether the quote supports the statement.',
  },
  'review-return': {
    map: 'Sent back', title: 'Reviewing a statement', read: 'reads', write: 'sends back',
    say: 'Followthrough wrote that the client asked for October 27, 2–5 pm. The hours are right, but the client never wrote them; they come from an older email in the same inbox. The reviewer sends the statement back to Followthrough to fix.',
  },
  correct: {
    map: 'Corrected', title: 'Correcting the statements', read: 'reads', write: 'rewrites',
    say: 'Followthrough rewrites its statements so each says only what its quoted source says. The client’s email is now quoted for two things: the new date, and that the time stays the same.',
  },
  'review-accept': {
    map: 'Accepted', title: 'Reviewing the correction', read: 'reads', write: 'accepts',
    say: 'The reviewer reads the corrected statements and accepts them. The room for October 27 is still not confirmed.',
  },
  draft: {
    map: 'Note to the event team', title: 'Drafting the note to the event team', read: 'reads', write: 'drafts',
    say: 'A later job starts from what the first one found: the new date, the unchanged time, and a room still to confirm. Followthrough drafts an email telling the event team what changed and what they need to do. It doesn’t send it.',
  },
};

// Names for each kind of record, as they appear on the flap tabs and headings.
export function recordName(a, role) {
  switch (a.type) {
    case 'email':
      return a.key === 'src_000003' ? 'The client’s email' : a.key === 'src_000006' ? 'The venue’s email' : 'An older email from the same inbox';
    case 'doc': {
      const which = /Brief/.test(a.title) ? 'Brief' : 'Invitation';
      if (role === 'output' || a.lines.some((l) => l.was)) return `The ${which} after the edit`;
      return a.lines.some((l) => l.changed) ? `The ${which} before the edit` : `The ${which} before the edit`;
    }
    case 'asked': return 'What it was asked to replace';
    case 'check': return 'The check’s result';
    case 'claim': return 'The statement';
    case 'quotes': return 'The quote check’s result';
    case 'ruling': return 'The reviewer’s decision';
    case 'findings': return 'The corrected statements';
    case 'request': return 'The new request';
    case 'results': return 'What the first job found';
    case 'draft': return 'The draft email';
    default: return '';
  }
}

// Short names for the flap tabs; the flap heading keeps the full name.
export function tabName(a) {
  switch (a.type) {
    case 'email': return a.key === 'src_000003' ? 'Client’s email' : a.key === 'src_000006' ? 'Venue’s email' : 'Older email';
    case 'doc': return `${/Brief/.test(a.title) ? 'Brief' : 'Invitation'}, ${a.lines.some((l) => l.was) ? 'after' : 'before'}`;
    case 'asked': return 'What was asked';
    case 'check': return 'Check result';
    case 'claim': return 'Statement';
    case 'quotes': return 'Quote check';
    case 'ruling': return 'Decision';
    case 'findings': return 'Corrected statements';
    case 'request': return 'New request';
    case 'results': return 'First job’s results';
    default: return recordName(a, 'input');
  }
}

export const FLAP = { input: 'Input', output: 'Output', openInput: 'Open input', openOutput: 'Open output', close: 'Fold away', fold: 'Fold' };

export const RESULT = {
  checkTitle: 'Result of the check, run just now in your browser',
  lines: (n, total) => `${n} of ${total} lines changed, and each one was asked for.`,
  other: 'Everything else is word for word the same.',
  styles: (k) => `The formatting of all ${k} paragraphs is the same.`,
  try: 'Try the check on your own copy',
  back: 'Back to the recorded result',
  yourCopy: (doc) => `Your copy of the ${doc}. Not part of the recording.`,
  changeTime: 'Change the time to 3–6 pm', putTime: 'Put the time back',
  flatten: 'Remove the title’s heading style', unflatten: 'Give the title its heading style back',
  reset: 'Reset',
  pass: 'The check passes. Only the lines that were asked for changed.',
  failTime: 'The time now says 3–6 pm, and nobody asked for that.',
  failHeading: 'The title is no longer a heading. The words are the same, but the formatting isn’t.',
  fail: 'The check fails.',
  quoteQuestion: 'Does each quoted sentence appear in the email it names?',
  found: (src) => `Found word for word in ${src}.`,
  notFound: (src) => `Not found in ${src}.`,
  quoteLimit: 'Found means the words exist. It doesn’t mean they support the statement.',
  was: 'Was',
  draftLabel: 'Draft, not sent',
  gloss: {
    'ruling-0': 'In plain words: the edits were right, but some statements claimed more than their quotes show, so they go back to be fixed.',
    'ruling-1': 'In plain words: each statement now says only what its quote shows, so the work is accepted.',
  },
  yourTitle: 'Your copy, checked',
  linksRemoved: 'The links were removed from the recording.',
  direct: 'Taken straight from a source',
  assessment: 'Followthrough’s own assessment',
  stillOpen: 'Still open',
  asked: (find, replace) => [find, replace],
};

export const PLAY = {
  pause: 'Pause', resume: 'Resume',
  following: (i, n) => `Following the replay · step ${i} of ${n}`,
  paused: (i, n) => `Paused · step ${i} of ${n}`,
  count: (i, n) => `Step ${i} of ${n}`,
  phases: ['Takes in the input', 'Works on it', 'Result ready'],
  reading: (t) => `Reading: ${t}`,
  follow: 'Follow the replay',
  movedOn: (t) => `The replay has moved on to: ${t}`,
  tryIt: 'Try the check yourself',
};

export const BRIDGE = 'An AI that carries out tasks often says a job is finished while the work is still wrong. Here Followthrough could have left “confirmed” standing, or credited the client with a time they never wrote. That failure is what my research is about.';
