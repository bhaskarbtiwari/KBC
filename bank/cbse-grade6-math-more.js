// Further Class 6 maths questions, 12 per chapter, in the same order as the chapters in
// cbse-grade6.js. Numeric ones are computed so the answers cannot be mistyped.

// numeric question: wrong choices are the given offsets from the answer
const num = (q, a, offsets = [1, -1, 2], unit = '') => [q, ...[0, ...offsets].map(d => `${a + d}${unit}`)].join('|');

const sequences = [[2,4,6,8],[5,10,15,20],[10,20,30,40],[3,6,9,12],[7,14,21,28],[100,90,80,70],[1,5,9,13],[2,5,8,11]]
  .map(s => num(`What comes next: ${s.join(', ')}, ...?`, s[3] + (s[1] - s[0]), [1, -1, 2 * (s[1] - s[0])]));
const patterns = [...sequences,
  num('What comes next: 1, 3, 9, 27, ...?', 81, [-27, -9, 27]),
  num('The sum of the first 6 odd numbers is ___.', 36, [-6, -11, 6]),
  num('What is the 10th square number?', 100, [-19, -80, 21]),
  num('What is 1 + 2 + 3 + 4 + 5 + 4 + 3 + 2 + 1?', 25, [-5, -1, 5]),
];

const angleType = d => d < 90 ? 'Acute' : d === 90 ? 'Right' : d < 180 ? 'Obtuse' : d === 180 ? 'Straight' : 'Reflex';
const angles = [
  ...[25, 89, 91, 150, 200, 300].map(d => {
    const a = angleType(d);
    return [`What type of angle is ${d}°?`, a, ...['Acute', 'Right', 'Obtuse', 'Straight', 'Reflex'].filter(t => t !== a).slice(0, 3)].join('|');
  }),
  'Which tool is used to measure an angle?|Protractor|Compass|Divider|Set of weights',
  'How many degrees are there in a full turn?|360°|180°|90°|270°',
  'Half of a right angle measures ___.|45°|30°|60°|90°',
  'The two rays that form an angle are called its ___.|arms|vertices|diameters|sides of a circle',
  'Which has no end points?|Line|Line segment|Ray|Side of a square',
  'How many lines can pass through two given different points?|1|2|0|Countless',
];

const digits = n => String(n).split('').map(Number);
const numberPlay = [
  ...[709, 3265, 9081, 55555].map(n => num(`The digit sum of ${n} is ___.`, digits(n).reduce((a, b) => a + b), [1, -1, 10])),
  ...[35, 68, 124, 243].map(n => num(`Reverse the digits of ${n} and add the result to ${n}. What do you get?`, n + Number(digits(n).reverse().join('')), [10, -10, 11])),
  num('What is the smallest 5-digit number?', 10000, [-1, 1, 1111]),
  num('How many 2-digit numbers are there?', 90, [-1, 9, 10]),
  num('What is the largest 3-digit palindrome?', 999, [-10, -110, -9]),
  'In the Collatz steps, what follows an even number n?|n ÷ 2|3n + 1|n + 1|2n',
];

const data = [
  ...[[5, 6], [10, 7], [4, 9], [20, 3]].map(([k, n]) => num(`In a pictograph one symbol stands for ${k} children. How many children do ${n} symbols show?`, k * n, [k, -k, n])),
  ...[[2, 8], [5, 4], [10, 9]].map(([k, h]) => num(`A bar graph scale is 1 unit = ${k} books. How many books does a bar ${h} units tall show?`, k * h, [k, -k, h])),
  ...[[35, 5, 7], [60, 10, 6]].map(([v, k, u]) => num(`With a scale of 1 unit = ${k}, how many units tall is a bar for ${v}?`, u, [1, -1, k])),
  'Tally marks are mainly used for ___.|counting while collecting data|drawing circles|measuring angles|finding area',
  'In a bar graph, the bar for the largest value is the ___.|longest|shortest|widest|first',
  'The gaps between bars in a bar graph should be ___.|equal|random|increasing|different for every bar',
];

const primes = [
  ...[[38, 41, 39, 40, 45], [50, 53, 51, 52, 55], [62, 67, 63, 65, 69], [90, 97, 91, 93, 95]]
    .map(([after, ...choices]) => [`Which of these is the next prime number after ${after}?`, ...choices].join('|')),
  ...[[8, 12, 24], [5, 7, 35], [9, 12, 36], [10, 15, 30]].map(([a, b, l]) => num(`What is the smallest common multiple of ${a} and ${b}?`, l, [a, b, 2 * l])),
  'How many even prime numbers are there?|1|0|2|Countless',
  'A number with more than two factors is called ___.|composite|prime|co-prime|odd',
  'Which number is a factor of every number?|1|0|2|10',
  'A number is divisible by 5 if it ends in ___.|0 or 5|2 or 4|only 1|3 or 6',
];

const area = [
  ...[5, 12, 20].map(s => num(`What is the perimeter, in cm, of a square of side ${s} cm?`, 4 * s, [-s, s, s * s])),
  ...[6, 11].map(s => num(`What is the area, in sq cm, of a square of side ${s} cm?`, s * s, [-s, s, 1])),
  ...[[12, 7], [15, 4]].map(([l, w]) => num(`What is the perimeter, in cm, of a ${l} cm by ${w} cm rectangle?`, 2 * (l + w), [-w, l, 2])),
  ...[[12, 7], [15, 4]].map(([l, w]) => num(`What is the area, in sq cm, of a ${l} cm by ${w} cm rectangle?`, l * w, [-w, l, 2])),
  num('A square has a perimeter of 36 cm. What is its side in cm?', 9, [-3, 3, 27]),
  num('A regular hexagon has sides of 5 cm. What is its perimeter in cm?', 30, [-5, 5, -10]),
  'Area is measured in ___ units.|square|cubic|straight|angle',
];

const fractions = [
  'What is 3/10 + 4/10?|7/10|7/20|1/10|12/10',
  'What is 7/9 - 2/9?|5/9|9/9|5/18|2/9',
  'Which fraction is equivalent to 1/4?|3/12|2/6|4/8|1/8',
  'The simplest form of 10/15 is ___.|2/3|5/10|1/5|3/5',
  'What is 1/3 + 1/6?|1/2|2/9|1/9|2/3',
  'What is 3/4 - 1/2?|1/4|2/2|1/2|1/8',
  'As an improper fraction, 3 1/2 is ___.|7/2|4/2|5/2|3/2',
  'Which is smallest?|1/9|1/5|1/3|1/2',
  'In 5/8, the number 8 is the ___.|denominator|numerator|quotient|remainder',
  'Fractions with the same denominator are called ___ fractions.|like|unlike|unit|mixed',
  'Which of these is an improper fraction?|9/4|4/9|1/2|7/8',
  'What is half of 30?|15|10|20|60',
];

const constructions = [
  ...[3, 5, 9, 12].map(r => num(`A circle has a radius of ${r} cm. What is its diameter in cm?`, 2 * r, [-r, r, 1])),
  ...[14, 22].map(d => num(`A circle has a diameter of ${d} cm. What is its radius in cm?`, d / 2, [1, -1, d / 2])),
  'The longest chord of a circle is its ___.|diameter|radius|centre|arc',
  'A part of the boundary of a circle is called an ___.|arc|angle|axis|area',
  'How many right angles does a square have?|4|2|1|3',
  'In a rectangle, opposite sides are ___.|equal|always unequal|curved|perpendicular to each other',
  'To draw a line segment of a given length, we use a ___.|ruler|protractor only|set of weights|thermometer',
  'A rectangle with all four sides equal is a ___.|square|triangle|circle|pentagon',
];

const symmetry = [
  'Which capital letter has a horizontal line of symmetry?|B|A|F|J',
  'Which capital letter has no line of symmetry?|F|A|M|T',
  'Which capital letter has both vertical and horizontal symmetry?|H|A|B|L',
  'How many lines of symmetry does a regular pentagon have?|5|4|2|10',
  'How many lines of symmetry does a regular hexagon have?|6|3|4|12',
  'An isosceles triangle that is not equilateral has ___ line(s) of symmetry.|1|0|2|3',
  'The smallest angle of rotational symmetry of an equilateral triangle is ___.|120°|60°|90°|180°',
  'The smallest angle of rotational symmetry of a regular hexagon is ___.|60°|90°|120°|30°',
  'A figure turned through 360° always looks ___.|the same as before|upside down|mirrored|smaller',
  'The fixed point about which a figure is rotated is the centre of ___.|rotation|mass of data|the ruler|reflection line',
  'A mirror image of a left hand looks like a ___.|right hand|left hand|foot|circle',
  'A windmill with four equal blades looks the same after a turn of ___.|90°|45°|60°|100°',
];

const integers = [
  ...[[-7, 12], [9, -15], [-8, -9], [20, -20]].map(([a, b]) => num(`What is (${a}) + (${b})?`, a + b, [1, -1, 2])),
  ...[[3, 11], [-5, 6], [-4, -10]].map(([a, b]) => num(`What is (${a}) - (${b})?`, a - b, [1, -1, 2])),
  'Which is the smallest?|-12|-3|0|4',
  'Which integer is neither positive nor negative?|0|1|-1|10',
  'What is the additive inverse of -15?|15|-15|0|1/15',
  'The integer just before -6 is ___.|-7|-5|-8|6',
  'A lift goes 3 floors below ground level 0. Its floor number is ___.|-3|3|0|-30',
];

module.exports = [patterns, angles, numberPlay, data, primes, area, fractions, constructions, symmetry, integers];
