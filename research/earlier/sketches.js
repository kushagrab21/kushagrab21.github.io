import { ease, motion, pacing } from './sequence.js';
// Code-native drawings. No plotted dataset is represented by these paths.
const wrap = (id, drawing, labels, controls = '') => `<div class="drawing drawing-${id}" role="img" aria-label="${labels.alt}"><svg viewBox="0 0 480 260" fill="none" aria-hidden="true">${drawing}</svg>${labels.html}</div>${controls}`;
const label = (text, x, y, cls = '') => `<span class="figure-label ${cls}" style="left:${x}%;top:${y}%">${text}</span>`;
const fingerprints = (x,y) => `<g transform="translate(${x} ${y})" class="fingerprint"><path d="M-12 8C-22-16 20-20 14 8M-7 12C-20-12 16-16 9 11M-1 15C-11-8 10-10 4 14M-17 5C-22-24 28-21 20 4"/></g>`;

export function sketch(id) {
  if (id === 'covid') return wrap(id, `
    <defs><clipPath id="covid-line-reveal" clipPathUnits="userSpaceOnUse"><rect class="covid-reveal" x="76" y="54" width="0" height="150"/></clipPath></defs>
    <path class="axis covid-axes" pathLength="1" d="M62 26V213H430"/><path class="axis covid-axis-heads" d="M57 33L62 26L67 33M423 208L430 213L423 218"/>
    <g clip-path="url(#covid-line-reveal)"><path class="covid-path ink" pathLength="1" d="M80 197C136 197 158 166 201 137S273 67 318 61"/>
    <path class="ghost-line" d="M318 61L332 59"/></g>
    <circle class="question-ring" cx="361" cy="58" r="28"/>
    ${[105,184,263,342].map((x,i)=>`<path class="axis covid-tick" style="--tick:var(--tick-${i})" d="M${x} 219v6"/>`).join('')}`,
    {alt:'An unnumbered cases-versus-days sketch extends into a question mark. It is not a forecast or paper result.',html:label('cases',9,4,'axis-label')+label('days',82,87,'axis-label')+label('?',75,14,'question')+label('What happens next?',51,68,'sketch-note')});
  if (id === 'wireless') return wrap(id, `
    <path class="phone-edge" d="M53 38H125L133 46V209L125 217H53L45 209V46Z"/><path class="phone-screen" d="M57 57H121V188H57Z"/><path class="axis" d="M77 47h24M81 201h17"/>
    ${[0,1,2,3].map((i)=>`<rect class="signal-bar signal-${i}" x="${66+i*12}" y="${148-i*14}" width="7" height="${16+i*14}" rx="1"/>`).join('')}
    <path class="flow-line" d="M148 137H187M179 131l8 6-8 6"/>
    <path class="standard-curve" d="M208 196C244 196 255 67 297 67S349 196 421 196"/>
    <path class="measured-curve ink" pathLength="1" d="M207 197C239 198 227 118 265 125S299 59 323 92S353 122 365 151S394 179 422 180"/>
    ${[[217,184],[237,149],[261,127],[285,115],[309,87],[331,104],[360,141],[386,176],[415,180]].map(([x,y],i)=>`<circle class="reading reading-${i}" cx="${x}" cy="${y}" r="4"/>`).join('')}`,
    {alt:'A phone signal flickers. Illustrative dots appear; an assumed curve gives way to a flexible curve. These are not measurements.',html:label('signal',18,89)+label('assumed shape',64,10,'standard-label')+label('let readings draw it',66,88,'flexible-label')});
  if (id === 'trade') return wrap(id, `
    <path class="trade-line india-line" d="M124 77C206 77 201 130 296 130"/><path class="trade-line japan-line" d="M124 190C206 190 201 147 296 147"/>
    <path class="trade-arrow india-line" d="M282 122l14 8-14 8"/><path class="trade-arrow japan-line" d="M282 139l14 8-14 8"/>
    <rect class="toggle-case" x="54" y="51" width="70" height="32" rx="16"/><circle class="india-switch switch" cx="70" cy="67" r="11"/>
    <rect class="toggle-case" x="54" y="175" width="70" height="32" rx="16"/><circle class="japan-switch switch" cx="70" cy="191" r="11"/>
    <path class="bloc" d="M307 69h105v128H307zM319 80h28v30h-28zM357 80h43v30h-43zM319 120h43v29h-43zM371 120h29v29h-29zM319 159h28v27h-28zM357 159h43v27h-43z"/>`,
    {alt:'India and Japan switches cycle through neither joining, India only, Japan only, and both. Arrows show participation only, not trade volume.',html:label('India',18,8)+label('Japan',18,55)+label('ASEAN',75,83)+label('neither joins',49,1,'scenario-label')},
    '<div class="sketch-controls"><button type="button" data-country="india" aria-pressed="false">India <span>off</span></button><button type="button" data-country="japan" aria-pressed="false">Japan <span>off</span></button></div>');
  if (id === 'replay') return wrap(id, `
    <path class="paper-shape replay-input" d="M25 88h50v77H25zM35 103h28M35 114h23M35 125h28M35 136h19"/>
    <path class="flow-line replay-link-a" d="M79 125h40m-8-6 8 6-8 6"/><path class="flow-line replay-link-b" d="M180 125h37m-8-6 8 6-8 6"/><path class="flow-line replay-link-final" d="M280 125h32m-8-6 8 6-8 6"/>
    <g class="replay-step-a"><rect class="step-box" x="122" y="94" width="58" height="58" rx="3"/><path class="step-glyph" d="M139 114h24m-24 12h18m-18 12h24"/></g>
    <g class="replay-step-b"><rect class="step-box" x="221" y="94" width="58" height="58" rx="3"/><path class="step-glyph" d="M238 114h24m-24 12h18m-18 12h24"/></g>
    <g class="stamp stamp-a">${fingerprints(151,181)}</g><g class="stamp stamp-b">${fingerprints(250,181)}</g>
    <path class="gather" d="M175 184h160v-30M273 184h62"/>
    <rect class="final-box replay-final-box" x="318" y="91" width="59" height="63" rx="3"/><g class="replay-final-print">${fingerprints(348,125)}</g>
    <g class="replayed"><rect class="final-box" x="406" y="91" width="59" height="63" rx="3"/></g><g class="replay-match">${fingerprints(436,125)}<path class="match-line" d="M386 119h11m-11 9h11"/></g>
    <path class="replay-path" pathLength="1" d="M432 169V214H50V173"/>`,
    {alt:'Input moves through steps, each leaving a symbolic fingerprint. The fingerprints combine. A replay produces a matching final fingerprint.',html:label('input',10,23,'replay-input')+label('steps',41,23,'replay-step-a')+label('final',72,23,'replay-final-label')+label('replay',91,23,'replayed')+label('step fingerprints',43,88,'finger-label')+label('same run',81,88,'match-label')});
  if (id === 'spar') return `<div class="bet-comparison" role="group" aria-label="Two charity bets with the same question and evidence">
    <div class="bet-caption"><p class="bet-question">spots on living giraffes</p><p class="bet-key">charity gets paid</p></div>
    <div class="bet-panels">${['high','low'].map(side => `<button type="button" class="bet-panel bet-${side}" data-bet="${side}" aria-label="Charity paid if the guess is ${side}" aria-pressed="${side === 'high'}">
      <span class="bet-title">Charity paid if the guess is <strong>${side}</strong></span>
      <span class="bet-figure" role="img" aria-label="An illustrative AI guess moves ${side === 'high' ? 'higher' : 'lower'} when a ${side} guess pays the charity. Positions are not measured values.">
        <span class="bet-track" aria-hidden="true"><span class="bet-paid"></span><span class="bet-cutoff"></span><span class="bet-guess"><span>AI estimate</span></span></span>
        <span class="bet-scale" aria-hidden="true"><span>low</span><span>same cutoff</span><span>high</span></span>
      </span>
    </button>`).join('')}</div>
  </div>`;
  return '';
}

export function sketchState(id, f) {
  const clamp = x => Math.max(0, Math.min(1, x));
  const reveal = (start, end) => ease((f - start) / (end - start));
  if (id === 'trade') return { scenario: Math.min(3, Math.floor(clamp(f) * 4)) };
  if (id === 'spar') return { bet: f < .5 ? 'high' : 'low', highShift: ease((f - .05) / .3), lowShift: ease((f - .55) / .3) };
  if (id === 'covid') return {
    axes: reveal(0,.28), axisHeads: reveal(.22,.3),
    ticks: [0,1,2,3].map(i => reveal(.2 + i * .08,.3 + i * .08)),
    draw: reveal(.24,1), question: reveal(.78,1),
  };
  if (id === 'replay') return {
    input: reveal(0,.14), linkA: reveal(.1,.22), stepA: reveal(.18,.3), stampA: reveal(.28,.4),
    linkB: reveal(.34,.46), stepB: reveal(.4,.52), stampB: reveal(.5,.62),
    linkFinal: reveal(.56,.68), final: reveal(.62,.74), finalPrint: reveal(.68,.8),
    replayed: reveal(.76,.9), match: reveal(.86,1), draw: reveal(.76,1),
  };
  return { draw: reveal(.12,1) };
}

export function updateSketch(root, id, progress, override = {}, immediate = false) {
  const s = { ...sketchState(id, progress), ...override };
  root.style.setProperty('--draw', s.draw ?? 1);
  if (id === 'covid') {
    root.style.setProperty('--axes', s.axes);
    root.style.setProperty('--axis-heads', s.axisHeads);
    root.style.setProperty('--question', s.question);
    s.ticks.forEach((tick,i) => root.style.setProperty(`--tick-${i}`, tick));
  }
  if (id === 'replay') {
    for (const key of ['input','linkA','stepA','stampA','linkB','stepB','stampB','linkFinal','final','finalPrint','replayed','match']) {
      root.style.setProperty(`--${key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())}`, s[key]);
    }
  }
  root.style.setProperty('--curve', ease((progress - .5) / .04));
  root.style.setProperty('--signal', progress > .15 && progress < 1 ? .35 + Math.sin(progress * 32) ** 2 * .65 : 1);
  if (id === 'trade') {
    const india = (s.scenario & 1) !== 0, japan = (s.scenario & 2) !== 0;
    const slot = Math.min(3, Math.floor(progress * 4));
    const withinSlot = progress >= 1 ? 1 : progress * 4 - slot;
    const travel = immediate || override.scenario !== undefined ? 1 : ease(withinSlot * motion.tradeScenario / motion.tradeSwitch);
    const previous = Math.max(0, s.scenario - 1);
    for (const [country, bit] of [['india',1],['japan',2]]) {
      const from = Number((previous & bit) !== 0), to = Number((s.scenario & bit) !== 0);
      root.style.setProperty(`--${country}-shift`, from + (to - from) * travel);
    }
    root.style.setProperty('--scenario-caption', immediate || override.scenario !== undefined || progress >= 1 ? 1 : ease(withinSlot * motion.tradeScenario / pacing.captionFade));
    root.dataset.india = String(india); root.dataset.japan = String(japan);
    root.querySelector('.scenario-label').textContent = ['neither joins', 'India joins', 'Japan joins', 'both join'][s.scenario];
    root.querySelectorAll('[data-country]').forEach(button => {
      const on = button.dataset.country === 'india' ? india : japan;
      button.setAttribute('aria-pressed', String(on)); button.querySelector('span').textContent = on ? 'on' : 'off';
    });
  }
  if (id === 'spar') {
    root.dataset.bet = s.bet;
    root.style.setProperty('--high-shift', override.bet ? Number(s.bet === 'high') : s.highShift);
    root.style.setProperty('--low-shift', override.bet ? Number(s.bet === 'low') : s.lowShift);
    root.querySelectorAll('[data-bet]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.bet === s.bet)));
  }
}
