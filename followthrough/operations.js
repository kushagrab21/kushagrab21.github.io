// The recorded job as a list of operations, in the order they happened.
// Each operation names its exact inputs, who did the work, and its exact output, all read from the
// recorded run. Pure functions only, so the facts can be tested without a browser.
import { parseEmail, runEditCheck, runQuoteCheck } from './model.js';

const finding = (run, id) => [...run.task_a.findings, ...run.task_b.findings].find((f) => f.finding_id === id);

function email(run, id, highlight = []) {
  const s = run.snapshots[id];
  return { type: 'email', key: id, title: s.title, ...parseEmail(s.text), highlight };
}

// A document as its lines, with the paragraph style each line was recorded with.
// The style list starts with a section break, so line i has style i + 1.
function doc(run, id, styles, { changed = [], before = null, focus = null } = {}) {
  const s = run.snapshots[id];
  const lines = s.text.split('\n').map((text, i) => ({
    text,
    style: styles[i + 1] ?? 'NORMAL_TEXT',
    changed: changed.includes(i + 1),
    was: before && changed.includes(i + 1) ? before[i] : null,
  }));
  return { type: 'doc', key: id, title: s.title, lines, focus: focus ?? changed[0] ?? 1 };
}

const sourceTitle = (run, id) => {
  if (id === 'src_000003') return 'the client’s email';
  if (id === 'src_000006') return 'the venue’s email';
  if (id === 'src_000002') return 'an older email from the same inbox';
  return run.snapshots[id]?.title ?? 'a source not in this record';
};

function edited(run, edit) {
  const before = run.snapshots[edit.before_source_id].text.split('\n');
  const changed = edit.recorded.line_changes.map((c) => c.line);
  return {
    before: doc(run, edit.before_source_id, edit.before_styles, { focus: changed[0] }),
    beforeMarked: doc(run, edit.before_source_id, edit.before_styles, { changed, focus: changed[0] }),
    after: doc(run, edit.after_source_id, edit.after_styles, { changed, before }),
    changed,
  };
}

export function buildOperations(run) {
  const [eBrief, eInvDate, eInvVenue] = run.task_a.edits;
  const brief = edited(run, eBrief);
  const invDate = edited(run, eInvDate);
  const invVenue = edited(run, eInvVenue);
  const client = (hl) => email(run, 'src_000003', hl);
  const venue = (hl) => email(run, 'src_000006', hl);
  const claim = finding(run, 'fd_000001');
  const [returned, accepted] = run.task_a.rulings;
  const revised = run.task_a.findings.filter((f) => f.review === 'accepted');
  const draft = run.task_b.drafts.at(-1);

  const asked = (edit) => ({ type: 'asked', key: `asked-${edit.after_source_id}`, replacements: edit.replacements });
  const checkResult = (edit, total) => ({ type: 'check', key: `check-${edit.after_source_id}`, edit, total, ...runEditCheck(run, edit) });
  const findingRec = (f) => ({
    id: f.finding_id, claim: f.claim, type: f.type, review: f.review,
    excerpts: f.excerpts.map((x) => ({ ...x, from: sourceTitle(run, x.source_id) })),
  });

  return [
    {
      id: 'brief-edit', area: 'documents', actor: 'worker', at: eBrief.at,
      inputs: [
        client(['Please move the workshop from October 20 to October 27.', 'The time stays the same.']),
        venue(['Your room is confirmed for October 20, 2–5 pm.']),
        brief.beforeMarked,
      ],
      output: brief.after,
    },
    {
      id: 'brief-check', area: 'documents', actor: 'code', at: eBrief.at, edit: eBrief,
      inputs: [brief.after, brief.before, asked(eBrief)], carry: [0],
      output: checkResult(eBrief, brief.after.lines.length),
    },
    {
      id: 'inv-date-edit', area: 'documents', actor: 'worker', at: eInvDate.at,
      inputs: [client(['Please move the workshop from October 20 to October 27.', 'The time stays the same.']), invDate.beforeMarked],
      output: invDate.after,
    },
    {
      id: 'inv-date-check', area: 'documents', actor: 'code', at: eInvDate.at, edit: eInvDate,
      inputs: [invDate.after, invDate.before, asked(eInvDate)], carry: [0],
      output: checkResult(eInvDate, invDate.after.lines.length),
    },
    {
      id: 'inv-venue-edit', area: 'documents', actor: 'worker', at: eInvVenue.at,
      inputs: [venue(['Your room is confirmed for October 20, 2–5 pm.']), client(['October 27']), invVenue.beforeMarked],
      output: invVenue.after,
    },
    {
      id: 'inv-venue-check', area: 'documents', actor: 'code', at: eInvVenue.at, edit: eInvVenue,
      inputs: [invVenue.after, invVenue.before, asked(eInvVenue)], carry: [0],
      output: checkResult(eInvVenue, invVenue.after.lines.length),
    },
    {
      id: 'quote-check', area: 'review', actor: 'code', at: run.task_a.gate[0].at,
      inputs: [
        { type: 'claim', key: 'claim-fd_000001', finding: findingRec(claim) },
        email(run, 'src_000003', [claim.excerpts[1].quote]),
        email(run, 'src_000002', [claim.excerpts[0].quote]),
      ],
      output: { type: 'quotes', key: 'quotes-fd_000001', ...runQuoteCheck(run, claim.excerpts), excerpts: findingRec(claim).excerpts },
    },
    {
      id: 'review-return', area: 'review', actor: 'reviewer', at: returned.at,
      inputs: [
        { type: 'claim', key: 'claim-fd_000001', finding: findingRec(claim) },
        { type: 'quotes', key: 'quotes-fd_000001', ...runQuoteCheck(run, claim.excerpts), excerpts: findingRec(claim).excerpts },
      ],
      carry: [1],
      output: { type: 'ruling', key: 'ruling-0', ...returned, focus: 'In finding fd_000001' },
      returnsTo: 'worker',
    },
    {
      id: 'correct', area: 'review', actor: 'worker', at: run.task_a.gate[1].at,
      inputs: [{ type: 'ruling', key: 'ruling-0', ...returned, focus: 'In finding fd_000001' }, client(['The time stays the same.']), venue([])],
      carry: [0],
      output: { type: 'findings', key: 'findings-revised', findings: revised.map(findingRec) },
    },
    {
      id: 'review-accept', area: 'review', actor: 'reviewer', at: accepted.at,
      inputs: [{ type: 'findings', key: 'findings-revised', findings: revised.map(findingRec) }],
      carry: [0],
      output: { type: 'ruling', key: 'ruling-1', ...accepted, focus: null },
    },
    {
      id: 'draft', area: 'later', actor: 'worker', at: draft.at,
      inputs: [
        { type: 'request', key: 'request-b', text: run.request_b },
        {
          type: 'results', key: 'earlier-results',
          changes: [
            { title: run.snapshots[eBrief.after_source_id].title, lines: eBrief.recorded.line_changes },
            { title: run.snapshots[eInvVenue.after_source_id].title, lines: [...eInvDate.recorded.line_changes, ...eInvVenue.recorded.line_changes] },
          ],
          findings: ['fd_000004', 'fd_000005', 'fd_000006'].map((id) => findingRec(finding(run, id))),
          outstanding: run.outstanding[0][0],
        },
      ],
      output: { type: 'draft', key: 'draft', to: draft.to, subject: draft.subject, body: draft.body, at: draft.at, sent: false },
    },
  ];
}

export const AREAS = ['documents', 'review', 'later'];
