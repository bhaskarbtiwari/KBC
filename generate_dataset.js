// Builds data/<subject>_g<grade>.json from the question banks in ./bank (math is computed).
// Usage: node generate_dataset.js
// Every question in a file is unique. Chapter sizes are listed in each file as chapterSizes.

const fs = require('fs');
const path = require('path');
const mathChapters = require('./bank/math');
const words = require('./bank/words');
const more = require('./bank/more');
const languageSets = require('./bank/sets-languages');
const sets = { ...languageSets, science: require('./bank/sets-science'), social: require('./bank/sets-social') };
// official-syllabus chapters; where present they replace the general chapters for that subject and grade
const cbse = { 6: require('./bank/cbse-grade6') };
// further questions for each of those chapters, listed in the same chapter order
for(const subject of ['math','science','social']){
  const extra = require(`./bank/cbse-grade6-${subject}-more`);
  if(extra.length !== cbse[6][subject].length) throw new Error(`grade 6 ${subject}: extra chapter lists do not match`);
  cbse[6][subject] = cbse[6][subject].map(([name, lines], i)=>[name, [...lines, ...extra[i]]]);
}
cbse[6].hindi = require('./bank/cbse-grade6-hindi');
cbse[6].english = require('./bank/cbse-grade6-english');
// Marathi follows the Maharashtra Balbharati book, split over two files
cbse[6].marathi = [...require('./bank/cbse-grade6-marathi-a'), ...require('./bank/cbse-grade6-marathi-b')];
const MIN_PER_CBSE_CHAPTER = { math:20, science:20, social:20, hindi:20, english:20, marathi:20 };
const MIN_MCQ = 50; // every subject and grade must have at least this many multiple-choice questions

// chapter names and question wording for the pair lists in bank/words.js
const wordText = {
  english: { names:['Opposite Words','Words with the Same Meaning','Spelling Practice'],
    opposite: w=>`What is the opposite of "${w}"?`, same: w=>`Which word means the same as "${w}"?` },
  hindi: { names:['विलोम अभ्यास','पर्यायवाची अभ्यास','वर्तनी अभ्यास'],
    opposite: w=>`"${w}" का सही विलोम शब्द चुनिए।`, same: w=>`"${w}" का सही पर्यायवाची शब्द चुनिए।` },
  marathi: { names:['विरुद्धार्थी सराव','समानार्थी सराव','शुद्धलेखन सराव'],
    opposite: w=>`"${w}" याचा योग्य विरुद्धार्थी शब्द निवडा.`, same: w=>`"${w}" याचा योग्य समानार्थी शब्द निवडा.` },
};

const bankSubjects = ['english','hindi','marathi','science','social'];
const grades = Array.from({length:10},(_,i)=>i+1);
const SPELL_PROMPT = 'Grammar Phoenix: Listen and type the word';

// seeded random numbers, so rebuilding gives the same files
function makeRandom(seedText){
  let seed = 2166136261;
  for(const ch of seedText) seed = Math.imul(seed ^ ch.codePointAt(0), 16777619);
  return function(){
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(a, random){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }

function mcq(line, random){
  const [q, answer, ...wrong] = line.split('|');
  return { type:'mcq', q, choices: shuffle([answer, ...wrong], random), answer };
}

// bank chapters are [name, [mcq lines], 'spelling words']
function fromBank(chapters, random){
  return chapters.map(([name, lines, words])=>{
    const questions = lines.map(line=>mcq(line, random));
    if(words) questions.push(...words.split(' ').map(answer=>({ type:'spell', q:SPELL_PROMPT, answer })));
    return { name, questions: shuffle(questions, random) };
  });
}

// turn "word=answer" pairs into MCQs, taking wrong choices from the other answers in the list
function fromPairs(name, list, ask, random){
  const pairs = list.map(p=>p.split('='));
  const questions = pairs.map(([word, answer])=>{
    const others = [...new Set(pairs.map(p=>p[1]).filter(a=>a !== answer && a !== word))];
    return mcq([ask(word), answer, ...shuffle(others, random).slice(0,3)].join('|'), random);
  });
  return { name, questions: shuffle(questions, random) };
}
function wordChapters(subject, grade, random){
  const { names, opposite, same } = wordText[subject];
  const [opposites, synonyms, spellings] = words[subject][grade];
  return [
    fromPairs(names[0], opposites.split(' '), opposite, random),
    fromPairs(names[1], synonyms.split(' '), same, random),
    { name: names[2], questions: spellings.split(' ').map(answer=>({ type:'spell', q:SPELL_PROMPT, answer })) },
  ];
}

// matching sets are [chapter name, question with %s, 'clue=answer; clue=answer']
function fromSet([name, template, list], random){
  return fromPairs(name, list.split('; '), clue=>template.replace('%s', ()=>clue), random);
}

function check(file, chapters){
  const seen = new Set();
  for(const { name, questions } of chapters){
    for(const q of questions){
      const key = `${q.q}|${q.type === 'spell' ? q.answer : ''}`;
      if(seen.has(key)) throw new Error(`${file}: repeated question ${key}`);
      seen.add(key);
      if(!q.q || !q.answer) throw new Error(`${file}: empty question or answer in "${name}"`);
      if(q.type === 'mcq' && (q.choices.length !== 4 || new Set(q.choices).size !== 4 || !q.choices.includes(q.answer))){
        throw new Error(`${file}: bad choices for ${q.q}`);
      }
    }
  }
}

function write(subject, grade, chapters){
  const file = path.join(__dirname, 'data', `${subject}_g${grade}.json`);
  check(file, chapters);
  const mcqCount = chapters.flatMap(c=>c.questions).filter(q=>q.type === 'mcq').length;
  if(mcqCount < MIN_MCQ) throw new Error(`${file}: only ${mcqCount} multiple-choice questions, need ${MIN_MCQ}`);
  const questions = chapters.flatMap(c=>c.questions).map((q,i)=>({ id:i+1, ...q }));
  const out = { questions, chapterCount: chapters.length, chapterNames: chapters.map(c=>c.name), chapterSizes: chapters.map(c=>c.questions.length), meta: { subject, grade } };
  fs.writeFileSync(file, JSON.stringify(out, null, 2), 'utf8');
  return questions.length;
}

fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
let total = 0;
for(const grade of grades){
  for(const subject of bankSubjects){
    if(cbse[grade]?.[subject]) continue;
    const bank = require(`./bank/${subject}`);
    const random = makeRandom(`${subject}${grade}`);
    const chapters = fromBank(bank[grade], random);
    if(words[subject]) chapters.push(...wordChapters(subject, grade, random));
    if(more[subject]) chapters.push(...fromBank([more[subject][grade]], random));
    chapters.push(...sets[subject][grade].map(set=>fromSet(set, random)));
    total += write(subject, grade, chapters);
  }
  if(!cbse[grade]?.math) total += write('math', grade, mathChapters(grade, makeRandom(`math${grade}`), shuffle));
  for(const [subject, chapters] of Object.entries(cbse[grade] || {})){
    for(const [name, lines] of chapters){
      if(lines.length < MIN_PER_CBSE_CHAPTER[subject]) throw new Error(`grade ${grade} ${subject} "${name}": only ${lines.length} questions`);
    }
    total += write(subject, grade, fromBank(chapters, makeRandom(`cbse${subject}${grade}`)));
  }
}
console.log(`Wrote ${total} questions into ./data`);
