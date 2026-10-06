export const SUBJECTS = Object.freeze({ maths: 'Maths', english: 'English' });
export const clampThreshold = value => Math.min(100, Math.max(0, Math.round((Number(value) || 0) * 100) / 100));
export const selectRows = (rows, threshold) => rows.filter(row => Number.isFinite(row.attendance) && row.attendance < clampThreshold(threshold));
export function summarize(rows, subject) {
  if (!Object.hasOwn(SUBJECTS, subject)) throw new Error('Unknown subject');
  const sum = rows.reduce((total, row) => total + row[subject], 0);
  return { count: rows.length, sum, mean: rows.length ? sum / rows.length : null };
}
export function makeSnapshot(rows, threshold, subject, datasetHash) {
  const normalized = clampThreshold(threshold);
  const group = selectRows(rows, normalized);
  return Object.freeze({ version: 1, datasetHash, threshold: normalized, subject,
    rowIds: Object.freeze(group.map(row => row.id)), ...summarize(group, subject) });
}
export function restoreSnapshot(value, rows, datasetHash) {
  if (!value || value.version !== 1 || value.datasetHash !== datasetHash || !Object.hasOwn(SUBJECTS, value.subject) || !Number.isFinite(value.threshold) || value.threshold < 0 || value.threshold > 100) return null;
  // Reconstruct from the source, rather than trusting stored totals or IDs.
  return makeSnapshot(rows, value.threshold, value.subject, datasetHash);
}
export function validateDataset(payload) {
  if (!payload?.metadata?.source_sha256 || !Array.isArray(payload.rows) || payload.rows.length !== 520) throw new Error('The demonstration dataset is incomplete.');
  const ids = new Set();
  for (const row of payload.rows) {
    if (typeof row.id !== 'string' || ids.has(row.id)) throw new Error('Records must have unique identities.');
    ids.add(row.id);
    for (const key of ['maths', 'english']) if (!Number.isFinite(row[key]) || row[key] < 0 || row[key] > 100) throw new Error('A score is unavailable or outside the sample range.');
    if (row.attendance !== null && (!Number.isFinite(row.attendance) || row.attendance < 0 || row.attendance > 100)) throw new Error('Invalid attendance.');
  }
  return payload;
}
