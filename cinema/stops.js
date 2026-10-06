// Which films play at which Writing-line station, in order. Each id is a folder in films/ (see FILM_CONTRACT.md).
export const STOPS = {
  intro: { line: 'Welcome', name: 'Introduction', films: ['intro'] },
  'w-articles': { line: 'Writing', name: 'Articles', films: ['ai-perspective'] },
  // used only by tests/flow.mjs: two films, fixed, so the tests don't depend on what a live station plays
  _test: { line: 'Writing', name: 'Test', films: ['entry-level', 'beyond-hype'] },
};
