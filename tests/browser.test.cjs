const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { launch } = require('./browser-helper.cjs');

let browser;
before(async () => { browser = await launch(); });
after(async () => { if (browser) await browser.close(); });
const run = expression => browser.evaluate(expression);
async function open(query = '', width = 1280, height = 720, dpr = 1, protocol = 'http') {
  await browser.navigate((protocol === 'file' ? browser.fileURL : browser.base + '/') + query, width, height, dpr);
}
async function clearLevel(level = 1, width = 1280, height = 720, dpr = 1) {
  await open(`?level=${level}&go`, width, height, dpr);
  await run(`__suma.setBudget(4); __suma.addCollected(4); __suma.chainRef().length = 0; __advanceFrames(60)`);
  assert.equal(await run('__suma.state()'), 'levelclear');
}
async function key(k, opts = {}) {
  const map = {
    ' ': { code: 'Space', vk: 32 }, Escape: { code: 'Escape', vk: 27 }, Enter: { code: 'Enter', vk: 13 },
    h: { code: 'KeyH', vk: 72 }, H: { code: 'KeyH', vk: 72 }, p: { code: 'KeyP', vk: 80 },
    f: { code: 'KeyF', vk: 70 }, x: { code: 'KeyX', vk: 88 }, r: { code: 'KeyR', vk: 82 },
    1: { code: 'Digit1', vk: 49 }, 2: { code: 'Digit2', vk: 50 },
  };
  const info = map[k] || { code: 'Digit' + k, vk: k.charCodeAt(0) };
  const ev = { key: k, code: info.code, windowsVirtualKeyCode: info.vk };
  await browser.call('Input.dispatchKeyEvent', { type: 'keyDown', ...ev });
  if (!opts.hold) await browser.call('Input.dispatchKeyEvent', { type: 'keyUp', ...ev });
}
async function clickAt(x, y) {
  await browser.call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await browser.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
async function clickCenter(selector) {
  const p = await run(`(() => { const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null; el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  assert.ok(p, 'missing element ' + selector);
  await clickAt(p.x, p.y);
}
const layerOpen = () => run(`!document.getElementById('hrPractice').classList.contains('hidden')`);
const canvasSig = id => run(`(() => { const cv = document.getElementById(${JSON.stringify(id)});
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) >>> 0; return h; })()`);
const findHitPoint = (kind, index) => run(`(() => {
  const cv = document.getElementById('hrTitle');
  cv.scrollIntoView({ block: 'center' });
  const r = cv.getBoundingClientRect();
  // CDP 将点击坐标取整为整数像素:只在整数坐标同样命中时才返回,避免椭圆/圆点边缘被取整挤出。
  for (let fx = 0.03; fx <= 0.97; fx += 0.008) for (let fy = 0.03; fy <= 0.97; fy += 0.008) {
    const hit = window.StellarHRDiagram.hitTest(cv, r.left + fx * r.width, r.top + fy * r.height);
    if (hit && hit.kind === ${JSON.stringify(kind)} && hit.index === ${index}) {
      const x = Math.round(r.left + fx * r.width), y = Math.round(r.top + fy * r.height);
      const snapped = window.StellarHRDiagram.hitTest(cv, x, y);
      if (snapped && snapped.kind === ${JSON.stringify(kind)} && snapped.index === ${index}) return { x, y };
    }
  }
  return null; })()`);
const layout = `(() => {
  const bounds = id => {
    const el = document.querySelector(id), r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom,
      shown: getComputedStyle(el).display !== 'none' };
  };
  return { stage: bounds('#stage'), game: bounds('#game'), score: bounds('.hud-left'),
    goal: bounds('.hud-right'), hr: bounds('.hud-hr'), info: bounds('#starInfo') };
})()`;
const overlap = (a, b) => a.shown && b.shown && Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1
  && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1;

test('HTTP serves the exact local HTML, stylesheet and all game scripts', async () => {
  for (const file of ['index.html', 'css/style.css', 'js/game.js', 'js/hr-model.js', 'js/hr-diagram.js', 'js/hr-learning.js', 'js/hr-practice.js']) {
    const res = await fetch(browser.base + '/' + file);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), await readFile(path.join(__dirname, '..', file), 'utf8'));
  }
});

test('continuing a saved evolution level synchronizes level number, content and state', async () => {
  await open();
  await run(`localStorage.setItem('stellar-zuma-save-v1', JSON.stringify({maxLevel: 11, best: 300}))`);
  await open();
  const result = await run(`document.querySelector('[data-action="continue"]').click();
    ({level: __suma.level(), part: __suma.gamePart(), state: __suma.state(), title: document.querySelector('.level-title')?.textContent})`);
  await run('localStorage.clear()');
  assert.equal(result.level, 11);
  assert.equal(result.part, 3);
  assert.equal(result.state, 'intro');
  assert.match(result.title, /G 型主序星/);
});

test('H-R map selection starts and labels the selected G-star level via real hit testing', async () => {
  await open();
  await run('localStorage.clear()');
  // litCount 门：未点亮时真实命中点也不解锁，只提示
  const locked = await findHitPoint('spectral', 4);
  assert.ok(locked, '共享 renderer 应能在标题图上命中 G 型光谱点');
  await clickAt(locked.x, locked.y);
  assert.equal(await run('__suma.state()'), 'title');
  assert.equal(await run(`document.getElementById('hrHint').classList.contains('warn')`), true);
  // 解锁后用真实指针点 G 点 → 第 5 关 G 型课
  await run(`localStorage.setItem('stellar-zuma-save-v1', JSON.stringify({spectral:[1,1,1,1,1,1,1],lum:[1,1,1]}))`);
  await open();
  const g = await findHitPoint('spectral', 4);
  await clickAt(g.x, g.y);
  const result = await run(`({level:__suma.level(), featured:__suma.featuredType(), label:document.getElementById('level').textContent,
    state:__suma.state(), title:document.querySelector('.level-title')?.textContent})`);
  assert.equal(result.level, 5);
  assert.equal(result.featured, 4);
  assert.equal(result.label, '第 5 关');
  assert.equal(result.state, 'intro');
  assert.match(result.title, /收集 G 型恒星/);
  // 区域命中映射：巨星区 → 第 9 关（第二部分）
  await open();
  const giant = await findHitPoint('region', 1);
  assert.ok(giant, '应能命中巨星区域');
  await clickAt(giant.x, giant.y);
  assert.equal(await run('__suma.level()'), 9);
  assert.equal(await run('__suma.gamePart()'), 2);
  // 空白处点击不开始任何关卡
  await open();
  const empty = await run(`(() => { const cv = document.getElementById('hrTitle');
    cv.scrollIntoView({ block: 'center' }); const r = cv.getBoundingClientRect();
    for (let fy = 0.02; fy <= 0.98; fy += 0.02) {
      const x = Math.round(r.left + r.width * 0.5), y = Math.round(r.top + fy * r.height);
      if (!window.StellarHRDiagram.hitTest(cv, x, y)) return { x, y };
    } return null; })()`);
  assert.ok(empty, '应存在未命中任何目标的空白点');
  await clickAt(empty.x, empty.y);
  assert.equal(await run('__suma.state()'), 'title');
  await run('localStorage.clear()');
});

test('a quiz must be answered before Next is visible or accepts activation', async () => {
  await clearLevel();
  const result = await run(`(() => {
    const b = document.getElementById('clearNext');
    const hidden = getComputedStyle(b).display === 'none';
    b.click();
    return {hidden, level:__suma.level(), state:__suma.state()};
  })()`);
  assert.deepEqual(result, { hidden: true, level: 1, state: 'levelclear' });
  await run(`document.querySelector('[data-quiz]').click(); document.getElementById('clearNext').click()`);
  assert.equal(await run('__suma.level()'), 2);
});

test('reloading cannot bypass the quiz via saved next-level progress', async () => {
  await open(); await run('localStorage.clear()');
  await clearLevel();
  assert.equal(await run(`JSON.parse(localStorage.getItem('stellar-zuma-save-v1')).maxLevel`), 1);
  await run(`document.querySelector('[data-quiz]').click()`);
  assert.equal(await run(`JSON.parse(localStorage.getItem('stellar-zuma-save-v1')).maxLevel`), 2);
});

test('pause preserves remaining power-up time', async () => {
  await open('?level=9&go');
  await run(`__suma.forceEffect(1); __advanceFrames(1); window.dispatchEvent(new KeyboardEvent('keydown',{key:'p'})); __advanceFrames(420)`);
  assert.equal(await run('__suma.state()'), 'paused');
  assert.equal(await run('__suma.effectFlags().slow'), true);
});

test('focus loss releases acceleration even if keyup occurs in another app', async () => {
  await open('?level=1&go');
  await run(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'})); window.dispatchEvent(new Event('blur'))`);
  assert.equal(await run(`document.getElementById('ffBtn').classList.contains('on')`), false);
});

test('completing collection takes precedence over reaching the black hole in the same frame', async () => {
  await open('?level=1&go');
  await run(`__suma.setBudget(4); const chain = __suma.chainRef(); chain.length=0;
    chain.push({type:2,dist:1000044}, ...[0,1,2,3].map(i=>({type:0,dist:1000000-i*44})));
    __advanceFrames(1)`);
  assert.equal(await run('__suma.state()'), 'clearing');
});

test('collecting extra blue supergiants cannot skip the red-supergiant learning phase', async () => {
  await open('?level=8&go');
  await run(`const chain=__suma.chainRef(); chain.length=0;
    chain.push(...[0,1,2,3,4,5,6,7].map(i=>({type:0,special:0,dist:352-i*44}))); __advanceFrames(1)`);
  assert.equal(await run('__suma.state()'), 'playing');
  assert.equal(await run('__suma.collected()'), 4, 'one color may only fill its share of the two-color goal');
  await run(`__suma.chainRef().push(...[0,1,2,3].map(i=>({type:6,special:0,dist:132-i*44}))); __advanceFrames(1)`);
  assert.equal(await run('__suma.state()'), 'clearing');
});

test('the planetary-nebula lesson can select a question about its own stage', async () => {
  await open('?level=13&go');
  await run(`Math.random=()=>0; __suma.setBudget(4); __suma.addCollected(4); __suma.chainRef().length=0; __advanceFrames(60)`);
  assert.match(await run(`document.querySelector('.quiz .desc').textContent`), /行星状星云/);
});

test('partial saves preserve all curriculum slots instead of truncating progress arrays', async () => {
  await open();
  await run(`localStorage.setItem('stellar-zuma-save-v1', JSON.stringify({spectral:[1],lum:[],evo:[[1]],best:-5}))`);
  await open();
  const progress = await run('__suma.progress()');
  await run('localStorage.clear()');
  assert.deepEqual(progress.spectral, [1,0,0,0,0,0,0]);
  assert.deepEqual(progress.lum, [0,0,0]);
  assert.deepEqual(progress.evo, [[1,0,0,0],[0,0,0]]);
  assert.equal(progress.best, 0);
});

test('title and lesson cards stay readable and expose overflow by scrolling', async () => {
  for (const [w,h] of [[1280,720],[1440,600],[390,844],[320,568],[844,390]]) {
    for (const query of ['', '?level=8', '?level=11']) {
      await open(query, w, h, 2);
      const result = await run(`(() => {
        const el=document.querySelector('.card'), r=el.getBoundingClientRect();
        el.scrollTop=el.scrollHeight;
        const button=el.querySelector('button.primary'), b=button.getBoundingClientRect();
        const x=b.x+b.width/2, y=b.y+b.height/2;
        return {top:r.top, bottom:r.bottom, left:r.left, right:r.right, x, y,
          reachable:button.contains(document.elementFromPoint(x,y)),
          accessible:el.scrollHeight<=el.clientHeight+1 || ['auto','scroll'].includes(getComputedStyle(el).overflowY)};
      })()`);
      assert.ok(result.top >= 0 && result.bottom <= h && result.left >= 0 && result.right <= w,
        `${w}x${h} ${query || 'title'} is clipped: ${JSON.stringify(result)}`);
      assert.ok(result.accessible, 'overflow content is unreachable');
      assert.ok(result.reachable, 'primary action cannot be reached after scrolling');
      await browser.call('Input.dispatchMouseEvent', {type:'mousePressed',x:result.x,y:result.y,button:'left',clickCount:1});
      await browser.call('Input.dispatchMouseEvent', {type:'mouseReleased',x:result.x,y:result.y,button:'left',clickCount:1});
      assert.equal(await run('__suma.state()'), query ? 'playing' : 'intro');
    }
  }
});

test('HUD panels do not overlap in narrow or short desktop windows', async () => {
  for (const [w,h] of [[1440,900],[1280,720],[1024,720],[1440,600],[900,600],[390,844]]) {
    await open('?level=8&go', w, h, 2);
    const rects = await run(layout);
    for (const [a,b] of [['score','goal'],['score','hr'],['goal','info'],['hr','info']]) {
      assert.ok(!overlap(rects[a], rects[b]), `${w}x${h}: ${a} overlaps ${b}: ${JSON.stringify(rects)}`);
    }
    assert.ok(rects.stage.right <= w+1, 'stage exceeds viewport width');
    assert.ok(Math.abs(rects.game.width / rects.game.height - 1) < .01, 'square playfield distorted');
  }
});

test('small-screen score and progress content stays inside its panel', async () => {
  await open('?level=8&go',390,844,2);
  const failures = await run(`(() => {
    const failures=[];
    for(const parent of document.querySelectorAll('.hud-left,.hud-right')) {
      const r=parent.getBoundingClientRect();
      for(const el of parent.querySelectorAll('.bar,.pill,.stat')) {
        const c=el.getBoundingClientRect();
        if(c.right>r.right+1 || c.left<r.left-1) failures.push(el.className);
      }
    }
    return failures;
  })()`);
  assert.deepEqual(failures, []);
});

test('file/HTTP and DPR 1/2 have identical CSS geometry and correct logical render scaling', async () => {
  let reference;
  for (const protocol of ['file','http']) for (const dpr of [1,2]) {
    await open('?level=1&go', 1280, 720, dpr, protocol);
    await run('__advanceFrames(1)');
    const rects = await run(layout);
    if (!reference) reference = rects;
    else assert.deepEqual(rects, reference, `${protocol}, DPR ${dpr}`);
    const canvas = await run(`(() => { const c=document.getElementById('game'), t=c.getContext('2d').getTransform();
      return {width:c.width,height:c.height,scaleX:t.a,scaleY:t.d}; })()`);
    assert.equal(canvas.width / canvas.scaleX, 800);
    assert.equal(canvas.height / canvas.scaleY, 800);
  }
});

test('the teaching column stays visible and separate from the game on desktop and mobile', async () => {
  for (const [w,h] of [[1440,900],[1280,720],[900,600],[390,844]]) {
    await open('?level=11&go',w,h,2);
    const rects=await run(layout);
    assert.ok(rects.hr.shown && rects.info.shown, `${w}: teaching content is hidden`);
    assert.ok(!overlap(rects.game,rects.hr) && !overlap(rects.game,rects.info), `${w}: teaching content covers the game`);
    assert.ok(!overlap(rects.game,rects.score) && !overlap(rects.game,rects.goal), `${w}: HUD covers the game`);
  }
});

test('pointer aiming is mapped through the square camera to world coordinates', async () => {
  await open('?level=1&go',1280,720,2);
  const result=await run(`(() => {
    __suma.chainRef().length=0;
    const cv=document.getElementById('game'), c=cv.getContext('2d'), calls=[], original=c.drawImage;
    c.drawImage=function(...args) { calls.push(args); return original.apply(this,args); };
    const r=cv.getBoundingClientRect();
    cv.dispatchEvent(new PointerEvent('pointermove',{clientX:r.x+r.width*.7,clientY:r.y+r.height*.3}));
    __advanceFrames(1);
    c.drawImage=original;
    const ball=calls.at(-1), t=c.getTransform();
    return {x:ball[1]+ball[3]/2,y:ball[2]+ball[4]/2,cameraX:-t.e/t.a};
  })()`);
  assert.equal(result.cameraX,320);
  // The pointer denotes world (880,240), relative to launcher (720,415).
  assert.ok(Math.abs((result.x-720)*(-175)-(result.y-415)*160)<.01, JSON.stringify(result));
});

/* ================= 任务3：阅读练习接入回归 ================= */

test('reading opened by H from playing freezes chain, skills and time; closing resumes', async () => {
  await open('?level=9&go');
  await run(`__suma.forceEffect(1); __advanceFrames(1)`);
  const before = await run(`({front:__suma.frontDist(), tail:__suma.tailDist(), slow:__suma.effectFlags().slow, state:__suma.state(), score:__suma.score()})`);
  assert.equal(before.slow, true);
  await key('f', { hold: true });
  assert.equal(await run(`document.getElementById('ffBtn').classList.contains('on')`), true);
  await key('h');
  assert.equal(await layerOpen(), true);
  // 打开即释放加速
  assert.equal(await run(`document.getElementById('ffBtn').classList.contains('on')`), false);
  // 冻结 8s（> 减速 6s）：星链位置、技能计时、状态、得分都不变
  await run(`__advanceFrames(500)`);
  const frozen = await run(`({front:__suma.frontDist(), tail:__suma.tailDist(), slow:__suma.effectFlags().slow, state:__suma.state(), score:__suma.score()})`);
  assert.deepEqual(frozen, before);
  await key('Escape');
  assert.equal(await layerOpen(), false);
  // 关闭后恢复前进
  await run(`__advanceFrames(120)`);
  assert.equal(await run('__suma.state()'), 'playing');
  assert.notEqual(await run('__suma.frontDist()'), before.front);
});

test('reading from paused, intro, title and gameover returns to the exact original state', async () => {
  // paused
  await open('?level=1&go');
  await key('p');
  assert.equal(await run('__suma.state()'), 'paused');
  await key('h');
  assert.equal(await layerOpen(), true);
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'paused');
  assert.match(await run(`document.querySelector('#overlay .card h1').textContent`), /已暂停/);
  await run(`document.querySelector('[data-action="resume"]').click()`);
  assert.equal(await run('__suma.state()'), 'playing');
  // intro
  await open('?level=2');
  assert.equal(await run('__suma.state()'), 'intro');
  await key('h');
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'intro');
  assert.equal(await run(`!document.getElementById('overlay').classList.contains('hidden')`), true);
  // title
  await open();
  await key('h');
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'title');
  // gameover
  await open('?level=1&go');
  await run(`const c = __suma.chainRef(); c.length = 0; c.push({ type: 0, dist: 1000000 }); __advanceFrames(120)`);
  assert.equal(await run('__suma.state()'), 'gameover');
  await key('h');
  assert.equal(await layerOpen(), true);
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'gameover');
  assert.match(await run(`document.querySelector('#overlay .card .bad').textContent`), /黑洞/);
});

test('reading freezes clearing and sucking transitions and lets them resume after close', async () => {
  // clearing：扫尾动画被冻结
  await open('?level=1&go');
  await run(`__suma.setBudget(4); __suma.addCollected(4); __advanceFrames(1)`);
  assert.equal(await run('__suma.state()'), 'clearing');
  await key('h');
  await run(`__advanceFrames(300)`);
  assert.equal(await run('__suma.state()'), 'clearing', 'clearing 必须在阅读期间冻结');
  await key('Escape');
  await run(`__advanceFrames(300)`);
  assert.equal(await run('__suma.state()'), 'levelclear');
  // sucking：黑洞吞噬被冻结
  await open('?level=1&go');
  await run(`const c = __suma.chainRef(); c.length = 0; c.push({ type: 0, dist: 1000000 }); __advanceFrames(1)`);
  assert.equal(await run('__suma.state()'), 'sucking');
  await key('h');
  await run(`__advanceFrames(300)`);
  assert.equal(await run('__suma.state()'), 'sucking', 'sucking 必须在阅读期间冻结');
  assert.equal(await run('__suma.chainLen()'), 1);
  await key('Escape');
  await run(`__advanceFrames(300)`);
  assert.equal(await run('__suma.state()'), 'gameover');
});

test('Esc closes reading without toggling pause; Enter/Space/X/F/P do not reach the game', async () => {
  // Esc 不二次切换：playing 打开 → Esc 关闭后仍是 playing
  await open('?level=1&go');
  await run('__advanceFrames(5)');
  await key('h');
  await key('Escape');
  assert.equal(await layerOpen(), false);
  assert.equal(await run('__suma.state()'), 'playing');
  // 阅读期间底层按键全部先返回
  await key('h');
  await run('__advanceFrames(2)');
  const before = await canvasSig('game');
  await key(' ');
  await key('x');
  await key('f', { hold: true });
  await key('p');
  await run('__advanceFrames(2)');
  assert.equal(await canvasSig('game'), before, 'Space/X 不得穿透换球');
  assert.equal(await run(`document.getElementById('ffBtn').classList.contains('on')`), false, 'F 不得穿透加速');
  assert.equal(await run('__suma.state()'), 'playing', 'P 不得穿透暂停');
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'playing');
  // Enter 不得点击底层主按钮（intro 的「出发」）
  await open('?level=1');
  await key('h');
  await key('Enter');
  assert.equal(await run('__suma.state()'), 'intro', 'Enter 不得触发底层 primary');
  assert.equal(await run(`!document.getElementById('overlay').classList.contains('hidden')`), true);
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'intro');
});

test('blur or page hidden during reading pauses only an underlying playing game', async () => {
  // playing → 阅读中 blur → 关闭后保持暂停
  await open('?level=1&go');
  await key('h');
  await run(`window.dispatchEvent(new Event('blur'))`);
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'paused');
  assert.match(await run(`document.querySelector('#overlay .card h1').textContent`), /已暂停/);
  await run(`document.querySelector('[data-action="resume"]').click()`);
  // intro 不被改写
  await open('?level=2');
  await key('h');
  await run(`window.dispatchEvent(new Event('blur'))`);
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'intro');
  // levelclear 不被改写
  await clearLevel(1);
  await key('h');
  await run(`window.dispatchEvent(new Event('blur'))`);
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'levelclear');
  // visibilitychange hidden 只把 playing 转 paused
  await open('?level=3&go');
  await key('h');
  await run(`Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'))`);
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'paused');
  // 重新可见不得自动恢复游玩
  await run(`Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'))`);
  assert.equal(await run('__suma.state()'), 'paused');
});

test('quiz DOM, feedback and next-level gating survive reading open/close', async () => {
  await clearLevel(1);
  const quizState = () => run(`(() => ({
    state: __suma.state(),
    nextHidden: (() => { const b = document.getElementById('clearNext'); return !b || getComputedStyle(b).display === 'none'; })(),
    quizDisabled: [...document.querySelectorAll('button[data-quiz]')].map(b => b.disabled),
    exp: document.getElementById('quizExp').textContent,
    rightMarked: [...document.querySelectorAll('button[data-quiz]')].filter(b => b.classList.contains('right')).length
  }))()`);
  const before = await quizState();
  assert.equal(before.nextHidden, true);
  assert.deepEqual(before.quizDisabled, [false, false, false]);
  await key('h');
  await run('__advanceFrames(60)');
  await key('Escape');
  assert.deepEqual(await quizState(), before);
  // 答题后再开关：反馈与下一关可见性保持
  await run(`document.querySelector('button[data-quiz]').click()`);
  const answered = await quizState();
  assert.equal(answered.nextHidden, false);
  assert.equal(answered.rightMarked, 1);
  assert.ok(answered.exp.length > 0);
  await key('h');
  await run('__advanceFrames(60)');
  await key('Escape');
  assert.deepEqual(await quizState(), answered);
  // 下一关仍可用
  await run(`document.getElementById('clearNext').click()`);
  assert.equal(await run('__suma.level()'), 2);
});

test('every overlay card exposes a real-clickable secondary read-hr entry on touch screens', async () => {
  const cardEntry = () => run(`(() => {
    const card = document.querySelector('#overlay .card');
    const btn = card.querySelector('[data-action="read-hr"]');
    const primary = card.querySelector('button.primary');
    return { has: !!btn, cls: btn ? btn.className : '', hasPrimary: !!primary,
      primaryAction: primary ? primary.dataset.action : null };
  })()`);
  // 标题卡
  await open('', 390, 844, 2);
  let entry = await cardEntry();
  assert.equal(entry.has, true, '标题卡应有 read-hr 入口');
  assert.match(entry.cls, /ghost/);
  assert.ok(!/primary/.test(entry.cls), 'read-hr 不得用 primary 样式');
  assert.ok(entry.hasPrimary, '原 primary 按钮保留');
  await clickCenter('#overlay [data-action="read-hr"]');
  assert.equal(await layerOpen(), true);
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'title');
  // 介绍卡
  await open('?level=1', 390, 844, 2);
  await clickCenter('#overlay [data-action="read-hr"]');
  assert.equal(await layerOpen(), true);
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'intro');
  // 暂停卡
  await open('?level=1&go', 390, 844, 2);
  await key('p');
  await clickCenter('#overlay [data-action="read-hr"]');
  assert.equal(await layerOpen(), true);
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'paused');
  // 过关卡（含问答 DOM）
  await clearLevel(1, 390, 844, 2);
  await clickCenter('#overlay [data-action="read-hr"]');
  assert.equal(await layerOpen(), true);
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'levelclear');
  assert.equal(await run(`document.querySelectorAll('button[data-quiz]').length`), 3, '问答 DOM 保留');
  // 失败卡
  await open('?level=1&go', 390, 844, 2);
  await run(`const c = __suma.chainRef(); c.length = 0; c.push({ type: 0, dist: 1000000 }); __advanceFrames(120)`);
  assert.equal(await run('__suma.state()'), 'gameover');
  await clickCenter('#overlay [data-action="read-hr"]');
  assert.equal(await layerOpen(), true);
  await key('Escape');
  assert.equal(await run('__suma.state()'), 'gameover');
});

test('closed practice layer is truly invisible and cannot intercept real pointer hits', async () => {
  for (const [w, h, dpr] of [[1280, 720, 1], [390, 844, 2]]) {
    await open('?level=1&go', w, h, dpr);
    await run('__advanceFrames(5)');
    const probe = () => run(`(() => {
      const layer = document.getElementById('hrPractice');
      const r = layer.getBoundingClientRect();
      const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { display: getComputedStyle(layer).display,
        intercepts: !!at && (at === layer || layer.contains(at)) };
    })()`);
    let c = await probe();
    assert.equal(c.display, 'none', `${w}: 初始关闭态必须 display:none`);
    assert.equal(c.intercepts, false, `${w}: 关闭层不得拦截中心点指针`);
    await key('h');
    assert.equal(await layerOpen(), true);
    assert.notEqual((await probe()).display, 'none', `${w}: 打开后可见`);
    await key('Escape');
    c = await probe();
    assert.equal(c.display, 'none', `${w}: 关闭后必须 display:none`);
    assert.equal(c.intercepts, false, `${w}: 关闭后不得拦截真实指针`);
  }
});

test('practice layer is fully operable by real pointer at desktop and mobile sizes', async () => {
  for (const [w, h, dpr] of [[1280, 720, 1], [390, 844, 2]]) {
    await open('?level=1&go', w, h, dpr);
    await run('__advanceFrames(10)');
    await clickCenter('#hrOpenBtn');
    assert.equal(await layerOpen(), true, `${w}: 侧栏入口真实点击可打开`);
    const q1 = await run(`({ prompt: document.getElementById('hrPrompt').textContent,
      summary: document.getElementById('hrChartSummary').textContent })`);
    await clickCenter('#hrChoices button');
    const answered = await run(`(() => ({
      feedback: document.getElementById('hrFeedback').textContent,
      disabled: [...document.querySelectorAll('#hrChoices button')].every(b => b.disabled)
    }))()`);
    assert.ok(answered.disabled, `${w}: 真实点击选项后已作答`);
    assert.ok(answered.feedback.length > 0, `${w}: 有反馈文案`);
    await clickCenter('#hrPracticeNext');
    const q2 = await run(`(() => ({ prompt: document.getElementById('hrPrompt').textContent,
      summary: document.getElementById('hrChartSummary').textContent,
      enabled: [...document.querySelectorAll('#hrChoices button')].every(b => !b.disabled) }))()`);
    assert.ok(q2.enabled, `${w}: 换一组后新题可用`);
    assert.ok(q2.prompt !== q1.prompt || q2.summary !== q1.summary, `${w}: 换一组更换了例子`);
    await clickCenter('[data-hr-kind="luminosity"]');
    assert.equal(await run(`document.querySelector('[data-hr-kind="luminosity"]').getAttribute('aria-pressed')`), 'true');
    await clickCenter('#hrPracticeClose');
    assert.equal(await layerOpen(), false, `${w}: 关闭按钮真实点击可关闭`);
    assert.equal(await run('__suma.state()'), 'playing', `${w}: 关闭回到游玩`);
  }
});

test('reading practice leaves score, save and progress untouched', async () => {
  await clearLevel(1);
  await run(`document.querySelector('button[data-quiz]').click()`);
  const snap = () => run(`({score:__suma.score(), progress:JSON.stringify(__suma.progress()),
    save:localStorage.getItem('stellar-zuma-save-v1'), state:__suma.state(), level:__suma.level()})`);
  const before = await snap();
  await key('h');
  await key('1');
  await key('r');
  await key('1');
  await run(`document.querySelector('[data-hr-kind="luminosity"]').click()`);
  await key('1');
  await run(`document.querySelector('[data-hr-kind="radius"]').click()`);
  await key('1');
  assert.deepEqual(await snap(), before, '读图练习不得影响分数/存档/进度');
  assert.match(await run(`document.getElementById('hrPracticeStats').textContent`), /已答\s*[1-9]/);
  await key('Escape');
  assert.deepEqual(await snap(), before);
  await run('localStorage.clear()');
});

test('evolution animation freezes by draw-command geometry while reading and resumes after close', async () => {
  // 第 11 关(太阳链 stage0/pointIndex0)的过关动画是固定圆环+圆点,与 fraction 无关,
  // 像素相等检测不到冻结门被删。第 12 关(stage1/pointIndex2)是真实移动段:
  // 头部光晕 c.arc(head.x, head.y, 10) 的坐标随 fraction 连续变化。
  await open('?level=12&go');
  await run(`__suma.setBudget(4); __suma.addCollected(4); __suma.chainRef().length = 0; __advanceFrames(90)`);
  assert.equal(await run('__suma.state()'), 'levelclear');
  // 观察缝:转发原生 2d 调用,只记录真实绘制命令坐标(非像素比较,规避跨模态 AA 漂移);
  // render 包装同样只观察真实 scene.animation.fraction,两者都全程转发原实现。
  await run(`(() => {
    const cv = document.getElementById('hrClear');
    const ctx = cv.getContext('2d');
    window.__headTrace = [];
    window.__nativeArc = ctx.arc.bind(ctx);
    ctx.arc = function (x, y, r) {
      if (r === 10) window.__headTrace.push({ x, y });
      return window.__nativeArc.apply(ctx, arguments);
    };
    const orig = window.StellarHRDiagram.render;
    window.__fracTrace = [];
    window.StellarHRDiagram.render = (canvas, scene) => {
      if (canvas === cv && scene && scene.animation) window.__fracTrace.push(scene.animation.fraction);
      return orig(canvas, scene);
    };
    return true;
  })()`);
  const head = () => run(`window.__headTrace.length ? window.__headTrace[window.__headTrace.length - 1] : null`);
  const fracs = () => run('window.__fracTrace.slice()');
  await run(`__advanceFrames(40)`);
  const f1 = (await fracs()).pop();
  assert.ok(f1 > 0.1 && f1 < 0.8, `冻结前应处于动画中段(实际 fraction=${f1})`);
  const h1 = await head();
  assert.ok(h1, 'levelclear 期间动画头部(r=10 光晕圆)持续绘制');
  await run(`__advanceFrames(10)`);
  const h2 = await head();
  assert.ok(h2 && (h2.x !== h1.x || h2.y !== h1.y),
    `阅读前动画必须真实推进(head ${h1.x.toFixed(1)},${h1.y.toFixed(1)} → ${h2.x.toFixed(1)},${h2.y.toFixed(1)})`);

  await key('h');
  await run(`window.__headTrace.length = 0; window.__fracTrace.length = 0`);
  await run(`__advanceFrames(120)`); // 1.92s:冻结门若被删,head 会推进到段末
  const frozen = await fracs();
  assert.equal(Math.max(...frozen) - Math.min(...frozen), 0,
    `阅读期间 scene.animation.fraction 必须恒定(实际范围 ${Math.min(...frozen)} – ${Math.max(...frozen)})`);
  const heads = await run('window.__headTrace.slice()');
  assert.ok(heads.length > 1, '冻结期间动画每帧仍在重绘(绘制命令持续产生)');
  assert.ok(heads.every(h => h.x === heads[0].x && h.y === heads[0].y),
    `阅读期间头部绘制坐标必须逐帧不变(实际 ${heads[0].x.toFixed(1)},${heads[0].y.toFixed(1)} → ` +
    `${heads[heads.length - 1].x.toFixed(1)},${heads[heads.length - 1].y.toFixed(1)})`);
  assert.deepEqual(heads[0], h2, '冻结起点与打开阅读前的最后采样一致');

  await key('Escape');
  await run(`__advanceFrames(30)`);
  const h5 = await head();
  const f5 = (await fracs()).pop();
  assert.ok(f5 > f1, `关闭后 fraction 必须前进(${f1} → ${f5})`);
  assert.ok(h5 && (h5.x !== heads[0].x || h5.y !== heads[0].y),
    `关闭后动画头部必须继续移动(head ${heads[0].x.toFixed(1)},${heads[0].y.toFixed(1)} → ${h5.x.toFixed(1)},${h5.y.toFixed(1)})`);
});

test('all 17 lessons and the endless transition start without exceptions', async () => {
  for (let level=1; level<=18; level++) {
    await open(`?level=${level}`);
    assert.equal(await run('__suma.level()'), level);
    assert.equal(await run('__suma.state()'), 'intro');
    await run('__suma.playerGo(); __advanceFrames(2)');
    assert.equal(await run('__suma.state()'), 'playing');
  }
  if (process.env.SCREENSHOT_PATH) {
    await open('?level=1&go', 1280, 720, 2);
    await run('__advanceFrames(1)');
    const {data} = await browser.call('Page.captureScreenshot', {format:'png'});
    await writeFile(process.env.SCREENSHOT_PATH, Buffer.from(data,'base64'));
  }
});
