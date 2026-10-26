'use strict';
// 任务3 集成回归：file:// 下完整走一遍
// 「游玩 → H 冻结 → 温度题错答解释 → 换题答对 → 光度/半径 → 关闭同进度 →
//   暂停来源开关 → 阅读中失焦安全 → 刷新原存档」的可复现演示闭环。
// 只加载真实生产页面与现有 CDP harness，不新增测试专用生产接口。
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch } = require('./browser-helper.cjs');

let browser;
before(async () => { browser = await launch(); });
after(async () => { if (browser) await browser.close(); });
const run = expression => browser.evaluate(expression);

async function open(query = '', width = 1280, height = 720, dpr = 1) {
  await browser.navigate(browser.fileURL + query, width, height, dpr);
}
async function key(k) {
  const map = {
    h: { code: 'KeyH', vk: 72 }, Escape: { code: 'Escape', vk: 27 }, r: { code: 'KeyR', vk: 82 },
    1: { code: 'Digit1', vk: 49 }, p: { code: 'KeyP', vk: 80 },
  };
  const info = map[k] || { code: 'Digit' + k, vk: k.charCodeAt(0) };
  const ev = { key: k, code: info.code, windowsVirtualKeyCode: info.vk };
  await browser.call('Input.dispatchKeyEvent', { type: 'keyDown', ...ev });
  await browser.call('Input.dispatchKeyEvent', { type: 'keyUp', ...ev });
}
const layerOpen = () => run(`!document.getElementById('hrPractice').classList.contains('hidden')`);

/* 有界换题重试：作答一次，未命中期望结果就换一组再答（≤ maxTries 题） */
async function answerOnce() {
  await key('1');
  return run(`(() => ({ correct: document.getElementById('hrFeedback').textContent.startsWith('回答正确'),
    feedback: document.getElementById('hrFeedback').textContent,
    marked: !!document.querySelector('#hrChoices button.right'),
    disabled: [...document.querySelectorAll('#hrChoices button')].every(b => b.disabled) }))()`);
}
async function answerUntil(wantCorrect, maxTries = 10) {
  let last;
  for (let i = 0; i < maxTries; i++) {
    last = await answerOnce();
    if (last.correct === wantCorrect) return last;
    await key('r');
  }
  return last;
}

test('file:// demo loop: freeze → practice → restore → pause source → blur safe → original save', async () => {
  // 预置存档：读图练习全程不得改写它
  await open();
  await run(`localStorage.setItem('stellar-zuma-save-v1', JSON.stringify({ spectral: [1,1,0,0,0,0,0], lum: [0,1,0], evo: [[0,0,0,0],[0,0,0]], best: 1234, maxLevel: 9 }))`);
  await open('?level=9&go');
  await run('__advanceFrames(30)');
  const before = await run(`({state:__suma.state(), level:__suma.level(), score:__suma.score(), front:__suma.frontDist()})`);
  assert.equal(before.state, 'playing');

  // H 冻结：星链/得分/状态全部不变
  await key('h');
  assert.equal(await layerOpen(), true);
  await run('__advanceFrames(240)');
  assert.deepEqual(await run(`({state:__suma.state(), level:__suma.level(), score:__suma.score(), front:__suma.frontDist()})`), before);

  // 温度题：换题直至一次错答，验证解释反馈
  const wrong = await answerUntil(false);
  assert.ok(!wrong.correct && wrong.marked && wrong.disabled, '错答后应标出正确答案并锁定选项');
  assert.ok(wrong.feedback.length > 20, '错答反馈必须包含解释');

  // R 换题后作答正确
  await key('r');
  const right = await answerUntil(true);
  assert.ok(right.correct, '换题后应能答对并给出解释');

  // 光度 / 半径题各作答一次
  await run(`document.querySelector('[data-hr-kind="luminosity"]').click()`);
  const lum = await answerOnce();
  assert.ok(lum.disabled, '光度题作答生效');
  await run(`document.querySelector('[data-hr-kind="radius"]').click()`);
  const rad = await answerOnce();
  assert.ok(rad.disabled, '半径题作答生效');
  assert.match(await run(`document.getElementById('hrPracticeStats').textContent`), /已答\s*[1-9]/);

  // 关闭：同进度回到游玩
  await key('Escape');
  assert.equal(await layerOpen(), false);
  assert.deepEqual(await run(`({state:__suma.state(), level:__suma.level(), score:__suma.score(), front:__suma.frontDist()})`), before);
  await run('__advanceFrames(90)');
  assert.notEqual(await run('__suma.frontDist()'), before.front, '关闭后星链恢复前进');

  // 暂停来源：暂停中开关阅读，仍回到暂停
  await key('p');
  await key('h');
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'paused');
  await run(`document.querySelector('[data-action="resume"]').click()`);
  assert.equal(await run('__suma.state()'), 'playing');

  // 失焦安全：阅读中失焦，关闭后保持暂停而非意外续玩
  await key('h');
  await run(`window.dispatchEvent(new Event('blur'))`);
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'paused');
  await run(`document.querySelector('[data-action="resume"]').click()`);
  assert.equal(await run('__suma.state()'), 'playing');

  // 刷新后原存档不变
  const save = await run(`localStorage.getItem('stellar-zuma-save-v1')`);
  await open('');
  assert.equal(await run(`localStorage.getItem('stellar-zuma-save-v1')`), save);
  assert.equal(await run(`!!document.querySelector('[data-action="continue"]')`), true);
  assert.equal(await run(`__suma.progress().maxLevel`), 9);
  await run('localStorage.clear()');
});
