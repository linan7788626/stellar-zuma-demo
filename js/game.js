/* ============================================================
   星链祖玛 Stellar Zuma
   纯原生 Canvas 实现 · 无任何外部依赖
   七色恒星球对应恒星光谱分类 O B A F G K M
   ============================================================ */
(() => {
'use strict';

/* ================= 基础常量 ================= */
const W = 1280, H = 800;
const CX = 640, CY = 415;
const BALL_R = 22, D = BALL_R * 2;
const TAU = Math.PI * 2;
const SHOT_SPEED = 950;
const SHOT_CD = 0.14;
const COMBO_WINDOW = 3.5;

const TYPES = [
  { key:'O', name:'蓝巨星', color:'#5b7bff', dark:'#243190', light:'#b8c8ff', glow:'#7d95ff' },
  { key:'B', name:'蓝白星', color:'#9fb6ff', dark:'#4a5fc0', light:'#dce6ff', glow:'#a5bdff' },
  { key:'A', name:'白星',   color:'#eef1ff', dark:'#98a3cf', light:'#ffffff', glow:'#dfe6ff' },
  { key:'F', name:'黄白星', color:'#fff3c8', dark:'#c2a452', light:'#fffbe8', glow:'#ffe9a6' },
  { key:'G', name:'黄矮星', color:'#ffd84d', dark:'#b57d12', light:'#fff3b0', glow:'#ffc93e' },
  { key:'K', name:'橙矮星', color:'#ff9e3d', dark:'#b25410', light:'#ffdcae', glow:'#ff8c2e' },
  { key:'M', name:'红矮星', color:'#ff5346', dark:'#a32318', light:'#ffb3a8', glow:'#ff4438' },
];
const UI_FONT = '"Trebuchet MS","PingFang SC","Microsoft YaHei",sans-serif';

const LEVEL_PALETTES = [
  [0, 2, 4, 6],
  [1, 2, 4, 5, 6],
  [0, 1, 2, 4, 6],
  [0, 2, 3, 4, 6],
  [0, 1, 2, 4, 5, 6],
  [0, 1, 2, 3, 4, 6],
  [0, 1, 2, 3, 4, 5, 6],
];

const STAR_INFO = [
  { temp: '≥ 30,000 K', example: '参宿一 · Alnitak', hr: [0.04, 0.06], desc: '最炽热也最稀有的蓝巨星，质量可达太阳数十倍，以电离氦谱线为特征，寿命仅有数百万年。' },
  { temp: '10,000 – 30,000 K', example: '角宿一 · Spica', hr: [0.16, 0.15], desc: '蓝白色的B型星，中性氦谱线强烈，猎户座腰带三星多属此类，是夜空中耀眼的亮星。' },
  { temp: '7,500 – 10,000 K', example: '织女星 · Vega', hr: [0.30, 0.28], desc: '洁白的A级星，氢的巴尔末谱线最为强烈，自转迅速，织女星是其原型。' },
  { temp: '6,000 – 7,500 K', example: '南河三 · Procyon', hr: [0.43, 0.42], desc: '黄白色的F型星，比太阳稍热稍亮，金属谱线增强，是搜寻类地行星的热门目标。' },
  { temp: '5,200 – 6,000 K', example: '太阳 · Sun (G2V)', hr: [0.56, 0.56], desc: '黄矮星，我们的太阳正属此类，氢燃烧平稳温和，寿命约一百亿年。' },
  { temp: '3,700 – 5,200 K', example: '大角星 · Arcturus', hr: [0.68, 0.70], desc: '橙色恒星，金属谱线明显，寿命可达数百亿年，被认为是宜居世界的优良宿主。' },
  { temp: '2,400 – 3,700 K', example: '比邻星 · Proxima', hr: [0.82, 0.88], desc: '数量最多的红矮星，占恒星总数七成以上，光度微弱而寿命极长，以耀斑活动著称。' },
];

const LUM_CLASSES = [
  { key: '蓝超', name: '蓝超巨星', color: 0, size: 1.3, icon: 0.84, example: '参宿七 · Rigel (B8Ia)', hr: [0.13, 0.06], region: [0.13, 0.08, 0.115, 0.08], yerkes: 'Ia', radius: '半径 ≈ 太阳的几十倍',
    desc: '最炽热明亮的超巨星，质量可达太阳数十倍，蓝白光辉源自极高表面温度；终将以超新星爆发结束一生。',
    effect: 'supernova', effectName: '超新星爆发', effectDesc: '摧毁它附近的所有恒星' },
  { key: '红超', name: '红超巨星', color: 6, size: 1.5, icon: 0.96, example: '参宿四 · Betelgeuse (M1-Ia)', hr: [0.84, 0.04], region: [0.84, 0.09, 0.13, 0.085], yerkes: 'Ia', radius: '半径 ≈ 太阳的近千倍',
    desc: '演化晚期的庞然巨物，半径可达太阳近千倍，表面冷却泛红；星风极强、物质抛洒剧烈，终以超新星收场。',
    effect: 'wind', effectName: '星风', effectDesc: '把整条星链吹退' },
  { key: '红巨', name: '红巨星', color: 5, size: 1.15, icon: 0.70, example: '毕宿五 · Aldebaran (K5III)', hr: [0.68, 0.28], region: [0.70, 0.30, 0.09, 0.16], yerkes: 'III', radius: '半径 ≈ 太阳的数十倍',
    desc: '离开主序的演化恒星：核心收缩而外包层剧烈膨胀，半径达太阳数十倍，包层稀疏近乎透明。',
    effect: 'slow', effectName: '弥漫减速', effectDesc: '星链减速 6 秒' },
  { key: '白矮', name: '白矮星', color: 2, size: 0.55, icon: 0.36, example: '天狼星B · Sirius B (DA2)', hr: [0.12, 0.88], region: [0.12, 0.82, 0.10, 0.10], yerkes: 'VII', radius: '半径 ≈ 地球(0.01 R☉)',
    desc: '类太阳恒星死亡后遗下的核心：只有地球大小却拥有接近太阳的质量，密度高达水的百万倍，由电子简并压力支撑。',
    effect: 'pierce', effectName: '简并子弹', effectDesc: '发射的星球变成穿透弹,直接摧毁沿途恒星 8 秒' },
];

const QUIZ_POOL = [
  { keys: ['HR'], q: '赫罗图的横轴表示恒星的什么?', opts: ['表面温度', '恒星质量', '距地球远近'], exp: '横轴是表面温度(高温在左),纵轴是光度(亮度)。' },
  { keys: ['HR'], q: '赫罗图的纵轴表示?', opts: ['光度(真实亮度)', '视星等', '恒星质量'], exp: '纵轴是光度,即恒星每秒向太空辐射的总能量。' },
  { keys: ['HR'], q: '太阳在赫罗图上位于?', opts: ['主序带上', '红巨星分支上', '白矮星区'], exp: '太阳是标准的黄矮星,正处在主序带中部。' },
  { keys: ['HR'], q: '主序星的能量来自?', opts: ['核心的氢聚变', '引力收缩', '化学燃烧'], exp: '主序阶段恒星把核心的氢聚变成氦,太阳已经烧了约 46 亿年。' },
  { keys: ['HR'], q: '主序带在赫罗图上的走向是?', opts: ['左上到右下', '左下到右上', '竖直一条线'], exp: '高温高光度的蓝星在左上,低温暗弱的红星在右下。' },
  { keys: ['HR'], q: '同样在主序上,质量越大的恒星光度?', opts: ['越大', '越小', '完全一样'], exp: '质量-光度关系:主序星的亮度随质量急剧增大。' },
  { keys: ['HR'], q: '光度分类中罗马数字 V 代表?', opts: ['主序星(矮星)', '超巨星', '白矮星'], exp: 'Yerkes 分类:V 主序、IV 亚巨星、III 巨星、I 超巨星。' },
  { keys: ['HR'], q: '为什么红巨星温度低却很亮?', opts: ['半径巨大,总辐射面积大', '核心还在烧氢', '离我们更近'], exp: '光度 ∝ 半径²×温度⁴,红巨星半径达太阳几十倍。' },
  { keys: ['O'], q: '光谱型中表面温度最高的是?', opts: ['O 型', 'G 型', 'M 型'], exp: '顺序 O B A F G K M,O 型可达 30000K 以上。' },
  { keys: ['O'], q: 'O 型星的典型颜色是?', opts: ['蓝色', '黄色', '红色'], exp: '温度越高越偏蓝,O 型星是最炽热的蓝巨星。' },
  { keys: ['B'], q: '猎户座腰带三星大多属于哪一型?', opts: ['B 型', 'K 型', 'M 型'], exp: '参宿一等腰带三星是炽热的 B 型星。' },
  { keys: ['A'], q: '织女星属于哪一光谱型?', opts: ['A 型', 'M 型', 'G 型'], exp: '织女星是 A 型星的典型代表,洁白发蓝白光。' },
  { keys: ['G'], q: '太阳的光谱型符号是?', opts: ['G2V', 'M1-Ia', 'DA2'], exp: 'G2 = 表面约 5800K,V = 主序星(矮星)。' },
  { keys: ['K'], q: '大角星是一颗?', opts: ['K 型橙色巨星', 'O 型蓝巨星', 'A 型白星'], exp: '大角星 K1III,已离开主序的橙色巨星。' },
  { keys: ['M'], q: '宇宙中数量最多的恒星是?', opts: ['红矮星', '蓝巨星', '黄矮星'], exp: 'M 型红矮星占恒星总数七成以上,只是太暗肉眼看不见。' },
  { keys: ['BSG'], q: '参宿七(猎户座最亮星)是一颗?', opts: ['蓝超巨星', '红矮星', '白矮星'], exp: '参宿七 B8Ia,光度约为太阳的 12 万倍。' },
  { keys: ['BSG'], q: '大质量恒星的结局通常是?', opts: ['超新星爆发,留下中子星或黑洞', '安静地变成白矮星', '慢慢蒸发消失'], exp: '质量越大死得越壮烈,核心坍缩引发超新星爆发。' },
  { keys: ['RSG'], q: '下列恒星中半径最大的是?', opts: ['红超巨星', '太阳', '白矮星'], exp: '红超巨星半径可达太阳近千倍,能把木星轨道都装进去。' },
  { keys: ['RSG'], q: '参宿四(红超巨星)在天文学尺度上随时可能?', opts: ['以超新星爆发终结', '变成主序星', '冷却成行星'], exp: '未来百万年内爆发,届时亮度可媲美满月。' },
  { keys: ['RG'], q: '红巨星膨胀的原因是?', opts: ['核心收缩点燃壳层氢,外层受热膨胀', '被行星撞击', '吞掉了另一颗星'], exp: '核心氢耗尽后收缩,壳层氢燃烧把外包层推出去。' },
  { keys: ['WD'], q: '白矮星靠什么对抗引力坍缩?', opts: ['电子简并压', '核聚变', '磁场'], exp: '泡利不相容原理产生的电子简并压支撑着白矮星。' },
  { keys: ['WD'], q: '天狼星 B 的体积与哪个天体相当?', opts: ['地球', '太阳', '月球'], exp: '只有地球大小,却拥有接近太阳的质量。' },
  { keys: ['WD'], q: '一茶匙白矮星物质的质量约为?', opts: ['几吨', '几克', '几毫克'], exp: '密度约为水的百万倍,堪称"宇宙中的钻石"。' },
  { keys: ['WD', 'HR'], q: '红矮星与白矮星最大的区别是?', opts: ['红矮星靠氢燃烧发光,白矮星是不再产能的遗骸', '白矮星更热所以更大', '红矮星不是真正的恒星'], exp: '红矮星是主序星(V),白矮星是恒星遗骸(VII),只靠余热发光。' },
  { keys: ['HR'], q: '棕矮星为什么被称为"失败的恒星"?', opts: ['质量太小,核心没能点燃氢聚变', '它曾经爆炸过', '它是行星的卫星'], exp: '棕矮星质量介于行星与恒星之间,无法维持稳定的氢聚变。' },
  { keys: ['HR'], q: '太阳最终的结局是?', opts: ['膨胀成红巨星,抛去外层后留下一颗白矮星', '变成一颗红矮星', '直接坍缩成黑洞'], exp: '约 50 亿年后太阳膨胀为红巨星,最终留下地球大小的白矮星。' },
];

const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
};

/* ================= 画布 ================= */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const SS = Math.min(2, window.devicePixelRatio || 1);
canvas.width = W * SS;
canvas.height = H * SS;

/* ================= 路径(向内螺旋) ================= */
const pathPts = [];
const TURN = 1.6, R0 = 335, R1 = 100, STEPS = 900;
for (let i = 0; i <= STEPS; i++) {
  const u = i / STEPS;
  const th = -Math.PI / 2 + u * TAU * TURN;
  const r = R0 + (R1 - R0) * u;
  pathPts.push({ x: CX + Math.cos(th) * r, y: CY + Math.sin(th) * r });
}
const cum = [0];
for (let i = 1; i < pathPts.length; i++) {
  const a = pathPts[i - 1], b = pathPts[i];
  cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
}
const totalLen = cum[cum.length - 1];

function posAt(d) {
  d = clamp(d, 0, totalLen);
  let lo = 0, hi = cum.length - 1;
  while (lo < hi - 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
  const seg = (cum[hi] - cum[lo]) || 1;
  const t = (d - cum[lo]) / seg;
  return { x: pathPts[lo].x + (pathPts[hi].x - pathPts[lo].x) * t,
           y: pathPts[lo].y + (pathPts[hi].y - pathPts[lo].y) * t };
}
function tanAt(d) {
  const a = posAt(Math.max(0, d - 6)), b = posAt(Math.min(totalLen, d + 6));
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  return { x: dx / L, y: dy / L };
}
const holePos = posAt(totalLen);

/* ================= 音效(WebAudio 合成) ================= */
let muted = false;
const SFX = {
  ctx: null, master: null,
  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.ctx.destination);
      } catch (e) { /* 无音频环境时静默 */ }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(f, dur, type = 'sine', vol = 0.2, delay = 0, slide) {
    if (!this.ctx || muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(f, 1), t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(slide, 1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  shoot()  { this.tone(440, 0.09, 'triangle', 0.18, 0, 760); },
  insert() { this.tone(190, 0.05, 'square', 0.10); },
  swap()   { this.tone(320, 0.06, 'sine', 0.12); this.tone(430, 0.06, 'sine', 0.10, 0.05); },
  clack()  { this.tone(150, 0.06, 'square', 0.12); },
  match(n, combo) {
    const base = 440 * Math.pow(1.13, combo);
    const steps = [0, 4, 7, 12];
    for (let i = 0; i < Math.min(4, n); i++)
      this.tone(base * Math.pow(2, steps[i] / 12), 0.14, 'triangle', 0.20, 0.03 + i * 0.06);
    if (n > 4) this.tone(base * 2, 0.20, 'sine', 0.15, 0.30);
  },
  autoClear() {
    this.tone(180, 0.30, 'sine', 0.25, 0, 70);
    this.tone(95, 0.40, 'triangle', 0.20, 0.05, 45);
  },
  pop()   { this.tone(600, 0.09, 'sine', 0.12, 0, 140); },
  alarm() { this.tone(200, 0.35, 'sawtooth', 0.14, 0, 90); },
  gameOver() { this.tone(300, 1.1, 'sawtooth', 0.20, 0, 55); this.tone(150, 1.4, 'triangle', 0.16, 0.10, 40); },
  levelClear() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.20, i * 0.11));
    this.tone(1318, 0.30, 'sine', 0.16, 0.50);
  },
  click() { this.tone(500, 0.05, 'sine', 0.10); },
};

/* ================= 恒星球精灵(预渲染) ================= */
const sprites = [];
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function diamond(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y - r);
  c.lineTo(x + r, y);
  c.lineTo(x, y + r);
  c.lineTo(x - r, y);
  c.closePath();
}
function glyphBehind(c, ti, T) {
  if (ti === 0) {
    c.fillStyle = hexA(T.light, 0.9);
    for (const a of [45, 135, 225, 315]) {
      c.save(); c.rotate(a * Math.PI / 180);
      c.beginPath(); c.moveTo(12, -2.4); c.lineTo(31, 0); c.lineTo(12, 2.4); c.closePath(); c.fill();
      c.restore();
    }
  } else if (ti === 1) {
    c.fillStyle = hexA(T.light, 0.85);
    for (let k = 0; k < 4; k++) {
      c.save(); c.rotate(k * Math.PI / 2);
      c.beginPath(); c.moveTo(12, -2); c.lineTo(28, 0); c.lineTo(12, 2); c.closePath(); c.fill();
      c.restore();
    }
  } else if (ti === 4) {
    c.strokeStyle = hexA(T.light, 0.9); c.lineWidth = 2.2; c.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      c.beginPath();
      c.moveTo(Math.cos(a) * 13, Math.sin(a) * 13);
      c.lineTo(Math.cos(a) * 26, Math.sin(a) * 26);
      c.stroke();
    }
  }
}
function glyphFront(c, ti, T, R) {
  if (ti === 2) {
    c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, 0, R + 4, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.25)';
    c.beginPath(); c.arc(0, 0, R + 7.5, 0, TAU); c.stroke();
  } else if (ti === 3) {
    c.strokeStyle = hexA(T.dark, 0.75); c.lineWidth = 1.8;
    c.setLineDash([5, 4]);
    c.beginPath(); c.arc(0, 0, R - 4.5, 0, TAU); c.stroke();
    c.setLineDash([]);
  } else if (ti === 5) {
    c.fillStyle = hexA(T.dark, 0.55);
    c.beginPath(); c.arc(6, 7, 3.4, 0, TAU); c.fill();
    c.beginPath(); c.arc(-7, 2, 2.4, 0, TAU); c.fill();
  } else if (ti === 6) {
    c.fillStyle = hexA(T.dark, 0.4);
    c.beginPath(); c.arc(4, 4, R - 6, 0, TAU); c.fill();
  }
}
function makeSprites() {
  const half = 48;
  TYPES.forEach((T, ti) => {
    const cv = document.createElement('canvas');
    cv.width = half * 2 * 2; cv.height = half * 2 * 2;
    const c = cv.getContext('2d');
    c.scale(2, 2); c.translate(half, half);
    let g = c.createRadialGradient(0, 0, BALL_R * 0.4, 0, 0, BALL_R + 26);
    g.addColorStop(0, hexA(T.glow, 0.5));
    g.addColorStop(0.5, hexA(T.glow, 0.15));
    g.addColorStop(1, hexA(T.glow, 0));
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, BALL_R + 26, 0, TAU); c.fill();
    glyphBehind(c, ti, T);
    g = c.createRadialGradient(-BALL_R * 0.35, -BALL_R * 0.4, BALL_R * 0.1, 0, 0, BALL_R * 1.15);
    g.addColorStop(0, T.light);
    g.addColorStop(0.45, T.color);
    g.addColorStop(1, T.dark);
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, BALL_R, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,10,.28)'; c.lineWidth = 2.4;
    c.beginPath(); c.arc(0, 0, BALL_R - 1.4, 0.5, 2.4); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, 0, BALL_R - 1.2, -2.7, -1.1); c.stroke();
    glyphFront(c, ti, T, BALL_R);
    c.fillStyle = 'rgba(255,255,255,.8)';
    c.beginPath(); c.ellipse(-7.5, -9, 5.5, 3.6, -0.65, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.9)';
    c.beginPath(); c.arc(-3.5, -13, 1.6, 0, TAU); c.fill();
    c.font = 'bold 15px "Trebuchet MS","Helvetica Neue",sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(12,14,34,.75)';
    c.fillText(T.key, 0, 1);
    sprites.push(cv);
  });
}
function drawBall(x, y, ti, scale = 1, alpha = 1) {
  const s = 96 * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprites[ti], x - s / 2, y - s / 2, s, s);
  ctx.restore();
}
function renderStarCard(id) {
  const cv = document.getElementById(id);
  if (!cv) return;
  const c = cv.getContext('2d');
  const s = cv.width;
  c.clearRect(0, 0, s, s);
  const g = c.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s * 0.52);
  g.addColorStop(0, hexA(TYPES[featuredType].glow, 0.45));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, s, s);
  c.drawImage(sprites[featuredType], s * 0.13, s * 0.13, s * 0.74, s * 0.74);
}
function renderLumCard(id) {
  const cv = document.getElementById(id);
  if (!cv) return;
  const c = cv.getContext('2d');
  const s = cv.width;
  c.clearRect(0, 0, s, s);
  const g = c.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s * 0.52);
  g.addColorStop(0, 'rgba(255,215,80,.5)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, s, s);
  const frac = s * LUM_CLASSES[curLum].icon, off = (s - frac) / 2;
  c.drawImage(sprites[LUM_CLASSES[curLum].color], off, off, frac, frac);
  c.strokeStyle = 'rgba(255,215,80,.9)';
  c.lineWidth = s * 0.035;
  c.beginPath(); c.arc(s / 2, s / 2, s * 0.375, 0, TAU); c.stroke();
  c.fillStyle = '#ffd84d';
  c.font = 'bold ' + Math.round(s * 0.13) + 'px ' + UI_FONT;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 5;
  c.fillText(LUM_CLASSES[curLum].key, s / 2, s * 0.08);
  c.shadowBlur = 0;
}
const HRP = { l: 76, r: 34, t: 40, b: 62 };
function hrMap(w, h, nx, ny) {
  const iw = w - HRP.l - HRP.r, ih = h - HRP.t - HRP.b;
  return [HRP.l + nx * iw, HRP.t + ny * ih];
}
function drawProgressHR(id, w, h) {
  const cv = document.getElementById(id);
  if (!cv) return;
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(8,10,26,.85)';
  roundRect(c, 0, 0, w, h, 14); c.fill();
  c.strokeStyle = 'rgba(140,160,255,.25)'; c.lineWidth = 2;
  roundRect(c, 0, 0, w, h, 14); c.stroke();
  const padL = w * 0.12, padR = w * 0.05, padT = h * 0.14, padB = h * 0.21;
  const iw = w - padL - padR, ih = h - padT - padB;
  const P = i => [padL + STAR_INFO[i].hr[0] * iw, padT + STAR_INFO[i].hr[1] * ih];
  c.strokeStyle = 'rgba(150,170,255,.4)'; c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(padL, padT); c.lineTo(padL, padT + ih); c.lineTo(padL + iw, padT + ih);
  c.stroke();
  if (progress.spectral.every(v => v)) drawIsoRadius(c, padL, padT, iw, ih, 9);
  c.strokeStyle = 'rgba(160,180,255,.22)'; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath();
  STAR_INFO.forEach((_, i) => { const [x, y] = P(i); i ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.stroke();
  LUM_CLASSES.forEach((L, i) => {
    const x = padL + L.region[0] * iw, y = padT + L.region[1] * ih;
    const rx = L.region[2] * iw, ry = L.region[3] * ih;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, TAU);
    if (progress.lum[i]) {
      c.fillStyle = 'rgba(255,215,80,.20)';
      c.fill();
      c.strokeStyle = 'rgba(255,215,80,.8)'; c.lineWidth = 1.6;
      c.stroke();
    } else {
      c.strokeStyle = 'rgba(255,215,80,.16)'; c.lineWidth = 1;
      c.setLineDash([3, 4]);
      c.stroke();
      c.setLineDash([]);
    }
  });
  c.textAlign = 'center'; c.textBaseline = 'middle';
  TYPES.forEach((T, i) => {
    const [x, y] = P(i);
    if (progress.spectral[i]) {
      c.fillStyle = hexA(T.glow, .35);
      c.beginPath(); c.arc(x, y, 10, 0, TAU); c.fill();
      c.fillStyle = T.color;
      c.beginPath(); c.arc(x, y, 5.5, 0, TAU); c.fill();
      c.fillStyle = '#e8eeff';
      c.font = 'bold 11px ' + UI_FONT;
      c.fillText(T.key, x, y - 12);
    } else {
      c.fillStyle = 'rgba(120,130,170,.55)';
      c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill();
    }
  });
  c.font = 'bold 10px ' + UI_FONT;
  LUM_CLASSES.forEach((L, i) => {
    if (!progress.lum[i]) return;
    const x = padL + L.region[0] * iw;
    const y = Math.max(padT + 7, padT + (L.region[1] - L.region[3]) * ih - 8);
    c.fillStyle = 'rgba(255,220,120,.9)';
    c.fillText(L.name, x, y);
  });
  if (state === 'intro' || state === 'playing' || state === 'clearing' || state === 'levelclear' || state === 'paused') {
    let tx, ty, tr;
    if (gamePart === 1) {
      [tx, ty] = P(featuredType);
      tr = 11;
    } else {
      const L = LUM_CLASSES[curLum];
      tx = padL + L.region[0] * iw; ty = padT + L.region[1] * ih;
      tr = Math.max(L.region[2] * iw, L.region[3] * ih) + 4;
    }
    c.strokeStyle = 'rgba(255,215,80,.9)';
    c.setLineDash([5, 4]);
    c.lineWidth = 1.6;
    c.beginPath(); c.arc(tx, ty, tr, 0, TAU); c.stroke();
    c.setLineDash([]);
  }
}
function drawIsoRadius(c, padL, padT, iw, ih, fs = 11) {
  const slope = 0.535, sun = STAR_INFO[4].hr;
  c.save();
  c.beginPath();
  c.rect(padL, padT, iw, ih);
  c.clip();
  c.font = fs + 'px ' + UI_FONT;
  c.setLineDash([7, 6]);
  [[0.01, '0.01'], [0.1, '0.1'], [1, '1'], [10, '10'], [100, '100'], [1000, '1000']].forEach(([rv, lab]) => {
    const off = -(2 * Math.log10(rv)) / 9;
    const ya = sun[1] + slope * (0 - sun[0]) + off;
    const yb = sun[1] + slope * (1 - sun[0]) + off;
    const ax = padL, ay = padT + ya * ih, bx = padL + iw, by = padT + yb * ih;
    let t0 = 0, t1 = 1;
    if (ya < 0) t0 = -ya / (yb - ya);
    if (yb > 1) t1 = (1 - ya) / (yb - ya);
    t0 = Math.max(0, t0); t1 = Math.min(1, t1);
    if (t1 <= t0) return;
    c.strokeStyle = 'rgba(255,215,80,.30)';
    c.beginPath();
    c.moveTo(ax + (bx - ax) * t0, ay + (by - ay) * t0);
    c.lineTo(ax + (bx - ax) * t1, ay + (by - ay) * t1);
    c.stroke();
    const ang = Math.atan2(by - ay, bx - ax);
    const lt = t0 + (t1 - t0) * 0.16;
    c.save();
    c.translate(ax + (bx - ax) * lt, ay + (by - ay) * lt);
    c.rotate(ang);
    c.fillStyle = 'rgba(255,215,80,.6)';
    c.textAlign = 'left'; c.textBaseline = 'bottom';
    c.fillText(lab + ' R☉', 4, -3);
    c.restore();
  });
  c.setLineDash([]);
  c.restore();
}
function drawHR(id, hl, lumHl = -1, isoR = false) {
  const cv = document.getElementById(id);
  if (!cv) return;
  const c = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  c.clearRect(0, 0, w, h);
  c.fillStyle = 'rgba(8,10,26,.85)';
  roundRect(c, 0, 0, w, h, 16); c.fill();
  c.strokeStyle = 'rgba(140,160,255,.25)'; c.lineWidth = 2;
  roundRect(c, 0, 0, w, h, 16); c.stroke();
  const padL = HRP.l, padR = HRP.r, padT = HRP.t, padB = HRP.b;
  const iw = w - padL - padR, ih = h - padT - padB;
  const P = i => [padL + STAR_INFO[i].hr[0] * iw, padT + STAR_INFO[i].hr[1] * ih];
  c.strokeStyle = 'rgba(150,170,255,.4)'; c.lineWidth = 2;
  c.beginPath();
  c.moveTo(padL, padT); c.lineTo(padL, padT + ih); c.lineTo(padL + iw, padT + ih);
  c.stroke();
  c.fillStyle = '#93a2d8';
  c.font = '19px ' + UI_FONT;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('表面温度', padL + iw / 2, h - 18);
  c.save();
  c.translate(26, padT + ih / 2); c.rotate(-Math.PI / 2);
  c.fillText('光度', 0, 0);
  c.restore();
  c.font = '16px ' + UI_FONT;
  c.textAlign = 'left';
  c.fillText('高温', padL + 6, padT + ih + 20);
  c.textAlign = 'right';
  c.fillText('低温', padL + iw - 6, padT + ih + 20);
  c.fillText('亮', padL - 12, padT + 10);
  c.fillText('暗', padL - 12, padT + ih - 10);
  if (isoR) drawIsoRadius(c, padL, padT, iw, ih, 11);
  c.save();
  c.beginPath();
  c.rect(padL, padT, iw, ih);
  c.clip();
  LUM_CLASSES.forEach((L, i) => {
    const x = padL + L.region[0] * iw, y = padT + L.region[1] * ih;
    const rx = L.region[2] * iw, ry = L.region[3] * ih;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, TAU);
    if (i === lumHl) {
      c.fillStyle = 'rgba(255,215,80,.20)';
      c.fill();
      c.strokeStyle = 'rgba(255,215,80,.85)';
      c.lineWidth = 2;
      c.stroke();
    } else {
      c.strokeStyle = 'rgba(255,215,80,.16)';
      c.lineWidth = 1.2;
      c.setLineDash([4, 5]);
      c.stroke();
      c.setLineDash([]);
    }
  });
  c.restore();
  c.strokeStyle = 'rgba(160,180,255,.3)'; c.lineWidth = 12; c.lineCap = 'round';
  c.beginPath();
  STAR_INFO.forEach((_, i) => { const [x, y] = P(i); i ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.stroke();
  c.strokeStyle = 'rgba(205,220,255,.5)'; c.lineWidth = 3;
  c.beginPath();
  STAR_INFO.forEach((_, i) => { const [x, y] = P(i); i ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.stroke();
  c.fillStyle = 'rgba(150,165,215,.55)';
  c.font = '17px ' + UI_FONT;
  c.textAlign = 'center';
  c.fillText('超巨星', padL + iw * 0.52, padT + 14);
  c.fillText('巨星', padL + iw * 0.82, padT + ih * 0.30);
  c.fillText('白矮星', padL + iw * 0.15, padT + ih * 0.84);
  c.fillText('主序带', padL + iw * 0.34, padT + ih * 0.58);
  TYPES.forEach((T, i) => {
    const [x, y] = P(i);
    if (i === hl) {
      c.fillStyle = hexA(T.glow, 0.35);
      c.beginPath(); c.arc(x, y, 16, 0, TAU); c.fill();
    }
    c.fillStyle = T.color;
    c.beginPath(); c.arc(x, y, i === hl ? 8 : 5.5, 0, TAU); c.fill();
    c.fillStyle = '#dfe6ff';
    c.font = 'bold 15px ' + UI_FONT;
    c.fillText(T.key, x, y - 15);
  });
  LUM_CLASSES.forEach((L, i) => {
    const x = padL + L.hr[0] * iw, y = padT + L.hr[1] * ih;
    const r = clamp(5 * L.size, 3, 8);
    if (i === lumHl) {
      c.fillStyle = 'rgba(255,215,80,.3)';
      c.beginPath(); c.arc(x, y, 17, 0, TAU); c.fill();
      c.fillStyle = '#ffd84d';
      diamond(c, x, y, r + 2.5); c.fill();
      c.fillStyle = '#ffd84d';
      c.font = 'bold 17px ' + UI_FONT;
      c.fillText('▼ 本关目标', x, Math.min(y + 26, padT + ih - 8));
    } else {
      c.strokeStyle = 'rgba(255,215,80,.55)';
      c.lineWidth = 1.8;
      diamond(c, x, y, r); c.stroke();
    }
  });
  if (isoR) {
    c.font = '11px ' + UI_FONT;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    LUM_CLASSES.forEach(L => {
      const x = padL + L.region[0] * iw;
      const y = Math.max(padT + 9, padT + (L.region[1] - L.region[3]) * ih - 9);
      c.fillStyle = 'rgba(255,220,120,.8)';
      c.fillText(L.name + ' ' + L.yerkes, x, y);
    });
  }
  if (hl >= 0) {
    const [x, y] = P(hl);
    c.fillStyle = '#ffd84d';
    c.font = 'bold 17px ' + UI_FONT;
    c.textAlign = 'center';
    c.fillText('▼ 本关目标', x, Math.min(y + 26, padT + ih - 8));
  }
}

/* ================= 背景(预渲染) ================= */
let bgCv = null;
const pathShape = new Path2D();
pathShape.moveTo(pathPts[0].x, pathPts[0].y);
for (let i = 1; i < pathPts.length; i++) pathShape.lineTo(pathPts[i].x, pathPts[i].y);

function makeBackground() {
  const cv = document.createElement('canvas');
  cv.width = W * 2; cv.height = H * 2;
  const c = cv.getContext('2d');
  c.scale(2, 2);
  let g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#070912');
  g.addColorStop(0.5, '#0c0f26');
  g.addColorStop(1, '#060814');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const blobs = [
    [300, 200, 360, '#7b4dd1', 0.16],
    [1000, 600, 320, '#2dd1c9', 0.10],
    [950, 150, 280, '#d14d8b', 0.10],
    [220, 640, 320, '#4d6bd1', 0.12],
    [640, 415, 260, '#6a5bff', 0.10],
  ];
  for (const [x, y, r, col, a] of blobs) {
    g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = a;
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.globalAlpha = 1;
  }
  for (let i = 0; i < 230; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = Math.random() * 1.2 + 0.3;
    c.fillStyle = `rgba(255,255,255,${(Math.random() * 0.7 + 0.15).toFixed(2)})`;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  c.strokeStyle = 'rgba(200,215,255,.35)'; c.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    c.beginPath();
    c.moveTo(x - 7, y); c.lineTo(x + 7, y);
    c.moveTo(x, y - 7); c.lineTo(x, y + 7);
    c.stroke();
  }
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = 'rgba(150,170,255,.10)'; c.lineWidth = 58; c.stroke(pathShape);
  c.strokeStyle = 'rgba(8,10,22,.85)';     c.lineWidth = 50; c.stroke(pathShape);
  c.strokeStyle = 'rgba(4,5,14,.9)';       c.lineWidth = 42; c.stroke(pathShape);
  for (let d = 30; d < totalLen; d += 46) {
    const p = posAt(d), t = tanAt(d);
    for (const s of [-1, 1]) {
      const ex = p.x - t.y * 26 * s, ey = p.y + t.x * 26 * s;
      c.fillStyle = `rgba(190,205,255,${0.12 + 0.14 * Math.abs(Math.sin(d * 0.11))})`;
      c.beginPath(); c.arc(ex, ey, 1.2, 0, TAU); c.fill();
    }
  }
  g = c.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,.5)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  bgCv = cv;
}

/* ================= 游戏状态 ================= */
let state = 'title';
let level = 1, score = 0, levelStartScore = 0;
let chain = [], shots = [], particles = [], floaters = [];
let total = 0, remaining = 0, pushSpeed = 25, rollbackSpeed = 80;
let activeTypes = LEVEL_PALETTES[0].slice();
let spawnTimer = 0;
let gamePart = 1, curLum = 0;
let featuredType = 0, quota = 12, collected = 0;
let effectQueue = [], windUntil = 0, slowUntil = 0, pierceUntil = 0;
let currentType = 0, nextType = 0;
let aimAngle = -Math.PI / 2;
let cooldown = 0, muzzleFlash = 0;
let shake = 0, shakeT = 0;
let comboLevel = 0, comboTimer = 0, maxCombo = 0;
let suckT = 0, sweepT = 0, sweepDone = 0;
let time = 0, lastBeat = 0, dangerLevel = 0;
let track = null;
let quiz = null, lastQuiz = -1;

/* ================= 进度存档 ================= */
const SAVE_KEY = 'stellar-zuma-save-v1';
let progress = { spectral: [0, 0, 0, 0, 0, 0, 0], lum: [0, 0, 0, 0], best: 0, maxLevel: 1 };
function loadProgress() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!d) return;
    if (Array.isArray(d.spectral)) progress.spectral = d.spectral.slice(0, 7).map(v => v ? 1 : 0);
    if (Array.isArray(d.lum)) progress.lum = d.lum.slice(0, 4).map(v => v ? 1 : 0);
    progress.best = d.best | 0;
    progress.maxLevel = Math.max(1, d.maxLevel | 0);
  } catch (e) { /* 存档损坏时忽略 */ }
}
function saveProgress() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch (e) { /* 无存储环境时忽略 */ }
}
function litCount() {
  return progress.spectral.reduce((a, b) => a + b, 0) + progress.lum.reduce((a, b) => a + b, 0);
}

function levelConf(n) {
  if (n <= 7) {
    return {
      part: 1,
      palette: LEVEL_PALETTES[n - 1],
      featured: n - 1,
      lum: -1,
      quota: 10 + n,
      speed: Math.min(50, 22 + n * 3.2),
      rollback: Math.min(130, 78 + n * 5),
      prefill: Math.min(22, 13 + n * 2),
      total: 9999,
    };
  }
  if (n <= 11) {
    const k = n - 8;
    return {
      part: 2,
      palette: [0, 1, 2, 3, 4, 5, 6],
      featured: -1,
      lum: k,
      quota: 5 + k,
      speed: 30 + k * 3,
      rollback: 130,
      prefill: 16,
      total: 9999,
    };
  }
  const k = n - 12;
  return {
    part: 2,
    palette: [0, 1, 2, 3, 4, 5, 6],
    featured: -1,
    lum: k % 4,
    quota: 10 + k,
    speed: Math.min(64, 44 + k * 2),
    rollback: 130,
    prefill: 18,
    total: 9999,
  };
}
function randOf(arr) { return arr[(Math.random() * arr.length) | 0]; }
function tailRunInChain() {
  const m = chain.length;
  if (!m) return 0;
  const t = chain[m - 1].type;
  let r = 1;
  for (let k = m - 2; k >= 0; k--) {
    if (chain[k].type !== t || chain[k].dist - chain[k + 1].dist > D + 3) break;
    r++;
  }
  return r;
}
function pickType() {
  let t;
  const tail = chain.length ? chain[chain.length - 1] : null;
  const tailRun = tail ? tailRunInChain() : 0;
  if (tailRun >= 3) {
    if (Math.random() < 0.3) {
      t = tail.type;
    } else {
      t = randOf(activeTypes.filter(x => x !== tail.type));
    }
  } else if (gamePart === 1 && Math.random() < 0.26) {
    t = featuredType;
  } else {
    t = randOf(activeTypes);
  }
  return t;
}
function startLevel(n) {
  const c = levelConf(n);
  total = c.total;
  remaining = c.total;
  pushSpeed = c.speed;
  rollbackSpeed = c.rollback;
  activeTypes = c.palette;
  gamePart = c.part;
  curLum = c.lum;
  featuredType = c.featured;
  quota = c.quota;
  collected = 0;
  chain = []; shots = []; particles = []; floaters = [];
  effectQueue = []; windUntil = 0; slowUntil = 0; pierceUntil = 0;
  spawnTimer = 0.5;
  comboLevel = 0; comboTimer = 0; maxCombo = 0; suckT = 0;
  sweepT = 0; sweepDone = 0; dangerLevel = 0;
  track = null;
  quiz = null;
  levelStartScore = score;
  currentType = pickType();
  nextType = pickType();
  for (let i = c.prefill - 1; i >= 0; i--) {
    chain.push({ type: pickType(), dist: i * D });
    remaining--;
  }
  showOverlay(introHTML());
  if (gamePart === 1) renderStarCard('introIcon'); else renderLumCard('introIcon');
  drawHR('hrIntro', featuredType, curLum, gamePart === 2);
  state = 'intro';
  updateHUD(true);
  drawProgressHR('hrMini', 230, 158);
}
function setupTitle() {
  levelConf(1);
  chain = [];
  for (let i = 17; i >= 0; i--) chain.push({ type: i % 7, dist: 300 + i * D });
  remaining = 0; total = 0;
  currentType = 0; nextType = 4;
  showOverlay(titleHTML());
  drawProgressHR('hrTitle', 460, 250);
  drawProgressHR('hrMini', 230, 158);
  state = 'title';
}

/* ================= 核心机制 ================= */
function findRun(i) {
  const t = chain[i].type;
  let a = i, b = i;
  while (a > 0 && chain[a - 1].type === t && chain[a - 1].dist - chain[a].dist <= D + 3) a--;
  while (b < chain.length - 1 && chain[b + 1].type === t && chain[b].dist - chain[b + 1].dist <= D + 3) b++;
  return [a, b];
}
function autoClearScan() {
  const n = chain.length;
  let i = 0;
  while (i < n) {
    const t = chain[i].type;
    let j = i;
    while (j + 1 < n && chain[j + 1].type === t && chain[j].dist - chain[j + 1].dist <= D + 3) j++;
    if (j - i + 1 >= 4) { removeRun(i, j, 'auto'); return; }
    i = j + 1;
  }
}
function runLabel(n) {
  if (n === 4) return '四连爆!';
  if (n === 5) return '五连爆!';
  return '星系湮灭!';
}
function comboBump() {
  if (comboTimer > 0) comboLevel = Math.min(8, comboLevel + 1); else comboLevel = 0;
  comboTimer = COMBO_WINDOW;
  maxCombo = Math.max(maxCombo, comboLevel + 1);
  return 1 + comboLevel;
}
function killBalls(list) {
  const set = new Set(list);
  const removed = chain.filter(b => set.has(b));
  if (!removed.length) return null;
  chain = chain.filter(b => !set.has(b));
  let cx = 0, cy = 0;
  for (const ball of removed) {
    const p = posAt(ball.dist);
    if (gamePart === 2 && ball.special != null) {
      collected++;
      effectQueue.push({ lum: ball.special, type: ball.type, x: p.x, y: p.y });
    } else if (gamePart === 1 && ball.type === featuredType) {
      collected++;
    }
    cx += p.x; cy += p.y;
    burst(p.x, p.y, ball.type);
  }
  return { removed, cx: cx / removed.length, cy: cy / removed.length };
}
function checkQuota() {
  if (state === 'playing' && collected >= quota) startSweep();
}
function removeRun(a, b, cause) {
  const n = b - a + 1;
  const mult = comboBump();
  let base = 10 * n;
  if (n >= 4) base += (n - 3) * 25;
  if (cause === 'auto') base = Math.round(base * 1.5);
  const streakBonus = comboLevel >= 2 ? 60 * comboLevel : 0;
  const pts = base * mult + streakBonus;
  score += pts;
  const res = killBalls(chain.slice(a, b + 1));
  const T = TYPES[res.removed[0].type];
  floatText(res.cx, res.cy - 26, '+' + pts, T.light, 17);
  if (cause === 'auto') {
    floatText(res.cx, res.cy - 54, '自动湮灭!', '#ffd84d', 24);
    ringFx(res.cx, res.cy, '#ffffff');
    SFX.autoClear();
  } else if (n >= 4) {
    floatText(res.cx, res.cy - 54, runLabel(n), '#ffd84d', 23);
  } else if (mult > 1) {
    floatText(res.cx, res.cy - 54, '连击 ×' + mult, '#ff9e3d', 20);
  }
  if (mult > 1) comboFlash((mult >= 4 ? '超新星' : '') + '连击 ×' + mult, mult);
  ringFx(res.cx, res.cy, T.glow);
  if (n >= 4 || mult > 1 || cause === 'auto') { shake = Math.min(9, 3 + n); shakeT = 0.28; }
  SFX.match(n, comboLevel);
  checkQuota();
}
function applyLumEffect(e) {
  const L = LUM_CLASSES[e.lum];
  comboFlash(L.effectName + '!', 3);
  ringFx(e.x, e.y, '#ffd84d');
  if (L.effect === 'supernova') {
    const victims = chain.filter(b => {
      const p = posAt(b.dist);
      const dx = p.x - e.x, dy = p.y - e.y;
      return dx * dx + dy * dy < 115 * 115;
    });
    if (victims.length) {
      const mult = comboBump();
      const res = killBalls(victims);
      const pts = 15 * res.removed.length * mult;
      score += pts;
      floatText(res.cx, res.cy - 26, '超新星爆发 +' + pts, '#ffd84d', 21);
      shake = 9; shakeT = 0.3;
      SFX.autoClear();
      checkQuota();
    }
  } else if (L.effect === 'wind') {
    windUntil = time + 2.6;
    SFX.tone(700, 0.5, 'sine', 0.18, 0, 120);
  } else if (L.effect === 'slow') {
    slowUntil = time + 6;
    SFX.tone(400, 0.4, 'triangle', 0.15, 0, 180);
  } else if (L.effect === 'pierce') {
    pierceUntil = time + 8;
    SFX.tone(1200, 0.12, 'square', 0.15, 0, 300);
  }
}
function checkJunction(idx) {
  if (idx <= 0 || idx >= chain.length) return;
  if (chain[idx - 1].type !== chain[idx].type) return;
  const run = findRun(idx - 1);
  if (run[1] - run[0] + 1 >= 3) removeRun(run[0], run[1], 'merge');
  else SFX.clack();
}
function insertShot(s, i) {
  const ball = chain[i];
  const p = posAt(ball.dist), tn = tanAt(ball.dist);
  const ahead = ((s.x - p.x) * tn.x + (s.y - p.y) * tn.y) > 0;
  let idx, dist;
  if (ahead) { idx = i; dist = ball.dist; }
  else { idx = i + 1; dist = ball.dist - D; }
  chain.splice(idx, 0, { type: s.type, dist });
  for (let k = idx + 1; k < chain.length; k++) chain[k].dist -= D;
  SFX.insert();
  particles.push({ x: s.x, y: s.y, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 8, color: TYPES[s.type].glow, kind: 'glow' });
  const run = findRun(idx);
  if (run[1] - run[0] + 1 >= 3) removeRun(run[0], run[1], 'shot');
}
function updateChain(dt) {
  const n = chain.length;
  if (!n) return;
  const bounds = [];
  let start = 0;
  for (let k = 1; k < n; k++) {
    if (chain[k - 1].dist - chain[k].dist > D + 2.5) { bounds.push(start); start = k; }
  }
  bounds.push(start);
  const segCount = bounds.length;
  const eff = time < slowUntil ? 0.45 : 1;
  const wind = time < windUntil ? 55 : 0;
  for (let j = 0; j < segCount; j++) {
    const s = bounds[j];
    const e = (j + 1 < segCount) ? bounds[j + 1] - 1 : n - 1;
    let v;
    if (segCount === 1) v = pushSpeed * eff - wind;
    else if (j === segCount - 1) v = pushSpeed * 2.6 * eff - wind;
    else v = -rollbackSpeed - wind;
    chain[s].dist += v * dt;
    for (let k = s + 1; k <= e; k++) chain[k].dist = chain[k - 1].dist - D;
  }
  for (let j = segCount - 1; j >= 1; j--) {
    const sJ = bounds[j];
    const eJ = (j + 1 < segCount) ? bounds[j + 1] - 1 : n - 1;
    const ePrev = bounds[j] - 1;
    if (chain[ePrev].dist - chain[sJ].dist < D) {
      const shift = D - (chain[ePrev].dist - chain[sJ].dist);
      for (let k = sJ; k <= eJ; k++) chain[k].dist -= shift;
      checkJunction(sJ);
      break;
    }
  }
}
function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (particles.length < 380)
      particles.push({ x: s.x, y: s.y, vx: 0, vy: 0, life: 0.22, max: 0.22, size: 3.4, color: time < pierceUntil ? '#ffd84d' : TYPES[s.type].glow, kind: 'glow' });
    if (s.x < -60 || s.x > W + 60 || s.y < -60 || s.y > H + 60) { shots.splice(i, 1); continue; }
    let hitIdx = -1;
    for (let k = 0; k < chain.length; k++) {
      if (chain[k].dist < 0) continue;
      const p = posAt(chain[k].dist);
      const dx = s.x - p.x, dy = s.y - p.y;
      if (dx * dx + dy * dy < (D - 4) * (D - 4)) { hitIdx = k; break; }
    }
    if (hitIdx >= 0) {
      if (time < pierceUntil) {
        const victim = chain[hitIdx];
        const p = posAt(victim.dist);
        score += 15;
        floatText(p.x, p.y - 20, '+15', '#ffd84d', 14);
        killBalls([victim]);
        SFX.pop();
        checkQuota();
      } else {
        insertShot(s, hitIdx);
        shots.splice(i, 1);
      }
    }
  }
}
function lumOnChain() {
  let c = 0;
  for (const b of chain) if (b.special != null) c++;
  return c;
}
function spawnUpdate(dt) {
  if (remaining <= 0) return;
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    const tail = chain[chain.length - 1];
    if (!tail || tail.dist >= D - 1) {
      const ball = { type: pickType(), dist: 0 };
      if (gamePart === 2 && collected < quota && lumOnChain() < 3 && Math.random() < 0.15) {
        ball.special = curLum;
        ball.type = LUM_CLASSES[curLum].color;
      }
      chain.push(ball);
      remaining--;
      spawnTimer = D / pushSpeed;
    }
  }
}
function updateSuck(dt) {
  for (let k = chain.length - 1; k >= 0; k--) {
    chain[k].dist += 780 * dt;
    if (chain[k].dist >= totalLen - 6) {
      const p = posAt(chain[k].dist);
      burst(p.x, p.y, chain[k].type);
      chain.splice(k, 1);
      SFX.pop();
    }
  }
  if (!chain.length) {
    suckT += dt;
    if (suckT > 0.8) {
      state = 'gameover';
      SFX.gameOver();
      progress.best = Math.max(progress.best, score);
      saveProgress();
      showOverlay(gameoverHTML());
    }
  }
}

/* ================= 特效 ================= */
function burst(x, y, ti) {
  const T = TYPES[ti];
  for (let i = 0; i < 11; i++) {
    const a = Math.random() * TAU, v = 60 + Math.random() * 240;
    particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.45 + Math.random() * 0.4, max: 0.85,
      size: 1.5 + Math.random() * 2.6,
      color: Math.random() < 0.5 ? T.light : T.glow, kind: 'spark',
    });
  }
}
function ringFx(x, y, color) {
  particles.push({ x, y, r: 8, life: 0.4, max: 0.4, color, kind: 'ring' });
}
function floatText(x, y, txt, color, size) {
  floaters.push({ x, y, txt, color, size, life: 1.1, max: 1.1 });
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    if (p.kind === 'ring') { p.r += 300 * dt; continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.exp(-2.5 * dt); p.vy *= Math.exp(-2.5 * dt);
  }
  if (particles.length > 420) particles.splice(0, particles.length - 420);
}
function updateFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.life -= dt; f.y -= 36 * dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }
}

/* ================= 发射 / 换球 ================= */
function shoot() {
  if (state !== 'playing' || cooldown > 0) return;
  cooldown = SHOT_CD;
  muzzleFlash = 1;
  const a = aimAngle;
  shots.push({ x: CX + Math.cos(a) * 52, y: CY + Math.sin(a) * 52, vx: Math.cos(a) * SHOT_SPEED, vy: Math.sin(a) * SHOT_SPEED, type: currentType });
  currentType = nextType;
  nextType = pickType();
  SFX.shoot();
}
function swapBalls() {
  if (state !== 'playing' && state !== 'intro') return;
  const t = currentType; currentType = nextType; nextType = t;
  SFX.swap();
}
function startSweep() {
  state = 'clearing';
  shots = [];
  effectQueue = [];
  sweepT = 0.12;
  sweepDone = 0.6;
  comboFlash('收集完成!', 3);
  SFX.tone(880, 0.4, 'triangle', 0.2, 0, 1320);
}

/* ================= 演化轨迹动画 ================= */
function trackForClear() {
  if (gamePart === 1) {
    const h = STAR_INFO[featuredType].hr;
    return [[h[0] + 0.10, Math.min(0.95, h[1] + 0.24)], [h[0] + 0.05, h[1] + 0.11], h.slice()];
  }
  const T = [
    [[0.05, 0.16], [0.09, 0.07], [0.13, 0.06]],
    [[0.13, 0.06], [0.38, 0.05], [0.62, 0.04], [0.84, 0.05]],
    [[0.56, 0.56], [0.61, 0.46], [0.66, 0.35], [0.70, 0.29]],
    [[0.70, 0.29], [0.48, 0.30], [0.27, 0.44], [0.14, 0.66], [0.12, 0.86]],
  ];
  return T[curLum].map(p => p.slice());
}
function drawTrackFrame() {
  const cv = document.getElementById('hrClear');
  if (!cv) return;
  drawHR('hrClear', gamePart === 1 ? featuredType : -1, gamePart === 2 ? curLum : -1, gamePart === 2);
  const c = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  const pts = track.pts.map(p => hrMap(w, h, p[0], p[1]));
  c.strokeStyle = 'rgba(255,215,80,.4)';
  c.lineWidth = 2;
  c.setLineDash([6, 5]);
  c.beginPath();
  pts.forEach((p, i) => { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
  c.stroke();
  c.setLineDash([]);
  const u = clamp(track.t / track.dur, 0, 1);
  const ease = u * u * (3 - 2 * u);
  const f = ease * (pts.length - 1);
  const i0 = Math.min(pts.length - 2, Math.floor(f));
  const lt = f - i0;
  const x = pts[i0][0] + (pts[i0 + 1][0] - pts[i0][0]) * lt;
  const y = pts[i0][1] + (pts[i0 + 1][1] - pts[i0][1]) * lt;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,225,140,.75)';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k <= i0; k++) c.lineTo(pts[k][0], pts[k][1]);
  c.lineTo(x, y);
  c.stroke();
  const R = 4.5 + Math.sin(Math.min(u, 1) * Math.PI) * 2;
  const g = c.createRadialGradient(x, y, 0, x, y, 15);
  g.addColorStop(0, 'rgba(255,240,190,.95)');
  g.addColorStop(0.4, 'rgba(255,215,80,.4)');
  g.addColorStop(1, 'rgba(255,215,80,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, 15, 0, TAU); c.fill();
  c.fillStyle = '#fff6d8';
  c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
  c.restore();
  if (u >= 1) {
    c.strokeStyle = 'rgba(255,215,80,.7)';
    c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, 15 + 2.5 * Math.sin(time * 4), 0, TAU); c.stroke();
  }
}

/* ================= 主循环 ================= */
function update(dt) {
  time += dt;
  muzzleFlash = Math.max(0, muzzleFlash - 3.2 * dt);
  if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
  updateParticles(dt);
  updateFloaters(dt);
  if (state === 'playing') {
    cooldown = Math.max(0, cooldown - dt);
    spawnUpdate(dt);
    updateChain(dt);
    autoClearScan();
    updateShots(dt);
    if (effectQueue.length) applyLumEffect(effectQueue.shift());
    if (time < windUntil && particles.length < 380 && Math.random() < dt * 22) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: -220 - Math.random() * 160, vy: (Math.random() - 0.5) * 40,
        life: 0.4, max: 0.4, size: 2.2, color: '#7de3ff', kind: 'spark',
      });
    }
    const front = chain[0];
    dangerLevel = front ? clamp((front.dist - (totalLen - 340)) / 340, 0, 1) : 0;
    if (dangerLevel > 0.5 && time - lastBeat > 1) {
      lastBeat = time;
      SFX.tone(65, 0.22, 'sine', 0.22);
      SFX.tone(58, 0.22, 'sine', 0.18, 0.12);
    }
    if (front && front.dist >= totalLen - 24) { state = 'sucking'; suckT = 0; SFX.alarm(); }
    if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) comboLevel = 0; }
  } else if (state === 'sucking') {
    updateSuck(dt);
  } else if (state === 'clearing') {
    sweepT -= dt;
    if (sweepT <= 0 && chain.length) {
      const b = chain.pop();
      const p = posAt(b.dist);
      burst(p.x, p.y, b.type);
      score += 15;
      if (b.type === featuredType) collected++;
      SFX.pop();
      sweepT = 0.045;
    }
    if (!chain.length) {
      sweepDone -= dt;
      if (sweepDone <= 0) {
        state = 'levelclear';
        score += levelBonus();
        SFX.levelClear();
        if (gamePart === 1) progress.spectral[featuredType] = 1; else progress.lum[curLum] = 1;
        progress.best = Math.max(progress.best, score);
        progress.maxLevel = Math.max(progress.maxLevel, level + 1);
        saveProgress();
        quiz = pickQuestion();
        showOverlay(clearHTML());
        if (gamePart === 1) renderStarCard('clearIcon'); else renderLumCard('clearIcon');
        drawHR('hrClear', gamePart === 1 ? featuredType : -1, gamePart === 2 ? curLum : -1, gamePart === 2);
        track = { pts: trackForClear(), t: 0, dur: 2.6 };
        drawProgressHR('hrMini', 230, 158);
      }
    } else sweepDone = 0.6;
  }
}
let lastTs = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  update(dt);
  render();
  if (track) {
    if (state === 'levelclear') { track.t += dt; drawTrackFrame(); }
    else track = null;
  }
  updateHUD(false);
}

/* ================= 渲染 ================= */
const twinkles = [];
for (let i = 0; i < 70; i++)
  twinkles.push({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 1.3, ph: Math.random() * TAU, sp: 0.8 + Math.random() * 2 });

function drawTwinkles() {
  ctx.save();
  for (const t of twinkles) {
    ctx.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * t.sp + t.ph));
    ctx.fillStyle = '#dfe8ff';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function drawPortal() {
  const p = posAt(0);
  const pulse = 1 + 0.08 * Math.sin(time * 3);
  ctx.save(); ctx.translate(p.x, p.y);
  let g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34 * pulse);
  g.addColorStop(0, 'rgba(160,120,255,.4)');
  g.addColorStop(1, 'rgba(160,120,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 34 * pulse, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(190,160,255,.5)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.stroke();
  ctx.restore();
}
function drawHole() {
  ctx.save(); ctx.translate(holePos.x, holePos.y);
  const pulse = 1 + 0.06 * Math.sin(time * 2.5) + dangerLevel * 0.2 * Math.sin(time * 9);
  let g = ctx.createRadialGradient(0, 0, 10, 0, 0, 60 * pulse);
  g.addColorStop(0, 'rgba(120,80,255,.5)');
  g.addColorStop(0.6, 'rgba(90,60,220,.18)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 60 * pulse, 0, TAU); ctx.fill();
  if (dangerLevel > 0) {
    g = ctx.createRadialGradient(0, 0, 6, 0, 0, 50);
    g.addColorStop(0, `rgba(255,60,40,${0.4 * dangerLevel})`);
    g.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 50, 0, TAU); ctx.fill();
  }
  ctx.save(); ctx.rotate(time * 1.3);
  ctx.strokeStyle = 'rgba(190,130,255,.75)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, 27, 0, 4.2); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.rotate(-time * 2.1);
  ctx.strokeStyle = 'rgba(255,150,80,.6)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, 35, 0, 3.4); ctx.stroke();
  ctx.restore();
  g = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
  g.addColorStop(0, '#000');
  g.addColorStop(0.75, '#0a0618');
  g.addColorStop(1, 'rgba(40,20,80,.7)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(220,200,255,.55)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, 0, 20.5, 0, TAU); ctx.stroke();
  ctx.restore();
}
function drawChain() {
  for (let i = chain.length - 1; i >= 0; i--) {
    const b = chain[i];
    if (b.dist < -BALL_R) continue;
    const p = posAt(b.dist);
    let scale = 1, alpha = 1;
    const near = totalLen - 70;
    if (b.dist > near) {
      const t = clamp((b.dist - near) / 70, 0, 1);
      scale = 1 - 0.62 * t;
      alpha = 1 - 0.5 * t;
    }
    const L = b.special != null ? LUM_CLASSES[b.special] : null;
    const sz = L ? L.size : 1;
    drawBall(p.x, p.y, b.type, scale * sz, alpha);
    if (L && alpha > 0.5) {
      const pul = 1 + 0.09 * Math.sin(time * 5 + b.dist * 0.05);
      ctx.strokeStyle = `rgba(255,215,80,${0.5 + 0.3 * Math.sin(time * 5 + b.dist * 0.1)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, (BALL_R + 4) * sz * pul, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ffd84d';
      ctx.font = 'bold 13px ' + UI_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 4;
      ctx.fillText(L.key, p.x, p.y - (BALL_R + 9) * sz);
      ctx.shadowBlur = 0;
      if (Math.random() < 0.03 && particles.length < 380)
        particles.push({ x: p.x + (Math.random() - 0.5) * 30 * sz, y: p.y + (Math.random() - 0.5) * 30 * sz, vx: 0, vy: -26, life: 0.5, max: 0.5, size: 1.6, color: '#ffd84d', kind: 'spark' });
    }
  }
}
function drawShots() {
  for (const s of shots) {
    drawBall(s.x, s.y, s.type, 0.92);
    if (time < pierceUntil) {
      ctx.strokeStyle = 'rgba(255,215,80,.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, 22, 0, TAU); ctx.stroke();
    }
  }
}
function drawLauncher() {
  const x = CX, y = CY, a = aimAngle;
  const nx = x - Math.cos(a) * 40, ny = y - Math.sin(a) * 40;
  drawBall(nx, ny, nextType, 0.58, 0.95);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(x + 3, y + 8, 46, 18, 0, 0, TAU); ctx.fill();
  let g = ctx.createRadialGradient(x - 10, y - 12, 4, x, y, 42);
  g.addColorStop(0, '#4a5482');
  g.addColorStop(0.6, '#252c52');
  g.addColorStop(1, '#101329');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, 42, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(160,180,255,.4)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 42, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(140,160,255,.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, 33, 0, TAU); ctx.stroke();
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  const bg = ctx.createLinearGradient(0, 0, 56, 0);
  bg.addColorStop(0, '#3d4670');
  bg.addColorStop(1, '#8b9bd6');
  ctx.fillStyle = bg;
  ctx.strokeStyle = 'rgba(200,215,255,.35)'; ctx.lineWidth = 1;
  for (const s of [-1, 1]) {
    roundRect(ctx, 16, s * 16 - 5, 42, 10, 5);
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  const mx = x + Math.cos(a) * 44, my = y + Math.sin(a) * 44;
  ctx.strokeStyle = hexA(TYPES[currentType].glow, 0.5 + 0.3 * Math.sin(time * 5));
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(mx, my, 25 + 2 * Math.sin(time * 5), 0, TAU); ctx.stroke();
  drawBall(mx, my, currentType, 1);
  ctx.fillStyle = hexA(TYPES[currentType].glow, 0.55);
  for (let i = 1; i <= 7; i++) {
    const d = 72 + i * 16;
    ctx.globalAlpha = 0.5 * (1 - i / 8);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.2, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (muzzleFlash > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    g = ctx.createRadialGradient(mx, my, 0, mx, my, 34);
    g.addColorStop(0, `rgba(255,255,240,${muzzleFlash * 0.7})`);
    g.addColorStop(1, 'rgba(255,255,240,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(mx, my, 34, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
function drawParticles() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    const a = p.life / p.max;
    if (p.kind === 'ring') {
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = p.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke();
    } else {
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.kind === 'glow' ? a : 1), 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}
function drawFloaters() {
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of floaters) {
    ctx.globalAlpha = clamp(f.life / f.max, 0, 1);
    ctx.font = `bold ${f.size}px "Trebuchet MS","PingFang SC",sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6;
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.restore();
}
function drawDanger() {
  if (dangerLevel <= 0.01) return;
  const a = dangerLevel * (0.16 + 0.1 * Math.sin(time * 6));
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, 'rgba(255,40,40,0)');
  g.addColorStop(1, `rgba(255,30,30,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
function drawEffectTimers() {
  const act = [];
  if (time < slowUntil) act.push(['弥漫减速', slowUntil, '#9fb6ff']);
  if (time < windUntil) act.push(['星风', windUntil, '#7de3ff']);
  if (time < pierceUntil) act.push(['简并子弹', pierceUntil, '#ffd84d']);
  if (!act.length) return;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px ' + UI_FONT;
  let y = 64;
  for (const [name, until, col] of act) {
    ctx.fillStyle = col;
    ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 5;
    ctx.fillText(name + '  ' + (until - time).toFixed(1) + 's', W / 2, y);
    ctx.shadowBlur = 0;
    y += 22;
  }
  ctx.restore();
}
function render() {
  ctx.setTransform(SS, 0, 0, SS, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (shakeT > 0) {
    const m = shake * (shakeT / 0.28);
    ctx.translate((Math.random() - 0.5) * 2 * m, (Math.random() - 0.5) * 2 * m);
  }
  ctx.drawImage(bgCv, 0, 0, W, H);
  drawTwinkles();
  drawPortal();
  drawHole();
  drawChain();
  drawShots();
  drawLauncher();
  drawParticles();
  drawFloaters();
  ctx.restore();
  drawDanger();
  drawEffectTimers();
}

/* ================= HUD / 覆盖层 ================= */
const elScore = document.getElementById('score');
const elLevel = document.getElementById('level');
const elFill = document.getElementById('prog-fill');
const elLabel = document.getElementById('prog-label');
const elCombo = document.getElementById('combo');
const overlay = document.getElementById('overlay');
const hud = { s: -1, l: -1, lbl: '' };

function updateHUD(force) {
  if (force || hud.s !== score) { elScore.textContent = score.toLocaleString('zh-CN'); hud.s = score; }
  if (force || hud.l !== level) { elLevel.textContent = '第 ' + level + ' 关'; hud.l = level; }
  const pct = quota > 0 ? Math.max(0, Math.min(1, collected / quota)) : 0;
  elFill.style.width = (pct * 100).toFixed(1) + '%';
  const goal = gamePart === 1
    ? TYPES[featuredType].key + ' 型恒星'
    : LUM_CLASSES[curLum].name;
  const lbl = (state === 'playing' || state === 'sucking' || state === 'intro' || state === 'clearing')
    ? '目标 ' + goal + ' ' + Math.min(collected, quota) + '/' + quota
    : '';
  if (hud.lbl !== lbl) { elLabel.textContent = lbl; hud.lbl = lbl; }
}
function comboFlash(txt, mult) {
  elCombo.textContent = txt;
  elCombo.style.color = mult >= 4 ? '#ff6b52' : (mult >= 3 ? '#ffd84d' : '#ffe9a8');
  elCombo.classList.remove('show');
  void elCombo.offsetWidth;
  elCombo.classList.add('show');
}
function showOverlay(html) { overlay.innerHTML = html; overlay.classList.remove('hidden'); }
function hideOverlay() { overlay.classList.add('hidden'); }

function titleHTML() {
  const legend = TYPES.map(t =>
    `<div class="star"><span class="dot" style="background:${t.color};box-shadow:0 0 10px ${t.glow}, inset 0 -4px 6px ${t.dark}">${t.key}</span><span class="nm">${t.name}</span></div>`
  ).join('');
  const unlocked = litCount() >= 11;
  const hint = unlocked
    ? '选关已解锁 · 点击赫罗图上的点或区域,直接开始对应关卡'
    : `已点亮 ${litCount()}/11 · 通关点亮整张赫罗图后解锁选关`;
  const hasSave = progress.best > 0 || progress.maxLevel > 1;
  const saveInfo = hasSave
    ? `<p class="tip">最高分 ${progress.best.toLocaleString('zh-CN')} · 已抵达第 ${progress.maxLevel} 关</p>
    <button class="primary" data-action="continue">继续游戏</button>
    <button class="ghost" data-action="start">从头开始</button>`
    : `<button class="primary" data-action="start">开始游戏</button>`;
  return `<div class="card">
    <h1>星链祖玛</h1><p class="sub">STELLAR ZUMA</p>
    <p class="desc">第一部分：七关收集七大光谱型 <b>O · B · A · F · G · K · M</b>！<br>第二部分：按<b>恒星演化</b>设关——蓝超巨星 / 红超巨星 / 红巨星 / 白矮星。<br>三颗同类即湮灭；<b>四连自动湮灭</b>；连续消除享<b>连击加成</b>。</p>
    <div class="legend">${legend}</div>
    <canvas id="hrTitle" width="460" height="250" class="${unlocked ? 'selectable' : ''}"></canvas>
    <p id="hrHint" class="tip">${hint}</p>
    ${saveInfo}
    <p class="controls">鼠标瞄准 · 点击发射 · <b>空格 / 右键</b> 换球 · <b>P</b> 暂停 · <b>M</b> 音效</p>
  </div>`;
}
function introHTML() {
  if (gamePart === 2) {
    const L = LUM_CLASSES[curLum];
    const ladder = [['Ia', '超巨星'], ['III', '巨星'], ['V', '主序矮星'], ['VII', '白矮星']]
      .map(([k, n]) => L.yerkes === k ? `<b>${k} ${n}</b>` : `${k} ${n}`).join(' · ');
    return `<div class="card intro">
      <div class="intro-head">
        <canvas id="introIcon" width="96" height="96"></canvas>
        <div class="intro-title">
          <h1>第 ${level} 关 · 收集 ${L.name}</h1>
          <p class="sub">第二部分 · 光度类 ${L.yerkes} · 恒星演化 ${L.key}</p>
        </div>
      </div>
      <p class="desc">${L.desc}</p>
      <p class="tip">金色冠环恒星会出现在星链中，摧毁 <b>${quota}</b> 颗<br>技能 <b>${L.effectName}</b>：${L.effectDesc}<br>代表恒星：${L.example} · ${L.radius}</p>
      <p class="tip">光度分类:${ladder}<br>恒星代号 = 光谱型 + 光度类:<b>B8Ia</b> = B 型 + Ia 超巨星,<b>G2V</b> = G 型 + V 主序矮星(太阳)<br>读图:金色虚线为等半径线,同一条线上半径相同——巨星与超巨星在右上,矮星贴着左下</p>
      ${curLum === 3 ? `<p class="tip">矮星家族:红矮星(V)是主序上的 M 型星,靠氢燃烧发光;白矮星(VII)是恒星遗骸,靠余热发光;棕矮星质量太小没点燃氢,不算真恒星。</p>` : ''}
      <canvas id="hrIntro" width="640" height="300"></canvas>
      <button class="primary" data-action="go">出发</button>
    </div>`;
  }
  const S = STAR_INFO[featuredType];
  const T = TYPES[featuredType];
  return `<div class="card intro">
    <div class="intro-head">
      <canvas id="introIcon" width="96" height="96"></canvas>
      <div class="intro-title">
        <h1>第 ${level} 关 · 收集 ${T.key} 型恒星</h1>
        <p class="sub">${T.name} · ${S.temp}</p>
      </div>
    </div>
    <p class="desc">${S.desc}</p>
    <p class="tip">代表恒星：${S.example} · 目标 ${quota} 颗 · 4 颗同类相连会自动湮灭</p>
    <canvas id="hrIntro" width="640" height="300"></canvas>
    <button class="primary" data-action="go">出发</button>
  </div>`;
}
function clearHTML() {
  if (gamePart === 2) {
    const L = LUM_CLASSES[curLum];
    return `<div class="card intro">
      <div class="intro-head">
        <canvas id="clearIcon" width="96" height="96"></canvas>
        <div class="intro-title">
          <h1 class="good">${L.name} · 收集完成!</h1>
          <p class="sub">恒星演化 ${L.key} · ${L.effectName}</p>
        </div>
      </div>
      <p class="desc">关卡奖励 <b>+${levelBonus()}</b> · 当前得分 <b>${score.toLocaleString('zh-CN')}</b> · 最大连击 <b>×${Math.max(1, maxCombo)}</b></p>
      <canvas id="hrClear" width="640" height="300"></canvas>
      ${quizHTML()}
      <button id="clearNext" class="primary hidden" data-action="next">${level < 11 ? '收集下一类恒星' : '进入无尽挑战'}</button>
    </div>`;
  }
  const S = STAR_INFO[featuredType];
  const T = TYPES[featuredType];
  return `<div class="card intro">
    <div class="intro-head">
      <canvas id="clearIcon" width="96" height="96"></canvas>
      <div class="intro-title">
        <h1 class="good">${T.key} 型恒星 · 收集完成!</h1>
        <p class="sub">${T.name} · ${S.temp}</p>
      </div>
    </div>
    <p class="desc">关卡奖励 <b>+${levelBonus()}</b> · 当前得分 <b>${score.toLocaleString('zh-CN')}</b></p>
    <canvas id="hrClear" width="640" height="300"></canvas>
    ${quizHTML()}
    <button id="clearNext" class="primary hidden" data-action="next">${level < 7 ? '收集下一类恒星' : '进入第二部分'}</button>
  </div>`;
}
function levelBonus() { return 500 + level * 100; }
function gameoverHTML() {
  return `<div class="card">
    <h1 class="bad">黑洞吞噬了星链…</h1>
    <p class="desc">最终得分 <b>${score.toLocaleString('zh-CN')}</b> · 抵达第 ${level} 关</p>
    <button class="primary" data-action="retry">重试本关</button>
    <button class="ghost" data-action="restart">从头开始</button>
  </div>`;
}
function pauseHTML() {
  return `<div class="card">
    <h1>已暂停</h1>
    <p class="controls">按 P 或点击按钮继续</p>
    <button class="primary" data-action="resume">继续游戏</button>
  </div>`;
}
/* ================= 知识问答 / 选关 ================= */
function pickQuestion() {
  const key = gamePart === 1 ? TYPES[featuredType].key : ['BSG', 'RSG', 'RG', 'WD'][curLum];
  const cand = f => QUIZ_POOL.map((q, i) => ({ q, i })).filter(x => f(x.q) && x.i !== lastQuiz);
  let pool = cand(q => q.keys.includes(key));
  if (!pool.length || Math.random() >= 0.6) {
    const hr = cand(q => q.keys.includes('HR'));
    if (hr.length) pool = hr;
  }
  if (!pool.length) pool = cand(() => true);
  const pick = pool[(Math.random() * pool.length) | 0];
  lastQuiz = pick.i;
  const order = [0, 1, 2];
  for (let i = 2; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
  return { ref: pick.q, order, answered: false };
}
function answerQuiz(pickIdx) {
  if (!quiz || quiz.answered) return;
  quiz.answered = true;
  const right = quiz.order[pickIdx] === 0;
  overlay.querySelectorAll('button[data-quiz]').forEach((b, j) => {
    b.disabled = true;
    if (quiz.order[j] === 0) b.classList.add('right');
    else if (j === pickIdx) b.classList.add('wrong');
  });
  if (right) {
    score += 200;
    progress.best = Math.max(progress.best, score);
    saveProgress();
    updateHUD(true);
    SFX.match(3, 0);
  } else {
    SFX.clack();
  }
  const expEl = document.getElementById('quizExp');
  if (expEl) expEl.textContent = (right ? '回答正确 +200 · ' : '正确答案已标出 · ') + quiz.ref.exp;
  const nb = document.getElementById('clearNext');
  if (nb) nb.classList.remove('hidden');
}
function quizHTML() {
  if (!quiz) return '';
  return `<div class="quiz">
    <p class="quiz-q">知识问答 · 答对 +200</p>
    <p class="desc">${quiz.ref.q}</p>
    <div class="quiz-opts">${quiz.order.map((oi, i) =>
      `<button class="ghost" data-quiz="${i}">${quiz.ref.opts[oi]}</button>`).join('')}</div>
    <p id="quizExp" class="tip"></p>
  </div>`;
}
function handleTitleHrClick(e) {
  const cv = document.getElementById('hrTitle');
  const hint = document.getElementById('hrHint');
  if (litCount() < 11) {
    if (hint) {
      hint.textContent = `赫罗图尚未点亮(${litCount()}/11),通关收集以解锁选关`;
      hint.classList.add('warn');
    }
    SFX.clack();
    return;
  }
  const r = cv.getBoundingClientRect();
  const mx = (e.clientX - r.left) / r.width * cv.width;
  const my = (e.clientY - r.top) / r.height * cv.height;
  const padL = cv.width * 0.12, padR = cv.width * 0.05, padT = cv.height * 0.14, padB = cv.height * 0.21;
  const iw = cv.width - padL - padR, ih = cv.height - padT - padB;
  const nx = (mx - padL) / iw, ny = (my - padT) / ih;
  let target = 0;
  for (let i = 0; i < 7; i++) {
    const px = padL + STAR_INFO[i].hr[0] * iw, py = padT + STAR_INFO[i].hr[1] * ih;
    if (Math.hypot(mx - px, my - py) < 20) { target = i + 1; break; }
  }
  if (!target) {
    for (let i = 0; i < LUM_CLASSES.length; i++) {
      const L = LUM_CLASSES[i];
      const dx = (nx - L.region[0]) / L.region[2], dy = (ny - L.region[1]) / L.region[3];
      if (dx * dx + dy * dy <= 1) { target = 8 + i; break; }
    }
  }
  if (target) {
    SFX.ensure(); SFX.click();
    score = 0;
    startLevel(target);
  }
}
overlay.addEventListener('click', e => {
  if (e.target.id === 'hrTitle') { handleTitleHrClick(e); return; }
  const qb = e.target.closest('button[data-quiz]');
  if (qb) { SFX.ensure(); answerQuiz(+qb.dataset.quiz); return; }
  const b = e.target.closest('button[data-action]');
  if (!b) return;
  SFX.ensure(); SFX.click();
  const act = b.dataset.action;
  if (act === 'start' || act === 'restart') { score = 0; level = 1; startLevel(1); }
  else if (act === 'continue') { score = 0; startLevel(Math.max(1, progress.maxLevel)); }
  else if (act === 'go') { hideOverlay(); state = 'playing'; }
  else if (act === 'next') { level++; startLevel(level); }
  else if (act === 'retry') { score = levelStartScore; startLevel(level); }
  else if (act === 'resume') { hideOverlay(); state = 'playing'; }
});

/* ================= 输入 ================= */
canvas.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) / r.width * W;
  const my = (e.clientY - r.top) / r.height * H;
  aimAngle = Math.atan2(my - CY, mx - CX);
});
canvas.addEventListener('pointerdown', e => {
  SFX.ensure();
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) / r.width * W;
  const my = (e.clientY - r.top) / r.height * H;
  aimAngle = Math.atan2(my - CY, mx - CX);
  if (e.button === 2) { swapBalls(); return; }
  if (state === 'playing') shoot();
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  SFX.ensure();
  if (e.code === 'Space') {
    e.preventDefault();
    swapBalls();
  } else if (e.key === 'x' || e.key === 'X') {
    swapBalls();
  } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    if (state === 'playing') { state = 'paused'; showOverlay(pauseHTML()); }
    else if (state === 'paused') { hideOverlay(); state = 'playing'; }
  } else if (e.key === 'm' || e.key === 'M') {
    muted = !muted;
  } else if (e.key === 'Enter') {
    const b = overlay.querySelector('button.primary');
    if (b && !overlay.classList.contains('hidden') && !b.classList.contains('hidden')) b.click();
  }
});
window.addEventListener('blur', () => {
  if (state === 'playing') { state = 'paused'; showOverlay(pauseHTML()); }
});

/* ================= 启动 ================= */
loadProgress();
makeSprites();
makeBackground();
const bootParams = new URLSearchParams(window.location.search);
if (bootParams.has('level')) {
  score = 0;
  level = Math.max(1, parseInt(bootParams.get('level'), 10) || 1);
  startLevel(level);
  if (bootParams.has('go')) { hideOverlay(); state = 'playing'; }
} else {
  setupTitle();
}
updateHUD(true);
requestAnimationFrame(frame);

if (typeof window !== 'undefined') {
  window.__suma = {
    state: () => state, score: () => score, level: () => level,
    featuredType: () => featuredType, quota: () => quota, collected: () => collected,
    chainLen: () => chain.length, comboLevel: () => comboLevel, maxCombo: () => maxCombo,
    frontDist: () => chain.length ? Math.round(chain[0].dist) : -1,
    tailDist: () => chain.length ? Math.round(chain[chain.length - 1].dist) : -1,
    spawned: () => total - remaining,
    pushSpeed: () => pushSpeed,
    segCount: () => {
      let c = 1;
      for (let k = 1; k < chain.length; k++) if (chain[k - 1].dist - chain[k].dist > D + 2.5) c++;
      return c;
    },
    startLevel,
    aimAt: (x, y) => { aimAngle = Math.atan2(y - CY, x - CX); },
    playerShoot: () => shoot(),
    playerGo: () => { if (state === 'intro') { hideOverlay(); state = 'playing'; } },
    forceEffect: lum => {
      const b = chain[0] || { dist: totalLen - 30 };
      const p = posAt(b.dist);
      effectQueue.push({ lum, type: 4, x: p.x, y: p.y });
    },
    effectFlags: () => ({ wind: time < windUntil, slow: time < slowUntil, pierce: time < pierceUntil }),
    specialsInChain: () => chain.filter(b => b.special != null).length,
    gamePart: () => gamePart,
    progress: () => progress,
    clearHTML: () => clearHTML(),
    startLevelAt: n => { level = n; startLevel(n); },
    killSpecial: () => {
      const b = chain.find(x => x.special != null);
      if (b) { killBalls([b]); checkQuota(); }
      return chain.filter(x => x.special != null).length;
    },
  };
}

})();
