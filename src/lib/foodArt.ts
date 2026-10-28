// ===== 食物插畫產生器 =====
// 畫風沿用動作示範的「網點復古編輯插畫」：粗黑輪廓、米白底、網點陰影；
// 但食材本身用各自的顏色（肉、菜、番茄、蛋黃…），讓食物看起來有食慾。
//
// 每道菜用一行「插畫配方」描述（Notion 食物清單「插畫配方」欄）：容器[~湯底或飲料]|食材[*大小],食材…[!冒煙]
//   例：'bowl~beefbroth|noodles,beef,greens!'  = 碗＋紅燒湯底＋麵、牛肉、青菜，冒熱氣
//       'cup~milktea|pearls'                   = 手搖杯＋奶茶＋珍珠
// 「*」在 Notion 可能被當成斜體符號吃掉，所以 'beef1.2'、'tofu.8' 也看得懂。
// 容器：plate 盤、bowl 碗、pot 鍋、box 便當、cup 手搖杯、jar 玻璃罐、bottle 瓶、none 直接擺
// 回傳完整 SVG 字串，網頁與 APP 共用；不依賴任何套件。

const INK = '#1a1714';
const PAPER = '#fffdf8';
const SW = 2.2;
const O = `stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"`;
const O1 = `stroke="${INK}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"`;

/** 食材色（插畫專用，比 APP 介面的三色更豐富） */
export const FOOD_COLORS = {
  rice: '#f6f2e9', grain: '#d4cfc2', brownrice: '#d7c6a9', quinoa: '#e5dcc7',
  chicken: '#d9c099', roast: '#b27f52', grill: '#875b37', teriyaki: '#97623d',
  beef: '#854c3c', beefLight: '#b27d6e', rawbeef: '#d09294', pork: '#caa28a', porkFat: '#ebdac9',
  braised: '#6d442f', fried: '#bb8d55', crumb: '#956635',
  salmon: '#d8997a', salmonLine: '#f4e0d2', fish: '#ebe4d7', mackerel: '#8092a3', shrimp: '#d78e76',
  egg: '#fffdf8', yolk: '#d9b55d', teaegg: '#856449', omelette: '#e1c77d',
  green: '#5f935b', greenDark: '#406c44', leaf: '#96bd7a', stem: '#cbd9b0', asparagus: '#779e66',
  tomato: '#c76458', carrot: '#d1915a', corn: '#dcc169', pepper: '#c76458', cucumber: '#6b9552',
  potato: '#dac58a', sweetSkin: '#93535d', sweetFlesh: '#d5a664', avocado: '#9cb374', avocadoSkin: '#4c6b39',
  mushroom: '#a38164', tofu: '#f4eede', tofuSide: '#dfd4bb', tofugan: '#977254',
  noodle: '#dcc993', udon: '#f6f2e7', soba: '#8d816c', konjac: '#dfdcd2',
  bread: '#e6d7b8', crust: '#b28d5f', bun: '#c7a270', patty: '#6b4834', cheese: '#dbbe66',
  sauce: '#bb6355', curry: '#bb8b44', pb: '#b48f69',
  banana: '#dec672', guava: '#a6c283', apple: '#c36761', kiwi: '#8fb068', kiwiSkin: '#857050',
  blueberry: '#5c548a', raspberry: '#bd6073', nut: '#a38164', lemon: '#d7ca70', pearl: '#382821',
} as const;
const K = FOOD_COLORS;

/** 湯底、粥、優格、飲料等「表面顏色」 */
const FILLS: Record<string, string> = {
  rice: K.rice, broth: '#e2d3b1', beefbroth: '#b28260', beefclear: '#dfd0b5', mala: '#b35f4e',
  tomatobroth: '#ca7d64', miso: '#c1a377', stew: '#c3a278', soysalty: '#e5ddc5', braise: '#856449',
  oats: '#daceb1', oatsoy: '#e6decb', yogurt: '#fbf6ed', salad: '#a2c183', steamegg: '#e9d6a1',
  greentea: '#c0c286', blacktea: '#a76f49', soytea: '#c6ab8e', milktea: '#ccb59d', latte: '#b89b81',
  lemontea: '#d0ca86', wintermelon: '#b49969', yakult: '#d6d8aa', brownsugar: '#ebe3d4',
  mango: '#d6ab65', shake: '#e5dbbc', soymilk: '#e5ddc5', milk: '#f7f6f2', protein: '#dbc8af',
};

// ---------- 小工具 ----------
const p = (d: string, fill: string, o = O) => `<path d="${d}" fill="${fill}" ${o}/>`;
const c = (x: number, y: number, r: number, fill: string, o = O) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${o}/>`;
const e = (x: number, y: number, rx: number, ry: number, fill: string, o = O) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${o}/>`;
const ln = (d: string, color: string, w = 1.8) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const dots = (pts: number[][], r: number, fill: string) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join('');
/** 粗線條食材（麵、蝦）：先畫黑邊再畫顏色 */
const rope = (d: string, color: string, w = 3.4) => ln(d, INK, w + 2.6) + ln(d, color, w);
const hi = (d: string) => ln(d, '#ffffff', 1.6).replace('/>', ' opacity=".75"/>');

// ---------- 食材（以 0,0 為中心，寬約 30） ----------
const SLAB = 'M-15 -5 Q-13 -11 -2 -10 Q13 -11 15 -3 Q17 6 4 8 Q-13 10 -15 3Z';
const MOUND = (fill: string) => p('M-17 5 Q-16 -9 0 -11 Q16 -9 17 5 Q0 10 -17 5Z', fill);
const grains = (col: string) => ln('M-9 -3 l2 -1 M-2 -6 l2 0 M5 -3 l2 1 M-5 2 l2 0 M9 2 l1 -1 M1 -1 l2 1', col, 1.3);
const TOAST = 'M-13 12 L-13 -5 Q-16 -14 -6 -14 Q0 -18 6 -14 Q16 -14 13 -5 L13 12Z';
const cube = (x: number, y: number, top: string, side: string) =>
  p(`M${x - 7} ${y - 3} L${x} ${y - 7} L${x + 7} ${y - 3} L${x} ${y + 1}Z`, top) +
  p(`M${x - 7} ${y - 3} L${x} ${y + 1} L${x} ${y + 9} L${x - 7} ${y + 5}Z`, side) +
  p(`M${x + 7} ${y - 3} L${x} ${y + 1} L${x} ${y + 9} L${x + 7} ${y + 5}Z`, side);
const floret = (x: number, y: number, r: number) =>
  c(x, y, r, K.green) + dots([[x - r / 3, y - r / 3], [x + r / 3, y], [x - r / 4, y + r / 3]], 1, K.greenDark);
const bone = (x1: number, y1: number, x2: number, y2: number) =>
  ln(`M${x1} ${y1} L${x2} ${y2}`, INK, 6.4) + ln(`M${x1} ${y1} L${x2} ${y2}`, PAPER, 3.8) + c(x2, y2 - 1.5, 2.4, PAPER, O1) + c(x2 + 1.5, y2 + 1.5, 2.4, PAPER, O1);
const sesame = (pts: number[][]) => pts.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.3" ry=".7" fill="#f9f6e7" transform="rotate(30 ${x} ${y})"/>`).join('');
const friedBlob = (s = 1) =>
  p(`M${-15 * s} ${2 * s} Q${-17 * s} ${-8 * s} ${-8 * s} ${-9 * s} Q${-5 * s} ${-14 * s} ${2 * s} ${-11 * s} Q${10 * s} ${-14 * s} ${13 * s} ${-6 * s} Q${19 * s} ${-1 * s} ${14 * s} ${5 * s} Q${12 * s} ${11 * s} ${3 * s} ${9 * s} Q${-4 * s} ${13 * s} ${-9 * s} ${9 * s} Q${-16 * s} ${8 * s} ${-15 * s} ${2 * s}Z`, K.fried) +
  dots([[-8 * s, -4 * s], [-2 * s, -7 * s], [5 * s, -5 * s], [9 * s, 1 * s], [-4 * s, 3 * s], [2 * s, 5 * s], [-10 * s, 4 * s]], 1.1, K.crumb);
const noodleBed = (col: string, w = 3.4) =>
  rope('M-17 -4 Q-11 -9 -5 -4 T7 -4 T17 -5', col, w) + rope('M-16 2 Q-10 -3 -4 2 T8 2 T16 1', col, w) + rope('M-12 7 Q-6 3 0 7 T12 6', col, w);
const nest = (col: string) =>
  e(0, 0, 17, 10, col) + rope('M-12 -1 Q-6 -8 2 -6 Q12 -4 10 2 Q6 8 -4 6 Q-10 4 -6 -1 Q-2 -4 4 -1', col, 3) + ln('M-14 3 Q-8 9 4 8', INK, 1.2);

const PARTS: Record<string, () => string> = {
  rice: () => MOUND(K.rice) + grains(K.grain),
  brownrice: () => MOUND(K.brownrice) + grains('#ab9574'),
  quinoa: () => MOUND(K.quinoa) + dots([[-8, -3], [-2, -6], [4, -2], [9, 1], [-4, 2], [2, 3], [7, -5]], 1, '#a25b4c') + dots([[-6, 0], [5, 1], [0, -4]], 1, INK),
  caulirice: () => MOUND('#f1efe7') + dots([[-8, -3], [-1, -6], [6, -2], [-4, 2], [9, 2]], 1.3, K.green),
  friedrice: () => MOUND('#ddc99c') + dots([[-9, -2], [2, -6], [8, 0]], 1.6, K.green) + dots([[-3, -4], [5, -4], [-6, 2]], 1.6, K.carrot) + dots([[0, 1], [-11, 2], [10, -3]], 1.8, K.omelette),

  chicken: () => p(SLAB, K.chicken) + ln('M-8 -7 L-11 5 M-1 -8 L-4 7 M6 -8 L3 6', K.grill, 2) + hi('M-11 -6 Q-5 -9 0 -9'),
  shredchicken: () => p('M-16 4 Q-14 -6 0 -8 Q14 -6 16 4 Q0 9 -16 4Z', '#e6d7bb') + ln('M-10 -1 L-2 -4 M-6 3 L6 -2 M2 4 L11 0 M-12 3 L-6 1', '#b79b75', 1.6) + dots([[-4, -5], [6, -4]], 1.2, K.green),
  chickenthigh: () => p('M-16 -2 Q-15 -11 -3 -11 Q8 -14 15 -6 Q19 3 9 8 Q-4 12 -13 7 Q-18 4 -16 -2Z', K.roast) + ln('M-9 -8 L-12 4 M-2 -10 L-5 8 M6 -9 L3 7', K.grill, 2.2) + hi('M-12 -6 Q-6 -10 2 -10'),
  teriyaki: () => p(SLAB, K.teriyaki) + hi('M-11 -6 Q-5 -9 1 -9') + sesame([[-6, -2], [1, -4], [7, 0], [-1, 3], [9, -5]]) + ln('M-4 -8 L-7 6 M4 -8 L1 7', INK, 1),
  drumstick: () => bone(6, -2, 16, -10) + p('M-14 4 Q-16 -6 -6 -9 Q4 -12 9 -4 Q12 4 4 9 Q-9 13 -14 4Z', K.roast) + hi('M-10 -4 Q-6 -8 0 -8') + ln('M-6 0 L-1 -4 M-2 5 L4 0', K.grill, 1.6),
  beef: () => p(SLAB, K.beef) + ln('M-9 -4 Q-3 -1 3 -5 M-4 4 Q2 1 9 3', K.beefLight, 1.6),
  rawbeef: () => p('M-15 -3 Q-12 -9 0 -8 Q13 -9 15 -2 Q14 6 2 6 Q-12 7 -15 -3Z', K.rawbeef) + ln('M-9 -3 Q-3 0 2 -4 Q6 -6 10 -2', '#f4e2de', 1.6),
  pork: () => p(SLAB, K.pork) + ln('M-13 -6 Q-2 -11 13 -5', K.porkFat, 3) + ln('M-6 1 L-1 -3 M2 3 L7 -1', '#9d6d54', 1.6),
  braisedpork: () => [[-7, -2], [3, -5], [-1, 4], [9, 2]].map(([x, y]) => p(`M${x - 5} ${y - 4} h10 v8 h-10Z`, K.braised).replace('/>', ` rx="2"/>`) + hi(`M${x - 3} ${y - 2} l4 0`)).join('') + dots([[-10, 6], [12, -4]], 1.6, K.green),
  steak: () => p('M-18 -1 Q-17 -12 -2 -12 Q15 -13 18 -3 Q20 8 4 10 Q-16 12 -18 -1Z', K.beef) + ln('M-10 -9 L-14 6 M-2 -11 L-6 9 M6 -11 L2 9 M-12 -2 L12 -6 M-12 4 L13 1', '#44291f', 1.8),
  fried: () => bone(8, -2, 17, -9) + friedBlob(0.85),
  popcorn: () => [[-9, -2], [0, -6], [9, -2], [-4, 5], [6, 5], [-13, 6], [13, 4]].map(([x, y]) => c(x, y, 5, K.fried) + dots([[x - 1, y - 1], [x + 2, y + 1]], 0.9, K.crumb)).join('') + p('M-2 -12 q4 -4 8 0 q-4 3 -8 0Z', K.green, O1),
  chickencutlet: () => friedBlob(1.15) + ln('M-6 -10 L-10 10 M4 -12 L0 10', K.crumb, 1.4),
  fish: () => p(SLAB, K.fish) + ln('M-9 -6 Q-6 0 -9 6 M-2 -8 Q1 0 -2 8 M5 -8 Q8 0 5 7', '#ccc1a9', 1.6),
  salmon: () => p(SLAB, K.salmon) + ln('M-10 -8 L-13 6 M-4 -9 L-7 8 M2 -9 L-1 8 M8 -8 L5 7', K.salmonLine, 1.6),
  mackerel: () => p('M-18 0 Q-10 -10 8 -8 Q17 -6 19 0 Q17 6 8 8 Q-10 10 -18 0Z', K.mackerel) + p('M-16 2 Q-6 8 8 7 Q15 5 18 1', '#e8ebee', O1) + ln('M-8 -6 L-11 3 M-1 -7 L-4 5 M6 -7 L3 5', '#3c4a58', 1.8) + c(12, -2, 1.3, INK, ''),
  wholefish: () => p('M-20 0 Q-8 -12 10 -8 L20 -14 L18 0 L20 14 L10 8 Q-8 12 -20 0Z', '#e8e2d5') + c(-12, -2, 1.6, INK, '') + ln('M-6 -4 Q2 -1 10 -4 M-8 3 Q2 6 9 3', '#ccc1a9', 1.4) + ln('M-14 -7 L6 -9 M-10 -3 L8 -5', K.green, 1.6) + ln('M-12 -5 L4 -7', '#efebdb', 1.4),
  tuna: () => [[-8, -2], [0, -5], [8, -1], [-3, 4], [6, 5]].map(([x, y]) => p(`M${x - 5} ${y} q2 -5 6 -3 q4 1 3 4 q-3 4 -7 2Z`, '#dac4b1', O1)).join(''),
  shrimp: () => rope('M-9 -6 Q4 -12 9 -1 Q9 8 -1 8', K.shrimp, 6) + ln('M-3 -8 l1 4 M3 -7 l-1 4 M7 -3 l-3 2 M7 3 l-4 0', '#f1d4c3', 1.2) + p('M-1 8 L-7 4 L-6 11Z', '#c97562', O1),
  egg: () => p('M-14 0 Q-15 -9 -5 -10 Q2 -14 9 -9 Q16 -6 14 2 Q13 10 2 9 Q-12 11 -14 0Z', K.egg) + c(1, -1, 5, K.yolk) + c(-0.5, -2.5, 1.3, '#ffffff', ''),
  boiledegg: () => e(0, 0, 9, 11, K.egg) + c(0, 1.5, 5, K.yolk) + hi('M-5 -6 Q-3 -9 0 -9'),
  teaegg: () => e(0, 0, 9, 11, K.teaegg) + ln('M-6 -6 L-2 -3 L-4 1 M2 -8 L4 -4 L1 0 L4 4 M-5 5 L-1 7', '#513826', 1.2),
  omelette: () => p('M-17 -6 Q-17 -9 -13 -9 L13 -9 Q17 -9 17 -6 L17 6 Q17 9 13 9 L-13 9 Q-17 9 -17 6Z', K.omelette) + ln('M-6 -9 L-6 9 M5 -9 L5 9', '#c7a156', 1.6) + dots([[-11, -2], [0, 3], [10, -3], [-1, -4], [11, 4]], 1.4, K.green),
  tomatoegg: () => p('M-15 2 Q-16 -7 -6 -8 Q2 -12 9 -7 Q16 -3 13 4 Q8 10 -3 9 Q-13 9 -15 2Z', K.omelette) + p('M-8 -2 L0 -6 L2 2Z', K.tomato, O1) + p('M3 0 L11 -3 L9 5Z', K.tomato, O1) + dots([[-4, 5], [6, -6]], 1.2, K.green),

  greens: () => ln('M-4 8 L-2 0 M3 8 L3 -1 M-8 7 L-6 2', INK, 4.4) + ln('M-4 8 L-2 0 M3 8 L3 -1 M-8 7 L-6 2', K.stem, 2.4) + floret(-7, -2, 6) + floret(6, -3, 6.5) + floret(-1, -6, 6.5),
  leafy: () => p('M-15 4 Q-17 -6 -8 -9 Q-3 -13 3 -9 Q10 -12 14 -5 Q18 2 10 6 Q0 11 -15 4Z', K.leaf) + ln('M-12 3 Q-2 -2 10 -4 M-4 0 L-6 -6 M3 -2 L4 -7', '#6b9552', 1.4),
  bokchoy: () => p('M-16 4 Q-10 -8 4 -9 Q12 -9 10 -4 Q2 0 -16 4Z', K.greenDark) + p('M-16 4 Q-4 -2 14 -1 Q12 4 2 5 Z', K.stem) + p('M-15 8 Q-6 1 8 0 Q16 0 14 4 Q4 7 -15 8Z', K.green),
  asparagus: () => [-4, 0, 4].map((dy) => rope(`M-16 ${dy + 3} L13 ${dy - 3}`, K.asparagus, 3.2) + p(`M12 ${dy - 6} l5 2 l-4 3Z`, '#587c4b', O1)).join(''),
  zucchini: () => [[-8, 0], [4, -4], [8, 6]].map(([x, y]) => c(x, y, 6.5, '#698a4f') + c(x, y, 4.6, '#dce3bf', '') + ln(`M${x - 3} ${y - 2} l6 0 M${x - 3} ${y + 2} l6 0`, K.grill, 1.2)).join(''),
  redpepper: () => p('M-15 -2 Q-6 -10 6 -6 Q14 -3 15 3 Q10 0 2 -1 Q-8 0 -15 -2Z', K.pepper) + p('M-12 6 Q-2 0 10 3 Q8 8 0 7 Q-6 9 -12 6Z', K.corn),
  cucumber: () => [-6, -2, 2, 6].map((x) => rope(`M${x - 6} 7 L${x + 6} -7`, K.cucumber, 2.4)).join(''),
  carrot: () => [[-6, -3], [5, -4], [0, 5]].map(([x, y]) => c(x, y, 5, K.carrot) + c(x, y, 2.2, '#e4b68a', '')).join(''),
  corn: () => [[-6, -3], [-1, -5], [4, -3], [-3, 1], [2, 1], [7, 1], [-8, 3], [0, 5], [5, 5]].map(([x, y]) => p(`M${x - 2.4} ${y} q0 -2.6 2.4 -2.6 q2.4 0 2.4 2.6 q0 2.2 -2.4 2.2 q-2.4 0 -2.4 -2.2Z`, K.corn, O1)).join(''),
  mushroom: () => p('M-3 2 L-2 9 L3 9 L4 2Z', '#eae2ce') + p('M-11 3 Q-11 -8 0 -9 Q11 -8 11 3Z', K.mushroom) + dots([[-4, -4], [3, -5]], 1.2, '#dccdb5'),
  scallion: () => [[-7, -2], [0, -4], [6, 0], [-3, 4], [8, -5], [2, 4]].map(([x, y]) => c(x, y, 2.4, '#c7d9aa', `stroke="${K.green}" stroke-width="1.6"`)).join(''),
  seaweed: () => p('M-10 -2 Q-6 -8 0 -4 Q6 -9 10 -3 Q6 2 0 0 Q-5 4 -10 -2Z', '#406148', O1) + p('M-4 4 q4 -4 8 0 q-4 3 -8 0Z', '#517959', O1),
  tomato: () => c(0, 0, 8.5, K.tomato) + p('M0 -9 L2 -6 L6 -7 L3 -4 L0 -5 L-3 -4 L-6 -7 L-2 -6Z', K.greenDark, O1) + hi('M-5 -1 Q-5 -4 -3 -5'),
  potato: () => [[-6, -2], [5, -3], [0, 5]].map(([x, y]) => p(`M${x - 5} ${y - 3} Q${x - 5} ${y - 6} ${x} ${y - 6} Q${x + 6} ${y - 6} ${x + 5} ${y} Q${x + 4} ${y + 5} ${x - 1} ${y + 4} Q${x - 6} ${y + 3} ${x - 5} ${y - 3}Z`, K.potato)).join(''),
  sweetpotato: () => p('M-18 2 Q-16 -9 -2 -8 Q12 -9 16 -2 Q17 6 4 7 Q-12 10 -18 2Z', K.sweetSkin) + e(13, 0, 5, 6.5, K.sweetFlesh) + ln('M-10 -3 Q-4 -5 2 -4', '#b68089', 1.4),
  avocado: () => [[-7, 1, -20], [0, -1, 0], [7, 1, 20]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})">` + p(`M${x - 3.5} ${y + 8} Q${x - 6} ${y - 4} ${x} ${y - 9} Q${x + 6} ${y - 4} ${x + 3.5} ${y + 8}Z`, K.avocado) + ln(`M${x - 3} ${y + 7} Q${x - 5} ${y - 3} ${x} ${y - 8}`, K.avocadoSkin, 1.6) + '</g>').join(''),
  tofu: () => cube(-6, 0, K.tofu, K.tofuSide) + cube(7, -2, K.tofu, K.tofuSide),
  tofugan: () => cube(-6, 0, '#a58264', K.tofugan) + cube(7, -2, '#a58264', K.tofugan),

  noodles: () => noodleBed(K.noodle),
  ricenoodle: () => noodleBed('#f3f0e9', 4),
  udon: () => noodleBed(K.udon, 5),
  soba: () => nest(K.soba),
  konjac: () => nest(K.konjac) + dots([[-6, -2], [4, 2]], 1.6, K.green),
  noodlepile: () => nest(K.noodle),
  pasta: () => nest('#d9c187') + p('M-8 -4 Q-6 -10 2 -9 Q10 -9 9 -3 Q6 2 -2 1 Q-9 1 -8 -4Z', K.sauce) + p('M2 -10 q4 -5 8 -1 q-4 3 -8 1Z', K.green, O1),
  curry: () => p('M-17 3 Q-18 -7 -6 -8 Q6 -11 15 -5 Q20 2 10 7 Q-4 11 -17 3Z', K.curry) + c(-7, -1, 3, K.carrot, O1) + p('M2 -4 h6 v5 h-6Z', K.potato, O1) + c(10, 2, 2.2, K.carrot, O1),

  pancake: () => [-11, 0, 11].map((x) => p(`M${x - 5} -7 Q${x - 5} -9 ${x - 3} -9 L${x + 3} -9 Q${x + 5} -9 ${x + 5} -7 L${x + 5} 7 Q${x + 5} 9 ${x + 3} 9 L${x - 3} 9 Q${x - 5} 9 ${x - 5} 7Z`, '#e7dbb6') + ln(`M${x - 3} -2 Q${x} -5 ${x + 3} -2 Q${x} 1 ${x - 2} -1`, '#c39d55', 2.2)).join(''),
  scallionpancake: () => p('M-17 2 Q-17 -9 -2 -10 Q15 -10 17 0 Q17 9 2 9 Q-15 10 -17 2Z', '#d9c191') + dots([[-9, -4], [4, -6], [10, 2], [-3, 4], [-11, 3]], 2, '#b28d5f') + dots([[-5, -2], [7, -2], [1, 5], [-12, -1]], 1.3, K.green),
  radishcake: () => p('M-16 -4 h13 v12 h-13Z', '#ece6d6') + ln('M-16 -4 h13', '#c7a671', 3) + p('M1 -8 h14 v12 h-14Z', '#ece6d6') + ln('M1 -8 h14', '#c7a671', 3),
  oystomelette: () => p('M-18 3 Q-18 -8 -3 -10 Q16 -10 18 0 Q18 9 2 9 Q-16 10 -18 3Z', '#e8deca') + [[-8, -3], [3, -5], [8, 2], [-3, 4]].map(([x, y]) => e(x, y, 3.6, 2.4, '#9a948a', O1)).join('') + dots([[-11, 2], [12, -3], [0, -1]], 1.6, K.green) + ln('M-12 -2 Q-4 3 4 -2 Q10 -6 14 -1', K.sauce, 2.2),
  sandwich: () => p('M-10 12 L18 12 L2 -12Z', K.bread).replace(INK, K.crust) + p('M-13 11 L16 11 L-2 -13Z', K.leaf) + p('M-15 10 L14 10 L-4 -14Z', K.tomato) + p('M-16 10 L13 10 L-5 -15Z', K.omelette) + p('M-18 10 L11 10 L-7 -15Z', K.bread) + ln('M-15 8 L8 8 L-6.5 -11Z', K.crust, 1.3),
  burger: () => p('M-15 9 Q-15 13 -11 13 L11 13 Q15 13 15 9Z', K.bun) + p('M-16 4 L16 4 L16 8 L-16 8Z', K.patty) + p('M-15 3 L15 3 L10 6 L4 3 L-3 7 L-8 3Z', K.cheese, O1) + ln('M-17 2 Q-13 -1 -9 2 T-1 2 T7 2 T17 2', K.leaf, 3) + p('M-16 0 Q-16 -14 0 -14 Q16 -14 16 0Z', K.bun) + sesame([[-7, -8], [0, -11], [6, -7], [-2, -5], [9, -3]]),
  toastpb: () => p(TOAST, K.bread) + p('M-9 9 L-9 -4 Q-11 -10 -4 -10 Q0 -13 4 -10 Q11 -10 9 -4 L9 9Z', K.pb, O1) + [[-4, -3], [4, 0], [-3, 5]].map(([x, y]) => c(x, y, 3.4, '#f0e7be', O1)).join(''),
  toastavo: () => p(TOAST, K.bread) + p('M-9 9 L-9 -4 Q-11 -10 -4 -10 Q0 -13 4 -10 Q11 -10 9 -4 L9 9Z', '#b3c58d', O1) + dots([[-4, -4], [3, -1], [-2, 4], [5, 5]], 1.1, '#c97562'),
  pancakes: () => e(0, 8, 16, 5, '#d2b286') + e(0, 3, 16, 5, '#d2b286') + e(0, -2, 16, 5, '#dabf93') + p('M-8 -4 Q0 -1 8 -4 L7 2 Q0 4 -6 1Z', '#e7ddc2', O1),
  wrap: () => p('M-16 -7 L12 -7 Q16 -7 16 0 Q16 7 12 7 L-16 7Z', '#e1d3b1') + e(12, 0, 5, 7, '#e1d3b1') + c(11, -2, 2, K.leaf, '') + c(13.5, 2, 1.8, K.tomato, '') + c(10, 2.5, 1.6, K.chicken, '') + ln('M-10 -7 Q-8 0 -10 7 M-2 -7 Q0 0 -2 7', '#bfa87e', 1.4),
  onigiri: () => p('M0 -14 Q4 -14 15 6 Q17 11 12 11 L-12 11 Q-17 11 -15 6 Q-4 -14 0 -14Z', K.rice) + p('M-7 2 h14 v9 h-14Z', '#323c37') + c(0, -3, 3, K.salmon, O1),
  riceroll: () => p('M-17 -7 L12 -7 Q16 -7 16 0 Q16 7 12 7 L-17 7Z', '#f1ede3') + e(12, 0, 5, 7, '#f1ede3') + c(12, 0, 3, '#be9960', O1) + dots([[-10, -3], [-4, 2], [3, -2]], 1, '#896984'),
  mantou: () => p('M-14 6 Q-16 -10 0 -11 Q16 -10 14 6Z', '#f7f4ed') + ln('M-14 6 L14 6', INK, 2.2) + dots([[6, -4], [9, 0], [4, 2]], 0.9, '#c5c0b4'),
  mantouw: () => p('M-14 6 Q-16 -10 0 -11 Q16 -10 14 6Z', '#ddd2bb') + dots([[-6, -4], [2, -7], [7, -2], [-2, 1], [9, 3]], 1, '#947e5f'),
  shaobing: () => p('M-17 -7 Q-17 -10 -14 -10 L14 -10 Q17 -10 17 -7 L17 7 Q17 10 14 10 L-14 10 Q-17 10 -17 7Z', '#c9a472') + ln('M-17 2 L17 2', K.omelette, 3) + sesame([[-10, -6], [-3, -4], [5, -7], [11, -3], [-7, 6], [3, 6], [10, 7]]),
  youtiao: () => rope('M-16 -3 Q0 -6 16 -3', '#be9960', 5) + rope('M-16 3 Q0 0 16 3', '#be9960', 5),
  dumpling: () => p('M-12 4 Q-12 -8 0 -9 Q12 -8 12 4 Q0 8 -12 4Z', '#f2eee3') + ln('M-6 -7 l1 4 M-1 -8 l0 4 M4 -8 l-1 4', '#c4beaf', 1.4),
  oden: () => ln('M0 14 L0 -16', INK, 4) + ln('M0 14 L0 -16', '#c6b28f', 2) + c(0, -11, 5, '#e1dacd') + p('M-6 -4 h12 v8 h-12Z', '#e7ddc2') + e(0, 9, 8, 4, '#e7ddc2'),
  banana: () => p('M-16 -4 Q-4 10 14 -2 Q16 -4 14 -6 Q2 2 -14 -8 Q-17 -7 -16 -4Z', K.banana) + ln('M-15 -6 l-2 -2 M14 -4 l2 -1', '#6b5334', 2.4) + ln('M-10 -3 Q0 4 10 -2', '#c7ab56', 1.3),
  guava: () => c(0, 0, 13, K.guava) + ln('M0 -13 L1 -17', '#6b5334', 2.4) + dots([[-5, -4], [4, 3], [-3, 6], [6, -5]], 1, '#84a263') + hi('M-8 -5 Q-7 -9 -3 -10'),
  apple: () => p('M0 -9 Q12 -16 14 -2 Q14 12 3 12 Q0 10 -3 12 Q-14 12 -14 -2 Q-12 -16 0 -9Z', K.apple) + ln('M0 -9 L1 -15', '#6b5334', 2.2) + p('M1 -14 q6 -4 9 0 q-5 3 -9 0Z', K.green, O1) + hi('M-9 -4 Q-8 -8 -5 -9'),
  kiwi: () => c(0, 0, 11, K.kiwiSkin) + c(0, 0, 9, K.kiwi, '') + c(0, 0, 3.2, '#eeefdb', '') + dots([[0, -6], [4, -4], [6, 0], [4, 4], [0, 6], [-4, 4], [-6, 0], [-4, -4]], 0.8, INK),
  berries: () => [[-6, -2, K.blueberry], [2, -5, K.raspberry], [7, 1, K.blueberry], [-1, 4, K.blueberry], [-9, 5, K.raspberry]].map(([x, y, col]) => c(+x, +y, 3.6, String(col), O1)).join(''),
  nuts: () => [[-6, -1, -20], [2, -3, 15], [7, 3, -10], [-2, 4, 30]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="3.8" ry="2.4" fill="${K.nut}" ${O1} transform="rotate(${r} ${x} ${y})"/>`).join(''),
  lemon: () => c(0, 0, 7, K.lemon) + c(0, 0, 5, '#f2edc9', '') + ln('M0 -5 L0 5 M-5 0 L5 0 M-3.5 -3.5 L3.5 3.5 M-3.5 3.5 L3.5 -3.5', '#c5b456', 1),
};

// 手搖杯內的配料（畫在杯底，並被杯身裁切）
const CUP_TOPPINGS: Record<string, () => string> = {
  pearls: () => [36, 46, 56, 66, 76, 84, 41, 51, 61, 71, 80, 46, 56, 66, 75].map((x, i) =>
    c(x, i < 6 ? 104 : i < 11 ? 97 : 90, 4.2, K.pearl, O1) + c(x - 1.3, (i < 6 ? 104 : i < 11 ? 97 : 90) - 1.3, 1, '#7a6559', '')).join(''),
  jelly: () => [[42, 100], [54, 102], [66, 100], [77, 102], [48, 92], [62, 93], [73, 91]].map(([x, y]) =>
    `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" rx="2" fill="#eef0dc" fill-opacity=".85" ${O1}/>`).join(''),
  sago: () => dots([[40, 104], [46, 100], [52, 105], [58, 101], [64, 104], [70, 100], [76, 104], [44, 94], [55, 95], [67, 94], [78, 96]], 2.4, '#fbf9ed'),
  mango: () => [[42, 98], [56, 101], [70, 97], [50, 89], [64, 88], [77, 90]].map(([x, y]) =>
    `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" rx="2" fill="#d0984d" ${O1}/>`).join(''),
  ice: () => [[46, 44, -12], [64, 48, 10], [56, 58, 4]].map(([x, y, r]) =>
    `<rect x="${x - 7}" y="${y - 7}" width="14" height="14" rx="3" fill="#ffffff" fill-opacity=".55" ${O1} transform="rotate(${r} ${x} ${y})"/>`).join(''),
  lemon: () => '',
  banana: () => '',
};

// ---------- 容器 ----------
type Shape = (fill: string, o: string) => string;
interface Vessel {
  shape: Shape;
  shade: [number, number]; // 網點陰影的位移：露出右下角
  ground: [number, number, number]; // 地面陰影 cx, cy, rx
  slots: Record<number, number[][]>;
  base: number;
}
const plateShape: Shape = (f, o) => `<ellipse cx="60" cy="78" rx="50" ry="22" fill="${f}" ${o}/>`;
const bowlShape: Shape = (f, o) => `<path d="M12 60 Q14 104 60 106 Q106 104 108 60Z" fill="${f}" ${o}/>`;
const boxShape: Shape = (f, o) => `<rect x="8" y="40" width="104" height="64" rx="10" fill="${f}" ${o}/>`;
const cupShape: Shape = (f, o) => `<path d="M30 34 L90 34 L82 110 L38 110Z" fill="${f}" ${o}/>`;
const jarShape: Shape = (f, o) => `<path d="M32 36 L88 36 L88 104 Q88 111 81 111 L39 111 Q32 111 32 104Z" fill="${f}" ${o}/>`;
const bottleShape: Shape = (f, o) =>
  `<path d="M46 18 L74 18 L74 30 Q90 38 90 54 L90 106 Q90 112 84 112 L36 112 Q30 112 30 106 L30 54 Q30 38 46 30Z" fill="${f}" ${o}/>`;

const FLAT: Record<number, number[][]> = {
  1: [[60, 74]], 2: [[50, 72], [82, 80]], 3: [[46, 72], [78, 68], [66, 86]], 4: [[44, 72], [74, 66], [60, 88], [90, 82]], 5: [[42, 72], [72, 66], [58, 88], [90, 80], [28, 84]],
};
const SURFACE: Record<number, number[][]> = {
  1: [[60, 58]], 2: [[48, 57], [76, 60]], 3: [[45, 57], [74, 54], [62, 66]], 4: [[42, 58], [70, 52], [58, 67], [86, 62]], 5: [[40, 58], [68, 52], [56, 67], [86, 62], [28, 64]],
};
const VESSELS: Record<string, Vessel> = {
  plate: { shape: plateShape, shade: [-7, -5], ground: [64, 96, 46], slots: FLAT, base: 1.15 },
  none: { shape: () => '', shade: [0, 0], ground: [62, 92, 34], slots: { 1: [[60, 74]], 2: [[48, 74], [78, 78]], 3: [[44, 72], [76, 70], [62, 86]] }, base: 1 },
  bowl: { shape: bowlShape, shade: [-10, -6], ground: [62, 108, 40], slots: SURFACE, base: 0.95 },
  pot: { shape: bowlShape, shade: [-10, -6], ground: [62, 108, 42], slots: SURFACE, base: 0.95 },
  box: { shape: boxShape, shade: [0, 0], ground: [62, 106, 50], slots: { 1: [[36, 72]], 2: [[36, 72], [84, 62]], 3: [[36, 72], [84, 60], [84, 86]], 4: [[36, 72], [83, 60], [75, 87], [96, 88]] }, base: 1 },
  cup: { shape: cupShape, shade: [-8, 0], ground: [62, 112, 30], slots: {}, base: 1 },
  jar: { shape: jarShape, shade: [-8, 0], ground: [62, 113, 32], slots: { 1: [[60, 38]], 2: [[50, 38], [72, 38]], 3: [[46, 38], [64, 36], [78, 40]] }, base: 0.8 },
  bottle: { shape: bottleShape, shade: [-8, 0], ground: [62, 114, 32], slots: {}, base: 1 },
};
const CAP_COLOR: Record<string, string> = { milk: '#6086af', soymilk: '#698950', protein: '#ff5a1f' };

let seq = 0;

export interface ParsedArt {
  vessel: string;
  fill?: string;
  parts: { name: string; scale: number }[];
  steam: boolean;
}

export function parseArt(spec: string): ParsedArt {
  const steam = spec.endsWith('!');
  const s = steam ? spec.slice(0, -1) : spec;
  const [head, body = ''] = s.split('|');
  const [vessel, fill] = head.split('~');
  const parts = body
    .split(',')
    .filter(Boolean)
    .map((t) => {
      // 'beef*1.2'、'beef1.2'、'beef.8' 都可以
      const m = t.trim().match(/^([a-z]+)\*?(\d*\.?\d+)?$/);
      if (!m) return { name: t.trim(), scale: 1 };
      return { name: m[1], scale: m[2] ? +m[2] : 1 };
    });
  return { vessel, fill, parts, steam };
}

/** 產生一張食物插畫（SVG 字串，正方形） */
export function foodArtSvg(spec: string, size = 96, label = ''): string {
  const art = parseArt(spec);
  const v = VESSELS[art.vessel] ?? VESSELS.plate;
  const id = `fa${++seq}`;
  const fill = art.fill ? FILLS[art.fill] ?? art.fill : undefined;
  const out: string[] = [];

  out.push(
    `<defs><pattern id="${id}d" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.05" fill="${INK}"/></pattern>` +
      `<pattern id="${id}b" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.4" fill="#9a9a9a"/></pattern>` +
      `<clipPath id="${id}c">${v.shape('#000', '')}</clipPath></defs>`,
  );
  // 背景網點圓＋地面陰影
  out.push(`<circle cx="74" cy="44" r="38" fill="url(#${id}b)" opacity=".55"/>`);
  out.push(`<ellipse cx="${v.ground[0]}" cy="${v.ground[1]}" rx="${v.ground[2]}" ry="6" fill="url(#${id}d)" opacity=".45"/>`);

  const shaded = (base: string) =>
    v.shape(base, O) +
    `<g clip-path="url(#${id}c)"><g opacity=".3">${v.shape(`url(#${id}d)`, '')}</g><g transform="translate(${v.shade[0]} ${v.shade[1]})">${v.shape(base, '')}</g></g>` +
    v.shape('none', O);

  if (art.vessel === 'plate') {
    out.push(shaded(PAPER) + `<ellipse cx="60" cy="76" rx="38" ry="15" fill="none" ${O1} opacity=".6"/>`);
  } else if (art.vessel === 'bowl' || art.vessel === 'pot') {
    const pot = art.vessel === 'pot';
    if (pot) out.push(`<rect x="2" y="60" width="16" height="7" rx="3.5" fill="${INK}"/><rect x="102" y="60" width="16" height="7" rx="3.5" fill="${INK}"/>`);
    out.push(`<path d="M46 104 L44 110 L76 110 L74 104Z" fill="${PAPER}" ${O}/>`);
    out.push(shaded(pot ? '#ff5a1f' : PAPER));
    if (!pot) out.push(ln('M20 76 Q60 86 100 76', '#ff5a1f', 2.4));
    out.push(e(60, 60, 48, 15, PAPER) + e(60, 61, 44, 12.5, fill ?? K.rice, O1));
  } else if (art.vessel === 'box') {
    out.push(v.shape(INK, O));
    out.push(`<rect x="14" y="46" width="92" height="52" rx="6" fill="#f7f3ea" ${O1}/>`);
    out.push(ln('M60 46 L60 98', INK, 2.2) + ln('M60 74 L106 74', INK, 1.6));
  } else if (art.vessel === 'cup' || art.vessel === 'jar') {
    const isJar = art.vessel === 'jar';
    const liquid = fill ?? FILLS.milktea;
    const tops = art.parts.filter((x) => CUP_TOPPINGS[x.name]);
    out.push(v.shape(isJar ? '#f7f6f2' : liquid, O));
    out.push(`<g clip-path="url(#${id}c)">`);
    if (isJar) out.push(`<rect x="20" y="40" width="80" height="80" fill="${liquid}"/>` + ln('M30 70 Q60 64 90 70', '#fbf6ed', 6) + `<rect x="20" y="76" width="80" height="40" fill="${FILLS.yogurt}"/>`);
    if (art.fill === 'brownsugar') out.push(ln('M34 50 Q50 60 40 76 M60 40 Q74 58 62 80 M80 46 Q70 64 80 90', '#775138', 4).replace('/>', ' opacity=".7"/>'));
    if (!isJar) out.push(ln('M30 46 L90 46', '#ffffff', 2).replace('/>', ' opacity=".5"/>'));
    out.push(tops.map((t) => CUP_TOPPINGS[t.name]()).join(''));
    out.push(`<g opacity=".28"><path d="M72 34 L90 34 L82 110 L66 110Z" fill="url(#${id}d)"/></g>`);
    out.push(`</g>`);
    out.push(v.shape('none', O));
    if (isJar) {
      out.push(`<rect x="28" y="30" width="64" height="8" rx="3" fill="${PAPER}" ${O}/>`);
    } else {
      out.push(`<rect x="66" y="2" width="7" height="34" rx="2" fill="#ff5a1f" ${O} transform="rotate(12 69 18)"/>`);
      out.push(`<rect x="26" y="28" width="68" height="8" rx="3" fill="${PAPER}" ${O}/>`);
      out.push(`<path d="M35 64 L85 64 L83 84 L37 84Z" fill="${PAPER}" ${O1}/>` + `<path d="M37 64 L85 64 L83 84 L71 84Z" fill="url(#${id}d)" opacity=".25"/>`);
      if (art.parts.some((x) => x.name === 'lemon')) out.push(`<g transform="translate(30 38)">${PARTS.lemon()}</g>`);
      if (art.parts.some((x) => x.name === 'banana')) out.push(`<g transform="translate(36 30) rotate(-20) scale(.7)">${PARTS.banana()}</g>`);
    }
  } else if (art.vessel === 'bottle') {
    out.push(shaded(fill ?? FILLS.milk));
    out.push(`<rect x="44" y="10" width="32" height="12" rx="3" fill="${CAP_COLOR[art.fill ?? ''] ?? '#ff5a1f'}" ${O}/>`);
    out.push(`<rect x="30" y="62" width="60" height="30" fill="${PAPER}" ${O}/>` + ln('M40 72 L72 72 M40 80 L62 80', INK, 2.4) + c(80, 77, 5, CAP_COLOR[art.fill ?? ''] ?? '#ff5a1f', O1));
  }

  // 食材：依槽位擺放，後面的先畫
  if (v.slots && Object.keys(v.slots).length) {
    const list = art.parts.filter((x) => PARTS[x.name] && !(art.vessel === 'cup' || art.vessel === 'bottle'));
    const n = Math.min(list.length, Math.max(...Object.keys(v.slots).map(Number)));
    const slots = v.slots[n] ?? [];
    list
      .slice(0, n)
      .map((x, i) => ({ ...x, at: slots[i] }))
      .sort((a, b) => a.at[1] - b.at[1])
      .forEach((x) => out.push(`<g transform="translate(${x.at[0]} ${x.at[1]}) scale(${(x.scale * v.base).toFixed(2)})">${PARTS[x.name]()}</g>`));
  }

  if (art.steam) {
    out.push(ln('M44 34 Q40 26 45 20 Q50 14 46 6 M62 32 Q58 24 63 18 Q68 12 64 4 M80 34 Q76 26 81 20', '#4a4740', 2.2).replace('/>', ' opacity=".7"/>'));
  }

  const aria = label ? `role="img" aria-label="${label.replace(/"/g, '')}"` : 'aria-hidden="true"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${art.vessel === 'none' ? '18 24 86 86' : '0 0 120 120'}" width="${size}" height="${size}" ${aria}>${out.join('')}</svg>`;
}

/** 列出配方裡用到但尚未定義的食材（給測試用） */
export function unknownParts(spec: string): string[] {
  const a = parseArt(spec);
  const bad = a.parts.map((x) => x.name).filter((n) => !PARTS[n] && !CUP_TOPPINGS[n]);
  if (!VESSELS[a.vessel]) bad.push(`容器:${a.vessel}`);
  if (a.fill && !FILLS[a.fill]) bad.push(`湯底:${a.fill}`);
  return bad;
}
