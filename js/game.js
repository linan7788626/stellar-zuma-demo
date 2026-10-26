/* ============================================================
   星链祖玛 Stellar Zuma
   纯原生 Canvas 实现 · 无任何外部依赖
   七色恒星球对应恒星光谱分类 O B A F G K M
   ============================================================ */
(() => {
'use strict';

/* ================= 基础常量 ================= */
const W = 1280, H = 800;
const CX = 720, CY = 415;
// 仅裁掉原画布为浮层预留的空白,物理/轨道仍使用原世界坐标。
const VIEW_W = 800, VIEW_X = CX - VIEW_W / 2;
const BALL_R = 22, D = BALL_R * 2;
const TAU = Math.PI * 2;
const SHOT_SPEED = 950;
const SHOT_CD = 0.14;
const COMBO_WINDOW = 3.5;

const TYPES = [
  { key:'O', name:'蓝色星', color:'#5b7bff', dark:'#243190', light:'#b8c8ff', glow:'#7d95ff' },
  { key:'B', name:'蓝白星', color:'#9fb6ff', dark:'#4a5fc0', light:'#dce6ff', glow:'#a5bdff' },
  { key:'A', name:'白星',   color:'#eef1ff', dark:'#98a3cf', light:'#ffffff', glow:'#dfe6ff' },
  { key:'F', name:'黄白星', color:'#fff3c8', dark:'#c2a452', light:'#fffbe8', glow:'#ffe9a6' },
  { key:'G', name:'黄色星', color:'#ffd84d', dark:'#b57d12', light:'#fff3b0', glow:'#ffc93e' },
  { key:'K', name:'橙色星', color:'#ff9e3d', dark:'#b25410', light:'#ffdcae', glow:'#ff8c2e' },
  { key:'M', name:'红色星', color:'#ff5346', dark:'#a32318', light:'#ffb3a8', glow:'#ff4438' },
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
const COLLECT_ORDER = [0, 1, 2, 3, 4, 5, 6];

const STAR_INFO = [
  { temp: '≥ 30,000 K', example: '蝎虎座 10 · 10 Lacertae (O9V)', desc: '炽热的蓝色 O 型星，以电离氦谱线为特征。O 型描述温度与光谱，并不等于巨星：O 型主序星通常质量大、光度高、寿命短。' },
  { temp: '10,000 – 30,000 K', example: '角宿一 · Spica（B 型，主星已演化）', desc: '蓝白色的 B 型星，中性氦谱线明显。B 型既有主序星，也有巨星和超巨星；还需光度类才能区分它们的演化状态。' },
  { temp: '7,500 – 10,000 K', example: '织女星 · Vega', desc: '洁白的A级星，氢的巴尔末谱线最为强烈，自转迅速，织女星是其原型。' },
  { temp: '6,000 – 7,500 K', example: '南河三 A · Procyon A (F5IV–V)', desc: '黄白色的 F 型星，比太阳表面更热，金属谱线增强。南河三 A 已接近亚巨星阶段，不能只凭 F 型就判断它仍在主序上。' },
  { temp: '5,200 – 6,000 K', example: '太阳 · Sun (G2V)', desc: '黄矮星，我们的太阳正属此类，氢燃烧平稳温和，寿命约一百亿年。' },
  { temp: '3,700 – 5,200 K', example: '天苑四 · Epsilon Eridani (K2V)', desc: '橙色恒星，金属谱线明显。K 型主序星比太阳冷而暗，寿命通常更长；同为 K 型的大角星却是巨星，不能混为一类。' },
  { temp: '2,400 – 3,700 K', example: '比邻星 · Proxima', desc: '数量最多的红矮星，占恒星总数七成以上，光度微弱而寿命极长，以耀斑活动著称。' },
];

const LUM_CLASSES = [
  { key: '超巨', name: '超巨星', yerkes: 'Ia', classification: '光度类 Ia', colors: [0, 6], size: 1.4, icon: 0.95,
    example: '参宿七 · Rigel (B8Ia) / 参宿四 · Betelgeuse (M1-Ia)', radius: '半径 ≈ 太阳的几十倍到近千倍',
    desc: '光度很高的演化恒星：蓝超巨星炽热，红超巨星表面较冷、半径巨大。大质量恒星晚期常发生核心坍缩，留下中子星或黑洞。',
    effect: 'supernova', effectName: '超新星爆发', effectDesc: '摧毁它附近的所有恒星' },
  { key: '巨星', name: '巨星', yerkes: 'III', classification: '光度类 III', colors: [5], size: 1.15, icon: 0.70,
    example: '毕宿五 · Aldebaran (K5III)', radius: '半径 ≈ 太阳的数十倍',
    desc: '离开主序的演化恒星：核心收缩而外包层剧烈膨胀，半径达太阳数十倍，包层稀疏近乎透明。',
    effect: 'slow', effectName: '弥漫减速', effectDesc: '星链减速 6 秒' },
  { key: '白矮', name: '白矮星', yerkes: 'D', classification: '白矮星光谱 D（如 DA）', colors: [2], size: 0.55, icon: 0.36,
    example: '天狼星B · Sirius B (DA2)', radius: '半径 ≈ 地球(0.01 R☉)',
    desc: '白矮星是类太阳恒星遗下的致密核心，约地球大小，由电子简并压力支撑，逐渐冷却。它不是主序矮星(V)；现代白矮星光谱常用 DA、DB 等 D 类代号。',
    effect: 'pierce', effectName: '简并子弹', effectDesc: '发射的星球变成穿透弹,直接摧毁沿途恒星 8 秒' },
];

const EVO_CHAINS = [
  {
    name: '太阳的演化',
    desc: '类太阳恒星的简化路径:主序氢聚变后经历红巨星等晚期阶段,抛出外层,留下白矮星。图中省略部分阶段,不是等时或定量演化模型。',
    stages: [
      { key: 'G主序', name: 'G 型主序星', type: 4, quizKey: 'G', ti: 0, desc: '太阳正处的阶段:核心稳定地进行氢聚变,主序期约占恒星寿命的九成。' },
      { key: '红巨星', name: '红巨星', type: 5, quizKey: 'GI', ti: 2, desc: '核心氢耗尽后外层剧烈膨胀,恒星变大变红,太阳将膨胀到地球轨道附近。' },
      { key: '抛壳', name: '抛壳 · 行星状星云', type: 1, quizKey: 'PN', ti: 4, desc: '外层气体被抛入太空,形成行星状星云,裸露出炽热的星核。赫罗图上的点表示中心星,不是整片星云。' },
      { key: '白矮星', name: '白矮星', type: 2, quizKey: 'WD', ti: 6, desc: '遗下的核心:地球大小却接近太阳质量,由电子简并压支撑,缓缓冷却。' },
    ],
  },
  {
    name: '大质量恒星的演化',
    desc: '大质量恒星的一种简化路径:热端主序星、超巨星,终末常发生核心坍缩。实际轨迹取决于初始质量、金属丰度与质量损失,并非都依次经历这些阶段。',
    stages: [
      { key: 'O主序', name: '主序热端 · O 型星', type: 0, quizKey: 'O', ti: 0, desc: '大质量恒星诞生于主序热端:温度最高、光度最强,寿命却只有数百万年。' },
      { key: '蓝超巨星', name: '蓝超巨星', type: 0, quizKey: 'SG', ti: 2, desc: '离开主序的蓝白色巨兽:光度可达太阳数十万倍,终末常发生核心坍缩。' },
      { key: '红超巨星', name: '红超巨星', type: 6, quizKey: 'SG', ti: 4, desc: '大质量恒星的一种晚期阶段:半径可达太阳近千倍,核心仍在经历后续核燃烧。' },
    ],
  },
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
  { keys: ['O'], q: 'O 型星的典型颜色是?', opts: ['蓝色', '黄色', '红色'], exp: 'O 型表面温度很高、颜色偏蓝;光谱型本身不能判断它是主序星还是巨星。' },
  { keys: ['B'], q: 'B 型星的典型颜色是?', opts: ['蓝白色', '橙色', '红色'], exp: 'B 型表面温度约一万至三万 K,比太阳更热,通常呈蓝白色。' },
  { keys: ['A'], q: '织女星属于哪一光谱型?', opts: ['A 型', 'M 型', 'G 型'], exp: '织女星是 A 型星的典型代表,洁白发蓝白光。' },
  { keys: ['G'], q: '太阳的光谱型符号是?', opts: ['G2V', 'M1-Ia', 'DA2'], exp: 'G2 = 表面约 5800K,V = 主序星(矮星)。' },
  { keys: ['K'], q: '大角星是一颗?', opts: ['K 型橙色巨星', 'O 型蓝巨星', 'A 型白星'], exp: '大角星 K1III,已离开主序的橙色巨星。' },
  { keys: ['M'], q: '宇宙中数量最多的恒星是?', opts: ['红矮星', '蓝巨星', '黄矮星'], exp: 'M 型红矮星占恒星总数七成以上,只是太暗肉眼看不见。' },
  { keys: ['SG'], q: '参宿七(猎户座最亮星)是一颗?', opts: ['蓝超巨星', '红矮星', '白矮星'], exp: '参宿七 B8Ia,光度约为太阳的 12 万倍。' },
  { keys: ['SG'], q: '大质量恒星的结局通常是?', opts: ['超新星爆发,留下中子星或黑洞', '安静地变成白矮星', '慢慢蒸发消失'], exp: '质量越大死得越壮烈,核心坍缩引发超新星爆发。' },
  { keys: ['SG'], q: '下列恒星中半径最大的是?', opts: ['红超巨星', '太阳', '白矮星'], exp: '红超巨星半径可达太阳近千倍,能把木星轨道都装进去。' },
  { keys: ['SG'], q: '参宿四(红超巨星)在天文学尺度上随时可能?', opts: ['以超新星爆发终结', '变成主序星', '冷却成行星'], exp: '未来百万年内爆发,届时亮度可媲美满月。' },
  { keys: ['GI'], q: '红巨星膨胀的原因是?', opts: ['核心收缩点燃壳层氢,外层受热膨胀', '被行星撞击', '吞掉了另一颗星'], exp: '核心氢耗尽后收缩,壳层氢燃烧把外包层推出去。' },
  { keys: ['WD'], q: '白矮星靠什么对抗引力坍缩?', opts: ['电子简并压', '核聚变', '磁场'], exp: '泡利不相容原理产生的电子简并压支撑着白矮星。' },
  { keys: ['WD'], q: '天狼星 B 的体积与哪个天体相当?', opts: ['地球', '太阳', '月球'], exp: '只有地球大小,却拥有接近太阳的质量。' },
  { keys: ['WD'], q: '一茶匙白矮星物质的质量约为?', opts: ['几吨', '几克', '几毫克'], exp: '密度约为水的百万倍,堪称"宇宙中的钻石"。' },
  { keys: ['WD', 'HR'], q: '红矮星与白矮星最大的区别是?', opts: ['红矮星靠氢聚变,白矮星主要释放储存的热能', '白矮星更热所以更大', '红矮星不是真正的恒星'], exp: '红矮星是主序星(V);白矮星是致密遗骸,常用 DA、DB 等光谱分类,不能混同。' },
  { keys: ['PN'], q: '行星状星云主要由什么形成?', opts: ['晚期恒星抛出的外层气体', '行星互相碰撞后的碎片', '新生恒星内部的核心'], exp: '它与行星形成无关;中心星使抛出的气体发光,赫罗图追踪的是中心星的温度与光度。' },
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
canvas.width = VIEW_W * SS;
canvas.height = H * SS;

/* ================= 路径(向内螺旋) ================= */
const pathPts = [];
const TURN = 1.6, R0 = 280, R1 = 100, STEPS = 900;
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
  c.drawImage(sprites[LUM_CLASSES[curLum].colors[0]], off, off, frac, frac);
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
/* ================= 场景 Adapter → 共享 renderer ================= */
// 唯一绘图实现位于 js/hr-diagram.js(StellarHRDiagram):物理投影、主序带、区域、
// 演化路径与等半径线全部由 renderer 负责。本文件只把 gamePart/featuredType/
// curLum/evoInfo 组装成场景,不再维护第二套归一化坐标、区域轮廓或手写半径线。
function getHRScene() {
  let target = null;
  if (state !== 'title' && state !== 'gameover') {
    if (gamePart === 1) target = { kind: 'spectral', index: featuredType };
    else if (gamePart === 2) target = { kind: 'region', index: curLum };
    else {
      const es = evoInfo();
      target = { kind: 'evolution', chain: es.chainIdx, stage: es.stageIdx };
    }
  }
  // 标题/失败画面未指定活动课时:不传 target,renderer 显示目录与太阳参照。
  const scene = { progress, target };
  if (track && state === 'levelclear' && gamePart === 3) {
    scene.animation = { chain: track.chain, stage: track.stage, fraction: clamp(track.t / track.dur, 0, 1) };
  }
  return scene;
}
function drawHRScene(id, density, showRadius) {
  const cv = document.getElementById(id);
  if (!cv) return;
  const scene = getHRScene();
  scene.density = density;
  if (showRadius) scene.showRadius = true;
  StellarHRDiagram.render(cv, scene);
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
    [720, 415, 260, '#6a5bff', 0.10],
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
let effectQueue = [], slowUntil = 0, pierceUntil = 0;
let currentType = 0, nextType = 0;
let aimAngle = -Math.PI / 2;
let cooldown = 0, muzzleFlash = 0;
let shake = 0, shakeT = 0;
let comboLevel = 0, comboTimer = 0, maxCombo = 0;
let suckT = 0, sweepT = 0, sweepDone = 0;
let time = 0, lastBeat = 0, dangerLevel = 0;
let track = null;
let quiz = null, lastQuiz = -1;
let phaseIdx = 0, phaseCollected = 0;
let fastForward = false;
let readingOpen = false; // 读图练习层开启期间冻结主循环与全部游戏按键

/* ================= 进度存档 ================= */
const SAVE_KEY = 'stellar-zuma-save-v1';
let progress = { spectral: [0, 0, 0, 0, 0, 0, 0], lum: [0, 0, 0], evo: [[0, 0, 0, 0], [0, 0, 0]], best: 0, maxLevel: 1 };
function loadProgress() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!d) return;
    const flags = (saved, defaults) => defaults.map((_, i) =>
      Array.isArray(saved) && (saved[i] === 1 || saved[i] === true) ? 1 : 0);
    progress.spectral = flags(d.spectral, progress.spectral);
    progress.lum = flags(d.lum, progress.lum);
    progress.evo = progress.evo.map((stages, i) => flags(d.evo?.[i], stages));
    progress.best = Number.isSafeInteger(d.best) && d.best >= 0 ? d.best : 0;
    progress.maxLevel = Number.isSafeInteger(d.maxLevel) && d.maxLevel > 0 ? d.maxLevel : 1;
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
    const k = Math.min(n, 5);
    return {
      part: 1,
      palette: LEVEL_PALETTES[n - 1],
      featured: n - 1,
      lum: -1,
      quota: 11 + k,
      speed: Math.min(50, 22 + k * 3.2),
      rollback: Math.min(130, 78 + k * 5),
      prefill: Math.min(22, 13 + k * 2),
      total: 9999,
    };
  }
  if (n <= 10) {
    const k = n - 8;
    return {
      part: 2,
      palette: [0, 1, 2, 3, 4, 5, 6],
      featured: -1,
      lum: k,
      quota: 8,
      speed: 30 + k * 3,
      rollback: 130,
      prefill: 16,
      total: 9999,
    };
  }
  if (n <= 17) {
    const idx = n - 11;
    const chainIdx = idx < 4 ? 0 : 1;
    const stageIdx = idx < 4 ? idx : idx - 4;
    return {
      part: 3,
      palette: [0, 1, 2, 3, 4, 5, 6],
      featured: -1,
      lum: -1,
      quota: 8,
      speed: Math.min(38, 30 + idx * 2),
      rollback: 100,
      prefill: 18,
      total: 9999,
      chainIdx,
      stageIdx,
    };
  }
  const k = n - 18;
  return {
    part: 2,
    palette: [0, 1, 2, 3, 4, 5, 6],
    featured: -1,
    lum: k % 3,
    quota: 8 + 4 * Math.floor(k / 3),
    speed: Math.min(64, 42 + k * 2),
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
function evoInfo() {
  const idx = level - 11;
  const chainIdx = idx < 4 ? 0 : 1;
  const stageIdx = idx < 4 ? idx : idx - 4;
  const chain = EVO_CHAINS[chainIdx];
  return { chain, chainIdx, stageIdx, stage: chain.stages[stageIdx] };
}
function targetColors() {
  if (gamePart === 1) return [featuredType];
  if (gamePart === 3) return [evoInfo().stage.type];
  return LUM_CLASSES[curLum].colors;
}
function phaseColor() {
  if (gamePart === 1) return featuredType;
  if (gamePart === 3) return evoInfo().stage.type;
  const colors = LUM_CLASSES[curLum].colors;
  return colors[Math.min(phaseIdx, colors.length - 1)];
}
function phaseQuota() {
  const share = Math.ceil(quota / targetColors().length);
  return Math.min(share, quota - phaseIdx * share);
}
function countColor(c) {
  return chain.filter(b => b.type === c).length;
}
function isTargetBall(b) {
  if (gamePart === 1) return b.type === featuredType;
  if (gamePart === 3) return b.type === phaseColor();
  return b.special != null && b.type === phaseColor();
}
function countTargets() {
  return chain.filter(isTargetBall).length;
}
function pickShotType() {
  const tColors = targetColors();
  const pool = activeTypes.filter(x => !tColors.includes(x));
  const tail = chain.length ? chain[chain.length - 1] : null;
  const tailRun = tail ? tailRunInChain() : 0;
  if (tailRun >= 3 && !tColors.includes(tail.type)) {
    const np = pool.filter(x => x !== tail.type);
    return Math.random() < 0.3 ? tail.type : randOf(np.length ? np : pool);
  }
  return randOf(pool);
}
function spawnBall() {
  const pc = phaseColor();
  const tail = chain[chain.length - 1];
  const tailRun = tail ? tailRunInChain() : 0;
  let type, special = null;
  const count = countColor(pc);
  const tailBlocked = tailRun >= 3 && tail.type === pc;
  const p = count <= 0 ? 0.85 : count === 1 ? 0.65 : count === 2 ? 0.45 : count === 3 ? 0.25 : count === 4 ? 0.1 : 0.03;
  if (!tailBlocked && Math.random() < p) {
    type = pc;
    if (gamePart === 2) special = curLum;
  } else {
    const pool = activeTypes.filter(x => !targetColors().includes(x));
    if (tailRun >= 3 && !targetColors().includes(tail.type) && Math.random() < 0.3) type = tail.type;
    else type = randOf(pool.length ? pool : activeTypes);
  }
  return { type, special };
}
function startLevel(n) {
  // 所有入口(续关、选关、重试、URL)共享同一个关卡编号来源。
  level = Number.isSafeInteger(n) && n > 0 ? n : 1;
  const c = levelConf(level);
  setFast(false);
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
  effectQueue = []; slowUntil = 0; pierceUntil = 0;
  spawnTimer = 0.5;
  comboLevel = 0; comboTimer = 0; maxCombo = 0; suckT = 0;
  sweepT = 0; sweepDone = 0; dangerLevel = 0;
  track = null;
  quiz = null;
  phaseIdx = 0;
  phaseCollected = 0;
  levelStartScore = score;
  currentType = pickShotType();
  nextType = pickShotType();
  for (let i = c.prefill - 1; i >= 0; i--) {
    const b = spawnBall();
    chain.push({ type: b.type, special: b.special, dist: i * D });
    remaining--;
  }
  showOverlay(introHTML());
  if (gamePart === 1) renderStarCard('introIcon');
  else if (gamePart === 2) renderLumCard('introIcon');
  else renderTypeCard('introIcon', evoInfo().stage.type);
  drawHRScene('hrIntro', 'standard', gamePart === 2);
  state = 'intro';
  updateHUD(true);
  drawHRScene('hrMini', 'compact');
  updateStarInfo();
}
function setupTitle() {
  levelConf(1);
  chain = [];
  for (let i = 17; i >= 0; i--) chain.push({ type: i % 7, dist: 300 + i * D });
  remaining = 0; total = 0;
  currentType = 0; nextType = 4;
  showOverlay(titleHTML());
  drawHRScene('hrTitle', 'standard');
  drawHRScene('hrMini', 'compact');
  const si = document.getElementById('starInfo');
  if (si) si.innerHTML = '';
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
    if (isTargetBall(ball)) {
      // 多色关卡按阶段分配目标,多收第一种颜色不能跳过第二种。
      if (gamePart !== 2 || phaseCollected < phaseQuota()) collected++;
      phaseCollected++;
      if (gamePart === 2 && ball.special != null) effectQueue.push({ lum: ball.special, type: ball.type, x: p.x, y: p.y });
    }
    cx += p.x; cy += p.y;
    burst(p.x, p.y, ball.type);
  }
  return { removed, cx: cx / removed.length, cy: cy / removed.length };
}
function checkQuota() {
  if (state !== 'playing') return;
  if (gamePart === 2 && phaseCollected >= phaseQuota() && countColor(phaseColor()) === 0) {
    const colors = LUM_CLASSES[curLum].colors;
    if (phaseIdx < colors.length - 1) {
      phaseCollected = 0;
      phaseIdx++;
      comboFlash('下一类:' + TYPES[phaseColor()].name + '!', 2);
      updateStarInfo();
    }
  }
  if (collected >= quota && (gamePart !== 2 || phaseIdx === targetColors().length - 1)) startSweep();
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
  const gotN = res.removed.filter(isTargetBall).length;
  if (gotN > 0) floatText(res.cx, res.cy - 78, '已收集 ×' + gotN, '#9dffb0', 16);
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
  const len = run[1] - run[0] + 1;
  const allT = chain.slice(run[0], run[1] + 1).every(isTargetBall);
  if (len >= (allT ? 4 : 3)) removeRun(run[0], run[1], 'merge');
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
  const fwd = fastForward ? 2.5 : 1;
  for (let j = 0; j < segCount; j++) {
    const s = bounds[j];
    const e = (j + 1 < segCount) ? bounds[j + 1] - 1 : n - 1;
    let v;
    if (segCount === 1) v = pushSpeed * eff * fwd;
    else if (j === segCount - 1) v = pushSpeed * 2.6 * eff * fwd;
    else v = -rollbackSpeed;
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
  for (let i = shots.length - 1; i >= 0 && state === 'playing'; i--) {
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
      const victim = chain[hitIdx];
      if (time < pierceUntil) {
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
function spawnUpdate(dt) {
  if (remaining <= 0) return;
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    const tail = chain[chain.length - 1];
    if (!tail || tail.dist >= D - 1) {
      const b = spawnBall();
      chain.push({ type: b.type, special: b.special, dist: 0 });
      remaining--;
      spawnTimer = D / (pushSpeed * (fastForward ? 2.5 : 1));
      checkQuota();
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
  nextType = pickShotType();
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
function renderTypeCard(id, type) {
  const cv = document.getElementById(id);
  if (!cv) return;
  const c = cv.getContext('2d');
  const s = cv.width;
  c.clearRect(0, 0, s, s);
  const g = c.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s * 0.52);
  g.addColorStop(0, hexA(TYPES[type].glow, 0.45));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, s, s);
  c.drawImage(sprites[type], s * 0.13, s * 0.13, s * 0.74, s * 0.74);
}
function drawTrackFrame() {
  // 演化过关动画由共享 renderer 绘制:animation 沿该链起点回顾到当前课程阶段。
  if (!track) return;
  drawHRScene('hrClear', 'standard', gamePart === 2);
}

/* ================= 主循环 ================= */
function update(dt) {
  // 读图练习开启期间完全冻结主循环(与暂停同级),关闭后从原进度继续。
  if (state === 'paused' || readingOpen) return;
  time += dt;
  muzzleFlash = Math.max(0, muzzleFlash - 3.2 * dt);
  if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
  updateParticles(dt);
  updateFloaters(dt);
  if (state === 'playing') {
    cooldown = Math.max(0, cooldown - dt);
    spawnUpdate(dt);
    if (state !== 'playing') return;
    updateChain(dt);
    if (state !== 'playing') return;
    autoClearScan();
    if (state !== 'playing') return;
    updateShots(dt);
    if (state !== 'playing') return;
    if (effectQueue.length) applyLumEffect(effectQueue.shift());
    if (state !== 'playing') return;
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
      if (isTargetBall(b)) collected++;
      SFX.pop();
      sweepT = 0.045;
    }
    if (!chain.length) {
      sweepDone -= dt;
      if (sweepDone <= 0) {
        state = 'levelclear';
        score += levelBonus();
        SFX.levelClear();
        progress.best = Math.max(progress.best, score);
        // 读完问答反馈后才解锁下一课，刷新也不能跳过问答。
        progress.maxLevel = Math.max(progress.maxLevel, level);
        saveProgress();
        quiz = pickQuestion();
        showOverlay(clearHTML());
        if (gamePart === 1) renderStarCard('clearIcon');
        else if (gamePart === 2) renderLumCard('clearIcon');
        else renderTypeCard('clearIcon', evoInfo().stage.type);
        drawHRScene('hrClear', 'standard', gamePart === 2);
        // track 只保留时间与链/阶段;动画路径由共享 renderer 依据 animation 场景绘制。
        track = gamePart === 3 ? { chain: evoInfo().chainIdx, stage: evoInfo().stageIdx, t: 0, dur: 2.8 } : null;
        drawHRScene('hrMini', 'compact');
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
    if (state === 'levelclear') {
      if (!readingOpen) track.t += dt;
      drawTrackFrame();
    } else track = null;
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
    if (isTargetBall(b) && alpha > 0.4) {
      const pul2 = 1 + 0.09 * Math.sin(time * 5 + b.dist * 0.04);
      ctx.strokeStyle = hexA(TYPES[b.type].glow, 0.45 + 0.3 * Math.sin(time * 4 + b.dist * 0.07));
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, (BALL_R + 10) * sz * pul2, 0, TAU); ctx.stroke();
    }
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
      if (state === 'playing' && Math.random() < 0.03 && particles.length < 380)
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
  if (time < pierceUntil) act.push(['简并子弹', pierceUntil, '#ffd84d']);
  if (!act.length) return;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px ' + UI_FONT;
  let y = 64;
  for (const [name, until, col] of act) {
    ctx.fillStyle = col;
    ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 5;
    ctx.fillText(name + '  ' + (until - time).toFixed(1) + 's', CX, y);
    ctx.shadowBlur = 0;
    y += 22;
  }
  ctx.restore();
}
function render() {
  ctx.setTransform(SS, 0, 0, SS, -VIEW_X * SS, 0);
  ctx.clearRect(VIEW_X, 0, VIEW_W, H);
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
  const goalN = Math.max(1, quota);
  const pct = Math.max(0, Math.min(1, collected / goalN));
  elFill.style.width = (pct * 100).toFixed(1) + '%';
  const goal = gamePart === 1
    ? TYPES[featuredType].key + ' 型恒星'
    : gamePart === 3
      ? evoInfo().stage.name
      : LUM_CLASSES[curLum].name;
  const lbl = (state === 'playing' || state === 'sucking' || state === 'intro' || state === 'clearing')
    ? '目标 ' + goal + ' · 已收 ' + Math.min(collected, goalN) + '/' + goalN + ' · 同色四连收集'
    : '';
  if (hud.lbl !== lbl) { elLabel.textContent = lbl; hud.lbl = lbl; }
}
function updateStarInfo() {
  const el = document.getElementById('starInfo');
  if (!el) return;
  if (gamePart === 3) {
    const es = evoInfo();
    const st = es.stage;
    const T = TYPES[st.type];
    el.innerHTML = `<div class="si-head"><span class="si-badge" style="background:${T.color};box-shadow:0 0 14px ${T.glow}">${T.key}</span>
      <div><div class="si-name">${st.name}</div><div class="si-sub">${es.chain.name}(${es.stageIdx + 1}/${es.chain.stages.length}) · 球色为阶段标记</div></div></div>
      <p class="si-desc">${st.desc}</p>
      <p class="si-example">演化链:${es.chain.stages.map(s => s.name).join(' → ')}</p>`;
    return;
  }
  if (gamePart === 1) {
    const T = TYPES[featuredType], S = STAR_INFO[featuredType];
    const seq = COLLECT_ORDER.map(i => {
      const cls = progress.spectral[i] ? 'si-done' : (i === featuredType ? 'si-cur' : 'si-future');
      return `<span class="${cls}">${TYPES[i].key}</span>`;
    }).join('<i>→</i>');
    el.innerHTML = `<div class="si-head"><span class="si-badge" style="background:${T.color};box-shadow:0 0 14px ${T.glow}">${T.key}</span>
      <div><div class="si-name">${T.name}</div><div class="si-sub">${S.temp}</div></div></div>
      <p class="si-seq">${seq}</p>
      <p class="si-desc">${S.desc}</p>
      <p class="si-example">代表恒星:${S.example}</p>`;
  } else {
    const L = LUM_CLASSES[curLum];
    el.innerHTML = `<div class="si-head"><span class="si-badge crown">${L.yerkes}</span>
      <div><div class="si-name">${L.name}</div><div class="si-sub">${L.classification} · 球色阶段 ${phaseIdx + 1}/${L.colors.length} · 本阶段目标 ${phaseQuota()} 颗</div></div></div>
      <p class="si-desc">${L.desc}</p>
      <p class="si-example">代表恒星:${L.example}<br>${L.radius}</p>
      <p class="si-skill">技能 ${L.effectName}:${L.effectDesc}</p>`;
  }
}
function comboFlash(txt, mult) {
  elCombo.textContent = txt;
  elCombo.style.color = mult >= 4 ? '#ff6b52' : (mult >= 3 ? '#ffd84d' : '#ffe9a8');
  elCombo.classList.remove('show');
  void elCombo.offsetWidth;
  elCombo.classList.add('show');
}
/* 所有覆盖层卡片统一追加次级读图入口:卡片会遮住侧栏按钮,触屏也需卡内入口。
   原主操作(primary)与问答 DOM 原样保留;read-hr 为非 primary 次级按钮。 */
function hrReadBtnHTML() {
  return '<button type="button" class="ghost" data-action="read-hr">读图练习(H)</button>';
}
function showOverlay(html) {
  overlay.innerHTML = html;
  const card = overlay.querySelector('.card');
  if (card) card.insertAdjacentHTML('beforeend', hrReadBtnHTML());
  overlay.classList.remove('hidden');
}
function hideOverlay() { overlay.classList.add('hidden'); }

function titleHTML() {
  const legend = TYPES.map(t =>
    `<div class="star"><span class="dot" style="background:${t.color};box-shadow:0 0 10px ${t.glow}, inset 0 -4px 6px ${t.dark}">${t.key}</span><span class="nm">${t.name}</span></div>`
  ).join('');
  const unlocked = litCount() >= 10;
  const hint = unlocked
    ? '选关已解锁 · 点击赫罗图上的点或区域,直接开始对应关卡'
    : `已点亮 ${litCount()}/10 · 按顺序通关点亮整张赫罗图后解锁选关`;
  const hasSave = progress.best > 0 || progress.maxLevel > 1;
  const saveInfo = hasSave
    ? `<p class="tip">最高分 ${progress.best.toLocaleString('zh-CN')} · 已抵达第 ${progress.maxLevel} 关</p>
    <button class="primary" data-action="continue">继续游戏</button>
    <button class="ghost" data-action="start">从头开始</button>`
    : `<button class="primary" data-action="start">开始游戏</button>`;
  return `<div class="card">
    <h1>星链祖玛</h1><p class="sub">STELLAR ZUMA</p>
    <p class="desc">第一部分：以主序带为线索，学习 <b>O → B → A → F → G → K → M</b> 的温度与颜色顺序。<br>第二部分：比较赫罗图中的<b>超巨星 / 巨星 / 白矮星</b>区域，区分光谱型与光度类。<br>第三部分：跟随<b>太阳</b>与<b>大质量恒星</b>的简化演化路径，理解它们在图上的移动。<br>同色目标星连成 <b>4 颗</b>即收集，<b>先收完一种球色再换下一种</b>。OBAFGKM 是温度顺序，不是一颗恒星的演化顺序。</p>
    <div class="legend">${legend}</div>
    <canvas id="hrTitle" width="460" height="250" class="${unlocked ? 'selectable' : ''}"></canvas>
    <p id="hrHint" class="tip">${hint}</p>
    <p class="tip">图中位置与球的大小、颜色为教学示意；连球消除、技能与黑洞终点是游戏机制，不表示真实恒星相撞或湮灭。</p>
    ${saveInfo}
    <p class="controls">鼠标瞄准 · 点击发射 · <b>空格 / 右键</b> 换球 · <b>F / 加速按钮</b> 加速星链 · <b>P</b> 暂停 · <b>H</b> 读图练习 · <b>M</b> 音效</p>
  </div>`;
}
function partMeta() {
  if (gamePart === 1) return { title: '第一部分', topic: '恒星的光谱型', desc: '学习 O · B · A · F · G · K · M 七大光谱分类——温度与颜色的对应关系' };
  if (gamePart === 2) return { title: '第二部分', topic: '赫罗图的主要区域', desc: '超巨星(I) · 巨星(III) · 白矮星(常用 D 类光谱)，不是同一条演化序列' };
  return { title: '第三部分', topic: '恒星的演化', desc: '沿赫罗图上的演化轨迹,见证恒星的一生' };
}
function introHTML() {
  const pm = partMeta();
  if (gamePart === 3) {
    const es = evoInfo();
    const st = es.stage;
    return `<div class="card intro">
      <div class="intro-head">
        <canvas id="introIcon" width="96" height="96"></canvas>
        <div class="intro-title">
          <h1 class="part-title">${pm.title} · ${pm.topic}</h1>
          <p class="part-desc">${pm.desc}</p>
          <h2 class="level-title">第 ${level} 关 · 演化阶段:${st.name}</h2>
          <p class="sub">${es.chain.name}(${es.stageIdx + 1}/${es.chain.stages.length}) · 球色仅为阶段标记</p>
        </div>
      </div>
      <p class="desc">本关目的:${st.desc}</p>
      <p class="tip">收集满 <b>${quota}</b> 颗本阶段的目标球即可过关；同色 4 颗相连自动收集。球色不等于该阶段的真实光谱型。<br>${es.chain.desc}</p>
      <canvas id="hrIntro" width="640" height="300"></canvas>
      <button class="primary" data-action="go">出发</button>
    </div>`;
  }
  if (gamePart === 2) {
    const L = LUM_CLASSES[curLum];
    const ladder = [['Ia', '超巨星'], ['III', '巨星'], ['V', '主序星'], ['D', '白矮星光谱']]
      .map(([k, n]) => L.yerkes === k ? `<b>${k} ${n}</b>` : `${k} ${n}`).join(' · ');
    return `<div class="card intro">
      <div class="intro-head">
        <canvas id="introIcon" width="96" height="96"></canvas>
        <div class="intro-title">
          <h1 class="part-title">${pm.title} · ${pm.topic}</h1>
          <p class="part-desc">${pm.desc}</p>
          <h2 class="level-title">第 ${level} 关 · 收集${L.name}</h2>
          <p class="sub">${L.classification} · 第 ${phaseIdx + 1}/${L.colors.length} 种冠环球色</p>
        </div>
      </div>
      <p class="desc">本关目的:认识${L.name}的物理特性与在赫罗图上的位置</p>
      <p class="tip">发射的星球只会插入星链;收集满 <b>${quota}</b> 颗冠环星即可过关,当前一类的冠环星随机分布并自动维持在 4 颗左右(新生星不会直接连成 4 连)<br><b>先收集完一类(4 颗同色相连消除),再收集下一类</b>——两类不会同时出现<br>同色 4 颗相连即自动湮灭并整批计入收集——通过消除普通星球引发链段合并,把同色冠环星凑到一起!<br>技能 <b>${L.effectName}</b>：${L.effectDesc} · 代表恒星：${L.example} · ${L.radius}</p>
      <p class="tip">分类对照:${ladder}<br><b>B8Ia</b> = B 型 + Ia 超巨星，<b>G2V</b> = G 型 + V 主序星；白矮星另用 <b>DA、DB</b> 等光谱分类。<br>读图：上方更亮、左侧更热；红巨星在右上，蓝超巨星在左上，白矮星在左下。金色等半径线为示意，光度 L ∝ R²T⁴。</p>
      ${curLum === 2 ? `<p class="tip">红矮星是仍在核心进行氢聚变的主序星；白矮星是致密遗骸；棕矮星不能持续进行氢聚变。白色球仅作标记，不表示白矮星属于 A 型主序星。</p>` : ''}
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
        <h1 class="part-title">${pm.title} · ${pm.topic}</h1>
        <p class="part-desc">${pm.desc}</p>
        <h2 class="level-title">第 ${level} 关 · 收集 ${T.key} 型恒星</h2>
        <p class="sub">本关认识:${T.name} · ${S.temp}</p>
      </div>
    </div>
    <p class="desc">${S.desc}</p>
    <p class="tip">发射的星球只会插入星链;收集满 <b>${quota}</b> 颗 ${T.key} 型星即可过关,星链中的目标星随机分布并自动维持在 4 颗左右(新生星不会直接连成 4 连)<br>同色 4 颗相连即自动消除并整批计入收集——通过消除普通星球引发链段合并,把目标星凑到一起!<br>温度顺序:O → B → A → F → G → K → M · 光谱型例星:${S.example}<br>图中点为代表性主序位置，例星不一定仍在主序上；光谱型描述温度，不单独决定半径、光度或演化阶段。</p>
    <canvas id="hrIntro" width="640" height="300"></canvas>
    <button class="primary" data-action="go">出发</button>
  </div>`;
}
function clearHTML() {
  if (gamePart === 3) {
    const es = evoInfo();
    const st = es.stage;
    return `<div class="card intro">
      <div class="intro-head">
        <canvas id="clearIcon" width="96" height="96"></canvas>
        <div class="intro-title">
          <h1 class="good">${st.name} · 演化完成!</h1>
          <p class="sub">第三部分 · ${es.chain.name}(${es.stageIdx + 1}/${es.chain.stages.length})</p>
        </div>
      </div>
      <p class="desc">关卡奖励 <b>+${levelBonus()}</b> · 当前得分 <b>${score.toLocaleString('zh-CN')}</b> · 最大连击 <b>×${Math.max(1, maxCombo)}</b></p>
      <canvas id="hrClear" width="640" height="300"></canvas>
      ${quizHTML()}
      <button id="clearNext" class="primary hidden" data-action="next">${level < 17 ? '演化继续 · 下一阶段' : '进入无尽挑战'}</button>
    </div>`;
  }
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
      <button id="clearNext" class="primary hidden" data-action="next">${level === 10 ? '进入第三部分 · 恒星演化' : level > 17 ? '继续无尽挑战' : '收集下一类恒星'}</button>
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
function gameoverHTML(reason) {
  return `<div class="card">
    <h1 class="bad">${reason || '黑洞吞噬了星链…'}</h1>
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
  const key = gamePart === 1 ? TYPES[featuredType].key
    : gamePart === 3 ? evoInfo().stage.quizKey : ['SG', 'GI', 'WD'][curLum];
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
  if (state !== 'levelclear' || !quiz || quiz.answered || !Number.isInteger(pickIdx) || pickIdx < 0 || pickIdx >= quiz.order.length) return;
  quiz.answered = true;
  const right = quiz.order[pickIdx] === 0;
  overlay.querySelectorAll('button[data-quiz]').forEach((b, j) => {
    b.disabled = true;
    if (quiz.order[j] === 0) b.classList.add('right');
    else if (j === pickIdx) b.classList.add('wrong');
  });
  if (right) {
    score += 200;
    updateHUD(true);
    SFX.match(3, 0);
  } else {
    SFX.clack();
  }
  if (gamePart === 1) progress.spectral[featuredType] = 1;
  else if (gamePart === 2) progress.lum[curLum] = 1;
  else {
    const es = evoInfo();
    progress.evo[es.chainIdx][es.stageIdx] = 1;
  }
  progress.best = Math.max(progress.best, score);
  progress.maxLevel = Math.max(progress.maxLevel, level + 1);
  saveProgress();
  drawHRScene('hrMini', 'compact');
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
  if (litCount() < 10) {
    if (hint) {
      hint.textContent = `赫罗图尚未点亮(${litCount()}/10),按顺序通关收集以解锁选关`;
      hint.classList.add('warn');
    }
    SFX.clack();
    return;
  }
  // 命中几何与绘制完全一致:直接复用共享 renderer 的 hitTest,不再维护第二套坐标。
  const hit = StellarHRDiagram.hitTest(cv, e.clientX, e.clientY);
  let target = 0;
  if (hit && hit.kind === 'spectral') target = hit.index + 1;
  else if (hit && hit.kind === 'region') target = 8 + hit.index;
  if (target) {
    SFX.ensure(); SFX.click();
    score = 0;
    startLevel(target);
  }
}
overlay.addEventListener('click', e => {
  if (e.target.id === 'hrTitle') { handleTitleHrClick(e); return; }
  const qb = e.target.closest('button[data-quiz]');
  if (qb) { if (readingOpen) return; SFX.ensure(); answerQuiz(+qb.dataset.quiz); return; }
  const b = e.target.closest('button[data-action]');
  if (!b) return;
  // 读图练习是唯一例外:开启期间冻结其他操作,但读图入口本身仍可响应(幂等)。
  if (b.dataset.action === 'read-hr') { SFX.ensure(); hrController.open('card'); return; }
  if (readingOpen) return;
  SFX.ensure(); SFX.click();
  const act = b.dataset.action;
  if (act === 'start' || act === 'restart') { score = 0; level = 1; startLevel(1); }
  else if (act === 'continue') { score = 0; startLevel(Math.max(1, progress.maxLevel)); }
  else if (act === 'go') { hideOverlay(); state = 'playing'; }
  else if (act === 'next' && state === 'levelclear' && quiz?.answered) { startLevel(level + 1); }
  else if (act === 'retry') { score = levelStartScore; startLevel(level); }
  else if (act === 'resume') { hideOverlay(); state = 'playing'; }
});

/* ================= 加速星链 ================= */
const ffBtn = document.getElementById('ffBtn');
function setFast(on) {
  fastForward = on && state === 'playing';
  if (ffBtn) ffBtn.classList.toggle('on', fastForward);
}
if (ffBtn) {
  ffBtn.addEventListener('pointerdown', e => { e.preventDefault(); setFast(true); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => ffBtn.addEventListener(ev, () => setFast(false)));
}

/* ================= 输入 ================= */
document.getElementById('swapBtn').addEventListener('click', () => { SFX.ensure(); swapBalls(); });
document.getElementById('pauseBtn').addEventListener('click', togglePause);
function togglePause() {
  setFast(false);
  if (state === 'playing') { state = 'paused'; showOverlay(pauseHTML()); }
  else if (state === 'paused') { hideOverlay(); state = 'playing'; }
}
canvas.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  const mx = VIEW_X + (e.clientX - r.left) / r.width * VIEW_W;
  const my = (e.clientY - r.top) / r.height * H;
  aimAngle = Math.atan2(my - CY, mx - CX);
});
canvas.addEventListener('pointerdown', e => {
  SFX.ensure();
  const r = canvas.getBoundingClientRect();
  const mx = VIEW_X + (e.clientX - r.left) / r.width * VIEW_W;
  const my = (e.clientY - r.top) / r.height * H;
  aimAngle = Math.atan2(my - CY, mx - CX);
  if (e.button === 2) { swapBalls(); return; }
  if (state === 'playing') shoot();
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  SFX.ensure();
  // 读图练习层拥有键盘焦点(焦点陷阱):其余游戏按键在此期间一律冻结,Esc 由练习层自行处理。
  if (readingOpen) return;
  if (e.code === 'Space') {
    e.preventDefault();
    swapBalls();
  } else if (e.key === 'x' || e.key === 'X') {
    swapBalls();
  } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    if (!e.repeat) togglePause();
  } else if (e.key === 'm' || e.key === 'M') {
    muted = !muted;
  } else if (e.key === 'f' || e.key === 'F') {
    setFast(true);
  } else if (e.key === 'h' || e.key === 'H') {
    if (!e.repeat) hrController.open('key');
  } else if (e.key === 'Enter') {
    const b = overlay.querySelector('button.primary');
    if (b && !overlay.classList.contains('hidden') && !b.classList.contains('hidden')) b.click();
  }
});
window.addEventListener('keyup', e => {
  if (e.key === 'f' || e.key === 'F') setFast(false);
});
/* 失焦/切页只把 playing 收敛为 paused;读图练习、暂停、结算等状态原样保留。 */
function handlePageHidden() {
  setFast(false);
  if (state === 'playing') { state = 'paused'; showOverlay(pauseHTML()); }
}
window.addEventListener('blur', handlePageHidden);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) handlePageHidden();
});
window.addEventListener('resize', () => drawHRScene('hrMini', 'compact'));

/* ================= 读图练习集成(共享练习层,全站仅挂载一次) ================= */
// 场景由同一 Adapter 提供:第二部分追问半径,需附带等半径线;其余部分不带。
const hrController = StellarHRPractice.mount({
  getScene: () => {
    const scene = getHRScene();
    if (gamePart === 2) scene.showRadius = true;
    return scene;
  },
  // 冻结语义:开启即挂起主循环并撤销加速;关闭只解除冻结,不触碰底层状态,
  // 因此暂停中打开→关闭仍回到暂停,intro/结算中打开→关闭覆盖层原样保留。
  onOpen: () => { readingOpen = true; setFast(false); },
  onClose: () => { readingOpen = false; },
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
    effectFlags: () => ({ slow: time < slowUntil, pierce: time < pierceUntil }),
    specialsInChain: () => chain.filter(b => b.special != null).length,
    gamePart: () => gamePart,
    progress: () => progress,
    chainRef: () => chain,
    setBudget: v => { quota = v; },
    addCollected: n => { collected += n; checkQuota(); },
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
