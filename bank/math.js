// Computed math questions: three topics per grade, QUESTIONS_PER_CHAPTER different questions each.
const QUESTIONS_PER_CHAPTER = 40;

module.exports = function mathChapters(grade, random, shuffle){
  const r = (min,max)=> Math.floor(random()*(max-min+1))+min;
  const gcd = (a,b)=> b ? gcd(b, a%b) : Math.abs(a);
  const money = n=> (n/10).toFixed(1); // tenths held as integers to avoid rounding errors

  // item(question, numericAnswer): distractors are nearby values, never negative unless the answer is
  const item = (q, ans, spread)=>{
    const choices = new Set([ans]);
    const step = spread || Math.max(3, Math.round(Math.abs(ans)/10));
    for(let tries=0; choices.size<4; tries++){
      const c = ans + r(-step, step + Math.floor(tries/10));
      if(c >= 0 || ans < 0) choices.add(c);
    }
    return { q, answer:String(ans), choices:[...choices].map(String) };
  };
  const textItem = (q, answer, wrong)=>{
    const choices = new Set([answer]);
    for(const w of wrong){ if(choices.size<4) choices.add(w); }
    return { q, answer, choices:[...choices] };
  };

  const topics = {
    1: [
      ['Addition', ()=>{ const a=r(0,10), b=r(1,10); return item(`What is ${a} + ${b}?`, a+b); }],
      ['Subtraction', ()=>{ const a=r(2,20), b=r(1,a); return item(`What is ${a} - ${b}?`, a-b); }],
      ['Numbers', ()=>{ const n=r(1,98), k=r(0,1); return item(`Which number comes just ${k?'after':'before'} ${n}?`, k?n+1:n-1); }],
    ],
    2: [
      ['Addition', ()=>{ const a=r(10,60), b=r(5,39); return item(`What is ${a} + ${b}?`, a+b); }],
      ['Subtraction', ()=>{ const a=r(25,99), b=r(5,24); return item(`What is ${a} - ${b}?`, a-b); }],
      ['Tables', ()=>{ const a=[2,3,4,5,10][r(0,4)], b=r(1,10); return item(`What is ${a} x ${b}?`, a*b); }],
    ],
    3: [
      ['Add and Subtract', ()=>{ const a=r(100,899), b=r(10,99); return r(0,1) ? item(`What is ${a} + ${b}?`, a+b) : item(`What is ${a} - ${b}?`, a-b); }],
      ['Multiplication', ()=>{ const a=r(3,12), b=r(2,10); return item(`What is ${a} x ${b}?`, a*b); }],
      ['Division', ()=>{ const a=r(2,10), b=r(2,10); return item(`What is ${a*b} ÷ ${a}?`, b); }],
    ],
    4: [
      ['Multiplication', ()=>{ const a=r(12,99), b=r(3,9); return item(`What is ${a} x ${b}?`, a*b); }],
      ['Division', ()=>{ const a=r(3,12), b=r(11,40); return item(`What is ${a*b} ÷ ${a}?`, b); }],
      ['Perimeter', ()=>{ const l=r(5,30), w=r(2,20); return item(`What is the perimeter (in cm) of a rectangle ${l} cm long and ${w} cm wide?`, 2*(l+w)); }],
    ],
    5: [
      ['Decimals', ()=>{ const a=r(11,99), b=r(11,99), s=a+b; return textItem(`What is ${money(a)} + ${money(b)}?`, money(s), [s+1,s-1,s+10,s-10].map(money)); }],
      ['Fractions', ()=>{ const d=r(2,9), n=r(1,d-1), k=r(2,12); return item(`What is ${n}/${d} of ${d*k}?`, n*k); }],
      ['Area', ()=>{ const l=r(4,25), w=r(3,15); return item(`What is the area (in sq cm) of a rectangle ${l} cm by ${w} cm?`, l*w); }],
    ],
    6: [
      ['HCF and LCM', ()=>{ const a=r(4,30), b=r(4,30), h=gcd(a,b); return r(0,1) ? item(`What is the HCF of ${a} and ${b}?`, h) : item(`What is the LCM of ${a} and ${b}?`, a*b/h); }],
      ['Ratio', ()=>{ const a=r(1,6), b=a+r(1,6), k=r(2,9); return item(`Two numbers are in the ratio ${a}:${b}. If the smaller is ${a*k}, what is the larger?`, b*k); }],
      ['Integers', ()=>{ const a=r(-15,15), b=r(1,20); return item(`What is (${a}) - ${b}?`, a-b); }],
    ],
    7: [
      ['Integers', ()=>{ const a=r(-12,-2), b=r(2,12); return item(`What is (${a}) x ${b}?`, a*b); }],
      ['Simple Equations', ()=>{ const a=r(2,9), x=r(2,15), b=r(1,20); return item(`Solve for x: ${a}x + ${b} = ${a*x+b}`, x); }],
      ['Percentage', ()=>{ const p=[5,10,20,25,40,50,75][r(0,6)], n=r(1,25)*20; return item(`What is ${p}% of ${n}?`, p*n/100); }],
    ],
    8: [
      ['Squares and Roots', ()=>{ const n=r(11,40); return r(0,1) ? item(`What is the square of ${n}?`, n*n) : item(`What is the square root of ${n*n}?`, n); }],
      ['Exponents', ()=>{ const b=r(2,6), e=r(2,4), c=r(1,30); return item(`What is ${b}^${e} + ${c}?`, b**e+c); }],
      ['Linear Equations', ()=>{ const x=r(2,15), a=r(4,9), c=r(1,3), b=r(1,20); return item(`Solve for x: ${a}x - ${b} = ${c}x + ${(a-c)*x-b}`.replace('+ -','- '), x); }],
    ],
    9: [
      ['Polynomials', ()=>{ const x=r(-4,5), a=r(1,4), b=r(1,9); return item(`If p(x) = ${a}x² + ${b}, what is p(${x})?`, a*x*x+b); }],
      ['Pythagoras', ()=>{ const t=[[3,4,5],[5,12,13],[8,15,17],[7,24,25],[9,40,41]][r(0,4)], k=r(1,10); return item(`A right triangle has legs ${t[0]*k} cm and ${t[1]*k} cm. How long is the hypotenuse (in cm)?`, t[2]*k); }],
      ['Mean', ()=>{ const m=r(10,40), d=r(1,9), e=r(1,9); const list=shuffle([m-d, m+d, m-e, m+e, m], random); return item(`What is the mean of ${list.join(', ')}?`, m); }],
    ],
    10: [
      ['Arithmetic Progressions', ()=>{ const a=r(1,20), d=r(2,9), n=r(5,25); return item(`What is term ${n} of the AP ${a}, ${a+d}, ${a+2*d}, ...?`, a+(n-1)*d); }],
      ['Quadratic Equations', ()=>{ const p=r(1,12), q=p+r(1,9); return item(`What is the larger root of x² - ${p+q}x + ${p*q} = 0?`, q); }],
      ['Coordinate Geometry', ()=>{ const t=[[3,4,5],[6,8,10],[5,12,13],[8,15,17]][r(0,3)], x=r(0,9), y=r(0,9); return item(`What is the distance between (${x}, ${y}) and (${x+t[0]}, ${y+t[1]})?`, t[2]); }],
    ],
  };

  return topics[grade].map(([name, make])=>{
    const seen = new Map();
    for(let tries=0; seen.size < QUESTIONS_PER_CHAPTER; tries++){
      if(tries > 5000) throw new Error(`math grade ${grade} "${name}": not enough different questions`);
      const x = make();
      if(!seen.has(x.q)) seen.set(x.q, { type:'mcq', q:x.q, choices:shuffle(x.choices, random), answer:x.answer });
    }
    return { name, questions:[...seen.values()] };
  });
};
