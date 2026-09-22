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
function drawHR(id, hl) {
  const cv = document.getElementById(id);
  if (!cv) return;
  const c = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  c.clearRect(0, 0, w, h);
  c.fillStyle = 'rgba(8,10,26,.85)';
  roundRect(c, 0, 0, w, h, 16); c.fill();
  c.strokeStyle = 'rgba(140,160,255,.25)'; c.lineWidth = 2;
  roundRect(c, 0, 0, w, h, 16); c.stroke();
  const padL = 76, padR = 34, padT = 40, padB = 62;
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
  c.fillText('超巨星', padL + iw * 0.60, padT + 16);
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
let featuredType = 0, quota = 12, collected = 0;
let currentType = 0, nextType = 0;
let aimAngle = -Math.PI / 2;
let cooldown = 0, muzzleFlash = 0;
let shake = 0, shakeT = 0;
let comboLevel = 0, comboTimer = 0, maxCombo = 0;
let suckT = 0, sweepT = 0, sweepDone = 0;
let time = 0, lastBeat = 0, dangerLevel = 0;

function levelConf(n) {
  if (n <= 7) {
    return {
      palette: LEVEL_PALETTES[n - 1],
      featured: n - 1,
      quota: 10 + n,
      speed: Math.min(50, 22 + n * 3.2),
      rollback: Math.min(130, 78 + n * 5),
      prefill: Math.min(22, 13 + n * 2),
      total: 9999,
    };
  }
  const k = n - 7;
  return {
    palette: [0, 1, 2, 3, 4, 5, 6],
    featured: (k - 1) % 7,
    quota: 18 + k * 2,
    speed: Math.min(64, 46 + k * 2),
    rollback: 130,
    prefill: 22,
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
  } else if (Math.random() < 0.26) {
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
  featuredType = c.featured;
  quota = c.quota;
  collected = 0;
  chain = []; shots = []; particles = []; floaters = [];
  spawnTimer = 0.5;
  comboLevel = 0; comboTimer = 0; maxCombo = 0; suckT = 0;
  sweepT = 0; sweepDone = 0; dangerLevel = 0;
  levelStartScore = score;
  currentType = pickType();
  nextType = pickType();
  for (let i = c.prefill - 1; i >= 0; i--) {
    chain.push({ type: pickType(), dist: i * D });
    remaining--;
  }
  showOverlay(introHTML());
  renderStarCard('introIcon');
  drawHR('hrIntro', featuredType);
  state = 'intro';
  updateHUD(true);
}
function setupTitle() {
  levelConf(1);
  chain = [];
  for (let i = 17; i >= 0; i--) chain.push({ type: i % 7, dist: 300 + i * D });
  remaining = 0; total = 0;
  currentType = 0; nextType = 4;
  showOverlay(titleHTML());
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
function removeRun(a, b, cause) {
  const n = b - a + 1;
  if (comboTimer > 0) comboLevel = Math.min(8, comboLevel + 1); else comboLevel = 0;
  comboTimer = COMBO_WINDOW;
  maxCombo = Math.max(maxCombo, comboLevel + 1);
  const mult = 1 + comboLevel;
  let base = 10 * n;
  if (n >= 4) base += (n - 3) * 25;
  if (cause === 'auto') base = Math.round(base * 1.5);
  const streakBonus = comboLevel >= 2 ? 60 * comboLevel : 0;
  const pts = base * mult + streakBonus;
  score += pts;
  const removed = chain.splice(a, n);
  let cx = 0, cy = 0;
  for (const ball of removed) {
    if (ball.type === featuredType) collected++;
    const p = posAt(ball.dist);
    cx += p.x; cy += p.y;
    burst(p.x, p.y, ball.type);
  }
  cx /= n; cy /= n;
  const T = TYPES[removed[0].type];
  floatText(cx, cy - 26, '+' + pts, T.light, 17);
  if (cause === 'auto') {
    floatText(cx, cy - 54, '自动湮灭!', '#ffd84d', 24);
    ringFx(cx, cy, '#ffffff');
    SFX.autoClear();
  } else if (n >= 4) {
    floatText(cx, cy - 54, runLabel(n), '#ffd84d', 23);
  } else if (mult > 1) {
    floatText(cx, cy - 54, '连击 ×' + mult, '#ff9e3d', 20);
  }
  if (mult > 1) comboFlash((mult >= 4 ? '超新星' : '') + '连击 ×' + mult, mult);
  ringFx(cx, cy, T.glow);
  if (n >= 4 || mult > 1 || cause === 'auto') { shake = Math.min(9, 3 + n); shakeT = 0.28; }
  SFX.match(n, comboLevel);
  if (state === 'playing' && collected >= quota) startSweep();
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
  for (let j = 0; j < segCount; j++) {
    const s = bounds[j];
    const e = (j + 1 < segCount) ? bounds[j + 1] - 1 : n - 1;
    let v;
    if (segCount === 1) v = pushSpeed;
    else if (j === segCount - 1) v = pushSpeed * 2.6;
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
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (particles.length < 380)
      particles.push({ x: s.x, y: s.y, vx: 0, vy: 0, life: 0.22, max: 0.22, size: 3.4, color: TYPES[s.type].glow, kind: 'glow' });
    if (s.x < -60 || s.x > W + 60 || s.y < -60 || s.y > H + 60) { shots.splice(i, 1); continue; }
    let hitIdx = -1;
    for (let k = 0; k < chain.length; k++) {
      if (chain[k].dist < 0) continue;
      const p = posAt(chain[k].dist);
      const dx = s.x - p.x, dy = s.y - p.y;
      if (dx * dx + dy * dy < (D - 4) * (D - 4)) { hitIdx = k; break; }
    }
    if (hitIdx >= 0) { insertShot(s, hitIdx); shots.splice(i, 1); }
  }
}
function spawnUpdate(dt) {
  if (remaining <= 0) return;
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    const tail = chain[chain.length - 1];
    if (!tail || tail.dist >= D - 1) {
      chain.push({ type: pickType(), dist: 0 });
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
  sweepT = 0.12;
  sweepDone = 0.6;
  comboFlash('收集完成!', 3);
  SFX.tone(880, 0.4, 'triangle', 0.2, 0, 1320);
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
        showOverlay(clearHTML());
        renderStarCard('clearIcon');
        drawHR('hrClear', featuredType);
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
    drawBall(p.x, p.y, b.type, scale, alpha);
  }
}
function drawShots() {
  for (const s of shots) drawBall(s.x, s.y, s.type, 0.92);
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
  const lbl = (state === 'playing' || state === 'sucking' || state === 'intro' || state === 'clearing')
    ? '目标 ' + TYPES[featuredType].key + ' 型恒星 ' + Math.min(collected, quota) + '/' + quota
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
  return `<div class="card">
    <h1>星链祖玛</h1><p class="sub">STELLAR ZUMA</p>
    <p class="desc">第一部分共七关，每关收集一种光谱型恒星，集齐 <b>O · B · A · F · G · K · M</b>！<br>三颗同类相连即湮灭；<b>四连自动湮灭</b>；连续消除享<b>连击加成</b>。</p>
    <div class="legend">${legend}</div>
    <p class="controls">鼠标瞄准 · 点击发射 · <b>空格 / 右键</b> 换球 · <b>P</b> 暂停 · <b>M</b> 音效</p>
    <button class="primary" data-action="start">开始游戏</button>
  </div>`;
}
function introHTML() {
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
    <button class="primary" data-action="next">${level < 7 ? '收集下一类恒星' : '进入无尽挑战'}</button>
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
overlay.addEventListener('click', e => {
  const b = e.target.closest('button[data-action]');
  if (!b) return;
  SFX.ensure(); SFX.click();
  const act = b.dataset.action;
  if (act === 'start' || act === 'restart') { score = 0; level = 1; startLevel(1); }
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
    if (b && !overlay.classList.contains('hidden')) b.click();
  }
});
window.addEventListener('blur', () => {
  if (state === 'playing') { state = 'paused'; showOverlay(pauseHTML()); }
});

/* ================= 启动 ================= */
makeSprites();
makeBackground();
setupTitle();
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
  };
}

})();
