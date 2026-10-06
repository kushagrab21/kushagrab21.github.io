// A reading guide to the current result, never a simulated processing status.
export function explainCalculation(snapshot, baselineMean) {
  const number = value => value.toLocaleString('en-US', { maximumFractionDigits: 1 });
  const mean = value => value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const subject = snapshot.subject === 'english' ? 'English' : 'maths';
  const students = snapshot.count === 1 ? 'student' : 'students';
  return [
    { title: 'Choose the students', sentence: `${snapshot.count} ${students} ${snapshot.count === 1 ? 'has' : 'have'} attendance below ${snapshot.threshold}%. Blue rows belong to this group.` },
    { title: 'Work out the average', sentence: snapshot.count ? `Their ${subject} scores total ${number(snapshot.sum)}. Divide by ${snapshot.count} ${students}.` : 'No students match this limit, so there are no scores to average.' },
    { title: 'Check the answer', sentence: snapshot.count ? `The average ${subject} score is ${mean(snapshot.mean)} out of 100. All 520 students average ${mean(baselineMean)}.` : `This group has no average. All 520 students still average ${mean(baselineMean)}.` }
  ];
}

export function explanationStep(progress) {
  // Two 3-step reading passes within the existing 48-second cutoff sweep.
  return Math.min(2, Math.floor(((progress * 2) % 1) * 3));
}
