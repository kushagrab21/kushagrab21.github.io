// A slow continuous sweep through the same calculation path as the slider.
export function createCutoffDemo({ read, write, status, onFrame = () => {}, request = requestAnimationFrame, cancel = cancelAnimationFrame, now = () => performance.now(), duration = 48000 }) {
  let frame = null, running = false, origin = 50, destination = 75, started = 0, last;
  function tick(time) {
    if (!running) return;
    const progress = Math.max(0, (time - started) / duration) % 1;
    const amount = (1 - Math.cos(progress * Math.PI * 2)) / 2;
    const value = Math.round((origin + (destination - origin) * amount) * 100) / 100;
    if (value !== last) { write(value); last = value; }
    onFrame(progress);
    frame = request(tick);
  }
  return {
    get running() { return running; },
    start({ reducedMotion = false } = {}) {
      if (running || reducedMotion) return false;
      origin = read(); destination = origin > 70 ? origin - 25 : origin + 25;
      started = now(); last = origin; running = true; status('running'); frame = request(tick); return true;
    },
    stop(reason = 'paused') {
      if (!running) return;
      running = false; if (frame !== null) cancel(frame); frame = null; status(reason);
    }
  };
}
