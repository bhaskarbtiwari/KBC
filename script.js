// KBC Kids - improved UI and better Indian voice support for Hindi/Marathi
// Full game script: generates or loads datasets, shows questions, spelling keyboard, and selects voices.

const STATE_KEY = 'kbc_kids_state_v3';

const subjects = [
  { id: 'english', name: 'English' },
  { id: 'hindi', name: 'Hindi' },
  { id: 'marathi', name: 'Marathi' },
  { id: 'math', name: 'Math' },
  { id: 'science', name: 'Science' },
  { id: 'social', name: 'Social Science' },
];

const LEVELS = [
  { id: 'basic', name: 'Basic', range: [1,5], reward: 5 },
  { id: 'intermediate', name: 'Intermediate', range: [6,10], reward: 10 },
  { id: 'advanced', name: 'Advanced', range: [11,20], reward: 20 },
];

function defaultState(){ return { coins:0, unlocked:{ basic:true, intermediate:false, advanced:false }, current:null, grade:1, settings:{}, progress:{}, chapterTitles:{} }; }
let state = defaultState();
let answered = false; // true once the current question has been scored or revealed

// DOM
const subjectsEl = document.getElementById('subjects');
const gameEl = document.getElementById('game');
const menuEl = document.getElementById('menu');
const progressEl = document.getElementById('progress');
const qText = document.getElementById('q-text');
const choicesEl = document.getElementById('choices');
const spellArea = document.getElementById('spell-area');
const playSoundBtn = document.getElementById('play-sound');
const spellInput = document.getElementById('spell-input');
const submitSpell = document.getElementById('submit-spell');
const keyboardEl = document.getElementById('keyboard');
const keyboardHelpEl = document.getElementById('keyboard-help');
const nextBtn = document.getElementById('next-btn');
const quitBtn = document.getElementById('quit-btn');
const messageEl = document.getElementById('message');
const coinsEl = document.getElementById('coins');
const levelEl = document.getElementById('level');
const voiceInfoEl = document.getElementById('voice-info');
const voiceControlsEl = document.getElementById('voice-controls');
const voiceRateEl = document.getElementById('voice-rate');
const voicePitchEl = document.getElementById('voice-pitch');
const voiceRateVal = document.getElementById('voice-rate-val');
const voicePitchVal = document.getElementById('voice-pitch-val');
const viewProgressBtn = document.getElementById('view-progress');
const backToMenuBtn = document.getElementById('back-to-menu');
const progressContent = document.getElementById('progress-content');
const resetBtn = document.getElementById('reset-progress');
const showAnswerEl = document.getElementById('show-answer');
const gradeSelectEl = document.getElementById('grade-select');

// Speech voices
let availableVoices = [];
function loadVoices(){
  availableVoices = window.speechSynthesis.getVoices() || [];
  // update voice info with a best default
  const curSub = state.current && state.current.subjectId ? state.current.subjectId : 'english';
  const v = getBestVoiceForSubject(curSub);
  updateVoiceInfo(v);
  // populate voice select
  const voiceSelect = document.getElementById('voice-select');
  if(voiceSelect){
    voiceSelect.innerHTML = '';
    availableVoices.forEach(vv=>{
      const opt = document.createElement('option'); opt.value = vv.name || vv.voiceURI || vv.lang; opt.textContent = `${vv.name || vv.lang} (${vv.lang})`;
      voiceSelect.appendChild(opt);
    });
    // set selected to current subject setting if available
    const curSubject = state.current && state.current.subjectId ? state.current.subjectId : null;
    const selName = curSubject && state.settings[curSubject] && state.settings[curSubject].voiceName ? state.settings[curSubject].voiceName : null;
    if(selName){ voiceSelect.value = selName; }
  }

// Sanitize questions loaded from files or generated at runtime
function sanitizeQuestions(subjectId, questions){
  if(!Array.isArray(questions)) return [];
  // filter out questions that clearly belong to another subject (basic heuristic)
  function hasDeva(s){ return /[\u0900-\u097F]/.test(String(s||'')); }
  const filtered = questions.filter(q=>{
    if(!q || !q.q) return false;
    const txt = String(q.q).toLowerCase();
    // remove English-specific prompts from Hindi/Marathi
    if((subjectId==='hindi' || subjectId==='marathi')){
      // require Devanagari in either question or answer to keep as local-language item
      if(!hasDeva(q.q) && !hasDeva(q.answer)) return false;
      if(/choose the correct word/.test(txt)) return false;
    }
    // for English, drop obviously Devanagari items
    if(subjectId==='english' && hasDeva(q.q + ' ' + q.answer)) return false;
    return true;
  });
  // dedupe by normalized q+answer
  const seen = new Set(); const out = [];
  for(const q of shuffle(filtered)){
    const key = `${(q.q||'').toString().trim()}|${(q.answer||'').toString().trim()}`;
    const nk = key.replace(/\s+/g,' ').toLowerCase();
    if(seen.has(nk)) continue;
    seen.add(nk); out.push(q);
  }
  return out;
}
}

// Play a short celebratory jingle using WebAudio when the user answers correctly
function playCorrectJingle(){
  try{
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain(); gain.connect(ctx.destination); gain.gain.setValueAtTime(0.0001, now);
    // melody (frequencies) - simple major arpeggio
    const notes = [523.25,659.25,783.99,1046.50]; // C5,E5,G5,C6
    let t = now;
    notes.forEach((f,i)=>{
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(f, t);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.01);
      g.gain.linearRampToValueAtTime(0.0001, t + 0.18);
      osc.stop(t + 0.2);
      t += 0.18;
    });
    // close context after short delay to free resources
    setTimeout(()=>{ try{ ctx.close(); }catch(e){} }, 800);
  }catch(e){ /* ignore */ }
}
if('speechSynthesis' in window){
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function getBestVoice(langPrefs){
  if(!availableVoices || availableVoices.length===0) return null;
  for(const lp of langPrefs){
    for(const v of availableVoices){
      if(v.lang && v.lang.toLowerCase().startsWith(lp.toLowerCase())) return v;
    }
  }
  for(const v of availableVoices){
    const n = (v.name||'').toLowerCase();
    if(n.includes('ind') || n.includes('hindi') || n.includes('marathi') || (n.includes('google') && n.includes('india'))) return v;
  }
  for(const v of availableVoices){ if(v.lang && v.lang.toLowerCase().startsWith('en-in')) return v; }
  return availableVoices[0];
}

function getBestVoiceForSubject(subjectId){
  if(!availableVoices || availableVoices.length===0) return null;
  if(subjectId === 'hindi') return getBestVoice(['hi-IN','hi','en-IN']);
  if(subjectId === 'marathi') return getBestVoice(['mr-IN','mr','hi-IN']);
  if(subjectId === 'english') return getBestVoice(['en-IN','en-US','en-GB']);
  return getBestVoice(['en-US','en-GB']);
}

function updateVoiceInfo(voice){
  if(!voice){ voiceInfoEl.textContent = 'Voice: Auto'; return; }
  voiceInfoEl.textContent = `Voice: ${voice.name || voice.lang}`;
}

// Save per-subject rate/pitch changes
if(voiceRateEl){
  voiceRateEl.addEventListener('change', ()=>{
    const curSub = state.current && state.current.subjectId ? state.current.subjectId : null;
    if(curSub){ state.settings[curSub] = state.settings[curSub] || {}; state.settings[curSub].rate = voiceRateEl.value; saveState(); }
    if(voiceRateVal) voiceRateVal.textContent = parseFloat(voiceRateEl.value).toFixed(2);
  });
}
if(voicePitchEl){
  voicePitchEl.addEventListener('change', ()=>{
    const curSub = state.current && state.current.subjectId ? state.current.subjectId : null;
    if(curSub){ state.settings[curSub] = state.settings[curSub] || {}; state.settings[curSub].pitch = voicePitchEl.value; saveState(); }
    if(voicePitchVal) voicePitchVal.textContent = parseFloat(voicePitchEl.value).toFixed(2);
  });
}

// voice select change handling
const voiceSelectEl = document.getElementById('voice-select');
if(voiceSelectEl){
  voiceSelectEl.addEventListener('change', ()=>{
    const name = voiceSelectEl.value;
    const cur = state.current && state.current.subjectId ? state.current.subjectId : (lastSelected && lastSelected.subjectId);
    if(cur){ state.settings[cur] = state.settings[cur] || {}; state.settings[cur].voiceName = name; saveState(); }
    // pick the actual voice object
    const v = findVoice(name);
    if(v) updateVoiceInfo(v);
  });
}

function findVoice(name){ return availableVoices.find(x=> (x.name||x.voiceURI||x.lang) === name); }

// queue=true speaks after whatever is already playing instead of cutting it off
function speak(text, subjectId, queue){
  if(!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  const chosen = state.settings[subjectId] && state.settings[subjectId].voiceName;
  const v = (chosen && findVoice(chosen)) || getBestVoiceForSubject(subjectId);
  if(v){ utter.voice = v; if(v.lang) utter.lang = v.lang; updateVoiceInfo(v); }
  // read rate/pitch from controls if visible
  let rate = 0.95, pitch = 1;
  if(voiceRateEl) rate = parseFloat(voiceRateEl.value || '0.95');
  if(voicePitchEl) pitch = parseFloat(voicePitchEl.value || '1');
  utter.rate = rate; utter.pitch = pitch;
  if(!queue) window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function saveState(){ localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
function loadState(){ const r = localStorage.getItem(STATE_KEY); if(r){ try{ state = Object.assign(defaultState(), JSON.parse(r)); }catch(e){} } }

function updateHeader(){ coinsEl.textContent = `Gold Coins: ${state.coins}`; const lvl = state.unlocked.advanced ? 'Advanced' : (state.unlocked.intermediate ? 'Intermediate' : 'Basic'); levelEl.textContent = `Level: ${lvl}`; }

function makeSubjects(){
  subjectsEl.innerHTML = '';
  subjects.forEach(s =>{
    const btn = document.createElement('button'); btn.className='subject-btn'; btn.textContent = s.name;
    btn.dataset.subjectId = s.id;
    btn.onclick = ()=> selectSubjectUI(s.id);
    subjectsEl.appendChild(btn);
  });
}

let autoNextTimer = null;
let questionMode = 'both'; // 'both' | 'phoenix' | 'mcq'
let lastLoadedQuestions = null; // raw data or array from last fetch
let lastSelected = null; // { subjectId, grade }

// Wire mode buttons
const modeButtonEls = { both: document.getElementById('mode-both'), phoenix: document.getElementById('mode-phoenix'), mcq: document.getElementById('mode-mcq') };
function setMode(mode){
  questionMode = mode;
  Object.entries(modeButtonEls).forEach(([m,b])=>{ if(b) b.classList.toggle('selected', m===mode); });
}
Object.entries(modeButtonEls).forEach(([mode,b])=>{
  if(b) b.addEventListener('click', ()=>{
    setMode(mode);
    // rebuild the chapter list for the last selected subject/grade
    if(lastLoadedQuestions && lastSelected) buildChaptersUI(lastSelected.subjectId, lastSelected.grade, lastLoadedQuestions);
  });
});

// Select subject in the menu, show chapters (group questions into chapters of 50)
function selectSubjectUI(subjectId){
  // mark selected button
  Array.from(subjectsEl.children).forEach(b=> b.classList.toggle('selected', b.dataset.subjectId === subjectId));
  // load questions for selected subject & current grade
  const grade = gradeSelectEl ? parseInt(gradeSelectEl.value||'1',10) : 1;
  const url = `data/${subjectId}_g${grade}.json`;
  const chapterListEl = document.getElementById('chapter-list');
  chapterListEl.innerHTML = '<div>Loading chapters…</div>';
  const selection = { subjectId, grade };
  lastSelected = selection; lastLoadedQuestions = null;
  const show = data=>{
    if(lastSelected !== selection) return; // another subject or grade was picked meanwhile
    lastLoadedQuestions = data;
    const list = Array.isArray(data) ? data : (data && data.questions) || [];
    const hasSpell = list.some(q=>q.type === 'spell');
    if(modeButtonEls.phoenix) modeButtonEls.phoenix.disabled = !hasSpell;
    if(!hasSpell && questionMode === 'phoenix') setMode('both');
    buildChaptersUI(subjectId, grade, data);
  };
  fetch(url).then(r=>{ if(!r.ok) throw new Error('no'); return r.json(); }).then(show).catch(()=>{
    // fallback: generate a larger pool by repeating generator (preserve fetch handling)
    const pool = [];
    while(pool.length < 500){ // ensure at least 10 chapters of 50
      const more = generateQuestions(subjectId, grade);
      pool.push(...more);
      if(pool.length > 2000) break;
    }
    show(pool);
  });
  // show chapters panel and mode buttons
  const modeButtons = document.getElementById('mode-buttons');
  if(modeButtons){ modeButtons.classList.remove('hidden'); }
  document.getElementById('chapters').classList.remove('hidden');
}

function buildChaptersUI(subjectId, grade, allQuestions){
  const chapterListEl = document.getElementById('chapter-list');
  chapterListEl.innerHTML = '';
  // If data file provides chapter metadata, use it
  if(allQuestions && Array.isArray(allQuestions.questions) && typeof allQuestions.chapterCount === 'number'){
    const questions = allQuestions.questions;
    const chapterCount = allQuestions.chapterCount;
    const names = Array.isArray(allQuestions.chapterNames) ? allQuestions.chapterNames : Array.from({length:chapterCount}, (_,i)=>`Chapter ${i+1}`);
    const chapterSize = Math.max(1, Math.ceil(questions.length / chapterCount));
    // chapterSizes lets chapters differ in length; older files split evenly
    const sizes = Array.isArray(allQuestions.chapterSizes) ? allQuestions.chapterSizes : null;
    let next = 0;
    for(let i=0;i<chapterCount;i++){
      const start = sizes ? next : i*chapterSize;
      const size = sizes ? sizes[i] : chapterSize;
      next = start + size;
      const chunk = questions.slice(start, start + size);
      // filter chunk according to selected questionMode
      const filteredChunk = chunk.filter(q=>{
        if(questionMode === 'phoenix') return q.type === 'spell';
        if(questionMode === 'mcq') return q.type === 'mcq';
        return true;
      });
      const btn = document.createElement('button'); btn.className='chapter-btn';
      btn.dataset.title = names[i] || `Chapter ${i+1}`;
      btn.textContent = `${btn.dataset.title} (${filteredChunk.length} q)`;
      if(filteredChunk.length === 0){ btn.disabled = true; btn.classList.add('disabled'); }
      else btn.onclick = ()=> startChapter(subjectId, grade, i+1, filteredChunk, btn);
      chapterListEl.appendChild(btn);
    }
    return;
  }
  // fallback when questions is raw array
  const arr = Array.isArray(allQuestions) ? allQuestions : (allQuestions && allQuestions.questions) || [];
  // For legacy files (raw array) avoid creating an excessive number of tiny chapters.
  // Prefer a sensible chapter count (max 12) and compute chapter sizes accordingly.
  const maxChapters = 12;
  const approxPerChapter = 180; // target ~180 questions per chapter
  const desiredChapterCount = Math.max(1, Math.min(maxChapters, Math.ceil(arr.length / approxPerChapter)));
  const chapterSize = Math.max(1, Math.ceil(arr.length / desiredChapterCount));
  // build friendly chapter name base depending on subject
  let nameBase = 'Chapter';
  if(['hindi','marathi'].includes(subjectId)) nameBase = 'Vocabulary Set';
  else if(subjectId === 'english') nameBase = 'Spelling & Vocab';
  else if(subjectId === 'math') nameBase = 'Practice Set';
  else if(subjectId === 'science') nameBase = 'Topic';
  else if(subjectId === 'social') nameBase = 'Topic';
  for(let i=0;i<desiredChapterCount;i++){
    const start = i*chapterSize;
    const chunk = arr.slice(start, start + chapterSize);
    const from = start + 1;
    const to = Math.min(arr.length, start + chunk.length);
    const btn = document.createElement('button'); btn.className='chapter-btn';
    const title = `${nameBase} ${i+1}`;
    // apply mode filter
    const filteredChunk = chunk.filter(q=>{
      if(questionMode === 'phoenix') return q.type === 'spell';
      if(questionMode === 'mcq') return q.type === 'mcq';
      return true;
    });
    btn.dataset.title = title;
    btn.textContent = `${title} (Q ${from}-${to}) — ${filteredChunk.length} available`;
    if(filteredChunk.length === 0){ btn.disabled = true; btn.classList.add('disabled'); }
    else btn.onclick = ()=> startChapter(subjectId, grade, i+1, filteredChunk, btn);
    chapterListEl.appendChild(btn);
  }
}

function startChapter(subjectId, grade, chapterNumber, questions, chapterBtn){
  // mark selected chapter
  Array.from(document.getElementById('chapter-list').children).forEach(b=> b.classList.toggle('selected', b===chapterBtn));
  // reset and set state
  state.current = { subjectId, grade, qIndex:0, questions };
  // show chapter title in game
  const chapterTitle = document.getElementById('chapter-title');
  if(chapterTitle){
    const titleFromBtn = chapterBtn && chapterBtn.dataset && chapterBtn.dataset.title ? chapterBtn.dataset.title : `Chapter ${chapterNumber}`;
    chapterTitle.textContent = `${subjects.find(s=>s.id===subjectId).name} — ${titleFromBtn}`;
  }
  saveState();
  showGame();
  // store chapter number and mode for progress tracking
  state.current.chapterNumber = chapterNumber;
  state.current.mode = questionMode;
  // restore progress for this chapter; a finished chapter restarts as practice
  const saved = chapterProgress(state.current);
  if(saved.completed) messageEl.textContent = 'Practice round: you already finished this chapter, so no more coins here.';
  else if(typeof saved.lastIndex === 'number') state.current.qIndex = saved.lastIndex;
  renderQuestion();
}

function startSubject(subjectId){
  const gradeSelect = document.getElementById('grade-select');
  const grade = gradeSelect ? parseInt(gradeSelect.value || '1', 10) : 1;
  const url = `data/${subjectId}_g${grade}.json`;
  fetch(url).then(r=>{ if(!r.ok) throw new Error('no'); return r.json(); }).then(data=>{
    // support both old array format and new object format { questions, chapterCount, chapterNames }
    let questions = Array.isArray(data) ? data : (data && data.questions) ? data.questions : generateQuestions(subjectId, grade);
    questions = sanitizeQuestions(subjectId, questions);
    state.current = { subjectId, grade, qIndex:0, questions };
    saveState(); showGame(); renderQuestion();
  }).catch(()=>{
    // fallback: generate a larger pool by repeating generator (preserve fetch handling)
    const questions = sanitizeQuestions(subjectId, (()=>{ const pool=[]; while(pool.length < 500){ pool.push(...generateQuestions(subjectId, grade)); if(pool.length>2000) break; } return pool; })());
    state.current = { subjectId, grade, qIndex:0, questions };
    saveState(); showGame(); renderQuestion();
  });
}

function chapterProgress(cur){
  const subject = state.progress[cur.subjectId] = state.progress[cur.subjectId] || {};
  const key = `g${cur.grade}_${cur.mode}_c${cur.chapterNumber}`;
  return subject[key] = subject[key] || {};
}

// Mark the current question as used up, so it cannot be scored again
function finishQuestion(){
  answered = true;
  const cur = state.current;
  if(cur && cur.chapterNumber){
    const p = chapterProgress(cur);
    if(!p.completed) p.lastIndex = cur.qIndex + 1;
  }
}

// When the grade selector changes: reset progress and start fresh for new grade
if(gradeSelectEl){
  gradeSelectEl.addEventListener('change', ()=>{
    if(!confirm('Change grade? This will reset your progress and coins for a fresh start.')){
      // revert selection to saved grade if available
      gradeSelectEl.value = String(state.grade);
      return;
    }
    // reset global progress
    state.coins = 0;
    state.unlocked = { basic:true, intermediate:false, advanced:false };
    state.current = null;
    state.progress = {};
    state.grade = parseInt(gradeSelectEl.value,10);
    saveState();
    updateHeader();
    clearSelection();
    showMenu();
    messageEl.textContent = 'Grade changed — progress reset. Choose a subject to start new questions for the selected grade.';
  });
}

function clearSelection(){
  lastSelected = null; lastLoadedQuestions = null;
  document.getElementById('chapters').classList.add('hidden');
  Array.from(subjectsEl.children).forEach(b=> b.classList.remove('selected'));
}

function showGame(){ menuEl.classList.add('hidden'); progressEl.classList.add('hidden'); gameEl.classList.remove('hidden'); messageEl.textContent=''; }
function showMenu(){ clearTimeout(autoNextTimer); if('speechSynthesis' in window) window.speechSynthesis.cancel(); gameEl.classList.add('hidden'); progressEl.classList.add('hidden'); menuEl.classList.remove('hidden'); }
function showProgress(){ menuEl.classList.add('hidden'); gameEl.classList.add('hidden'); progressEl.classList.remove('hidden'); progressContent.innerHTML=''; const div=document.createElement('div'); div.innerHTML=`<p>Total Gold Coins: <strong>${state.coins}</strong></p><p>Unlocked: ${Object.keys(state.unlocked).filter(k=>state.unlocked[k]).join(', ')}</p>`; progressContent.appendChild(div); }

function renderQuestion(){
  clearTimeout(autoNextTimer); answered = false; spellInput.style.borderColor = '';
  updateHeader(); nextBtn.classList.add('hidden'); choicesEl.innerHTML=''; spellArea.classList.add('hidden'); spellInput.value=''; keyboardEl.classList.add('hidden');
  if(voiceControlsEl) voiceControlsEl.style.display = 'none';
  if(showAnswerEl) showAnswerEl.classList.add('hidden');
  if(keyboardHelpEl) keyboardHelpEl.classList.add('hidden');
  const cur = state.current; if(!cur || !cur.questions || cur.questions.length===0){ showMenu(); return; }
  if(cur.qIndex >= cur.questions.length){ completeChapter(cur); return; }
  const q = cur.questions[cur.qIndex]; qText.textContent = `${cur.qIndex+1}. ${q.q}`;
  if(q.type === 'mcq'){
    choicesEl.classList.remove('hidden'); q.choices.forEach(c=>{ const d=document.createElement('div'); d.className='choice'; d.textContent=c; d.onclick=()=>handleMCQAnswer(q,c,d); choicesEl.appendChild(d); });
  } else if(q.type === 'spell'){
    choicesEl.classList.add('hidden'); spellArea.classList.remove('hidden');
    // show voice controls
    if(voiceControlsEl) voiceControlsEl.style.display = 'block';
    // show on-screen keyboard for Hindi/Marathi
    if(['hindi','marathi'].includes(cur.subjectId)){
      keyboardEl.classList.remove('hidden'); renderDevaKeyboard(cur.subjectId); keyboardEl.setAttribute('aria-hidden','false');
    } else { keyboardEl.classList.add('hidden'); keyboardEl.setAttribute('aria-hidden','true'); }
    // restore per-subject voice rate/pitch if saved
    const curSub = cur.subjectId;
    if(state.settings && state.settings[curSub]){
      const s = state.settings[curSub];
      if(voiceRateEl && typeof s.rate !== 'undefined') voiceRateEl.value = s.rate;
      if(voicePitchEl && typeof s.pitch !== 'undefined') voicePitchEl.value = s.pitch;
      if(voiceRateVal && voiceRateEl) voiceRateVal.textContent = parseFloat(voiceRateEl.value).toFixed(2);
      if(voicePitchVal && voicePitchEl) voicePitchVal.textContent = parseFloat(voicePitchEl.value).toFixed(2);
    }
    if(keyboardHelpEl && ['hindi','marathi'].includes(curSub)) keyboardHelpEl.classList.remove('hidden');
    const voiceSelect = document.getElementById('voice-select');
    const voice = findVoice(state.settings[curSub] && state.settings[curSub].voiceName) || getBestVoiceForSubject(curSub);
    if(voiceSelect && voice) voiceSelect.value = voice.name || voice.voiceURI || voice.lang;
    // play the question prompt, then the word to spell once the prompt has finished
    speak(q.q, cur.subjectId);
    speak(q.answer, cur.subjectId, true);
  }
}

function handleMCQAnswer(q, chosen, el){
  if(answered) return;
  finishQuestion();
  // exact comparison: normalize() would treat "-1" and "1" as equal
  const correct = String(chosen) === String(q.answer);
  Array.from(choicesEl.children).forEach(c=>c.onclick=null);
  if(correct){
    el.classList.add('correct');
    messageEl.textContent='Correct! You earned coins.';
    awardCoinsForQuestion(q);
    // auto-advance after 2 seconds
    nextBtn.classList.remove('hidden');
    clearTimeout(autoNextTimer);
    autoNextTimer = setTimeout(()=> moveNext(), 2000);
  } else {
    el.classList.add('wrong');
    // reveal correct then auto-advance after 2 seconds
    Array.from(choicesEl.children).forEach(c=>{ if(c.textContent===String(q.answer)) c.classList.add('correct'); });
    messageEl.textContent='Oops — that was not correct.';
    clearTimeout(autoNextTimer);
    autoNextTimer = setTimeout(()=> moveNext(), 2000);
  }
  saveState();
}


// reveal/show answer handler
if(showAnswerEl){
  showAnswerEl.addEventListener('click', ()=>{
    const cur = state.current; if(!cur) return;
    const q = cur.questions[cur.qIndex]; if(!q) return;
    if(q.type === 'mcq'){
      // reveal correct choice visually
      finishQuestion(); saveState();
      Array.from(choicesEl.children).forEach(c=>{
        if(c.textContent===String(q.answer)) c.classList.add('correct');
        c.onclick = null;
      });
      messageEl.textContent = `Correct answer: ${q.answer}`;
      showAnswerEl.classList.add('hidden');
      nextBtn.classList.remove('hidden');
    } else if(q.type === 'spell'){
      finishQuestion(); saveState();
      // insert correct spelling into input
      spellInput.value = q.answer;
      spellInput.style.borderColor = '#63c05e';
      messageEl.textContent = `Answer revealed.`;
      showAnswerEl.classList.add('hidden');
      nextBtn.classList.remove('hidden');
    }
  });
}

function moveNext(){
  clearTimeout(autoNextTimer);
  const cur = state.current; if(!cur || cur.qIndex >= cur.questions.length) return;
  cur.qIndex += 1;
  messageEl.textContent = '';
  // persist per-chapter progress so resuming the same subject/chapter continues correctly
  if(cur.subjectId && cur.chapterNumber){
    const p = chapterProgress(cur);
    if(!p.completed) p.lastIndex = cur.qIndex;
  }
  saveState();
  renderQuestion();
}

function handleSpellSubmit(){
  const cur = state.current; if(!cur || answered) return;
  const q = cur.questions[cur.qIndex]; if(!q) return;
  const typed = spellInput.value.trim(); if(!typed) return;
  const correct = normalize(typed) === normalize(q.answer);
  if(correct){
    finishQuestion();
    messageEl.textContent='Great spelling!';
    spellInput.style.borderColor = '#63c05e';
    awardCoinsForQuestion(q);
    nextBtn.classList.remove('hidden');
    // auto-advance after 2s
    clearTimeout(autoNextTimer);
    autoNextTimer = setTimeout(()=> moveNext(), 2000);
    if(showAnswerEl) showAnswerEl.classList.add('hidden');
  } else {
    messageEl.textContent = `Not quite. Tap "Show Answer" to reveal or try again.`;
    spellInput.style.borderColor = '#ff8a8a';
    if(showAnswerEl) showAnswerEl.classList.remove('hidden');
    nextBtn.classList.add('hidden');
  }
  saveState();
}

function awardCoinsForQuestion(q){
  if(state.current.chapterNumber && chapterProgress(state.current).completed) return;
  const idx = state.current.qIndex + 1;
  let reward = 5;
  if(idx >= LEVELS[2].range[0]) reward = LEVELS[2].reward;
  else if(idx >= LEVELS[1].range[0]) reward = LEVELS[1].reward;
  else reward = LEVELS[0].reward;
  state.coins += reward;
  messageEl.textContent += ` (+${reward} coins)`;
  updateHeader();
  // Play a short celebratory jingle when coins are awarded (if available)
  if(typeof playCorrectJingle === 'function'){ try{ playCorrectJingle(); }catch(e){} }
}
function awardCompletion(){ const bonus = 50; state.coins += bonus; messageEl.textContent += ` Bonus ${bonus} coins for finishing!`; updateHeader(); saveState(); }
function completeChapter(cur){
  qText.textContent = 'Chapter complete';
  const p = chapterProgress(cur);
  if(p.completed){ messageEl.textContent = 'Practice round complete. Well done!'; return; }
  p.completed = true;
  messageEl.textContent = 'You completed the chapter! Great job!';
  awardCompletion(); maybeUnlockNextLevel(cur);
}
function maybeUnlockNextLevel(cur){ const total = cur.questions ? cur.questions.length : 0; if(total >= 6 && !state.unlocked.intermediate){ state.unlocked.intermediate = true; messageEl.textContent += ' You unlocked Intermediate level!'; } if(total >= 11 && !state.unlocked.advanced){ state.unlocked.advanced = true; messageEl.textContent += ' You unlocked Advanced level!'; } saveState(); }

// Unicode-aware normalize: keep letters, vowel marks and numbers from any script
function normalize(str){ if(!str) return ''; return String(str).normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu,''); }

// on-screen Devanagari keyboard (improved with common conjuncts)
function renderDevaKeyboard(subjectId){
  keyboardEl.innerHTML = '';
  const rows = [
    ['अ','आ','इ','ई','उ','ऊ','ऋ','ए','ऐ','ओ','औ','ऑ'],
    ['क','ख','ग','घ','ङ','च','छ','ज','झ','ञ'],
    ['ट','ठ','ड','ढ','ण','त','थ','द','ध','न'],
    ['प','फ','ब','भ','म','य','र','ल','व','श'],
    ['ष','स','ह','ळ','क्ष','त्र','ज्ञ','श्र'],
    ['ा','ि','ी','ु','ू','ृ','े','ै','ो','ौ'],
    ['ॅ','ॉ','ं','ँ','ः','्','़'],
    ['Space','Back','Clear']
  ];
  rows.forEach(row=>{
    const rowEl = document.createElement('div'); rowEl.className='key-row';
    row.forEach(k=>{
      const btn = document.createElement('button'); btn.className='key-btn'; btn.type='button'; btn.textContent = k;
      btn.onclick = ()=>{
        if(k==='Space') spellInput.value += ' ';
        else if(k==='Back') spellInput.value = spellInput.value.slice(0,-1);
        else if(k==='Clear') spellInput.value = '';
        else spellInput.value += k;
        spellInput.focus();
      };
      rowEl.appendChild(btn);
    });
    keyboardEl.appendChild(rowEl);
  });
}

// helper functions
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function makeNumberChoices(correct){ const c=Number(correct); const set=new Set([String(c)]); while(set.size<4) set.add(String(c + rand(-3,5))); return shuffle(Array.from(set)); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }

// Question generator (simplified)
function generateQuestions(subjectId, grade){
  const list = []; const total = 15; const g = Math.max(1, Math.min(10, parseInt(grade,10)||1));
  const englishWords = {1:['cat','dog','sun','ball','tree'],2:['apple','house','river','green','water'],3:['school','friend','family','garden','market'],4:['because','between','animal','planet','country'],5:['difficult','beautiful','college','language','picture'],6:['vegetable','decision','history','science','practice'],7:['knowledge','experience','population','government','community'],8:['environment','technology','economics','electricity','molecule'],9:['constitution','photosynthesis','function','equation','expression'],10:['civilization','democracy','biodiversity','architecture','literature'] };
  const marathiWords = {1:['घरी','बाळ','पाणी','पुस्तक','फूल'],2:['आजी','बाबा','शाळा','ऐका','दुकान'],3:['मित्र','खंड','पुस्तके','खूप','औषध'],4:['ज्ञान','घर','पालक','विद्या','भूमी'],5:['साहित्य','इतिहास','प्रकृती','संस्कृती','विज्ञान'],6:['राज्य','समाज','संगणक','प्रक्रिया','संख्याशास्त्र'],7:['विषय','प्रयोग','संशोधन','ऐतिहासिक','भूगोल'],8:['संविधान','अर्थव्यवस्था','रसायन','जीवन','प्रवास'],9:['सहयोग','पर्यावरण','नीती','धरोहर','स्वातंत्र्य'],10:['समाजशास्त्र','प्रौद्योगिकी','राष्ट्रीय','संरचना','इतिहास'] };
  const hindiWordsSimple = {1:['घर','बच्चा','पानी','फूल','ठेला'],2:['माँ','पापा','विद्यालय','सुनो','दुकान'],3:['मित्र','पाठ','पुस्तक','विद्यालय','साहित्य'],4:['ज्ञान','घर','अभिभावक','विद्या','भूमि'],5:['साहित्य','इतिहास','प्रकृति','संस्कृति','विज्ञान'],6:['राज्य','समाज','संगणक','प्रक्रिया','संख्या'],7:['विषय','प्रयोग','अनुसंधान','ऐतिहासिक','भूगोल'],8:['संविधान','अर्थव्यवस्था','रसायन','जीवन','यात्रा'],9:['सहयोग','पर्यावरण','नीति','धरोहर','स्वतंत्रता'],10:['समाजशास्त्र','प्रौद्योगिकी','राष्ट्रीय','संरचना','इतिहास'] };
  const simpleScience = ['Plants make food using sunlight','Water freezes at 0°C','The Earth orbits the Sun','Bees make honey','Humans breathe using lungs','Sound needs a medium to travel','Gravity pulls objects toward Earth','Plants have roots, stems, leaves','The sun is a star','Water evaporates into vapor'];
  const socialQ = ['Capital of India is New Delhi','India is in Asia','A map shows places','We vote to elect leaders','A community is a group of people','Rivers provide water','History tells us about the past','A holiday can be national or local','Transport helps movement','Markets are for buying and selling'];

  function take(pool,n){ const src=shuffle(Array.from(pool)); const out=[]; for(let i=0;i<n;i++) out.push(src[i%src.length]); return out; }
  const englishPool = take(englishWords[g]||englishWords[1], Math.ceil(total/3));
  const marathiPool = take(marathiWords[g]||marathiWords[1], Math.ceil(total/2));
  const hindiPool = take(hindiWordsSimple[g]||hindiWordsSimple[1], Math.ceil(total/2));

  for(let i=0;i<total;i++){
    if(subjectId === 'math'){
      const max = 5 + g*3; const a = rand(1, Math.max(2, Math.floor(max/2))); const b = rand(1, Math.max(2, Math.floor(max))); const op = (g<4)?'+':(g<7?(i%2?'+':'-'):(i%3? '*':'/'));
      let q,ans; if(op==='+'){ q=`What is ${a} + ${b}?`; ans=String(a+b); } else if(op==='-'){ q=`What is ${a+b} - ${a}?`; ans=String(b); } else if(op==='*'){ q=`What is ${a} x ${b}?`; ans=String(a*b); } else { const prod=a*b; q=`What is ${prod} ÷ ${a}?`; ans=String(b); }
      list.push({id:i+1,type:'mcq',q,choices:makeNumberChoices(ans),answer:ans});
    } else if(subjectId === 'english'){
      if(i%3===0){ const word = englishPool[(i/3)%englishPool.length]; list.push({id:i+1,type:'spell',q:'Grammar Phoenix: Listen and type the word',answer:word}); }
      else{ list.push({id:i+1,type:'mcq',q:'Choose the correct word: ___ is a place to learn.',choices:['School','Run','Blue','Eat'],answer:'School'}); }
    } else if(subjectId === 'marathi'){
      if(i%2===0){ const w = marathiPool[(i/2)%marathiPool.length]; list.push({id:i+1,type:'spell',q:'Grammar Phoenix: Listen and type the Marathi word',answer:w}); }
      else{
        // varied Marathi MCQs (in English for clarity) to avoid repeating the same question
        const pool = [
          {q:'Which is a good habit?', choices:['Reading','Sleeping all day','Stealing','Fighting'], answer:'Reading'},
          {q:'Which is healthy to eat?', choices:['Fruits','Chips','Sweets','Soda'], answer:'Fruits'},
          {q:'Where do children go to learn?', choices:['School','Market','Home','Shop'], answer:'School'},
          {q:'Who should we respect?', choices:['Elders','Strangers','Animals','Machines'], answer:'Elders'}
        ];
        const item = pool[i % pool.length];
        list.push({id:i+1,type:'mcq',q:item.q,choices:item.choices,answer:item.answer});
      }
    } else if(subjectId === 'hindi'){
      if(i%2===0){ const w = hindiPool[(i/2)%hindiPool.length]; list.push({id:i+1,type:'spell',q:'Grammar Phoenix: Listen and type the Hindi word',answer:w}); }
      else{
        const pool = [
          {q:'Which is a good habit?', choices:['Helping others','Shouting','Stealing','Lying'], answer:'Helping others'},
          {q:'What should you do with elders?', choices:['Respect them','Ignore them','Tease them','Hide'], answer:'Respect them'},
          {q:'Where do you go to learn?', choices:['School','Market','Park','Hospital'], answer:'School'},
          {q:'Which food is healthy?', choices:['Vegetables','Chips','Sweets','Cola'], answer:'Vegetables'}
        ];
        const item = pool[i % pool.length];
        list.push({id:i+1,type:'mcq',q:item.q,choices:item.choices,answer:item.answer});
      }
    } else if(subjectId === 'science'){
      const s = simpleScience[i % simpleScience.length]; list.push({id:i+1,type:'mcq',q:`Is this true or false: ${s}?`,choices:['True','False','Maybe','Not sure'],answer:'True'});
    } else if(subjectId === 'social'){
      const s = socialQ[i % socialQ.length]; list.push({id:i+1,type:'mcq',q:`Which statement is correct? ${s}`,choices:['Correct','Wrong','Both','None'],answer:'Correct'});
    }
  }
  return list;
}

// Events and wiring
playSoundBtn.onclick = ()=>{
  const cur = state.current; if(!cur) return; const q = cur.questions[cur.qIndex]; if(!q) return;
  // In spelling mode, play the word to be typed; otherwise speak the question prompt
  if(q.type === 'spell') speak(q.answer, cur.subjectId);
  else speak(q.q, cur.subjectId);
};
submitSpell.onclick = handleSpellSubmit;
nextBtn.onclick = moveNext;
quitBtn.onclick = ()=>{ state.current = null; saveState(); showMenu(); };
viewProgressBtn.onclick = showProgress;
backToMenuBtn.onclick = ()=>{ showMenu(); };
resetBtn.onclick = ()=>{ if(confirm('Reset all progress and coins?')){ const { grade, settings } = state; state = Object.assign(defaultState(), { grade, settings }); saveState(); updateHeader(); showMenu(); } };

// Voice controls interaction
if(voiceRateEl){ voiceRateEl.addEventListener('input', ()=>{ voiceRateVal.textContent = parseFloat(voiceRateEl.value).toFixed(2); }); }
if(voicePitchEl){ voicePitchEl.addEventListener('input', ()=>{ voicePitchVal.textContent = parseFloat(voicePitchEl.value).toFixed(2); }); }

// Init
loadState(); if(gradeSelectEl) gradeSelectEl.value = String(state.grade); makeSubjects(); updateHeader(); showMenu();
spellInput.addEventListener('keydown',(e)=>{ if(e.key==='Enter') handleSpellSubmit(); });
window.__KBC = { state, subjects, generateQuestions };
