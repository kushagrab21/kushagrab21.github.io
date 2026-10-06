// Input must stop the playhead before the browser continues scroll processing.
// A passive wheel listener can be delivered through the compositor's deferred
// path. Explicit passive:false opts out; we still never cancel the event.
export function bindPauseInputs(target, pause, beforePause = () => {}) {
  const onInput = event => {
    beforePause(event);
    pause();
  };
  const options = { capture: true, passive: false };
  const types = ['pointerdown', 'touchstart', 'keydown', 'wheel'];
  for (const type of types) target.addEventListener(type, onInput, options);
  return () => {
    for (const type of types) target.removeEventListener(type, onInput, options);
  };
}
