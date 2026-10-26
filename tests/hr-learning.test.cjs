'use strict';

// 纯练习会话测试：只依赖 Node 内置 test runner 与 js/hr-learning.js。
// 预期答案全部手工写死，不用被测函数计算预期答案。

const test = require('node:test');
const assert = require('node:assert/strict');
const Learning = require('../js/hr-learning.js');

const noRandom = () => 0;

function starEquals(actual, [label, temperature, luminosity]) {
  assert.equal(actual.label, label);
  assert.equal(actual.temperature, temperature);
  assert.equal(actual.luminosity, luminosity);
}

function assertChoiceSet(choices) {
  assert.equal(choices.length, 3);
  assert.deepEqual(
    Array.from(choices.map(c => c.id)).sort(),
    ['a', 'b', 'same']
  );
  for (const choice of choices) {
    assert.equal(typeof choice.text, 'string');
    assert.ok(choice.text.length > 0);
  }
}

test('kinds lists the three question kinds in contract order', () => {
  assert.deepEqual(Learning.kinds, ['temperature', 'luminosity', 'radius']);
});

test('createSession works without options', () => {
  const session = Learning.createSession();
  const snap = session.snapshot();
  assert.equal(snap.question.kind, 'temperature');
  assertChoiceSet(snap.question.choices);
});

test('new session starts with the temperature question and empty totals', () => {
  const session = Learning.createSession({ random: noRandom });
  const snap = session.snapshot();
  assert.equal(snap.question.kind, 'temperature');
  assert.equal(snap.answered, false);
  assert.equal(snap.selectedChoiceId, null);
  assert.equal(snap.correct, null);
  assert.deepEqual(snap.totals, { answered: 0, correct: 0 });
  assert.equal(typeof snap.question.id, 'string');
  assert.ok(snap.question.id.length > 0);
  assert.ok(snap.question.prompt.includes('温度'));
  assert.ok(snap.question.explanation.length > 0);
  assert.equal(snap.question.stars.length, 2);
  assert.equal(snap.question.stars[0].label, '甲');
  assert.equal(snap.question.stars[1].label, '乙');
  starEquals(snap.question.stars[0], ['甲', 20000, 1]);
  starEquals(snap.question.stars[1], ['乙', 4000, 1]);
  // 手工预期：T=20000 K 比 T=4000 K 更热
  assert.equal(snap.question.correctChoiceId, 'a');
  assertChoiceSet(snap.question.choices);
});

test('temperature: swapped stars flip the correct choice', () => {
  const session = Learning.createSession({ random: noRandom });
  session.next(); // 第 2 个变体：交换甲乙
  const q = session.snapshot().question;
  assert.equal(q.kind, 'temperature');
  starEquals(q.stars[0], ['甲', 4000, 1]);
  starEquals(q.stars[1], ['乙', 20000, 1]);
  assert.equal(q.correctChoiceId, 'b');
});

test('temperature: equal temperature answers same', () => {
  const session = Learning.createSession({ random: noRandom });
  session.next();
  session.next(); // 第 3 个变体：温度相同、光度不同
  const q = session.snapshot().question;
  assert.equal(q.stars[0].temperature, q.stars[1].temperature);
  assert.equal(q.stars[0].temperature, 20000);
  assert.notEqual(q.stars[0].luminosity, q.stars[1].luminosity);
  assert.equal(q.correctChoiceId, 'same');
});

test('answering correctly updates the snapshot and totals once', () => {
  const session = Learning.createSession({ random: noRandom });
  const after = session.answer('a');
  assert.equal(after.answered, true);
  assert.equal(after.selectedChoiceId, 'a');
  assert.equal(after.correct, true);
  assert.deepEqual(after.totals, { answered: 1, correct: 1 });

  // 重复提交不改统计
  const repeat = session.answer('b');
  assert.equal(repeat.answered, true);
  assert.equal(repeat.selectedChoiceId, 'a');
  assert.equal(repeat.correct, true);
  assert.deepEqual(repeat.totals, { answered: 1, correct: 1 });

  const again = session.answer('same');
  assert.deepEqual(again.totals, { answered: 1, correct: 1 });
});

test('answering wrongly records an incorrect result', () => {
  const session = Learning.createSession({ random: noRandom });
  const after = session.answer('b');
  assert.equal(after.answered, true);
  assert.equal(after.selectedChoiceId, 'b');
  assert.equal(after.correct, false);
  assert.deepEqual(after.totals, { answered: 1, correct: 0 });
});

test('invalid choice ids never change state or totals', () => {
  const session = Learning.createSession({ random: noRandom });
  for (const bad of ['x', 'A', 'same ', '', null, undefined, 1, ['a']]) {
    const snap = session.answer(bad);
    assert.equal(snap.answered, false, `answer(${JSON.stringify(bad)}) should be rejected`);
    assert.equal(snap.selectedChoiceId, null);
    assert.equal(snap.correct, null);
    assert.deepEqual(snap.totals, { answered: 0, correct: 0 });
  }
  // 已作答后，无效选项同样被拒绝
  session.answer('a');
  const afterAnswer = session.answer('zzz');
  assert.deepEqual(afterAnswer.totals, { answered: 1, correct: 1 });
});

test('next() rotates temperature variants deterministically and always changes the example', () => {
  const session = Learning.createSession({ random: noRandom });
  const seen = [];
  const ids = [];
  for (let i = 0; i < 7; i++) {
    const q = session.snapshot().question;
    seen.push(q.stars.map(s => `${s.temperature}/${s.luminosity}`).join('|'));
    ids.push(q.id);
    session.next();
  }
  // 任何相邻两次例子都不同（换题确实改变例子或甲乙位置）
  for (let i = 1; i < seen.length; i++) {
    assert.notEqual(seen[i], seen[i - 1]);
  }
  // 3 个变体确定性轮换：第 4 题回到第 1 题的例子
  assert.equal(seen[3], seen[0]);
  // 题目 id 各不相同
  assert.equal(new Set(ids).size, ids.length);
});

test('next(kind) switches kind without resetting totals and keeps it as default', () => {
  const session = Learning.createSession({ random: noRandom });
  session.answer('a'); // 温度题答对
  const afterSwitch = session.next('luminosity');
  assert.equal(afterSwitch.question.kind, 'luminosity');
  assert.equal(afterSwitch.answered, false);
  assert.equal(afterSwitch.selectedChoiceId, null);
  assert.equal(afterSwitch.correct, null);
  assert.deepEqual(afterSwitch.totals, { answered: 1, correct: 1 });
  // next() 默认沿用当前题型
  const afterDefault = session.next();
  assert.equal(afterDefault.question.kind, 'luminosity');
});

test('next rejects unknown kinds', () => {
  const session = Learning.createSession({ random: noRandom });
  assert.throws(() => session.next('bogus'), RangeError);
  assert.throws(() => session.next('TEMPERATURE'), RangeError);
  // 抛错后原题与统计不受影响
  const snap = session.snapshot();
  assert.equal(snap.question.kind, 'temperature');
  assert.deepEqual(snap.totals, { answered: 0, correct: 0 });
});

test('luminosity questions: base, swapped and equal variants', () => {
  const session = Learning.createSession({ random: noRandom });
  let q = session.next('luminosity').question;
  starEquals(q.stars[0], ['甲', 5772, 100]);
  starEquals(q.stars[1], ['乙', 5772, 1]);
  // 手工预期：L=100 L☉ 比 L=1 L☉ 光度更大
  assert.equal(q.correctChoiceId, 'a');
  // 解释要区分光度与视亮度
  assert.ok(q.explanation.includes('视亮度'), 'luminosity explanation must mention apparent brightness');

  q = session.next('luminosity').question;
  starEquals(q.stars[0], ['甲', 5772, 1]);
  starEquals(q.stars[1], ['乙', 5772, 100]);
  assert.equal(q.correctChoiceId, 'b');

  q = session.next('luminosity').question;
  // 光度相同、温度不同
  assert.equal(q.stars[0].luminosity, q.stars[1].luminosity);
  assert.equal(q.stars[0].temperature, 8500);
  assert.equal(q.stars[1].temperature, 4500);
  assert.equal(q.correctChoiceId, 'same');
  assert.ok(q.explanation.includes('视亮度'));
});

test('radius questions: base, swapped and equal variants', () => {
  const session = Learning.createSession({ random: noRandom });
  let q = session.next('radius').question;
  starEquals(q.stars[0], ['甲', 5772, 100]);
  starEquals(q.stars[1], ['乙', 5772, 1]);
  // 手工预期：同温度 L=100 对应 R=10，L=1 对应 R=1
  assert.equal(q.correctChoiceId, 'a');
  assert.ok(q.explanation.includes('R☉'), 'radius explanation should reference radius values');

  q = session.next('radius').question;
  starEquals(q.stars[0], ['甲', 5772, 1]);
  starEquals(q.stars[1], ['乙', 5772, 100]);
  assert.equal(q.correctChoiceId, 'b');

  q = session.next('radius').question;
  // 半径相同：(5772,1) 与 (11544,16)
  starEquals(q.stars[0], ['甲', 5772, 1]);
  starEquals(q.stars[1], ['乙', 11544, 16]);
  assert.equal(q.correctChoiceId, 'same');
  assert.ok(q.explanation.includes('R☉'));
});

test('totals accumulate across kinds and variants', () => {
  const session = Learning.createSession({ random: noRandom });
  session.answer('a'); // 温度题答对
  session.next('luminosity');
  session.answer('a'); // 光度题答对
  session.next('radius');
  session.answer('b'); // 半径题答错（正确为 a）
  const snap = session.snapshot();
  assert.deepEqual(snap.totals, { answered: 3, correct: 2 });
});

test('snapshots are isolated from internal session state', () => {
  const session = Learning.createSession({ random: noRandom });
  const first = session.snapshot();
  // 调用者肆意改写快照
  first.question.stars[0].temperature = 999999;
  first.question.stars.push({ label: '丙', temperature: 1, luminosity: 1 });
  first.question.choices.length = 0;
  first.question.correctChoiceId = 'same';
  first.question.prompt = '';
  first.question.explanation = '';
  first.question.id = 'hacked';
  first.totals.answered = 123;
  first.totals.correct = 456;
  first.answered = true;
  first.correct = true;
  first.selectedChoiceId = 'same';

  const second = session.snapshot();
  starEquals(second.question.stars[0], ['甲', 20000, 1]);
  assert.equal(second.question.stars.length, 2);
  assert.equal(second.question.choices.length, 3);
  assertChoiceSet(second.question.choices);
  assert.equal(second.question.correctChoiceId, 'a');
  assert.ok(second.question.prompt.length > 0);
  assert.ok(second.question.explanation.length > 0);
  assert.notEqual(second.question.id, 'hacked');
  assert.equal(second.answered, false);
  assert.equal(second.selectedChoiceId, null);
  assert.equal(second.correct, null);
  assert.deepEqual(second.totals, { answered: 0, correct: 0 });

  // 会话仍按真实题目工作
  const answered = session.answer('a');
  assert.equal(answered.correct, true);
  assert.deepEqual(answered.totals, { answered: 1, correct: 1 });

  // answer() 返回的快照同样隔离
  answered.totals.correct = 999;
  answered.question.correctChoiceId = 'b';
  assert.deepEqual(session.snapshot().totals, { answered: 1, correct: 1 });
  assert.equal(session.snapshot().question.correctChoiceId, 'a');
});

test('independent sessions do not share state', () => {
  const a = Learning.createSession({ random: noRandom });
  const b = Learning.createSession({ random: noRandom });
  a.answer('a');
  a.next();
  const bSnap = b.snapshot();
  assert.equal(bSnap.answered, false);
  assert.deepEqual(bSnap.totals, { answered: 0, correct: 0 });
  starEquals(bSnap.question.stars[0], ['甲', 20000, 1]);
});

test('random is only used for choice display order', () => {
  const low = Learning.createSession({ random: () => 0 });
  const high = Learning.createSession({ random: () => 0.999999 });
  const lowIds = low.snapshot().question.choices.map(c => c.id);
  const highIds = high.snapshot().question.choices.map(c => c.id);
  assertChoiceSet(low.snapshot().question.choices);
  assertChoiceSet(high.snapshot().question.choices);
  // 极端 random 产生不同展示顺序，证明 random 只影响排序
  assert.notDeepEqual(lowIds, highIds);
  // 相同 random 源得到确定的顺序
  const again = Learning.createSession({ random: () => 0 });
  assert.deepEqual(again.snapshot().question.choices.map(c => c.id), lowIds);
  // random 不影响题目内容与正确答案
  assert.equal(low.snapshot().question.correctChoiceId, 'a');
  assert.equal(high.snapshot().question.correctChoiceId, 'a');
  starEquals(low.snapshot().question.stars[0], ['甲', 20000, 1]);
  starEquals(high.snapshot().question.stars[0], ['甲', 20000, 1]);
});

test('temperature explanations state actual left/right positions', () => {
  const session = Learning.createSession({ random: noRandom });
  const base = session.snapshot().question;
  assert.ok(base.explanation.includes('甲 T=20000 K 位于图中更左侧'), base.explanation);
  assert.ok(base.explanation.includes('乙 T=4000 K 位于更右侧'), base.explanation);

  const swapped = session.next().question;
  assert.ok(swapped.explanation.includes('乙 T=20000 K 位于图中更左侧'), swapped.explanation);
  assert.ok(swapped.explanation.includes('甲 T=4000 K 位于更右侧'), swapped.explanation);

  const equal = session.next().question;
  assert.ok(equal.explanation.includes('位置相同'), equal.explanation);
  assert.ok(equal.explanation.includes('温度一样高'), equal.explanation);
});

test('luminosity explanations state actual higher/lower positions', () => {
  const session = Learning.createSession({ random: noRandom });
  const base = session.next('luminosity').question;
  assert.ok(base.explanation.includes('甲 L=100 L☉ 位于图中更高处'), base.explanation);
  assert.ok(base.explanation.includes('乙 L=1 L☉ 位于更下方'), base.explanation);
  assert.ok(base.explanation.includes('视亮度'), base.explanation);

  const swapped = session.next('luminosity').question;
  assert.ok(swapped.explanation.includes('乙 L=100 L☉ 位于图中更高处'), swapped.explanation);
  assert.ok(swapped.explanation.includes('甲 L=1 L☉ 位于更下方'), swapped.explanation);

  const equal = session.next('luminosity').question;
  assert.ok(equal.explanation.includes('位置相同'), equal.explanation);
  assert.ok(equal.explanation.includes('光度一样大'), equal.explanation);
  assert.ok(equal.explanation.includes('视亮度'), equal.explanation);
});

test('radius base/swapped explanations teach same-temperature scaling with concrete ratios', () => {
  const session = Learning.createSession({ random: noRandom });
  const base = session.next('radius').question;
  assert.ok(base.explanation.includes('同温时 L∝R²'), base.explanation);
  assert.ok(base.explanation.includes('光度比 100 → 半径比 √100 = 10'), base.explanation);
  assert.ok(base.explanation.includes('甲 R≈10 R☉'), base.explanation);
  assert.ok(base.explanation.includes('乙 R≈1 R☉'), base.explanation);
  assert.ok(base.explanation.includes('更亮的星就是更大的星'), base.explanation);
  assert.ok(base.explanation.includes('甲的半径更大'), base.explanation);

  const swapped = session.next('radius').question;
  assert.ok(swapped.explanation.includes('同温时 L∝R²'), swapped.explanation);
  assert.ok(swapped.explanation.includes('光度比 100 → 半径比 √100 = 10'), swapped.explanation);
  assert.ok(swapped.explanation.includes('乙 R≈10 R☉'), swapped.explanation);
  assert.ok(swapped.explanation.includes('甲 R≈1 R☉'), swapped.explanation);
  assert.ok(swapped.explanation.includes('乙的半径更大'), swapped.explanation);
});

test('radius equal variant keeps the general formula explanation', () => {
  const session = Learning.createSession({ random: noRandom });
  session.next('radius');
  session.next('radius');
  const equal = session.next('radius').question;
  assert.ok(equal.explanation.includes('L∝R²T⁴'), equal.explanation);
  assert.ok(equal.explanation.includes('R☉'), equal.explanation);
  assert.ok(equal.explanation.includes('相同'), equal.explanation);
});
