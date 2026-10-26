'use strict';
// 任务2 UI 测试：真实 Chrome + CDP，屏蔽 js/game.js 防止游戏重复挂载。
// 只依赖真实生产模块 js/hr-model.js / js/hr-learning.js / js/hr-diagram.js / js/hr-practice.js：
// 缺失或损坏时本套件应直接失败，不在测试内复制生产逻辑。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { launch } = require('./browser-helper.cjs');

const root = path.resolve(__dirname, '..');
const shotsDir = path.join(root, '.superpowers/sdd/2026-10-25-hr-learning-loop/shots');

/* ---------- 工具 ---------- */
let h;
test.before(async () => {
  h = await launch();
  await h.call('Network.enable');
  /* 只屏蔽 js/game.js：组件测试手动 mount 生产 Practice，避免集成层重复挂载 */
  await h.call('Network.setBlockedURLs', { urls: [h.base + '/js/game.js', '*://*/js/game.js'] });
});
test.after(async () => { if (h) await h.close(); });


async function goto (width = 1280, height = 720, dpr = 1) {
  await h.navigate(h.base + '/', width, height, dpr);
  await h.evaluate(`(() => {
    window.__counts = { open: 0, close: 0, scenes: 0 };
    window.__ctrl = window.StellarHRPractice.mount({
      getScene () { window.__counts.scenes++; return { density: 'expanded' }; },
      onOpen () { window.__counts.open++; },
      onClose () { window.__counts.close++; }
    });
    return true;
  })()`);
}

async function key (k, opts = {}) {
  const map = {
    Tab: { code: 'Tab', vk: 9 },
    Escape: { code: 'Escape', vk: 27 },
    r: { code: 'KeyR', vk: 82 },
    R: { code: 'KeyR', vk: 82 }
  };
  const info = map[k] || { code: 'Digit' + k, vk: k.charCodeAt(0) };
  await h.call('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: info.code,
    windowsVirtualKeyCode: info.vk, modifiers: opts.shift ? 8 : 0 });
  await h.call('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: info.code,
    windowsVirtualKeyCode: info.vk, modifiers: opts.shift ? 8 : 0 });
}

const PAGE = {
  openState: () => h.evaluate(`(() => ({
    isOpen: window.__ctrl.isOpen(),
    layerHidden: document.getElementById('hrPractice').classList.contains('hidden'),
    openCount: window.__counts.open, closeCount: window.__counts.close,
    siblingsInert: [...document.getElementById('stage').children]
      .filter(c => c.id !== 'hrPractice').map(c => c.inert),
    activeInLayer: !!document.activeElement.closest('#hrPractice'),
    activeIsAnswer: !!(document.activeElement.dataset && document.activeElement.dataset.hrAnswer),
    activeId: document.activeElement.id || document.activeElement.dataset.hrKind || document.activeElement.dataset.hrAnswer || ''
  }))()`),
  stats: () => h.evaluate(`(() => {
    const t = document.getElementById('hrPracticeStats').textContent;
    const m = t.match(/本次答对\\s*(\\d+)\\s*\\/\\s*已答\\s*(\\d+)/);
    return m ? { correct: +m[1], answered: +m[2], raw: t } : { raw: t };
  })()`),
  questionText: () => h.evaluate(`(() => ({
    prompt: document.getElementById('hrPrompt').textContent,
    summary: document.getElementById('hrChartSummary').textContent,
    aria: document.getElementById('hrPracticeCanvas').getAttribute('aria-label') || '',
    pressed: [...document.querySelectorAll('[data-hr-kind]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.hrKind),
    choices: [...document.querySelectorAll('#hrChoices button')].map(b => ({ id: b.dataset.hrAnswer, disabled: b.disabled, cls: b.className })),
    feedback: document.getElementById('hrFeedback').textContent,
    activeId: document.activeElement.id || document.activeElement.dataset.hrKind || ''
  }))()`)
};

/* ---------- 测试 ---------- */

test('侧栏入口存在且可见（桌面与移动）', async () => {
  await goto(1280, 720);
  const blocked = await h.evaluate(`({
    suma: typeof window.__suma,
    overlayLen: document.getElementById('overlay').innerHTML.length,
    model: typeof window.StellarHRModel,
    learning: typeof window.StellarHRLearning,
    diagram: typeof window.StellarHRDiagram,
    practice: typeof window.StellarHRPractice,
    kinds: typeof window.StellarHRLearning === 'object' ? JSON.stringify(window.StellarHRLearning.kinds) : ''
  })`);
  assert.equal(blocked.suma, 'undefined', 'js/game.js 应被屏蔽（组件测试手动 mount）');
  assert.equal(blocked.overlayLen, 0, '游戏覆盖层应为空（game.js 未运行）');
  assert.equal(blocked.model, 'object', '生产模块 js/hr-model.js 必须真实加载');
  assert.equal(blocked.learning, 'object', '生产模块 js/hr-learning.js 必须真实加载');
  assert.equal(blocked.diagram, 'object', '生产模块 js/hr-diagram.js 必须真实加载');
  assert.equal(blocked.practice, 'object', '生产模块 js/hr-practice.js 必须真实加载');
  assert.deepEqual(JSON.parse(blocked.kinds), ['temperature', 'luminosity', 'radius'], 'kinds 契约值');
  const desk = await h.evaluate(`(() => {
    const b = document.getElementById('hrOpenBtn');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { inPanel: !!b.closest('.learning-panel'), tag: b.tagName, text: b.textContent.trim(),
      w: r.width, h: r.height, visible: r.width > 0 && r.height > 0 };
  })()`);
  assert.ok(desk, '缺少 #hrOpenBtn');
  assert.equal(desk.tag, 'BUTTON');
  assert.ok(desk.inPanel, '入口应在学习栏内');
  assert.ok(desk.visible && desk.h >= 40, '桌面入口应有足够尺寸');
  assert.ok(/赫罗图|读图练习/.test(desk.text), '入口文案应含“赫罗图/读图练习”');

  await goto(390, 844);
  const mob = await h.evaluate(`(() => {
    const b = document.getElementById('hrOpenBtn'); const r = b.getBoundingClientRect();
    return { w: r.width, h: r.height, inPanel: !!b.closest('.learning-panel') };
  })()`);
  assert.ok(mob.w > 0 && mob.h >= 40, '移动端入口可见且可触控');
});

test('公共 mount：打开/关闭回调各一次，背景 inert 与焦点恢复', async () => {
  await goto(1280, 720);
  await h.evaluate(`document.getElementById('hrOpenBtn').click()`);
  let s = await PAGE.openState();
  assert.equal(s.isOpen, true, 'isOpen 应为 true');
  assert.equal(s.openCount, 1, 'onOpen 恰好一次');
  assert.equal(s.layerHidden, false, '层应显示');
  assert.ok(s.siblingsInert.length >= 3 && s.siblingsInert.every(v => v === true), '对话框之外的同级内容应 inert');
  assert.ok(s.activeInLayer && !s.activeIsAnswer, '初始焦点在层内且不在答案按钮上');

  await h.evaluate(`document.getElementById('hrPracticeClose').click()`);
  s = await PAGE.openState();
  assert.equal(s.isOpen, false);
  assert.equal(s.closeCount, 1, 'onClose 恰好一次');
  assert.equal(s.layerHidden, true);
  assert.ok(s.siblingsInert.every(v => v === false), '关闭应恢复背景 inert');
  const back = await h.evaluate(`document.activeElement.id`);
  assert.equal(back, 'hrOpenBtn', '焦点应返回侧栏入口');

  await h.evaluate(`document.getElementById('hrOpenBtn').click()`);
  await h.evaluate(`document.getElementById('hrPracticeClose').click()`);
  s = await PAGE.openState();
  assert.equal(s.openCount, 2, '再次打开仍各计一次');
  assert.equal(s.closeCount, 2);
});

test('Tab / Shift+Tab 不逃逸，Esc 关闭并返回焦点', async () => {
  await goto(1280, 720);
  await h.evaluate(`document.getElementById('hrOpenBtn').click()`);
  const activeId = () => h.evaluate(`document.activeElement.closest('#hrPractice')
    ? (document.activeElement.id || document.activeElement.dataset.hrKind || document.activeElement.dataset.hrAnswer || 'anon')
    : 'ESCAPED'`);
  const nFocus = await h.evaluate(`[...document.getElementById('hrPractice').querySelectorAll('button:not([disabled])')].length`);
  assert.ok(nFocus >= 7, '层内应有多个可聚焦元素');

  const start = await activeId();
  assert.notEqual(start, 'ESCAPED', '打开后焦点应在层内');
  const seen = [start];
  for (let i = 0; i < nFocus; i++) {
    await key('Tab');
    seen.push(await activeId());
  }
  assert.ok(!seen.includes('ESCAPED'), `Tab 遍历中焦点始终在层内: ${seen.join(',')}`);
  assert.ok(seen.includes('hrPracticeClose') && seen.includes('hrPracticeNext'), 'Tab 应遍历到关闭与换题按钮');
  assert.equal(seen[seen.length - 1], start, 'Tab 一整轮后回到起始焦点');

  await key('Tab', { shift: true });
  assert.notEqual(await activeId(), 'ESCAPED', 'Shift+Tab 后仍在层内');
  assert.equal(await activeId(), seen[seen.length - 2], 'Shift+Tab 应回到循环中的上一个焦点元素');

  await key('Escape');
  const s = await PAGE.openState();
  assert.equal(s.isOpen, false, 'Esc 应关闭');
  assert.equal(await h.evaluate(`document.activeElement.id`), 'hrOpenBtn', 'Esc 后焦点返回入口');
});

test('三类题型：作答反馈、重复作答、换题与统计', async () => {
  await goto(1280, 720);
  await h.evaluate(`document.getElementById('hrOpenBtn').click()`);

  let q = await PAGE.questionText();
  assert.deepEqual(q.pressed, ['temperature'], '初始应为温度题');
  assert.match((await PAGE.stats()).raw, /本次答对\s*0\s*\/\s*已答\s*0/, '初始统计为 0/0');
  assert.ok(q.aria.includes('甲') && q.aria.includes('乙'), '画布摘要应包含甲/乙');
  assert.ok(q.summary.length > 10, '应有图表文字摘要');

  await key('1');
  q = await PAGE.questionText();
  assert.ok(q.choices.every(c => c.disabled), '作答后选项应禁用');
  assert.ok(q.feedback.trim().length > 0, '应有反馈文案');
  let st = await PAGE.stats();
  assert.equal(st.answered, 1, '已答 +1');
  assert.equal(st.correct === 0 || st.correct === 1, true, '本次答对为 0 或 1');
  assert.equal(q.activeId, 'hrPracticeNext', '作答后焦点移到“换一组”');

  await key('1'); await key('2');
  st = await PAGE.stats();
  assert.equal(st.answered, 1, '重复/后续按键不得重复计数');

  const before = await PAGE.questionText();
  await h.evaluate(`document.getElementById('hrPracticeNext').click()`);
  let after = await PAGE.questionText();
  st = await PAGE.stats();
  assert.equal(st.answered, 1, '换题不改统计');
  assert.ok(after.prompt !== before.prompt || after.summary !== before.summary, '换一组必须更换例子');
  assert.ok(after.choices.every(c => !c.disabled), '新题选项应可用');
  assert.equal(after.feedback.trim(), '', '新题反馈应清空');

  await h.evaluate(`document.querySelector('[data-hr-kind="luminosity"]').click()`);
  after = await PAGE.questionText();
  assert.deepEqual(after.pressed, ['luminosity'], '切到光度题');
  st = await PAGE.stats();
  assert.equal(st.answered, 1, '切题型不重置总计');

  const lumChoice = await h.evaluate(`document.querySelector('#hrChoices button').dataset.hrAnswer`);
  await h.evaluate(`document.querySelector('#hrChoices button').click()`);
  st = await PAGE.stats();
  assert.equal(st.answered, 2, '点击选项同样计一次');
  assert.ok(st.correct >= 0);

  await h.evaluate(`document.querySelector('[data-hr-kind="radius"]').click()`);
  after = await PAGE.questionText();
  assert.deepEqual(after.pressed, ['radius'], '切到半径题');
  assert.ok(after.summary.length > 10, '半径题也有图表摘要');

  await h.evaluate(`document.getElementById('hrPracticeClose').click()`);
});

test('页面会话生命周期：关闭重开保留题目/统计/作答状态，刷新后重置', async () => {
  const answeredState = () => h.evaluate(`(() => ({
    prompt: document.getElementById('hrPrompt').textContent,
    summary: document.getElementById('hrChartSummary').textContent,
    feedback: document.getElementById('hrFeedback').textContent,
    stats: document.getElementById('hrPracticeStats').textContent,
    pressed: [...document.querySelectorAll('#hrPractice [data-hr-kind]')]
      .filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.hrKind),
    choices: [...document.querySelectorAll('#hrChoices button')]
      .map(b => ({ id: b.dataset.hrAnswer, disabled: b.disabled, cls: b.className }))
  }))()`);
  const outcomeOf = st => st.choices.some(c => c.cls.includes('wrong')) ? 'wrong' : 'right';

  await goto(1280, 720);
  await h.evaluate(`document.getElementById('hrOpenBtn').click()`);
  await key('1');
  const s1 = await answeredState();
  assert.ok(s1.feedback.trim().length > 0, '作答后应有反馈');
  assert.ok(s1.choices.every(c => c.disabled), '作答后选项禁用');
  assert.ok(s1.choices.some(c => c.cls.includes('right')), '应标出正确答案');

  /* 关闭 → 重开：同一道题、同一统计、同一反馈、同一作答标记 */
  await h.evaluate(`document.getElementById('hrPracticeClose').click()`);
  await h.evaluate(`document.getElementById('hrOpenBtn').click()`);
  const s2 = await answeredState();
  assert.equal(s2.prompt, s1.prompt, '重开应是同一道题');
  assert.equal(s2.summary, s1.summary, '图表摘要保留');
  assert.equal(s2.feedback, s1.feedback, '反馈文案保留');
  assert.equal(s2.stats, s1.stats, '「本次答对 X / 已答 Y」保留');
  assert.deepEqual(s2.pressed, s1.pressed, '题型页签保留');
  assert.deepEqual(s2.choices, s1.choices, '选项禁用与对错标记逐项保留');

  /* 重开后按键/点击不得重复计数 */
  await key('1');
  await key('2');
  await h.evaluate(`document.querySelector('#hrChoices button').click()`);
  assert.equal((await PAGE.stats()).answered, 1, '重开后重复作答不得累计');
  assert.equal((await answeredState()).stats, s1.stats, '统计文本不变');

  /* 覆盖另一种作答结果（对↔错）：换题再答，最多尝试 12 题 */
  const firstOutcome = outcomeOf(s1);
  let s3 = null;
  for (let i = 0; i < 12 && !s3; i++) {
    await h.evaluate(`document.getElementById('hrPracticeNext').click()`);
    await key('1');
    const st = await answeredState();
    if (outcomeOf(st) !== firstOutcome) s3 = st;
  }
  assert.ok(s3, '应在有限换题内覆盖到对/错两种作答结果');
  await h.evaluate(`document.getElementById('hrPracticeClose').click()`);
  await h.evaluate(`document.getElementById('hrOpenBtn').click()`);
  const s4 = await answeredState();
  assert.equal(s4.prompt, s3.prompt, '（另一结果）重开仍是同一道题');
  assert.equal(s4.stats, s3.stats, '（另一结果）统计保留');
  assert.equal(s4.feedback, s3.feedback, '（另一结果）反馈保留');
  assert.deepEqual(s4.choices, s3.choices, '（另一结果）作答标记保留');

  /* R 键换题仍有效，且不清空总计 */
  const beforeR = await answeredState();
  await key('r');
  const afterR = await PAGE.questionText();
  assert.ok(afterR.prompt !== beforeR.prompt || afterR.summary !== beforeR.summary, 'R 键换一组应更换例子');
  assert.ok(afterR.choices.every(c => !c.disabled), '新题选项恢复可用');
  assert.equal(afterR.feedback.trim(), '', '新题反馈清空');
  assert.ok((await PAGE.stats()).answered >= 1, '换题不清空总计');

  /* 页面刷新后会话才重置 */
  await goto(1280, 720);
  await h.evaluate(`document.getElementById('hrOpenBtn').click()`);
  const fresh = await answeredState();
  const fs2 = await PAGE.stats();
  assert.equal(fs2.correct, 0, '刷新后本次答对归零');
  assert.equal(fs2.answered, 0, '刷新后已答归零');
  assert.equal(fresh.feedback.trim(), '', '刷新后无残留反馈');
  assert.ok(fresh.choices.every(c => !c.disabled && !/(right|wrong)/.test(c.cls)), '刷新后选项可用且无对错标记');
});

test('renderer 支持全部场景变体，不修改只读 scene', async () => {
  await goto(1280, 720);
  const result = await h.evaluate(`(() => {
    const D = window.StellarHRDiagram;
    const M = window.StellarHRModel;
    const freeze = o => { if (o && typeof o === 'object') { Object.freeze(o); Object.values(o).forEach(freeze); } return o; };
    const cases = [];
    const mk = (w, hstyle) => {
      const cv = document.createElement('canvas');
      cv.style.cssText = 'width:' + w + 'px;height:' + hstyle + 'px;display:block';
      document.body.appendChild(cv);
      return cv;
    };
    const progress = freeze({ spectral: [1, 1, 0, 0, 0, 0, 0], lum: [1, 0, 0], evo: [[1, 0, 0, 0], [0, 0, 0]] });
    const full = freeze({ spectral: [1, 1, 1, 1, 1, 1, 1], lum: [1, 1, 1], evo: [[1, 1, 1, 1], [1, 1, 1]] });
    const variants = [
      ['默认', {}],
      ['compact', { density: 'compact' }],
      ['standard', { density: 'standard' }],
      ['expanded', { density: 'expanded' }],
      ['target光谱', { density: 'standard', target: { kind: 'spectral', index: 4 }, progress }],
      ['target区域', { density: 'standard', target: { kind: 'region', index: 2 }, progress }],
      ['target演化', { density: 'standard', target: { kind: 'evolution', chain: 0, stage: 3 }, progress }],
      ['半径线', { density: 'standard', showRadius: true, progress: full }],
      ['比较-温度', { density: 'expanded', comparison: { kind: 'temperature', stars: [{ label: '甲', temperature: 20000, luminosity: 1 }, { label: '乙', temperature: 4000, luminosity: 1 }] } }],
      ['比较-光度', { density: 'expanded', comparison: { kind: 'luminosity', stars: [{ label: '甲', temperature: 5772, luminosity: 100 }, { label: '乙', temperature: 5772, luminosity: 1 }] } }],
      ['比较-半径', { density: 'expanded', comparison: { kind: 'radius', stars: [{ label: '甲', temperature: 5772, luminosity: 100 }, { label: '乙', temperature: 5772, luminosity: 1 }] } }],
      ['动画-中段', { density: 'expanded', animation: { chain: 0, stage: 2, fraction: 0.5 }, progress: full }],
      ['动画-起点', { density: 'expanded', animation: { chain: 0, stage: 0, fraction: 0 }, progress: full }],
      ['动画-终点', { density: 'expanded', animation: { chain: 1, stage: 2, fraction: 1 }, progress: full }],
      ['动画-stage1太阳链', { density: 'expanded', animation: { chain: 0, stage: 1, fraction: 0.5 }, progress: full }],
      ['target演化-stage1大质量', { density: 'standard', target: { kind: 'evolution', chain: 1, stage: 1 }, progress }],
      ['动画-stage越界', { density: 'expanded', animation: { chain: 1, stage: 9, fraction: 0.5 }, progress: full }],
      ['越界比较星', { density: 'expanded', comparison: { kind: 'luminosity', stars: [{ label: '甲', temperature: 40000, luminosity: 2e6 }, { label: '乙', temperature: 5772, luminosity: 1 }] } }],
      ['compact全进度', { density: 'compact', progress: full }]
    ];
    const out = [];
    for (const [name, scene] of variants) {
      const frozen = freeze(JSON.parse(JSON.stringify(scene)));
      try {
        const cv = mk(name === 'compact' || name === 'compact全进度' ? 320 : 480, 260);
        D.render(cv, frozen);
        const blank = cv.toDataURL().length < 2000;
        cv.remove();
        out.push({ name, ok: true, blank });
      } catch (err) { out.push({ name, ok: false, err: String(err && err.message || err) }); }
    }
    // 目录完整性与 stage→pointIndex 约定（renderer 依赖 stages[stage].pointIndex，不把 stage 当路径节点）
    const stageIdx = M.evolution.map(ch => ch.stages.map(st => st.pointIndex));
    out.push({ name: 'model-shape', ok: M.spectral.length === 7 && M.regions.length === 3 && M.evolution.length === 2
      && JSON.stringify(stageIdx[0]) === JSON.stringify([0, 2, 4, 6]) && JSON.stringify(stageIdx[1]) === JSON.stringify([0, 2, 4]) });
    return out;
  })()`);
  for (const r of result) {
    assert.ok(r.ok, `场景「${r.name}」渲染失败: ${r.err || ''}`);
    if (r.ok && 'blank' in r) assert.equal(r.blank, false, `场景「${r.name}」不应是空白画布`);
  }
});

test('hitTest 网格扫描：CSS/DPR 下命中全部光谱点与区域', async () => {
  for (const dpr of [1, 2]) {
    await goto(1280, 720, dpr);
    const scan = await h.evaluate(`(() => {
      const D = window.StellarHRDiagram;
      const M = window.StellarHRModel;
      const cv = document.createElement('canvas');
      cv.style.cssText = 'width:520px;height:340px;display:block';
      document.body.appendChild(cv);
      D.render(cv, { density: 'standard' });
      const r = cv.getBoundingClientRect();
      const hits = { spectral: {}, region: {} };
      for (let fx = 0.04; fx <= 0.97; fx += 0.02) {
        for (let fy = 0.04; fy <= 0.97; fy += 0.02) {
          const res = D.hitTest(cv, r.left + fx * r.width, r.top + fy * r.height);
          if (!res) continue;
          const bucket = hits[res.kind];
          const k = String(res.index);
          if (!bucket[k]) bucket[k] = { minFx: fx, minFy: fy };
          else { bucket[k].minFx = Math.min(bucket[k].minFx, fx); bucket[k].minFy = Math.min(bucket[k].minFy, fy); }
        }
      }
      const outside = D.hitTest(cv, r.left - 40, r.top + r.height / 2);
      const inside = D.hitTest(cv, r.left + r.width * 0.5, r.top + r.height * 0.5);
      cv.remove();
      return { spectral: Object.keys(hits.spectral).map(Number).sort((a, b) => a - b).map(i => ({ i, ...hits.spectral[String(i)] })),
        region: Object.keys(hits.region).map(Number).sort((a, b) => a - b).map(i => ({ i, ...hits.region[String(i)] })),
        outside, insideNotNull: inside !== null, dpr: window.devicePixelRatio };
    })()`);
    assert.equal(scan.dpr, dpr, `DPR=${dpr} 应生效`);
    assert.deepEqual(scan.spectral.map(s => s.i), [0, 1, 2, 3, 4, 5, 6], `DPR=${dpr} 七个光谱点全部可命中`);
    assert.deepEqual(scan.region.map(s => s.i), [0, 1, 2], `DPR=${dpr} 三个区域全部可命中`);
    for (let i = 1; i < scan.spectral.length; i++) {
      assert.ok(scan.spectral[i].minFx >= scan.spectral[i - 1].minFx, `DPR=${dpr} 光谱 ${i - 1}→${i} 应从左到右（左热右冷）`);
    }
    assert.ok(scan.spectral[6].minFx - scan.spectral[0].minFx > 0.2, `DPR=${dpr} 光谱点应横向铺开`);
    const fy = { supergiant: scan.region[0].minFy, giant: scan.region[1].minFy, wd: scan.region[2].minFy };
    assert.ok(fy.supergiant < fy.giant && fy.giant < fy.wd, `DPR=${dpr} 超巨星在上、巨星居中、白矮星在下`);
    assert.equal(scan.outside, null, `DPR=${dpr} 画布外应返回 null`);
  }
});

test('hitTest 确定性与未渲染画布', async () => {
  await goto(1280, 720);
  const prep = await h.evaluate(`(() => {
    const D = window.StellarHRDiagram;
    const cv = document.createElement('canvas');
    cv.style.cssText = 'width:520px;height:340px;display:block';
    document.body.appendChild(cv);
    D.render(cv, { density: 'standard' });
    const r = cv.getBoundingClientRect();
    let gPoint = null;
    for (let fx = 0.04; fx <= 0.97 && !gPoint; fx += 0.02) {
      for (let fy = 0.04; fy <= 0.97; fy += 0.02) {
        const res = D.hitTest(cv, r.left + fx * r.width, r.top + fy * r.height);
        if (res && res.kind === 'spectral' && res.index === 4) { gPoint = { x: r.left + fx * r.width, y: r.top + fy * r.height }; break; }
      }
    }
    window.__gPoint = gPoint;
    const fresh = document.createElement('canvas');
    fresh.style.cssText = 'width:200px;height:150px';
    document.body.appendChild(fresh);
    const freshHit = D.hitTest(fresh, fresh.getBoundingClientRect().left + 100, fresh.getBoundingClientRect().top + 75);
    fresh.remove();
    return { gPointFound: !!gPoint, freshHit, rect: { left: r.left, top: r.top, w: r.width, h: r.height } };
  })()`);
  assert.ok(prep.gPointFound, '应能找到 G 型光谱点命中点');
  assert.equal(prep.freshHit, null, '未渲染画布 hitTest 应返回 null');
  const stable = await h.evaluate(`(() => {
    const D = window.StellarHRDiagram;
    const cv = [...document.querySelectorAll('canvas')].find(c => c.style.width === '520px');
    const out = [];
    for (let i = 0; i < 5; i++) out.push(JSON.stringify(D.hitTest(cv, window.__gPoint.x, window.__gPoint.y)));
    return [...new Set(out)];
  })()`);
  assert.equal(stable.length, 1, '同一坐标重复 hitTest 结果应一致');
  assert.match(stable[0], /"kind":"spectral","index":4/);
});

test('响应式布局与截图（1280/1024/390/844×390）', async () => {
  fs.mkdirSync(shotsDir, { recursive: true });
  const shots = [];
  const shot = async name => {
    const img = await h.call('Page.captureScreenshot', { format: 'png' });
    const p = path.join(shotsDir, name);
    fs.writeFileSync(p, Buffer.from(img.data, 'base64'));
    shots.push(p);
    return p;
  };

  // 桌面两栏
  for (const [w, ht, name] of [[1280, 720, 'desktop-1280x720.png'], [1024, 720, 'narrow-desktop-1024x720.png']]) {
    await goto(w, ht);
    await h.evaluate(`document.getElementById('hrOpenBtn').click()`);
    const m = await h.evaluate(`(() => {
      const body = document.querySelector('#hrPractice .hr-body');
      const cols = getComputedStyle(body).gridTemplateColumns.split(' ').filter(Boolean);
      const cv = document.getElementById('hrPracticeCanvas').getBoundingClientRect();
      const dlg = document.querySelector('#hrPractice .hr-dialog');
      return { cols: cols.length, chartW: cv.width, dlgW: dlg.getBoundingClientRect().width,
        noOverflow: dlg.scrollWidth <= dlg.clientWidth + 1,
        closeVisible: document.getElementById('hrPracticeClose').getBoundingClientRect().width > 0 };
    })()`);
    assert.equal(m.cols, 2, `${w}px 应为两栏（图表+题目）`);
    assert.ok(m.chartW >= 380, `${w}px 图表宽 ≥380px（实际 ${m.chartW.toFixed(0)}）`);
    assert.ok(m.noOverflow, `${w}px 对话框不得横向溢出`);
    assert.ok(m.dlgW <= 920 + 1, `${w}px 对话框宽 ≤920px`);
    await shot(name);
    await h.evaluate(`document.getElementById('hrPracticeClose').click()`);
  }

  // 移动单栏
  await goto(390, 844);
  await h.evaluate(`document.getElementById('hrOpenBtn').click()`);
  let m = await h.evaluate(`(() => {
    const body = document.querySelector('#hrPractice .hr-body');
    const cols = getComputedStyle(body).gridTemplateColumns.split(' ').filter(Boolean);
    const dlg = document.querySelector('#hrPractice .hr-dialog').getBoundingClientRect();
    const btns = [...document.querySelectorAll('#hrChoices button')];
    return { cols: cols.length, dlgW: dlg.width, layerPos: getComputedStyle(document.getElementById('hrPractice')).position,
      choiceH: Math.min(...btns.map(b => b.getBoundingClientRect().height)),
      choiceW: Math.min(...btns.map(b => b.getBoundingClientRect().width)),
      noOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1 };
  })()`);
  assert.equal(m.cols, 1, '390px 应为单栏');
  assert.ok(m.dlgW <= 390, '对话框不宽于视口');
  assert.ok(m.choiceH >= 40, `选项按钮高 ≥40px（实际 ${m.choiceH}）`);
  assert.ok(m.noOverflow, '移动端无横向溢出');
  await shot('mobile-390x844.png');

  // 短横屏
  await goto(844, 390);
  await h.evaluate(`document.getElementById('hrOpenBtn').click()`);
  m = await h.evaluate(`(() => {
    const layer = document.getElementById('hrPractice');
    const close = document.getElementById('hrPracticeClose').getBoundingClientRect();
    const body = document.querySelector('#hrPractice .hr-body');
    const cv = document.getElementById('hrPracticeCanvas').getBoundingClientRect();
    /* 渲染器 expanded 密度：cssH<300 时 padT=max(24,42*.72)=30、padB=max(38,60*.85)=51 */
    const plotH = Math.round(cv.height) - 30 - 51;
    return { pos: getComputedStyle(layer).position, closeRight: close.right, closeTop: close.top,
      bodyScroll: body.scrollHeight >= body.clientHeight, chartW: Math.round(cv.width), chartH: Math.round(cv.height), plotH };
  })()`);
  assert.equal(m.pos, 'fixed', '844×390 阅读层应为 fixed');
  assert.ok(m.closeRight <= 844 && m.closeTop >= 0, '关闭按钮在视口内可达');
  assert.ok(m.bodyScroll, '内容可滚动');
  assert.ok(m.chartW >= 200 && m.chartH >= 260, '短屏图表高度充足（实测 canvas ' + m.chartW + '×' + m.chartH + '）');
  assert.ok(m.plotH >= 180, '短屏绘图区可用高度充足（实测 plot≈' + m.plotH + 'px，须 ≥180）');
  /* 滚动到操作区后真实点击「换一组」 */
  const act = await h.evaluate(`(() => {
    const body = document.querySelector('#hrPractice .hr-body');
    const btn = document.getElementById('hrPracticeNext');
    const r = btn.getBoundingClientRect();
    const before = { top: r.top, inView: r.top >= 0 && r.bottom <= window.innerHeight };
    btn.scrollIntoView({ block: 'center' });
    const r2 = btn.getBoundingClientRect();
    return { before, after: { top: Math.round(r2.top), inView: r2.top >= 0 && r2.bottom <= window.innerHeight },
      prompt: document.getElementById('hrPrompt').textContent,
      summary: document.getElementById('hrChartSummary').textContent };
  })()`);
  assert.ok(act.after.inView, '「换一组」滚动后进入视口');
  await h.evaluate(`document.getElementById('hrPracticeNext').click()`);
  const afterShort = await PAGE.questionText();
  assert.ok(afterShort.prompt !== act.prompt || afterShort.summary !== act.summary, '短屏滚动后点击「换一组」产生新题');
  console.log('SHORT-VIEWPORT measured: canvas ' + m.chartW + 'x' + m.chartH + ', plot≈' + m.plotH + 'px; nextBtn before-scroll inView=' + act.before.inView + ', after-scroll inView=' + act.after.inView);
  await shot('short-landscape-844x390.png');

  // 记录截图路径供报告
  console.log('SCREENSHOTS:\n' + shots.join('\n'));
});

test('可访问性：语义、aria 与键盘提示', async () => {
  await goto(1280, 720);
  await h.evaluate(`document.getElementById('hrOpenBtn').click()`);
  const a = await h.evaluate(`(() => ({
    role: document.getElementById('hrPractice').getAttribute('role'),
    modal: document.getElementById('hrPractice').getAttribute('aria-modal'),
    labelled: !!document.getElementById('hrPracticeTitle'),
    live: document.getElementById('hrFeedback').getAttribute('aria-live'),
    canvasRole: document.getElementById('hrPracticeCanvas').getAttribute('role'),
    canvasAria: document.getElementById('hrPracticeCanvas').getAttribute('aria-label'),
    groupLabel: document.querySelector('.hr-kinds').getAttribute('aria-label'),
    closeName: document.getElementById('hrPracticeClose').textContent.trim()
  }))()`);
  assert.equal(a.role, 'dialog');
  assert.equal(a.modal, 'true');
  assert.ok(a.labelled && a.live === 'polite' && a.canvasRole === 'img');
  assert.ok(a.canvasAria && a.canvasAria.includes('甲') && a.canvasAria.includes('乙'), '画布 aria-label 含甲乙摘要');
  assert.ok(a.groupLabel, '题型组应有 aria-label');
  assert.ok(a.closeName.includes('关闭'), '关闭按钮有可读名称');
  /* 题型页签必须与 Learning.kinds 完全一致：next(未知题型) 会抛 RangeError，UI 不得产生未知值 */
  const kindsOk = await h.evaluate(`JSON.stringify([...document.querySelectorAll('#hrPractice [data-hr-kind]')].map(b => b.dataset.hrKind).sort()) === JSON.stringify([...window.StellarHRLearning.kinds].sort())`);
  assert.equal(kindsOk, true, 'data-hr-kind 值应与 StellarHRLearning.kinds 一一对应');
  const note = await h.evaluate(`document.querySelector('#hrPractice .hr-note').textContent`);
  assert.ok(/练习不影响/.test(note) && /得分|进度|点亮|解锁/.test(note), '应说明练习不影响游戏进度');
  assert.ok(!/掌握/.test(note), '文案不得把练习说成掌握');
  const stats = (await PAGE.stats()).raw;
  assert.ok(!/掌握/.test(stats), '统计文案不得出现“掌握”');
});
