// Node script to generate synthetic CBSE-style question datasets per subject and grade.
// Usage: node generate_dataset.js --count=200 (default 200). Use --count=2000 to produce 2000 per file.

const fs = require('fs');
const path = require('path');

const subjects = ['english','hindi','marathi','math','science','social'];
const grades = Array.from({length:10},(_,i)=>i+1);

const argv = Object.fromEntries(process.argv.slice(2).map(s=>{
  const parts = s.replace(/^--/,'').split('='); return [parts[0], parts[1] || true];
}));
const count = parseInt(argv.count||'200',10);

if(!fs.existsSync('data')) fs.mkdirSync('data');

function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }
function makeNumberChoices(correct){ const c=Number(correct); const s=new Set([String(c)]); while(s.size<4) s.add(String(c+rand(-3,5))); return shuffle(Array.from(s)); }

const englishWords = {
  1:['cat','dog','sun','ball','tree'],
  2:['apple','house','river','green','water'],
  3:['school','friend','family','garden','market'],
  4:['because','between','animal','planet','country'],
  5:['difficult','beautiful','college','language','picture'],
  6:['vegetable','decision','history','science','practice'],
  7:['knowledge','experience','population','government','community'],
  8:['environment','technology','economics','electricity','molecule'],
  9:['constitution','photosynthesis','function','equation','expression'],
  10:['civilization','democracy','biodiversity','architecture','literature']
};
const devWords = {
  1:['घर','मुलगा','पाणी','फुल','वाढ'],
  2:['आई','वडील','शाळा','ऐका','दुकान'],
  3:['मित्र','पाठ','पुस्तक','शैक्षणिक','नैसर्गिक'],
  4:['ज्ञान','गृह','पालक','विद्या','भूमी'],
  5:['साहित्य','इतिहास','प्रकृती','संस्कृती','विज्ञान'],
  6:['राज्य','समाज','संगणक','प्रक्रिया','संख्याशास्त्र'],
  7:['विषय','प्रयोग','संशोधन','इतिहासिक','भूगोल'],
  8:['संविधान','अर्थव्यवस्था','रसायन','जीवन','प्रवास'],
  9:['सहयोग','पर्यावरण','नीती','धरोहर','स्वातंत्र्य'],
  10:['समाजशास्त्र','तंत्रज्ञान','राष्ट्रीय','संक्रमण','इतिहास']
};

function genFor(subject, grade, n){
  const list = [];
  for(let i=0;i<n;i++){
    if(subject==='math'){
      const g = grade;
      const max = 5 + g*3;
      const a = rand(1, Math.max(2, Math.floor(max/2)));
      const b = rand(1, Math.max(2, Math.floor(max)));
      const op = (g<4)?'+':(g<7?(i%2?'+':'-'):(i%3? '*':'/'));
      let q,ans;
      if(op==='+'){ q=`What is ${a} + ${b}?`; ans=String(a+b); }
      else if(op==='-'){ q=`What is ${a+b} - ${a}?`; ans=String(b); }
      else if(op==='*'){ q=`What is ${a} x ${b}?`; ans=String(a*b); }
      else{ const prod=a*b; q=`What is ${prod} ÷ ${a}?`; ans=String(b); }
      list.push({id:i+1,type:'mcq',q,choices:makeNumberChoices(ans),answer:ans});
    } else if(subject==='english'){
      if(i%3===0){ const arr = englishWords[grade]||englishWords[1]; const w = arr[i%arr.length]; list.push({id:i+1,type:'spell',q:'Grammar Phoenix: Listen and type the word',answer:w}); }
      else{ list.push({id:i+1,type:'mcq',q:'Choose the correct word: ___ is a place to learn.',choices:['School','Run','Blue','Eat'],answer:'School'}); }
    } else if(subject==='hindi' || subject==='marathi'){
      const arr = devWords[grade]||devWords[1];
      if(i%2===0){ const w = arr[i%arr.length]; list.push({id:i+1,type:'spell',q:'Grammar Phoenix: Listen and type the word',answer:w}); }
      else{ list.push({id:i+1,type:'mcq',q:'Which is a good habit?',choices:['Reading','Sleeping all day','Stealing','Fighting'],answer:'Reading'}); }
    } else if(subject==='science'){
      const s = ['Plants make food using sunlight','Water freezes at 0°C','Sun is a star','Bees make honey','Humans breathe with lungs'][i%5];
      list.push({id:i+1,type:'mcq',q:`Is this true or false: ${s}?`,choices:['True','False','Maybe','Not sure'],answer:'True'});
    } else if(subject==='social'){
      const s = ['Capital of India is New Delhi','India is in Asia','A map shows places','We vote to elect leaders','A community is a group of people'][i%5];
      list.push({id:i+1,type:'mcq',q:`Which statement is correct? ${s}`,choices:['Correct','Wrong','Both','None'],answer:'Correct'});
    }
  }
  return list;
}

console.log(`Generating ${count} questions per subject per grade into ./data ...`);
for(const subj of subjects){
  for(const g of grades){
    const arr = genFor(subj,g,count);
    // decide a sensible chapter count to avoid too many tiny chapters in large generated datasets
    const chapterCount = Math.max(1, Math.min(12, Math.ceil(count / 180)));
    const chapterNames = Array.from({length: chapterCount}, (_,i) => `Chapter ${i+1}`);
    const out = { questions: arr, chapterCount, chapterNames, meta: { subject: subj, grade: g } };
    const fname = path.join('data', `${subj}_g${g}.json`);
    fs.writeFileSync(fname, JSON.stringify(out, null, 2), 'utf8');
  }
}
console.log('Done.');

