/* ============================================================
   星链祖玛 · 共享赫罗图渲染器 StellarHRDiagram
   统一 T/logL 物理投影：左热右冷、下暗上亮、太阳锚点、物理等半径线。
   只消费 window.StellarHRModel；不依赖、不调用 game.js 的任何绘图。
   ============================================================ */
(() => {
'use strict';

const UI_FONT = '"Trebuchet MS","PingFang SC","Microsoft YaHei",sans-serif';
const RADII = [1000, 100, 10, 1, 0.1, 0.01];
const T_TICKS = [100000, 30000, 10000, 3000];
const L_TICKS = [[1e6, '10⁶'], [1e4, '10⁴'], [1e2, '10²'], [1, '1'], [1e-2, '10⁻²'], [1e-4, '10⁻⁴']];
const geom = new WeakMap();

const DENS = {
  compact:  { padL: 34, padR: 12, padT: 28, padB: 40, refW: 320, axis: 12, key: 12, region: 12, note: 12, tick: 0,  dot: 4.0, dotLit: 6.0, sun: false },
  standard: { padL: 60, padR: 16, padT: 36, padB: 56, refW: 480, axis: 14, key: 13, region: 13, note: 12, tick: 12, dot: 4.5, dotLit: 6.5, sun: true },
  expanded: { padL: 64, padR: 20, padT: 42, padB: 60, refW: 560, axis: 16, key: 14, region: 14, note: 12, tick: 13, dot: 5.0, dotLit: 7.0, sun: true }
};

function model () {
  const M = window.StellarHRModel;
  if (!M) throw new Error('StellarHRModel 未加载（需先加载 js/hr-model.js）');
  return M;
}
function roundRect (c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const classTag = cl => (String(cl || '').match(/\b(Ia|Ib|III|II|IV|V|D)\b/) || [''])[0];
const starColor = (M, t) => {
  let best = '#dfe6ff', bd = Infinity;
  for (const sp of M.spectral) {
    const d = Math.abs(Math.log10(sp.temperature) - Math.log10(t));
    if (d < bd) { bd = d; best = sp.color; }
  }
  return best;
};

/* ---------- 等半径线 ---------- */
function radiusLines (c, M, X, Y, padL, padT, iw, ih, D, scale, labels, highlight) {
  const B = M.BOUNDS;
  for (const R of RADII) {
    const pts = [];
    const n = 46;
    for (let i = 0; i <= n; i++) {
      const t = B.maxTemperature * Math.pow(B.minTemperature / B.maxTemperature, i / n);
      let l;
      try { l = M.luminosityAtRadius(t, R); } catch { break; }
      if (l < B.minLuminosity || l > B.maxLuminosity) continue;
      const p = M.project({ temperature: t, luminosity: l });
      if (!p.inside) continue;
      pts.push([X(p.x), Y(p.y)]);
    }
    if (pts.length < 2) continue;
    const hot = highlight && highlight.has(R);
    c.save();
    c.setLineDash([7, 6]);
    c.strokeStyle = hot ? 'rgba(255,215,80,.9)' : 'rgba(255,215,80,.30)';
    c.lineWidth = hot ? 2.5 : (D === DENS.compact ? 1 : 1.5);
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.stroke();
    c.restore();
    if (labels && D.tick > 0) {
      const end = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      const ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
      c.save();
      c.translate(end[0], end[1]);
      c.rotate(ang);
      c.font = (hot ? 'bold ' : '') + Math.max(12, Math.round(11 * scale)) + 'px ' + UI_FONT;
      c.fillStyle = hot ? 'rgba(255,220,120,.95)' : 'rgba(255,215,80,.55)';
      c.textAlign = 'right'; c.textBaseline = 'bottom';
      c.fillText(R + ' R☉', -4, -3);
      c.restore();
    }
  }
}

/* ---------- 演化链 ---------- */
function chainPts (M, chain) {
  return chain.points.map(p => {
    const q = M.project(p);
    return { x: q.x, y: q.y, inside: q.inside };
  });
}
function drawEvolution (c, M, X, Y, iw, ih, D, scene, fs) {
  const progress = scene.progress;
  const target = scene.target;
  const anim = scene.animation;
  if (!M.evolution) return;
  M.evolution.forEach((chain, ci) => {
    const isTarget = target && target.kind === 'evolution' && target.chain === ci;
    const isAnim = anim && anim.chain === ci;
    const hasDone = progress && progress.evo && progress.evo[ci] && progress.evo[ci].some(Boolean);
    if (!isTarget && !isAnim && !hasDone) return;
    const pts = chainPts(M, chain).map(p => ({ x: X(clamp(p.x, 0, 1)), y: Y(clamp(p.y, 0, 1)) }));
    const active = isTarget || isAnim;
    c.save();
    c.setLineDash([5, 4]);
    c.strokeStyle = active ? 'rgba(255,215,80,.65)' : 'rgba(255,215,80,.22)';
    c.lineWidth = active ? 2 : 1.2;
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.stroke();
    c.restore();

    if (isAnim && chain.stages[anim.stage]) {
      const upto = chain.stages[anim.stage].pointIndex;
      if (upto > 0) {
        // 亮色部分路径 + 移动点：沿链起点到指定 stage
        const seg = pts.slice(0, upto + 1);
        let total = 0;
        const cum = [0];
        for (let i = 1; i < seg.length; i++) { total += Math.hypot(seg[i].x - seg[i - 1].x, seg[i].y - seg[i - 1].y); cum.push(total); }
        const goal = clamp(anim.fraction || 0, 0, 1) * total;
        let head = seg[seg.length - 1];
        c.save();
        c.strokeStyle = 'rgba(255,215,80,.95)';
        c.lineWidth = 2.5;
        c.setLineDash([]);
        c.beginPath();
        c.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          if (cum[i] <= goal) { c.lineTo(seg[i].x, seg[i].y); head = seg[i]; }
          else {
            const r = (goal - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
            head = { x: seg[i - 1].x + (seg[i].x - seg[i - 1].x) * r, y: seg[i - 1].y + (seg[i].y - seg[i - 1].y) * r };
            c.lineTo(head.x, head.y);
            break;
          }
        }
        c.stroke();
        chain.stages.forEach((st, si) => {
          if (st.pointIndex > upto) return;
          const p = pts[st.pointIndex];
          c.fillStyle = 'rgba(255,215,80,.9)';
          c.beginPath(); c.arc(p.x, p.y, 3, 0, Math.PI * 2); c.fill();
        });
        c.fillStyle = 'rgba(255,215,80,.35)';
        c.beginPath(); c.arc(head.x, head.y, 10, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffd84d';
        c.beginPath(); c.arc(head.x, head.y, 4.5, 0, Math.PI * 2); c.fill();
        c.restore();
      } else {
        // 单节点：强调该点，不伪造前置路径
        const p = pts[0];
        c.save();
        c.strokeStyle = 'rgba(255,215,80,.9)'; c.lineWidth = 2;
        c.beginPath(); c.arc(p.x, p.y, 10, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#ffd84d';
        c.beginPath(); c.arc(p.x, p.y, 4.5, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    } else {
      chain.stages.forEach((st, si) => {
        const p = pts[st.pointIndex];
        if (!p) return;
        const done = progress && progress.evo && progress.evo[ci] && progress.evo[ci][si] === 1;
        const isCur = isTarget && target.stage === si;
        if (done) {
          c.fillStyle = '#ffd84d';
          c.beginPath(); c.arc(p.x, p.y, 4.5, 0, Math.PI * 2); c.fill();
        } else if (isCur) {
          c.fillStyle = starColor(M, chain.points[st.pointIndex].temperature);
          c.beginPath(); c.arc(p.x, p.y, 5.5, 0, Math.PI * 2); c.fill();
          c.strokeStyle = 'rgba(255,215,80,.9)'; c.lineWidth = 1.5;
          c.beginPath(); c.arc(p.x, p.y, 9, 0, Math.PI * 2); c.stroke();
        } else {
          c.strokeStyle = 'rgba(200,210,240,.4)'; c.lineWidth = 1;
          c.beginPath(); c.arc(p.x, p.y, 3.5, 0, Math.PI * 2); c.stroke();
        }
      });
    }
  });
}

/* ---------- 主渲染 ---------- */
function render (canvas, scene) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('render 需要 canvas 元素');
  const M = model();
  const s = scene && typeof scene === 'object' ? scene : {};
  const dName = DENS[s.density] ? s.density : 'standard';
  const D = DENS[dName];
  const dpr = clamp(window.devicePixelRatio || 1, 1, 4);
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(120, Math.round(rect.width || canvas.clientWidth || 480));
  const cssH = Math.max(100, Math.round(rect.height || canvas.clientHeight || 360));
  const bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
  if (canvas.width !== bw) canvas.width = bw;
  if (canvas.height !== bh) canvas.height = bh;
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, cssW, cssH);

  const scale = clamp(cssW / D.refW, 0.9, 1.12);
  const fs = n => Math.max(12, Math.round(n * scale));
  /* 画布高度受限（矮视口）时压缩上下留白，保住绘图区可用高度 */
  const shortH = cssH < 300;
  const padL = D.padL, padR = D.padR;
  const padT = shortH ? Math.max(24, Math.round(D.padT * 0.72)) : D.padT;
  const padB = shortH ? Math.max(38, Math.round(D.padB * 0.85)) : D.padB;
  const iw = Math.max(60, cssW - padL - padR), ih = Math.max(60, cssH - padT - padB);
  const X = nx => padL + nx * iw, Y = ny => padT + ny * ih;

  /* 面板 */
  c.fillStyle = 'rgba(8,10,26,.85)';
  roundRect(c, 0.5, 0.5, cssW - 1, cssH - 1, 14); c.fill();
  c.strokeStyle = 'rgba(140,160,255,.25)'; c.lineWidth = 2; c.stroke();

  /* 坐标轴 */
  c.strokeStyle = 'rgba(150,170,255,.4)';
  c.lineWidth = dName === 'expanded' ? 2 : 1.5;
  c.beginPath();
  c.moveTo(padL, padT); c.lineTo(padL, padT + ih); c.lineTo(padL + iw, padT + ih);
  c.stroke();
  if (D.tick > 0) {
    c.font = fs(D.tick) + 'px ' + UI_FONT;
    c.fillStyle = '#93a2d8';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const t of T_TICKS) {
      const p = M.project({ temperature: t, luminosity: M.BOUNDS.maxLuminosity });
      const x = X(p.x);
      c.strokeStyle = 'rgba(150,170,255,.35)';
      c.beginPath(); c.moveTo(x, padT + ih); c.lineTo(x, padT + ih + 5); c.stroke();
      c.fillText(String(t), x, padT + ih + 16);
    }
    c.textAlign = 'right';
    for (const [l, lab] of L_TICKS) {
      const p = M.project({ temperature: M.BOUNDS.maxTemperature, luminosity: l });
      const y = Y(p.y);
      c.strokeStyle = 'rgba(150,170,255,.35)';
      c.beginPath(); c.moveTo(padL - 5, y); c.lineTo(padL, y); c.stroke();
      c.fillText(lab, padL - 8, y);
    }
  }
  /* 轴标题 */
  c.fillStyle = '#aab9e8';
  c.font = fs(D.axis) + 'px ' + UI_FONT;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(dName === 'compact' ? '温度（左热 → 右冷）' : '表面温度 / K（左热 → 右冷）', padL + iw / 2, cssH - Math.max(13, padB * 0.35));
  c.save();
  c.translate(dName === 'compact' ? 15 : 18, padT + ih / 2);
  c.rotate(-Math.PI / 2);
  c.fillText(dName === 'compact' ? '光度（下暗 → 上亮）' : '光度 L/L☉（下暗 → 上亮）', 0, 0);
  c.restore();

  /* 图内内容（裁剪到绘图区） */
  c.save();
  c.beginPath(); c.rect(padL, padT, iw, ih); c.clip();

  const progress = s.progress;
  const showRadiusLines = dName === 'expanded' || s.showRadius === true ||
    (dName === 'compact' && progress && progress.spectral && progress.spectral.every(Boolean));
  const radiusLabels = dName !== 'compact';

  /* 比较星的半径高亮集合 */
  let radiusHi = null;
  if (s.comparison && s.comparison.kind === 'radius' && Array.isArray(s.comparison.stars)) {
    radiusHi = new Set();
    for (const st of s.comparison.stars) {
      let best = RADII[0], bd = Infinity;
      try {
        const r = M.radiusOf({ temperature: st.temperature, luminosity: st.luminosity });
        for (const R of RADII) { const d = Math.abs(Math.log10(r) - Math.log10(R)); if (d < bd) { bd = d; best = R; } }
        radiusHi.add(best);
      } catch { /* 无效数据忽略高亮 */ }
    }
  }
  if (showRadiusLines) radiusLines(c, M, X, Y, padL, padT, iw, ih, D, scale, radiusLabels, radiusHi);

  /* 区域（超巨/巨星/白矮） */
  const hitRegions = [];
  M.regions.forEach((R, i) => {
    const tMid = Math.sqrt(R.temperature[0] * R.temperature[1]);
    const lMid = Math.sqrt(R.luminosity[0] * R.luminosity[1]);
    const pa = M.project({ temperature: R.temperature[1], luminosity: lMid });
    const pb = M.project({ temperature: R.temperature[0], luminosity: lMid });
    const pc = M.project({ temperature: tMid, luminosity: R.luminosity[1] });
    const pd = M.project({ temperature: tMid, luminosity: R.luminosity[0] });
    const cx = (X(pa.x) + X(pb.x)) / 2, cy = (Y(pc.y) + Y(pd.y)) / 2;
    const rx = Math.abs(X(pb.x) - X(pa.x)) / 2, ry = Math.abs(Y(pd.y) - Y(pc.y)) / 2;
    const done = progress && progress.lum && progress.lum[i];
    const isTarget = s.target && s.target.kind === 'region' && s.target.index === i;
    c.save();
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (done || isTarget) {
      c.fillStyle = 'rgba(255,215,80,' + (isTarget ? 0.22 : 0.16) + ')';
      c.fill();
      c.strokeStyle = 'rgba(255,215,80,.8)'; c.lineWidth = isTarget ? 2 : 1.6;
      c.setLineDash([]);
    } else {
      c.strokeStyle = 'rgba(255,215,80,.18)'; c.lineWidth = 1;
      c.setLineDash([3, 4]);
    }
    c.stroke();
    c.restore();
    hitRegions.push({ index: i, cx, cy, rx, ry });
  });

  /* 主序带 */
  const msPts = M.spectral.map(sp => {
    const p = M.project({ temperature: sp.temperature, luminosity: sp.luminosity });
    return [X(p.x), Y(p.y)];
  });
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = 'rgba(160,180,255,.20)'; c.lineWidth = dName === 'compact' ? 6 : 9;
  c.beginPath(); msPts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
  c.strokeStyle = 'rgba(205,220,255,.45)'; c.lineWidth = dName === 'compact' ? 2 : 3;
  c.beginPath(); msPts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
  if (dName !== 'compact') {
    /* 主序带标签：置于带中部下方；若与比较星（甲/乙）角标区域冲突则省略 */
    const a = msPts[0], b = msPts[msPts.length - 1];
    const lx = (a[0] + b[0]) / 2 - iw * 0.16, ly = (a[1] + b[1]) / 2 + ih * 0.12;
    let collide = false;
    if (s.comparison && Array.isArray(s.comparison.stars)) {
      for (const st of s.comparison.stars) {
        try {
          const p = M.project({ temperature: st.temperature, luminosity: st.luminosity });
          if (Math.hypot(X(p.x) - lx, Y(p.y) - ly) < 56) { collide = true; break; }
        } catch { /* 忽略无效比较星 */ }
      }
    }
    if (!collide) {
      c.fillStyle = 'rgba(150,165,215,.55)';
      c.font = fs(D.region) + 'px ' + UI_FONT;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('主序带', lx, ly);
    }
  }

  /* 演化链 */
  drawEvolution(c, M, X, Y, iw, ih, D, s, fs);

  /* 太阳锚点 */
  const sunP = M.project({ temperature: M.SUN.temperature, luminosity: M.SUN.luminosity });
  const sx = X(sunP.x), sy = Y(sunP.y);
  c.strokeStyle = 'rgba(255,215,80,.9)'; c.lineWidth = 1.5;
  c.beginPath(); c.arc(sx, sy, 5, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#ffd84d';
  c.beginPath(); c.arc(sx, sy, 2, 0, Math.PI * 2); c.fill();
  if (D.sun) {
    if (radiusHi) {
      c.save();
      c.setLineDash([4, 3]);
      c.strokeStyle = 'rgba(255,215,80,.85)'; c.lineWidth = 1.8;
      c.beginPath(); c.arc(sx, sy, 9, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    c.fillStyle = 'rgba(255,220,120,.9)';
    c.font = fs(D.region) + 'px ' + UI_FONT;
    c.textAlign = 'left'; c.textBaseline = 'bottom';
    c.fillText('太阳', sx + 7, sy - 3);
  }

  /* 光谱点 */
  const hitPoints = [];
  M.spectral.forEach((sp, i) => {
    const p = M.project({ temperature: sp.temperature, luminosity: sp.luminosity });
    const x = X(p.x), y = Y(p.y);
    const lit = progress && progress.spectral && progress.spectral[i];
    const isTarget = s.target && s.target.kind === 'spectral' && s.target.index === i;
    if (lit || isTarget) {
      c.fillStyle = 'rgba(255,255,255,.10)';
      c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill();
      c.fillStyle = sp.color;
      c.beginPath(); c.arc(x, y, D.dotLit, 0, Math.PI * 2); c.fill();
    } else {
      c.fillStyle = 'rgba(120,130,170,.55)';
      c.beginPath(); c.arc(x, y, D.dot, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = lit ? '#e8eeff' : '#8898c6';
    c.font = 'bold ' + fs(D.key) + 'px ' + UI_FONT;
    c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText(sp.id, x, y + (dName === 'compact' ? 8 : 10));
    hitPoints.push({ index: i, x, y, r: Math.max(13, D.dotLit + 8) });
  });

  /* 区域标签 */
  c.textAlign = 'center'; c.textBaseline = 'middle';
  M.regions.forEach((R, i) => {
    const m = R.marker || { temperature: Math.sqrt(R.temperature[0] * R.temperature[1]), luminosity: Math.sqrt(R.luminosity[0] * R.luminosity[1]) };
    const p = M.project(m);
    const done = progress && progress.lum && progress.lum[i];
    c.fillStyle = done ? 'rgba(255,220,120,.95)' : 'rgba(255,220,120,.5)';
    c.font = 'bold ' + fs(D.region) + 'px ' + UI_FONT;
    const tag = classTag(R.classification);
    c.fillText(R.name + (tag ? ' ' + tag : ''), X(p.x), Y(p.y));
  });

  /* 本关目标标记 */
  if (s.target && !s.animation) {
    let tx = null, ty = null, tr = 12;
    if (s.target.kind === 'spectral' && M.spectral[s.target.index]) {
      const sp = M.spectral[s.target.index];
      const p = M.project({ temperature: sp.temperature, luminosity: sp.luminosity });
      tx = X(p.x); ty = Y(p.y);
    } else if (s.target.kind === 'region' && M.regions[s.target.index]) {
      const m = M.regions[s.target.index].marker;
      const p = M.project(m);
      tx = X(p.x); ty = Y(p.y); tr = 14;
    } else if (s.target.kind === 'evolution' && M.evolution[s.target.chain] && M.evolution[s.target.chain].stages[s.target.stage]) {
      const st = M.evolution[s.target.chain].stages[s.target.stage];
      const q = M.evolution[s.target.chain].points[st.pointIndex];
      const p = M.project(q);
      tx = X(p.x); ty = Y(p.y);
    }
    if (tx !== null) {
      c.save();
      c.setLineDash([5, 4]);
      c.strokeStyle = 'rgba(255,215,80,.9)'; c.lineWidth = 1.6;
      c.beginPath(); c.arc(tx, ty, tr, 0, Math.PI * 2); c.stroke();
      c.restore();
      c.fillStyle = '#ffd84d';
      c.font = 'bold ' + fs(D.key + 1) + 'px ' + UI_FONT;
      c.textAlign = 'center'; c.textBaseline = 'top';
      c.fillText('▼ 本关目标', clamp(tx, padL + 34, padL + iw - 34), Math.min(ty + tr + 4, padT + ih - 14));
    }
  }

  /* 比较星（甲/乙） */
  let oob = false;
  if (s.comparison && Array.isArray(s.comparison.stars)) {
    const stars = s.comparison.stars;
    /* 参考虚线：先画线，再画星 */
    for (const st of stars) {
      let p;
      try { p = M.project({ temperature: st.temperature, luminosity: st.luminosity }); }
      catch { continue; }
      if (!p.inside) continue;
      c.save();
      c.setLineDash([3, 4]);
      c.strokeStyle = 'rgba(255,255,255,.38)'; c.lineWidth = 1;
      c.beginPath();
      c.moveTo(X(p.x), Y(p.y)); c.lineTo(X(p.x), padT + ih);
      c.moveTo(X(p.x), Y(p.y)); c.lineTo(padL, Y(p.y));
      c.stroke();
      c.restore();
    }
    for (const st of stars) {
      let p;
      try { p = M.project({ temperature: st.temperature, luminosity: st.luminosity }); }
      catch { continue; }
      const label = String(st.label || '星');
      if (!p.inside) {
        /* 合法越界：夹到边缘示意，不假装在图内有效 */
        oob = true;
        const ex = clamp(X(p.x), padL + 6, padL + iw - 6);
        const ey = clamp(Y(p.y), padT + 6, padT + ih - 6);
        c.strokeStyle = 'rgba(200,210,240,.85)'; c.lineWidth = 1.5;
        c.setLineDash([2, 3]);
        c.beginPath(); c.arc(ex, ey, 6, 0, Math.PI * 2); c.stroke();
        c.setLineDash([]);
        c.fillStyle = '#ff8d80';
        c.font = fs(D.note) + 'px ' + UI_FONT;
        c.textAlign = 'center'; c.textBaseline = 'top';
        c.fillText('超出图幅', ex, ey + 10);
      } else {
        const x = X(p.x), y = Y(p.y);
        c.fillStyle = 'rgba(255,255,255,.14)';
        c.beginPath(); c.arc(x, y, 11, 0, Math.PI * 2); c.fill();
        c.fillStyle = starColor(M, st.temperature);
        c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(x, y, 8.5, 0, Math.PI * 2); c.stroke();
      }
      /* 文字角标（不依赖颜色区分甲乙） */
      const bx = p.inside ? X(p.x) : clamp(X(p.x), padL + 6, padL + iw - 6);
      const by = p.inside ? Y(p.y) : clamp(Y(p.y), padT + 6, padT + ih - 6);
      const cf = fs(D.key);
      c.font = 'bold ' + cf + 'px ' + UI_FONT;
      const cw = Math.max(22, c.measureText(label).width + 10), ch = cf + 8;
      let cx = bx + 12, cy = by - ch - 10;
      if (cx + cw > padL + iw - 2) cx = bx - cw - 12;
      if (cy < padT + 2) cy = by + 12;
      c.fillStyle = 'rgba(233,238,255,.96)';
      roundRect(c, cx, cy, cw, ch, 6); c.fill();
      c.strokeStyle = 'rgba(140,160,255,.6)'; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#0a0c1e';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(label, cx + cw / 2, cy + ch / 2 + 0.5);
    }
  }

  c.restore(); /* 结束绘图区裁剪 */

  /* 顶部说明 */
  c.fillStyle = '#93a2d8';
  c.font = fs(D.note) + 'px ' + UI_FONT;
  c.textAlign = 'left'; c.textBaseline = 'middle';
  /* 顶部说明：坐标为真实物理对数刻度，示意的是数据点/路径（教学近似），不否认坐标本身 */
  let note = '教学示意数据 · 对数坐标';
  if (s.comparison) note = '教学示意数据 · 甲/乙 为练习示意星';
  if (oob) note += '（部分对象超出范围，已在边缘示意）';
  c.fillText(note, padL, Math.max(11, padT * 0.42));

  /* 命中几何（CSS 像素） */
  geom.set(canvas, { cssW, cssH, points: hitPoints, regions: hitRegions });
}

/* ---------- 命中检测（复用渲染几何） ---------- */
function hitTest (canvas, clientX, clientY) {
  if (!(canvas instanceof HTMLCanvasElement)) return null;
  if (typeof clientX !== 'number' || typeof clientY !== 'number' || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
  const g = geom.get(canvas);
  if (!g) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const lx = (clientX - rect.left) * (g.cssW / rect.width);
  const ly = (clientY - rect.top) * (g.cssH / rect.height);
  let best = null, bestD = Infinity;
  for (const p of g.points) {
    const d = Math.hypot(lx - p.x, ly - p.y);
    if (d <= p.r && d < bestD) { bestD = d; best = { kind: 'spectral', index: p.index }; }
  }
  if (best) return best;
  for (const r of g.regions) {
    const dx = (lx - r.cx) / (r.rx + 4), dy = (ly - r.cy) / (r.ry + 4);
    if (dx * dx + dy * dy <= 1) return { kind: 'region', index: r.index };
  }
  return null;
}

window.StellarHRDiagram = { render, hitTest };
})();
