import { SUBJECTS, clampThreshold, selectRows, summarize, makeSnapshot, restoreSnapshot, validateDataset } from './model.js';
import { createCutoffDemo } from './demo.js?v=6';
import { explainCalculation, explanationStep } from './explanation.js?v=8';
import { createAnalyst } from './analyst.js?v=9b';

const $ = id => document.getElementById(id);
const analyst=createAnalyst($('analyst-stage'));
let analystPhase=.4, analystTime=0, analystMoving=false, analystSnapshot={count:40,sum:1531,mean:38.275};
function paintAnalyst(){analyst?.frame({...analystSnapshot,step:guideStep,phase:analystPhase,time:analystTime,moving:analystMoving});}
const STORAGE = 'adsp-experience-v1';
const PAGE_SIZE = 8;
const NS = 'http://www.w3.org/2000/svg';
let rows = [], datasetHash = '', points = new Map(), baseline = {}, saved = null;
let state = { threshold: 50, subject: 'maths', view: 'spatial' };
let evidence = null, tablePage = 0, announcementTimer, focusedRow = null;
let sourceExpanded = false, sourcePage = 0, liftedRow = null, lifting = false, plottedSubject = null;
let guideStep = 0, explanations = [], folded = { input: false, output: false };
const panelIds = ['data-input', 'experiment', 'answer-step'];
const controlStrip = document.querySelector('.control-strip');
const smallLayout = matchMedia('(max-width:820px)');
smallLayout.addEventListener('change', () => { applyView(); scheduleGeometry(); });
const fmt = value => value === null ? '—' : value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const totalFmt = value => value.toLocaleString('en-US', { maximumFractionDigits: 1 });
const recordNumber = row => String(Number(row.id.slice(1)) - 1000).padStart(3, '0');
const attendanceText = row => row.attendance === null ? 'Not recorded' : `${row.attendance.toFixed(1)}%`;
function announce(text) { clearTimeout(announcementTimer); announcementTimer = setTimeout(() => { $('announcement').textContent = text; }, 220); }
function persist() {
  try { localStorage.setItem(STORAGE, JSON.stringify({ ...state, saved, datasetHash })); }
  catch { $('storage-note').hidden = false; }
}
function restore() {
  try {
    const previous = JSON.parse(localStorage.getItem(STORAGE) || 'null');
    if (previous?.datasetHash === datasetHash) {
      state.threshold = clampThreshold(previous.threshold);
      if (Object.hasOwn(SUBJECTS, previous.subject)) state.subject = previous.subject;
      if (['flat', 'spatial'].includes(previous.view)) state.view = previous.view;
      saved = restoreSnapshot(previous.saved, rows, datasetHash);
    }
  } catch { /* Unavailable or stale storage must not prevent the demonstration. */ }
  const queryView = new URLSearchParams(location.search).get('view');
  if (['flat', 'spatial'].includes(queryView)) state.view = queryView;
}
function initPoints() {
  const fragment = document.createDocumentFragment();
  points.clear(); plottedSubject = null;
  for (const row of rows) {
    if (row.attendance === null) continue;
    const circle = document.createElementNS(NS, 'circle');
    circle.classList.add('record-point');
    circle.setAttribute('cy', String(228 - row.attendance * 2.12));
    circle.setAttribute('r', '2.8');
    const title = document.createElementNS(NS, 'title');
    circle.append(title);
    circle.addEventListener('click', event => {
      event.stopPropagation();
      if (dragMoved) return;
      focusedRow = row.id;
      update();
      liftRecord(row);
    });
    points.set(row.id, circle); fragment.append(circle);
  }
  $('plot-points').replaceChildren(fragment);
}
function currentSnapshot() { return makeSnapshot(rows, state.threshold, state.subject, datasetHash); }
function update({ speak = false, persistState = true } = {}) {
  if (!rows.length) return;
  const snapshot = currentSnapshot(), group = selectRows(rows, state.threshold), reference = baseline[state.subject];
  analystSnapshot=snapshot;
  explanations = explainCalculation(snapshot, reference.mean);
  renderExplanation();
  const subject = SUBJECTS[state.subject];
  const subjectInSentence = state.subject === 'english' ? 'English' : 'maths';
  $('threshold').value = state.threshold;
  $('threshold').style.setProperty('--progress', `${state.threshold}%`);
  $('threshold-output').value = state.threshold;
  $('question-subject').textContent = subjectInSentence;
  $('question-cutoff').textContent = state.threshold;
  $('answer-scope').textContent = `${subject} · attendance below ${state.threshold}%`;
  $('selection-preview').textContent = `${snapshot.count} students`;
  $('mean-preview').textContent = snapshot.mean === null ? 'No average' : `${fmt(snapshot.mean)} average`;
  $('visible-calculation').textContent = snapshot.count ? `${totalFmt(snapshot.sum)} ÷ ${snapshot.count} = ${fmt(snapshot.mean)}` : 'No students → no average';
  $('source-selection').textContent = `${snapshot.count} of 520 students selected`;
  $('source-rule').textContent = `Attendance below ${state.threshold}%`;
  $('source-average').textContent = snapshot.mean === null ? 'No selected average' : `${subject} average → ${fmt(snapshot.mean)}`;
  for (const tr of $('input-rows').children) {
    const selected=tr.dataset.attendance !== '' && Number(tr.dataset.attendance) < state.threshold;
    tr.classList.toggle('input-selected', selected);
    tr.setAttribute('aria-selected', String(selected));
  }
  $('threshold').setAttribute('aria-valuetext', `Below ${state.threshold}% attendance, ${snapshot.count} selected records`);
  $('scope-count').textContent = `${snapshot.count} of ${rows.length} students`;
  $('selected-mean').textContent = fmt(snapshot.mean);
  $('baseline-mean').textContent = fmt(reference.mean);
  $('inspect-mean').setAttribute('aria-label', `Inspect ${subject.toLowerCase()} mean ${fmt(snapshot.mean)} for ${snapshot.count} records`);
  for (const key of Object.keys(SUBJECTS)) $(`subject-${key}`).setAttribute('aria-pressed', String(state.subject === key));
  const delta = snapshot.mean === null ? null : snapshot.mean - reference.mean;
  $('result-description').replaceChildren();
  if (delta === null) $('result-description').textContent = 'No records meet this cutoff. Increase it to compare a group with the whole dataset.';
  else {
    const strong = document.createElement('strong');
    strong.textContent = Math.abs(delta) < 0.05 ? 'the same mean' : `${fmt(Math.abs(delta))} points ${delta < 0 ? 'lower' : 'higher'}`;
    $('result-description').append(`${snapshot.count} students have attendance below ${state.threshold}%. Their average ${subjectInSentence} score is `, strong, ' than the average for all 520 students.');
    if (fmt(snapshot.mean) === fmt(reference.mean)) $('result-description').textContent = `Both means round to ${fmt(snapshot.mean)}. The selected group and whole dataset have almost the same mean ${subjectInSentence} score.`;
  }
  $('flow-label-two').textContent = snapshot.mean===null?'No average':`${fmt(snapshot.mean)} average`;
  $('calc-sum').textContent = snapshot.count ? totalFmt(snapshot.sum) : '—';
  $('calc-count').textContent = snapshot.count;
  $('calc-mean').textContent = fmt(snapshot.mean);
  $('calculation-sentence').textContent = explanations[1].sentence;
  $('calc-empty').hidden = snapshot.count > 0;
  $('calculation-plane').classList.toggle('is-empty', snapshot.count === 0);
  $('calculation-plane').querySelector('.arithmetic').hidden = false;
  $('calculation-plane').querySelector('.arithmetic-labels').hidden = false;
  $('chart-subject-label').textContent = `${subject} × attendance`;
  $('plot-title').textContent = `${subject} scores by attendance`;
  $('plot-description').textContent = `${snapshot.count} of 520 records have known attendance below ${state.threshold}%. Those records are highlighted. Six records with no attendance are omitted from this plot and can be inspected separately.`;
  $('x-label').textContent = `${subject} score`;
  $('plot-selected-label').textContent = `${snapshot.count} selected`;
  const cutoffY = 228 - state.threshold * 2.12;
  $('selection-region').setAttribute('y', cutoffY);
  $('selection-region').setAttribute('height', 228 - cutoffY);
  $('cutoff-line').setAttribute('d', `M48 ${cutoffY}H462`);
  $('cutoff-tag').setAttribute('transform', `translate(420 ${Math.max(16, cutoffY - 9)})`);
  $('cutoff-tag-text').textContent = `< ${state.threshold}%`;
  for (const row of rows) {
    const point = points.get(row.id); if (!point) continue;
    if(plottedSubject !== state.subject) point.setAttribute('cx', 48 + row[state.subject] * 4.14);
    point.classList.toggle('selected', row.attendance < state.threshold);
    point.classList.toggle('focused', focusedRow === row.id);
    if(plottedSubject !== state.subject) point.firstChild.textContent = `Record ${recordNumber(row)} · ${subject} ${row[state.subject]} · attendance ${row.attendance}%`;
  }
  plottedSubject = state.subject;
  const example = rows.find(row => row.id === (focusedRow || 'S1022'));
  const cueX = 48 + example[state.subject] * 4.14, cueY = 228 - example.attendance * 2.12;
  $('point-cue-ring').setAttribute('cx', cueX); $('point-cue-ring').setAttribute('cy', cueY);
  const cueSide=cueX>330?-1:1, cueBelow=cueY>190?-1:1;
  $('point-cue-line').setAttribute('d',`M${cueX+8*cueSide} ${cueY+4*cueBelow}L${cueX+24*cueSide} ${cueY+20*cueBelow}H${cueX+96*cueSide}`);
  $('point-cue-text').setAttribute('x',cueX+28*cueSide);$('point-cue-text').setAttribute('y',cueY+33*cueBelow);
  $('point-cue-text').setAttribute('text-anchor',cueSide<0?'end':'start');
  $('point-cue-text').textContent=liftedRow?`STUDENT ${recordNumber(liftedRow)}`:'OPEN A ROW';
  $('decrease').disabled = state.threshold === 0; $('increase').disabled = state.threshold === 100;
  updateSaved(); updateLiftedRecord(); if (persistState) persist();
  if (speak) announce(`${snapshot.count} selected records. Mean ${subject.toLowerCase()} score ${fmt(snapshot.mean)}; whole-data mean ${fmt(reference.mean)}.`);
}
function renderExplanation() {
  if (!explanations.length) return;
  $('process-title').textContent = ['Choosing the students', 'Calculating the average', 'Reading the answer'][guideStep];
  $('process-sentence').textContent = explanations[guideStep].sentence;
  panelIds.forEach((id, index) => $(id).classList.toggle('is-current', index === guideStep));
  $('scene').dataset.guide = guideStep;
  $('analyst-action').textContent=['Find the selected rows','Add the scores. Divide by the count.','Bring the answer back to the data'][guideStep];
  paintAnalyst();
  $('room-surfaces').style.setProperty('--light-x', `${[20, 50, 80][guideStep]}%`);
}
function setGuideStep(step) {
  if (step === guideStep) return;
  guideStep = step;
  renderExplanation();
}
function foldPanel(kind) {
  folded[kind] = !folded[kind];
  const input = kind === 'input', panel = $(input ? 'data-input' : 'answer-step');
  if (!input && liftedRow) closePoint();
  panel.classList.toggle('is-folded', folded[kind]);
  const button = $(input ? 'fold-input' : 'fold-output');
  button.setAttribute('aria-expanded', String(!folded[kind]));
  button.querySelector('.fold-label').textContent = folded[kind] ? 'Open +' : 'Fold −';
  button.setAttribute('aria-label', `${folded[kind] ? 'Open' : 'Fold'} ${input ? 'input rows' : 'answer chart'}`);
  setGuideStep(input ? 0 : 2);
  scheduleGeometry();
}
function rowElement(row, subject) {
  const tr = document.createElement('tr');
  if (row.id === focusedRow) tr.classList.add('row-focused');
  [recordNumber(row), attendanceText(row), row.maths, row.english].forEach((value, index) => {
    const td = document.createElement('td'); td.textContent = value;
    if ((subject === 'maths' && index === 2) || (subject === 'english' && index === 3)) td.classList.add('highlight-subject', 'maths-cell');
    tr.append(td);
  });
  return tr;
}
function renderSource() {
  if(!rows.length) return;
  const query=$('source-search').value.trim();
  const filtered=rows.filter(row=>!query || recordNumber(row).includes(query));
  const pages=Math.max(1,Math.ceil(filtered.length/6));
  sourcePage=Math.min(sourcePage,pages-1);
  const preview=sourceExpanded ? filtered.slice(sourcePage*6,sourcePage*6+6) : [rows[0],rows[17],rows[21],rows[67]];
  $('input-rows').replaceChildren(...preview.map(row=>{const tr=rowElement(row,state.subject);tr.dataset.attendance=row.attendance ?? '';return tr;}));
  if(!preview.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=4;td.textContent='No matching student.';tr.append(td);$('input-rows').append(tr);}
  $('source-page-label').textContent=`${filtered.length} ${query ? (filtered.length===1 ? 'match' : 'matches') : 'students'} · page ${sourcePage+1}/${pages}`;
  $('source-prev').disabled=sourcePage===0; $('source-next').disabled=sourcePage>=pages-1;
  update({persistState:false});
}
function updateSaved() {
  $('saved-comparison').hidden = !saved;
  if (!saved) return;
  $('pin-label').textContent = `${SUBJECTS[saved.subject]} · below ${saved.threshold}% · ${saved.count} records`;
  $('pin-value').textContent = fmt(saved.mean);
}
function applyView() {
  $('scene').classList.toggle('is-spatial', state.view === 'spatial');
  $('scene').classList.toggle('is-flat', state.view === 'flat');
  $('view-spatial').setAttribute('aria-pressed', String(state.view === 'spatial'));
  $('view-flat').setAttribute('aria-pressed', String(state.view === 'flat'));
  $('reset-camera').hidden = state.view === 'flat';
  $('scene-hint').textContent = state.view === 'flat' ? 'All three pages face you.' : 'Drag the space to turn the pages.';
  scheduleGeometry();

}
function setThreshold(value) { state.threshold = clampThreshold(value); update({ speak: true }); $('control-summary').textContent='Blue students make up this average.'; $('pause-prompt').textContent='Explore a dot, or resume the flow.'; }
function openEvidence(kind, row = null) {
  if (!rows.length) return;
  const snapshot = kind === 'saved' ? saved : currentSnapshot();
  if (!snapshot) return;
  setGuideStep(kind === 'input' ? 0 : kind === 'calculation' || kind === 'missing' ? 1 : 2);
  const ids = new Set(snapshot.rowIds);
  const records = kind === 'input' ? rows : kind === 'missing' ? rows.filter(item => item.attendance === null) : kind === 'single' ? [row] : rows.filter(item => ids.has(item.id));
  evidence = { kind, snapshot, rows: records }; tablePage = 0; $('row-search').value = '';
  const subject = SUBJECTS[snapshot.subject];
  $('evidence-kicker').textContent = kind === 'input' ? '01 · The input' : kind === 'saved' ? 'Your kept comparison' : kind === 'missing' ? 'Missing attendance' : '03 · Check the answer';
  $('evidence-title').textContent = kind === 'input' ? 'classroom.csv' : kind === 'calculation' ? 'The average, calculated.' : kind === 'missing' ? 'Attendance not recorded.' : kind === 'single' ? `Student ${recordNumber(row)}` : 'The students in this answer.';
  $('evidence-context').replaceChildren();
  const badge = document.createElement('span'); badge.className = 'scope-badge';
  badge.textContent = kind === 'input' ? '520 students · entire sample' : kind === 'missing' ? '6 missing attendance values' : kind === 'single' ? `One student · opened at ${snapshot.threshold}% cutoff` : `${records.length} students · attendance below ${snapshot.threshold}%`;
  $('evidence-context').append(badge, kind === 'saved' ? ' Kept scope · independent of your current selection' : ' Classroom demonstration data');
  $('evidence-math').hidden = ['input','missing', 'single'].includes(kind);
  $('evidence-math').replaceChildren();
  if (!['input','missing', 'single'].includes(kind)) {
    $('evidence-math').append(snapshot.count ? `${totalFmt(snapshot.sum)} ÷ ${snapshot.count} = ${fmt(snapshot.mean)}` : 'No records → no mean');
    const small = document.createElement('small'); small.textContent = `${subject} score total ÷ selected records = mean score`; $('evidence-math').append(small);
  }
  $('evidence-explanation').textContent = kind === 'input' ? 'The input stays the same when you move the slider. It changes which students are selected for the calculation. This is fictional demonstration data.' : kind === 'missing'
    ? 'These records stay in the whole-data score baseline. They cannot be placed above or below an attendance cutoff, so they are excluded from the attendance plot and threshold selection.'
    : kind === 'single' ? `Attendance ${row.attendance}% is ${row.attendance < snapshot.threshold ? 'below' : 'not below'} the ${snapshot.threshold}% cutoff. This student is ${row.attendance < snapshot.threshold ? 'included in' : 'excluded from'} the selected average.`
    : records.length ? `These ${records.length} records produce the mean. The baseline uses all 520 records, including this group.` : 'No records meet this cutoff. There is no mean to calculate; the whole-data baseline is still available.';
  renderEvidenceTable();
  if (!$('evidence-dialog').open) $('evidence-dialog').showModal();
}
function renderEvidenceTable() {
  if (!evidence) return;
  const query = $('row-search').value.trim().toLowerCase();
  const filtered = evidence.rows.filter(row => !query || recordNumber(row).includes(query));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  tablePage = Math.min(Math.max(0, tablePage), pages - 1);
  const part = filtered.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE);
  $('evidence-rows').replaceChildren(...part.map(row => rowElement(row, evidence.snapshot.subject)));
  $('table-empty').hidden = part.length > 0;
  $('table-count').textContent = query ? `${filtered.length} matching / ${evidence.rows.length} records` : `${evidence.rows.length} ${evidence.rows.length === 1 ? 'record' : 'records'} in this view`;
  $('page-label').textContent = `Page ${tablePage + 1} of ${pages}`;
  $('previous-page').disabled = tablePage === 0; $('next-page').disabled = tablePage >= pages - 1;
}

let drag = null, dragMoved = false, camera = { x:0, y:0 };
function resetCamera() {
  camera = {x:0,y:0};
  analyst?.reset();
  $('scene-orbit').style.setProperty('--rx','0deg'); $('scene-orbit').style.setProperty('--ry','0deg');
  scheduleGeometry();
}
$('scene').addEventListener('pointerdown',event=>{
  if(state.view!=='spatial' || event.button!==0 || event.pointerType==='touch' || event.target.closest('.workflow-paper,.analyst-stage,button,a'))return;
  event.preventDefault();
  $('scene').setPointerCapture(event.pointerId);
  $('scene').classList.add('is-dragging');
  drag={startX:event.clientX,startY:event.clientY,pointerId:event.pointerId,...camera}; dragMoved=false;
});
window.addEventListener('pointermove',event=>{
  if(!drag)return;
  const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
  if(Math.hypot(dx,dy)>4)dragMoved=true;
  if(!dragMoved)return;
  camera.x=Math.max(-3,Math.min(3,drag.x-dy*.035));camera.y=Math.max(-3,Math.min(3,drag.y+dx*.035));
  $('scene-orbit').style.setProperty('--rx',`${camera.x}deg`);$('scene-orbit').style.setProperty('--ry',`${camera.y}deg`);
  scheduleGeometry();
});
function finishSceneDrag(){
  if(drag && $('scene').hasPointerCapture(drag.pointerId))$('scene').releasePointerCapture(drag.pointerId);
  drag=null;$('scene').classList.remove('is-dragging');scheduleGeometry();
  setTimeout(()=>{dragMoved=false;},0);
}
window.addEventListener('pointerup',finishSceneDrag);
window.addEventListener('pointercancel',finishSceneDrag);
window.addEventListener('blur',finishSceneDrag);
let geometryFrame = null;
function scheduleGeometry(){
  if(geometryFrame !== null)return;
  geometryFrame=requestAnimationFrame(()=>{geometryFrame=null;drawFlow();});
}
function drawFlow(){
  const scene=$('scene').getBoundingClientRect();
  const boxes=['data-input','experiment','answer-step'].map(id=>$(id).getBoundingClientRect());
  const room=$('room-surfaces').getBoundingClientRect();
  const radiusX=room.width*.48, depth=smallLayout.matches?165:Math.max(220,Math.min(285,scene.width*.20));
  const footprintIds=smallLayout.matches?['answer-step']:panelIds;
  const feet=footprintIds.flatMap(id=>['.contact-start','.contact-end'].map(selector=>$(id).querySelector(selector).getBoundingClientRect()));
  const centerY=Math.max(...feet.map(point=>{
    const normalizedX=(point.left-scene.left-scene.width/2)/radiusX;
    return point.top-scene.top+16-depth/2*Math.sqrt(Math.max(.01,1-normalizedX**2));
  }));
  $('room-surfaces').style.setProperty('--table-y',`${centerY-depth/2}px`);
  $('room-surfaces').style.setProperty('--table-depth',`${depth}px`);
  boxes.forEach((box,i)=>{const shadow=$(`shadow-${i}`);shadow.style.left=`${box.left-scene.left+box.width*.12}px`;shadow.style.top=`${box.bottom-scene.top-5}px`;shadow.style.width=`${box.width*.95}px`;});
  $('flow-connections').setAttribute('viewBox',`0 0 ${scene.width} ${scene.height}`);
  $('floor-contacts').setAttribute('viewBox',`0 0 ${scene.width} ${scene.height}`);
  ['data-input','experiment','answer-step'].forEach((id,i)=>{
    const a=$(id).querySelector('.contact-start').getBoundingClientRect(),b=$(id).querySelector('.contact-end').getBoundingClientRect();
    $(`contact-${i}`).setAttribute('d',`M${a.left-scene.left} ${a.top-scene.top+2}L${b.left-scene.left} ${b.top-scene.top+2}`);
  });
  for(let i=0;i<2;i++){
    const a=boxes[i],b=boxes[i+1];let path,labelX,labelY;
    if(smallLayout.matches){
      const x1=a.left-scene.left+a.width*.62,y1=a.bottom-scene.top+8;
      const x2=b.left-scene.left+b.width*.4,y2=b.top-scene.top-9;
      const mid=(y1+y2)/2;
      path=`M${x1} ${y1}C${x1+32} ${mid},${x2-32} ${mid},${x2} ${y2}`;labelX=(x1+x2)/2+45;labelY=mid;
    }else{
      const x1=a.right-scene.left+5,x2=b.left-scene.left-5;
      // One shared horizontal axis connects all three working pages.
      const sharedY=(Math.max(...boxes.map(box=>box.top))+Math.min(...boxes.map(box=>box.bottom)))/2-scene.top;
      path=`M${x1} ${sharedY}H${x2}`;
      labelX=(x1+x2)/2;labelY=sharedY-20;
    }
    const word=i===0?'one':'two';
    $(`flow-${word}`).setAttribute('d',path);$(`flow-pulse-${word}`).setAttribute('d',path);
    $(`flow-label-${word}`).style.left=`${labelX}px`;$(`flow-label-${word}`).style.top=`${labelY}px`;
  }
  drawTether();
}
function drawTether(){
  $('inspection-tether').toggleAttribute('hidden',!liftedRow);
  if(!liftedRow)return;
  const base=$('scene').getBoundingClientRect(),point=points.get(liftedRow.id).getBoundingClientRect();
  const x=point.left+point.width/2-base.left,y=point.top+point.height/2-base.top;
  if(!lifting){
    const width=smallLayout.matches?280:310;
    $('point-card').style.left=`${Math.max(22,Math.min(base.width-width-30,x-80))}px`;
    $('point-card').style.top=`${Math.max(20,y-$('point-card').offsetHeight-45)}px`;
    // Correct the projected position, so the raised card cannot cover its source dot.
    for(let pass=0;pass<2;pass++){
      const projected=$('point-card').getBoundingClientRect(), pointY=point.top+point.height/2;
      const minimumTop=20;
      const desiredTop=pointY-projected.height-30>=minimumTop?pointY-projected.height-30:pointY+30;
      const scale=projected.height/$('point-card').offsetHeight;
      $('point-card').style.top=`${parseFloat($('point-card').style.top)+(desiredTop-projected.top)/scale}px`;
    }
  }
  const card=$('point-card').getBoundingClientRect();
  const endX=card.left+card.width*.22-base.left,endY=(point.top>card.bottom?card.bottom:card.top)-base.top;
  $('inspection-tether').setAttribute('d',`M${x} ${y}Q${x-25} ${y-10},${endX} ${endY}`);
}
function liftRecord(row){
  setGuideStep(2);
  lifting=false;liftedRow=row;focusedRow=row.id;$('point-card').hidden=false;$('answer-step').classList.add('point-card-open');
  $('try-point').setAttribute('aria-expanded','true');update();
  drawTether();
  const card=$('point-card'),dot=points.get(row.id).getBoundingClientRect(),base=$('scene').getBoundingClientRect();
  const originX=dot.left+dot.width/2-base.left-parseFloat(card.style.left)-card.offsetWidth/2;
  const originY=dot.top+dot.height/2-base.top-parseFloat(card.style.top)-card.offsetHeight;
  card.getAnimations().forEach(animation=>animation.cancel());
  if(!reducedMotion.matches && $('allow-motion').checked){
    lifting=true;const rise=card.animate([{opacity:.1,transform:`perspective(900px) translate(${originX}px,${originY}px) scale(.06)`},{opacity:1,transform:'perspective(900px) translateZ(45px) rotateX(3deg) rotateY(-5deg)'}],{duration:700,easing:'cubic-bezier(.16,1,.3,1)'});
    rise.onfinish=()=>{lifting=false;drawTether();};
    function followRise(){drawTether();if(rise.playState==='running')requestAnimationFrame(followRise);}requestAnimationFrame(followRise);
  }
  requestAnimationFrame(drawTether);setTimeout(drawTether,800);
  $('pause-prompt').textContent='Read this row, or choose another dot.'; $('control-summary').textContent='Move the slider to change the group.';
  $('close-point').focus({preventScroll:true});announce(`Student ${recordNumber(row)}, attendance ${attendanceText(row)}. Row opened from the chart.`);
}
function updateLiftedRecord(){
  if(!liftedRow)return;
  $('point-title').textContent=`Student ${recordNumber(liftedRow)}`;
  $('point-attendance').textContent=attendanceText(liftedRow);$('point-maths').textContent=liftedRow.maths;$('point-english').textContent=liftedRow.english;
  requestAnimationFrame(drawTether);
  $('point-membership').textContent=liftedRow.attendance<state.threshold ? `Included: ${attendanceText(liftedRow)} is below the ${state.threshold}% cutoff.` : `Outside this group: ${attendanceText(liftedRow)} is not below ${state.threshold}%.`;
}
function closePoint(){lifting=false;liftedRow=null;$('inspection-tether').setAttribute('hidden','');$('point-card').hidden=true;$('answer-step').classList.remove('point-card-open');$('try-point').setAttribute('aria-expanded','false');$('try-point').focus({preventScroll:true});$('pause-prompt').textContent='Explore another student, or move the slider.';update({persistState:false});}
$('close-point').addEventListener('click',closePoint);
document.querySelectorAll('.introduction nav a').forEach(link=>link.addEventListener('click',()=>{
  const id=link.getAttribute('href').slice(1), step=panelIds.indexOf(id);
  if(step<0)return;
  if(step===0 && folded.input)foldPanel('input');
  if(step===2 && folded.output)foldPanel('output');
  setGuideStep(step);
}));
for(const [kind,id] of [['input','data-input'],['output','answer-step']]) {
  $(id).addEventListener('click',event=>{
    if(event.target.closest('button,a,input,label,table,svg,.point-invitation,.answer-heading,.input-preview,.source-tools,.source-pages,.input-live,.scope-heading') || window.getSelection()?.toString())return;
    foldPanel(kind);
  });
  $(kind==='input'?'fold-input':'fold-output').addEventListener('click',()=>foldPanel(kind));
}
$('point-full').addEventListener('click',()=>{if(liftedRow)openEvidence('single',liftedRow);});
$('point-card').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closePoint();}});
$('reset-camera').addEventListener('click', resetCamera);
for (const view of ['spatial','flat']) $(`view-${view}`).addEventListener('click', () => { state.view = view; applyView(); persist(); });
for (const subject of Object.keys(SUBJECTS)) $(`subject-${subject}`).addEventListener('click', () => { state.subject = subject; update({ speak:true }); });
$('threshold').addEventListener('input', event => setThreshold(event.target.value));
$('decrease').addEventListener('click', () => setThreshold(state.threshold - 5));
$('increase').addEventListener('click', () => setThreshold(state.threshold + 5));
document.querySelectorAll('[data-inspect]').forEach(button => button.addEventListener('click', () => openEvidence(button.dataset.inspect)));
$('missing-records').addEventListener('click', () => openEvidence('missing'));
$('try-point').addEventListener('click', () => { const row=rows.find(item=>item.id===(focusedRow || 'S1022')); if(row) liftRecord(row); });
$('pin-comparison').addEventListener('click', () => { saved = currentSnapshot(); updateSaved(); persist(); announce(`Kept ${SUBJECTS[saved.subject]} comparison for ${saved.count} records below ${saved.threshold}% attendance.`); });
$('open-pin').addEventListener('click', () => openEvidence('saved'));
$('remove-pin').addEventListener('click', () => { saved = null; updateSaved(); persist(); $('pin-comparison').focus(); announce('Kept comparison removed.'); });
$('reset-all').addEventListener('click', () => { manualChange(); paintPlayback(false); state = { threshold:50, subject:'maths', view:'spatial' }; focusedRow = null; liftedRow=null; $('point-card').hidden=true;$('answer-step').classList.remove('point-card-open'); resetCamera(); applyView(); update({ speak:true }); });
$('close-evidence').addEventListener('click', () => $('evidence-dialog').close());
$('evidence-dialog').addEventListener('click', event => { if (event.target === $('evidence-dialog')) { const box = event.target.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.target.close(); } });
$('row-search').addEventListener('input', () => { tablePage = 0; renderEvidenceTable(); });
$('previous-page').addEventListener('click', () => { tablePage--; renderEvidenceTable(); });
$('next-page').addEventListener('click', () => { tablePage++; renderEvidenceTable(); });
$('method-toggle').addEventListener('click', () => { const expanded = $('method-toggle').getAttribute('aria-expanded') === 'true'; $('method-toggle').setAttribute('aria-expanded',String(!expanded)); $('method-note').hidden = expanded; });
$('retry').addEventListener('click', load);
$('expand-input').addEventListener('click',()=>{
  sourceExpanded=!sourceExpanded;
  $('expand-input').setAttribute('aria-expanded',String(sourceExpanded));
  $('expand-input').textContent=sourceExpanded ? 'Fold spreadsheet back ↑' : 'Open the spreadsheet ↗';
  $('source-tools').hidden=!sourceExpanded; $('source-pages').hidden=!sourceExpanded; $('source-demo').hidden=true;
  $('data-input').classList.toggle('expanded',sourceExpanded); renderSource();
  scheduleGeometry();
});
$('source-search').addEventListener('input',()=>{sourcePage=0;renderSource();});
$('source-prev').addEventListener('click',()=>{sourcePage--;renderSource();});
$('source-next').addEventListener('click',()=>{sourcePage++;renderSource();});

const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
let observer, sceneVisible=true, flowEnabled=true;
$('allow-motion').checked=!reducedMotion.matches;
function paintPlayback(running){
  analystMoving=running;paintAnalyst();
  $('scene').classList.toggle('is-moving',running);
  $('instrument').classList.toggle('is-paused',!running);
  const motionOff=reducedMotion.matches || !$('allow-motion').checked;
  $('demo-toggle').setAttribute('aria-label',motionOff?'Show one change':running?'Pause flow':'Resume flow');
  $('play-icon').textContent=running?'Ⅱ':'▶';
  $('play-label').textContent=motionOff?'Step':running?'Pause':'Resume';
  $('demo-status').textContent=running?'Changing the attendance limit':motionOff?'Motion off':'Choose a group';
  $('pause-prompt').textContent=running?'Click anywhere to take over.':'Flow paused until you resume.';
  $('control-summary').textContent=running?'Move the slider to choose a group.':'Drag to change the student group.';
}
const demo=createCutoffDemo({
  read:()=>state.threshold,write:value=>{state.threshold=value;update({persistState:false});},
  onFrame:progress=>{analystPhase=((progress*6)%1);analystTime=progress*48;if(!smallLayout.matches)setGuideStep(explanationStep(progress));paintAnalyst();},
  status:status=>{paintPlayback(status==='running');if(status!=='running')persist();}
});
function canAnimate(){return flowEnabled && $('allow-motion').checked && !reducedMotion.matches && sceneVisible && !document.hidden;}
function resumeFlow(){if(canAnimate())demo.start();}
function manualChange(){if(!flowEnabled && !demo.running)return;flowEnabled=false;demo.stop('interrupted');paintPlayback(false);}
// Capture before local handlers, including SVG dots that stop propagation.
// Playback itself is the deliberate exception: its click must be able to resume.
for(const type of ['pointerdown','click'])document.addEventListener(type,event=>{
  if(event.target.closest('#demo-toggle,#source-demo'))return;
  manualChange();
  const panel=event.target.closest('.workflow-paper');
  if(panel)setGuideStep(panelIds.indexOf(panel.id));
},true);
document.addEventListener('keydown',event=>{
  if(event.target.closest('#demo-toggle'))return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter',' '].includes(event.key)){
    manualChange();const panel=event.target.closest('.workflow-paper');if(panel)setGuideStep(panelIds.indexOf(panel.id));
  }
},true);
$('threshold').addEventListener('input',manualChange,true);
function toggleDemo(){
  if(reducedMotion.matches || !$('allow-motion').checked){manualChange();setThreshold(state.threshold>70?state.threshold-25:state.threshold+25);return;}
  if(demo.running)manualChange();else{flowEnabled=true;resumeFlow();}
}
$('demo-toggle').addEventListener('click',toggleDemo);
$('source-demo').addEventListener('click',toggleDemo);
$('allow-motion').addEventListener('change',()=>{
  if(!$('allow-motion').checked){manualChange();paintPlayback(false);}
  else{flowEnabled=false;paintPlayback(false);}
});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches){$('allow-motion').checked=false;manualChange();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)demo.stop();else resumeFlow();});
function prepareDemo(){
  observer?.disconnect();observer=new IntersectionObserver(entries=>{sceneVisible=entries[0].isIntersecting;$('instrument').classList.toggle('scene-out-of-view',!sceneVisible);if(sceneVisible)resumeFlow();else demo.stop();},{threshold:0});observer.observe($('scene'));
  if(reducedMotion.matches)paintPlayback(false);else resumeFlow();
}
const visiblePanels=new Map();
const panelObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>visiblePanels.set(entry.target.id,entry.intersectionRatio));
  if(!smallLayout.matches || !flowEnabled)return;
  const current=[...visiblePanels].sort((a,b)=>b[1]-a[1])[0];
  if(current?.[1]>0)setGuideStep(panelIds.indexOf(current[0]));
},{threshold:[0,.25,.5,.75,1]});
panelIds.forEach(id=>panelObserver.observe($(id)));
async function load() {
  $('load-error').hidden = true; $('instrument').setAttribute('aria-busy','true');
  try {
    const response = await fetch('./data/classroom.json'); if (!response.ok) throw new Error('Sample unavailable');
    const payload = validateDataset(await response.json()); rows = payload.rows; datasetHash = payload.metadata.source_sha256;
    baseline = Object.fromEntries(Object.keys(SUBJECTS).map(subject => [subject,summarize(rows,subject)]));
    restore(); initPoints(); resetCamera();
    renderSource(); update(); applyView(); prepareDemo();
    $('instrument').setAttribute('aria-busy','false');
    document.fonts.ready.then(drawFlow);
  } catch (error) { $('load-error').hidden = false; $('instrument').setAttribute('aria-busy','false'); $('result-description').textContent = 'The sample has not loaded. Try again to explore the data.'; console.error('ADSP sample:',error); }
}
const layoutObserver=new ResizeObserver(()=>scheduleGeometry());
layoutObserver.observe($('scene'));
document.querySelectorAll('.workflow-paper').forEach(node=>layoutObserver.observe(node));
window.addEventListener('resize',()=>scheduleGeometry());
load();
