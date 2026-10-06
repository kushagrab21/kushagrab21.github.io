import { papers, facts, models, copy, firstStats, firstMisses, secondStats, secondMisses, gainLabel, separate } from './data.js';
import { createPlayback, duration, ease } from './sequence.js';
import { bindPauseInputs } from './input.js';

const $ = selector => document.querySelector(selector);
function setSeparatedText(element, text) {
  const nodes=[];
  String(text).split('·').forEach((part,index)=>{
    if(index){
      const separator=document.createElement('span');
      separator.className='sep';
      separator.setAttribute('aria-hidden','true');
      nodes.push(separator);
    }
    nodes.push(document.createTextNode(part.trim()));
  });
  element.replaceChildren(...nodes);
}
const params = new URLSearchParams(location.search);
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const playback = createPlayback({ still: params.has('still') || motion.matches });
$('#scrub').max=duration;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external = (url, label) => `<a href="${escape(url)}" target="_blank" rel="noopener">${label} ↗</a>`;
const value = name => facts[name].value;
const linkSet = paper => external(paper.pdf, 'Read PDF') + external(paper.doi, 'Paper page') + external(paper.code, 'Code');
const contents = [
  { kicker: 'Paper 1', meta: separate(papers.first.venue, papers.first.date), title: papers.first.title, heading: copy.opening, stats: firstStats(), misses: firstMisses(), links: linkSet(papers.first) },
  { kicker: 'The test set', meta: 'Built for the second paper', title: 'GAUNTLET', heading: copy.gauntletHeading, stats: `Paper 1 used its own ${value('firstTasks')} tasks.`, misses: 'GAUNTLET is the first test set for Paper 2.', links: external('https://github.com/kushagrab21/gauntlet-corpus', 'The tasks') + external(papers.second.code, 'Code') },
  { kicker: 'Paper 2', meta: separate(papers.second.venue, papers.second.date), title: papers.second.title, heading: copy.gauntletBridge, stats: secondStats(), misses: secondMisses(), links: linkSet(papers.second) },
  { kicker: 'The next question', meta: 'Not run', title: 'An unfinished part of the work', heading: copy.openHeading, stats: separate('Paper 2', 'A comparison still to run'), misses: '', links: external(`${papers.second.pdf}#page=23`, 'Read the limitation') },
];

$('#first-caption').textContent = copy.firstPrediction;
$('#first-caveat').textContent = copy.firstCaveat;
$('#second-claim').textContent = copy.secondClaim;
$('#counter-effect').textContent = copy.counterEffect;
$('#open-question').textContent = copy.openQuestion;
document.querySelectorAll('[data-fact]').forEach(el => { el.textContent = value(el.dataset.fact); });
$('#task-tiles').innerHTML = Array.from({length:value('gauntletTasks')}, () => '<i></i>').join('');

$('#overview').innerHTML = `<h2 id="overview-title" tabindex="-1">${copy.lock}</h2><div class="overview-cards">
  <article class="summary"><p class="tag" data-paper-tag="first"></p><h3>${papers.first.title}</h3><p>${copy.firstPrediction} ${copy.firstOutcome}</p><small>${firstMisses()}</small><nav>${external(papers.first.pdf,'PDF')}${external(papers.first.code,'Code')}<button class="revisit" data-go="0" aria-label="Show Paper 1 and its chart">Show chart</button></nav></article>
  <article class="summary"><p class="tag">Then I built the test set</p><h3>GAUNTLET</h3><p>${value('gauntletTasks')} tasks for Paper 2, with tests shown in stages.</p><small>Paper 2 also uses a separate ${value('secondCorpusTasks')}-task set.</small><nav>${external('https://github.com/kushagrab21/gauntlet-corpus','The tasks')}${external(papers.second.code,'Code')}<button class="revisit" data-go="1" aria-label="Show how GAUNTLET works">Show setup</button></nav></article>
  <article class="summary"><p class="tag" data-paper-tag="second"></p><h3>${papers.second.title}</h3><p>${copy.secondSummary}</p><small>Across both test sets. ${secondMisses()}</small><nav>${external(papers.second.pdf,'PDF')}${external(papers.second.code,'Code')}<button class="revisit" data-go="2" aria-label="Show the result from Paper 2">Show result</button></nav></article>
  </div><div class="overview-open"><h3>${copy.openHeading}</h3><p>${copy.openQuestion}</p><button data-go="3">Show the missing check</button></div>`;
setSeparatedText($('[data-paper-tag="first"]'),separate('Paper 1',papers.first.venue));
setSeparatedText($('[data-paper-tag="second"]'),separate('Paper 2',papers.second.venue));

let chartMobile = null;
let chartPoints = [];
function buildChart() {
  const mobile = matchMedia('(max-width:650px)').matches;
  if (chartMobile === mobile) return;
  chartMobile = mobile;
  const w = mobile ? 320 : 740, h = mobile ? 218 : 228;
  const x = (gain, i) => mobile ? 148 + gain * 6.7 : 49 + i * 107;
  const y = (gain, i) => mobile ? 33 + i * 24.4 : 137 - gain * 6.15;
  chartPoints = models.map((m, i) => ({ x:x(m.gain,i), y:y(m.gain,i) }));
  const label = (text,x,y,cls,extra='') => `<span class="plot-label ${cls}" style="left:${x/w*100}%;top:${y/h*100}%" ${extra}>${text}</span>`;
  const path = pts => pts.map((p,i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  // Prediction was directional, not seven numeric forecasts. This schematic is labelled accordingly.
  const expected = mobile ? 'M148 33 L211 118 M225 140 L268 179' : 'M49 137 L365 76 M400 69 L691 13';
  const expectedWhole = mobile ? 'M148 33 L268 179' : 'M49 137 L691 13';
  const draw = 'pathLength="1" stroke-dasharray="1"';
  const guide = mobile ? `<path class="plot-axis" ${draw} d="M148 24V190"/>` : `<path class="plot-axis" ${draw} d="M35 137H708"/><path class="plot-guide" ${draw} d="M35 75.5H708"/>`;
  let html = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${guide}<path class="expectation" d="${expected}" data-broken="${expected}" data-whole="${expectedWhole}"/><path class="observed" d="${path(chartPoints)}"/>${models.map((m,i)=>`<circle data-point="${i}" class="chart-dot ${i===6?'weak':''}" cx="${chartPoints[i].x}" cy="${chartPoints[i].y}" r="${mobile?4.4:5.7}"/>`).join('')}</svg>`;
  models.forEach((m,i)=>{
    const p=chartPoints[i];
    html += label(gainLabel(m.gain), mobile ? p.x+10 : p.x, mobile ? p.y-5 : p.y-23, 'gain', `data-gain="${i}"`);
    html += label(mobile ? m.label.join(' ') : m.label.join('<br>'), mobile ? 0 : p.x, mobile ? p.y-5 : 167, 'model', `data-model="${i}"`);
  });
  html += mobile
    ? label('strongest ↓ weakest',62,6,'rank-direction') + label('0',148,195,'zero') + label('what I expected<span>direction only</span>',242,0,'expected-label')
    : label('strongest',49,205,'rank-direction') + label('weakest',691,205,'rank-direction') + label('Models ordered before the runs',370,205,'rank-direction') + label('0',20,133,'zero') + label('what I expected<span>direction only</span>',584,4,'expected-label');
  $('#chart').innerHTML = html+'<p id="chart-cue" aria-hidden="true"></p>';
  $('#chart-cue').textContent=copy.chartCue;
}

let lastStep = -1, lastPhase = '', lastStatus = '';
function render() {
  const s=playback.state;
  const effectiveStep = Math.min(s.step,3);
  document.body.classList.toggle('still',s.still || motion.matches);
  document.body.classList.toggle('paused',!s.playing);
  document.body.classList.toggle('settled',s.settled);
  document.body.classList.toggle('with-hidden',s.hiddenTests);
  document.body.classList.toggle('first-pending',s.step===0 && s.phase!=='result');
  // No wall-clock CSS animations: pausing also freezes arrivals and fades.
  $('.room').style.opacity=s.arrival.room;
  $('.back-cards').style.opacity=s.arrival.backdrop;
  $('.front-card').style.opacity=s.arrival.card*s.cardOpacity;
  $('#overview').style.opacity=s.summaryOpacity;
  $('.withheld').style.opacity=s.hiddenOpacity;
  $('#end-rule').style.opacity=s.endRuleOpacity;
  for (const [idx,cls] of ['is-paper-1','is-gauntlet','is-paper-2','is-open'].entries()) document.body.classList.toggle(cls,idx===effectiveStep);
  $('#overview').hidden = !s.settled;
  $('#show-all').setAttribute('aria-expanded',String(s.settled));
  if(s.step!==lastStep) {
    const c=contents[effectiveStep];
    for(const [id,key] of [['card-kicker','kicker'],['card-meta','meta'],['card-title','title'],['card-heading','heading'],['stats','stats'],['misses','misses']]) setSeparatedText($(`#${id}`),c[key]);
    $('#card-title').title = effectiveStep===0 ? `${papers.first.title} ${papers.first.subtitle}` : c.title;
    $('#card-links').innerHTML=c.links;
    ['chart-panel','gauntlet-panel','second-panel','open-panel'].forEach((id,i)=>$(`#${id}`).hidden=effectiveStep!==i);
    document.querySelectorAll('.step-controls [data-go]').forEach(el=>el.setAttribute('aria-current',Number(el.dataset.go)===s.step?'step':'false'));
    $('#end-rule').innerHTML=effectiveStep===2?'AI says<br>“finished”':'The tests decide<br>“finished”';
    $('#ai-caption').textContent=effectiveStep===2?'says “finished”':'submits code';
    $('#shared-loop').setAttribute('aria-label', effectiveStep===0 ? 'The AI submits code. The tests decide whether it is finished.' : effectiveStep===1 ? 'The AI submits code. More tests are held back until everything visible passes.' : 'The AI says finished when visible tests pass, while more tests are still held back.');
    lastStep=s.step;
  }
  document.querySelectorAll('.back-card').forEach((el,i)=>{
    const d=i-effectiveStep, direction=Math.sign(d);
    const prior=effectiveStep===0?direction:Math.sign(d+1);
    const turn=prior+(direction-prior)*s.trackProgress;
    el.dataset.position=d===0?'active':Math.abs(d)>1?'gone':'side';
    el.style.left=direction<0?'2%':'auto';el.style.right=direction>0?'2%':'auto';
    el.style.transform=`rotateY(${-turn*15}deg) rotate(${turn*3}deg)`;
    el.style.opacity=d===0?'0':String(.65*s.trackOpacity);
    // These pointer shortcuts duplicate the ordered, labelled step buttons.
    el.tabIndex=-1;
  });
  const bridge=$('#bridge'),taskCount=$('.tile-field>span');
  taskCount.style.opacity='';
  bridge.textContent=s.bridge==='first'?copy.firstBridge:s.bridge==='second'?copy.gauntletBridge:s.bridge==='open'&&s.step===2?copy.openHeading:'';
  bridge.classList.toggle('flying',s.flight!==null);
  if(s.flight!==null) {
    const stage=$('.stage').getBoundingClientRect(), card=$('.front-card').getBoundingClientRect();
    const heading=$(effectiveStep===2?'#second-panel .seen':'#card-heading').getBoundingClientRect();
    const target=heading.top-stage.top;
    const start=card.bottom-stage.top+1;
    const p=ease(s.flight);
    const targetWidth=Math.min(640,heading.width);
    const targetX=heading.left-stage.left+targetWidth/2;
    const startWidth=Math.min(700,stage.width*.8);
    bridge.style.width=`${startWidth+(targetWidth-startWidth)*p}px`;
    // Measure after wrapping. Coordinates use the full stage on every viewport;
    // neither a grid-row origin nor a fixed phone offset may be added to them.
    const caption=bridge.getBoundingClientRect();
    const x=stage.width/2+(targetX-stage.width/2)*p+Math.sin(p*Math.PI)*25-caption.width/2;
    const y=start+(target-start)*p;
    const inset=4;
    bridge.style.left=`${Math.max(inset,Math.min(stage.width-caption.width-inset,x))}px`;
    bridge.style.top=`${Math.max(inset,Math.min(stage.height-caption.height-inset,y))}px`;
    // The new card's heading is visible as soon as it arrives. Let the outgoing
    // question dissolve before it reaches that text, rather than blanking it.
    const clearHeading=effectiveStep===1&&s.bridge==='first'
      ? Math.max(0,Math.min(1,(y-(heading.bottom-stage.top)-8)/40)) : 1;
    bridge.style.opacity=Math.min(s.bridgeOpacity,clearHeading);
    if(effectiveStep===1&&Number(bridge.style.opacity)>0){
      const captionBounds=bridge.getBoundingClientRect(),label=taskCount.getBoundingClientRect();
      const gap=Math.max(label.left-captionBounds.right,captionBounds.left-label.right,
        label.top-captionBounds.bottom,captionBounds.top-label.bottom);
      // Fade before contact, keep the count hidden during overlap, then restore
      // it as the question moves clear. Opacity leaves the passing layout intact.
      taskCount.style.opacity=Math.max(0,Math.min(1,gap/18));
    }
  } else { bridge.style.top='';bridge.style.left='';bridge.style.width='';bridge.style.opacity=s.bridgeOpacity; }
  if(s.step===0) {
    for(const [selector,progress] of [['.plot-axis',s.chartFrame.axis],['.plot-guide',s.chartFrame.guide]]){
      const line=$(`#chart ${selector}`);
      if(line){line.style.strokeDashoffset=1-progress;line.style.opacity=progress>0?1:0;}
    }
    document.querySelectorAll('[data-model]').forEach((el,i)=>{el.style.opacity=s.chartFrame.labels[i];});
    document.querySelectorAll('#chart .rank-direction,#chart .zero').forEach(el=>{el.style.opacity=s.chartFrame.axis;});
    $('.lock-note').style.opacity=s.chartFrame.lock;
    $('.lock-note path').style.strokeDashoffset=1-s.chartFrame.lock;
    $('#chart').setAttribute('aria-label',s.phase==='question'?copy.chartCue:s.phase==='prediction'
      ? `${copy.firstPrediction} The dashed line shows a direction, not predicted numbers.`
      : `Extra jobs done right out of every 100 when the tests decide instead of the AI. ${models.map(m=>`${m.name}: ${gainLabel(m.gain)}`).join('; ')}. ${copy.firstCaveat}`);
    $('#first-caption').textContent=s.phase!=='result'?copy.firstPrediction:`${copy.firstPrediction} ${copy.firstOutcome}`;
    $('#first-caption').style.opacity=s.captionOpacity;
    $('#chart-cue').style.opacity=s.cueOpacity;
    $('#chart-cue').hidden=s.cueOpacity===0;
    $('#first-caveat').style.opacity=s.resultOpacity;
    $('#misses').style.opacity=s.resultOpacity;
    const p=s.resultProgress;
    $('#chart .observed').style.opacity=s.observedOpacity;
    const expected=$('#chart .expectation');
    expected.style.opacity=.9*s.predictionOpacity-.5*s.resultOpacity;
    expected.setAttribute('d',s.phase==='result'?expected.dataset.broken:expected.dataset.whole);
    const remaining=100*(1-s.predictionProgress);
    expected.style.clipPath=chartMobile?`inset(0 0 ${remaining}% 0)`:`inset(0 ${remaining}% 0 0)`;
    $('#chart .expected-label').style.opacity=s.predictionOpacity;
    document.querySelectorAll('[data-point]').forEach((el,i)=>{
      const reveal=ease((p*8-i)/1.3);
      el.style.opacity=reveal;
      el.setAttribute('transform',`translate(0,${-15*(1-reveal)})`);
      document.querySelector(`[data-gain="${i}"]`).style.opacity=reveal;
    });
  } else $('#misses').style.opacity='';
  $('#scrub').value=s.time;
  const status=s.settled?'The line so far':s.playing?separate('Playing','touch anywhere to pause'):separate('Paused','choose a step');
  if(status!==lastStatus){setSeparatedText($('#play-status'),status);lastStatus=status;}
  $('#play').textContent=s.playing?'Pause':s.settled?'Play again':'Keep playing';
  if(s.phase!==lastPhase){document.body.dataset.phase=s.phase;lastPhase=s.phase;}
}

let frame=0;
function stopFrame(){cancelAnimationFrame(frame);frame=0;}
function animate(now){
  if(!playback.state.playing){frame=0;return;}
  playback.frame(now);render();
  frame=playback.state.playing?requestAnimationFrame(animate):0;
}
function play(){playback.play();playback.frame(performance.now());render();if(!frame)frame=requestAnimationFrame(animate);}
function pause(){playback.pause();stopFrame();render();}
function go(step){playback.go(step);stopFrame();render();}
function seek(time){playback.seek(time);stopFrame();render();}
function settle(){playback.settle();stopFrame();render();}
// Capture remembers the button's pre-touch state, then pauses without swallowing the click.
let playWasRunning=false;
bindPauseInputs(window,pause,event=>{
  const activatesPlay=event.type==='pointerdown'||event.type==='keydown'&&(event.key==='Enter'||event.key===' ');
  if(activatesPlay&&event.target?.closest?.('#play'))playWasRunning=playback.state.playing;
});
$('#play').addEventListener('click',()=>{if(playWasRunning){pause();playWasRunning=false;}else{play();}});
function showStep(step){
  go(step);
  $(step===4?'#overview-title':'#card-title').focus({preventScroll:true});
}
document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>showStep(Number(el.dataset.go))));
$('#show-all').addEventListener('click',()=>showStep(4));
$('#scrub').addEventListener('input',event=>seek(Number(event.target.value)));
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
motion.addEventListener('change',event=>{if(event.matches)settle();});
window.addEventListener('resize',()=>{buildChart();render();});
window.__station={get state(){return {...playback.state};},play,pause,go,seek,settle};
buildChart();render();
if(playback.state.playing){playback.frame(performance.now());frame=requestAnimationFrame(animate);}
