/* ============================================================
   星链祖玛 · 赫罗图读图练习层 StellarHRPractice
   独立对话层：管理本次练习 session、焦点与背景 inert。
   只消费 StellarHRModel / StellarHRLearning / StellarHRDiagram；
   不读写游戏分数、存档、点亮或解锁。
   ============================================================ */
(() => {
'use strict';

function learning () {
  const L = window.StellarHRLearning;
  if (!L) throw new Error('StellarHRLearning 未加载（需先加载 js/hr-learning.js）');
  return L;
}
function diagram () {
  const D = window.StellarHRDiagram;
  if (!D) throw new Error('StellarHRDiagram 未加载（需先加载 js/hr-diagram.js）');
  return D;
}
function model () {
  const M = window.StellarHRModel;
  if (!M) throw new Error('StellarHRModel 未加载（需先加载 js/hr-model.js）');
  return M;
}

const SUP = { '-1': '⁻¹', '-2': '⁻²', '-3': '⁻³', '-4': '⁻⁴', '-5': '⁻⁵', '-6': '⁻⁶' };
function fmtT (t) { return Math.round(t).toLocaleString('zh-CN') + ' K'; }
function fmtL (l) {
  if (l >= 1000) return Math.round(l).toLocaleString('zh-CN') + ' L☉';
  if (l >= 10) return Math.round(l) + ' L☉';
  if (l >= 0.01) return (+l.toFixed(2)) + ' L☉';
  const e = Math.round(Math.log10(l));
  return (SUP[String(e)] || '10^' + e) + ' L☉';
}

/* 图表文字摘要：只陈述图上证据（数值与方位），不替学生下结论 */
function describeComparison (question) {
  const M = model();
  const stars = (question.stars || []).slice(0, 3);
  if (!stars.length) return '';
  const parts = stars.map(st => {
    let v = '';
    try {
      const p = M.project({ temperature: st.temperature, luminosity: st.luminosity });
      v = p.inside
        ? `${st.label}星 T≈${fmtT(st.temperature)}、L=${fmtL(st.luminosity)}`
        : `${st.label}星超出图幅（图中以边缘标记示意）`;
    } catch { v = `${st.label}星数据无效`; }
    return v;
  });
  let rel = '';
  if (stars.length === 2) {
    let pa, pb;
    try {
      pa = M.project({ temperature: stars[0].temperature, luminosity: stars[0].luminosity });
      pb = M.project({ temperature: stars[1].temperature, luminosity: stars[1].luminosity });
    } catch { pa = pb = null; }
    if (pa && pb && pa.inside && pb.inside) {
      const [a, b] = stars.map(s => s.label);
      if (Math.abs(pa.x - pb.x) < 0.02) rel = `${a}星与${b}星左右位置几乎相同（横坐标相近）`;
      else rel = pa.x < pb.x ? `${a}星在${b}星左侧` : `${b}星在${a}星左侧`;
      if (Math.abs(pa.y - pb.y) >= 0.02) rel += pa.y < pb.y ? `，且${a}星更靠上` : `，且${b}星更靠上`;
      else rel += '，两星高度相近';
      rel += '。';
    }
  }
  let tail = '横轴左热右冷，纵轴下暗上亮。';
  if (question.kind === 'radius') tail += '图中金色虚线为等半径线（同一条线上的恒星半径相同）。';
  return '读图：' + parts.join('；') + '。' + rel + tail;
}

let mounted = null;

function mount (options) {
  if (mounted) return mounted; /* 防止重复挂载（集成层与测试层各自调用时共用一个控制器） */
  const opts = options || {};
  const layer = document.getElementById('hrPractice');
  const openBtn = document.getElementById('hrOpenBtn');
  if (!layer) throw new Error('缺少 #hrPractice 对话层容器');
  const canvas = document.getElementById('hrPracticeCanvas');
  const closeBtn = document.getElementById('hrPracticeClose');
  const nextBtn = document.getElementById('hrPracticeNext');
  const promptEl = document.getElementById('hrPrompt');
  const choicesEl = document.getElementById('hrChoices');
  const feedbackEl = document.getElementById('hrFeedback');
  const statsEl = document.getElementById('hrPracticeStats');
  const summaryEl = document.getElementById('hrChartSummary');
  const kindBtns = [...layer.querySelectorAll('[data-hr-kind]')];

  const state = {
    open: false, session: null, snap: null, baseScene: {},
    savedFocus: null, savedInert: []
  };

  function renderChart (question) {
    const scene = Object.assign({}, state.baseScene, {
      density: 'expanded',
      comparison: { kind: question.kind, stars: question.stars },
      showRadius: state.baseScene.showRadius === true || question.kind === 'radius'
    });
    diagram().render(canvas, scene);
  }

  /* 作答后的界面标记：选项禁用 + 正确/所选标记 + 反馈文案。
     重开对话框时由 applySnapshot 对已作答快照复用同一逻辑，避免状态被静默重置。 */
  function markAnswered (snap) {
    const q = snap.question;
    const btns = [...choicesEl.querySelectorAll('button')];
    btns.forEach(b => { b.disabled = true; });
    btns.forEach(b => {
      if (b.dataset.hrAnswer === q.correctChoiceId) b.classList.add('right');
      else if (b.dataset.hrAnswer === snap.selectedChoiceId) b.classList.add('wrong');
    });
    feedbackEl.textContent = (snap.correct ? '回答正确。' : '再想想：正确答案已标出。') + (q.explanation || '');
  }

  function applySnapshot (snap) {
    state.snap = snap;
    const q = snap.question;
    kindBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hrKind === q.kind)));
    promptEl.textContent = q.prompt;
    choicesEl.textContent = '';
    q.choices.forEach((ch, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hr-choice';
      b.dataset.hrAnswer = ch.id;
      const key = document.createElement('span');
      key.className = 'hr-key';
      key.setAttribute('aria-hidden', 'true');
      key.textContent = String(i + 1);
      const tx = document.createElement('span');
      tx.className = 'hr-choice-text';
      tx.textContent = ch.text;
      b.append(key, tx);
      choicesEl.appendChild(b);
    });
    feedbackEl.textContent = '';
    statsEl.textContent = `本次答对 ${snap.totals.correct} / 已答 ${snap.totals.answered}`;
    if (snap.answered) markAnswered(snap);
    renderChart(q);
    const summary = describeComparison(q);
    summaryEl.textContent = summary;
    canvas.setAttribute('aria-label', '练习用赫罗图。' + summary);
  }

  function answer (choiceId) {
    if (!state.snap || state.snap.answered) return;
    applySnapshot(state.session.answer(choiceId));
    if (nextBtn) nextBtn.focus();
  }

  function next (kind) {
    applySnapshot(state.session.next(kind));
  }

  /* ---------- 打开 / 关闭 ---------- */
  function open (trigger) {
    if (state.open) return;
    state.open = true;
    state.savedFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const parent = layer.parentElement;
    state.savedInert = parent ? [...parent.children].filter(el => el !== layer).map(el => ({ el, was: el.inert })) : [];
    state.savedInert.forEach(({ el }) => { el.inert = true; });
    try { state.baseScene = opts.getScene ? opts.getScene() : {}; }
    catch { state.baseScene = {}; }
    if (!state.baseScene || typeof state.baseScene !== 'object') state.baseScene = {};
    /* 会话为页面级生命周期：首次打开创建，关闭重开沿用同一会话与当前题目，
       只有页面刷新才会重置（spec：本次练习统计跨开关保留）。 */
    if (!state.session) state.session = learning().createSession();
    layer.classList.remove('hidden');
    applySnapshot(state.session.snapshot());
    /* 初始焦点落在题型栏（主操作），不落在答案上，防止 Enter 误答 */
    const first = layer.querySelector('[data-hr-kind]');
    if (first) first.focus();
    if (typeof opts.onOpen === 'function') opts.onOpen(trigger);
  }

  function close () {
    if (!state.open) return;
    state.open = false;
    layer.classList.add('hidden');
    state.savedInert.forEach(({ el, was }) => { el.inert = was; });
    state.savedInert = [];
    const back = (state.savedFocus && state.savedFocus.isConnected && state.savedFocus !== document.body)
      ? state.savedFocus : document.getElementById('hrOpenBtn');
    if (back) back.focus();
    state.savedFocus = null;
    if (typeof opts.onClose === 'function') opts.onClose();
  }

  /* ---------- 事件 ---------- */
  if (openBtn) openBtn.addEventListener('click', () => open('sidebar'));
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (nextBtn) nextBtn.addEventListener('click', () => next());
  kindBtns.forEach(b => b.addEventListener('click', () => next(b.dataset.hrKind)));

  layer.addEventListener('click', e => {
    const a = e.target.closest('[data-hr-answer]');
    if (a) { answer(a.dataset.hrAnswer); return; }
  });

  const focusables = () => [...layer.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(el => el.offsetParent !== null || el.getClientRects().length > 0);

  layer.addEventListener('keydown', e => {
    if (!state.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const f = focusables();
      if (!f.length) return;
      const idx = f.indexOf(document.activeElement);
      let ni;
      if (idx === -1) ni = e.shiftKey ? f.length - 1 : 0;
      else ni = (idx + (e.shiftKey ? -1 : 1) + f.length) % f.length;
      f[ni].focus();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    if (e.key >= '1' && e.key <= '3') {
      if (!state.snap || state.snap.answered) return;
      const btns = [...choicesEl.querySelectorAll('button')];
      const b = btns[+e.key - 1];
      if (b) { e.preventDefault(); e.stopPropagation(); answer(b.dataset.hrAnswer); }
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      e.stopPropagation();
      next();
    }
  });

  window.addEventListener('resize', () => {
    if (state.open && state.snap) {
      try { renderChart(state.snap.question); } catch { /* 忽略重绘失败 */ }
    }
  });

  mounted = { open, close, isOpen: () => state.open };
  return mounted;
}

window.StellarHRPractice = { mount };
})();
