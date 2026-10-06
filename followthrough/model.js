// Turns the recorded run into what the page shows. Pure functions only, so they can be tested.
import { verifyDocEdit, verifyExcerpts } from './verify.js';

export function parseEmail(text) {
  const [head, ...rest] = text.split('\n\n');
  const field = (name) => (head.match(new RegExp(`^${name}: (.*)$`, 'm')) || [])[1] || '';
  return { from: field('From'), date: field('Date'), subject: field('Subject'), body: rest.join('\n\n').trim() };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDay = (iso) => { const d = new Date(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };

// A finding's quotes, by the finding the reviewer accepted for that claim.
const quotesOf = (run, id) => run.task_a.findings.find((f) => f.finding_id === id)?.excerpts ?? [];

export function buildScene(run) {
  const snap = (id) => run.snapshots[id];
  const client = { ...parseEmail(run.inputs.client_email.text), id: 'src_000003' };
  const venue = { ...parseEmail(run.inputs.venue_email.text), id: 'src_000006' };

  // Which sentence justifies each line, taken from findings the reviewer accepted.
  const reasons = {
    date: { finding: 'fd_000004', source: client, quotes: quotesOf(run, 'fd_000004') },
    time: { finding: 'fd_000005', source: client, quotes: quotesOf(run, 'fd_000005') },
    venue: { finding: 'fd_000006', source: venue, quotes: quotesOf(run, 'fd_000006').slice(0, 1) },
  };

  const edits = run.task_a.edits;
  const doc = (title, beforeId, afterId, editIdx) => {
    const before = snap(beforeId).text.split('\n');
    const after = snap(afterId).text.split('\n');
    const lines = after.map((line, i) => {
      const kind = /^Date:/.test(line) ? 'date' : /^Time:/.test(line) ? 'time' : /^Venue:/.test(line) ? 'venue' : null;
      return { n: i + 1, before: before[i], after: line, changed: before[i] !== line, kind };
    });
    return { title, lines, head: 4, edits: editIdx.map((i) => edits[i]) };
  };

  // The email an earlier practice run left in the mailbox: the source of the wrong "2–5 pm" quote.
  const practice = { ...parseEmail(snap('src_000002').text), id: 'src_000002' };
  const draft = run.task_b.drafts.at(-1);
  return {
    request: run.request_a,
    client,
    venue,
    practice,
    reasons,
    brief: doc('Northstar Workshop — Brief', 'src_000007', 'src_000008', [0]),
    invitation: doc('Northstar Workshop — Invitation', 'src_000009', 'src_000012', [1, 2]),
    handoff: { to: draft.to, subject: draft.subject, body: draft.body, request: run.request_b },
    stillOpen: run.outstanding[0][0],
    sentBack: sentBack(run),
    facts: {
      day: formatDay(run.task_a.totals.started),
      costs: [run.task_a.totals.cost_usd, run.task_b.totals.cost_usd],
      minutes: [run.task_a.totals, run.task_b.totals].map((t) => (new Date(t.finished) - new Date(t.started)) / 60000),
    },
  };
}

function sentBack(run) {
  const claim = run.task_a.findings.find((f) => f.finding_id === 'fd_000001');
  const [first, second] = run.task_a.rulings;
  const sourceTitle = (id) => run.snapshots[id]?.title;
  // The quote that proved the wrong thing came from an earlier rehearsal email, not from the client.
  const quotes = claim.excerpts.map((q) => ({
    ...q,
    from: q.source_id === 'src_000003' ? 'the client’s email' : `an email left in the mailbox by an earlier practice run, “${sourceTitle(q.source_id)}”`,
    rehearsal: q.source_id !== 'src_000003',
  }));
  const refusal = first.text.match(/the claim includes .*?does not state/)[0];
  const repaired = run.task_a.findings.find((f) => f.finding_id === 'fd_000005');
  return {
    repaired: { claim: repaired.claim, quotes: repaired.excerpts },
    claim: claim.claim,
    quotes,
    refusal,
    sentAt: first.at,
    acceptedAt: second.at,
    minutesToRepair: Math.round((new Date(second.at) - new Date(first.at)) / 60000),
  };
}

// Run the product's own edit check on one recorded edit, timing it.
export function runEditCheck(run, edit, tamper = null) {
  const before = { text: run.snapshots[edit.before_source_id].text, styles: edit.before_styles };
  let after = { text: run.snapshots[edit.after_source_id].text, styles: edit.after_styles };
  if (tamper) after = tamper(after);
  const t0 = performance.now();
  const result = verifyDocEdit(before, after, edit.replacements);
  return { result, ms: performance.now() - t0, tampered: Boolean(tamper) };
}

export function runQuoteCheck(run, excerpts) {
  const t0 = performance.now();
  const result = verifyExcerpts(excerpts, (id) => run.snapshots[id]?.text ?? null);
  return { result, ms: performance.now() - t0 };
}

// Edits a visitor can try to slip past the check. Each is the visitor's, never the agent's.
export const tampers = {
  time: {
    label: 'Also change the time to 3–6 pm',
    apply: (after) => ({ ...after, text: after.text.replace('Time: 2–5 pm', 'Time: 3–6 pm') }),
  },
  heading: {
    label: 'Flatten the title into normal text',
    // R-0038: the real failure behind this check. A write that changed the right words
    // silently turned a HEADING_1 into NORMAL_TEXT.
    apply: (after) => ({ ...after, styles: after.styles.map((s) => (s === 'HEADING_1' ? 'NORMAL_TEXT' : s)) }),
  },
};
