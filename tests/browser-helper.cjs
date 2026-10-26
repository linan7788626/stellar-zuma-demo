// Zero-dependency browser harness. Never connects to the user's Chrome profile.
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { mkdtemp, rm, readFile } = require('node:fs/promises');
const { createServer } = require('node:http');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const preload = `
  let seed = 123456789;
  Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  let frames = [], clock = 0;
  window.requestAnimationFrame = fn => frames.push(fn);
  window.__advanceFrames = n => {
    for (let i = 0; i < n; i++) {
      clock += 16;
      const pending = frames; frames = [];
      pending.forEach(fn => fn(clock));
    }
  };
`;

async function launch() {
  const profile = await mkdtemp(path.join(process.env.TMPDIR || os.tmpdir(), 'stellar-zuma-test-'));
  const executable = process.env.CHROME_BIN || (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
  const chrome = spawn(executable, ['--headless=new', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let ws, server;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Chrome did not start within 15 seconds')), 15000);
      let output = '';
      chrome.once('error', err => { clearTimeout(timer); reject(err); });
      chrome.once('exit', code => { clearTimeout(timer); reject(new Error(`Chrome exited (${code}): ${output}`)); });
      chrome.stderr.on('data', chunk => {
        output += chunk;
        const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    ws = new WebSocket(endpoint);
    await once(ws, 'open');
    let sequence = 0;
    const pending = new Map();
    const listeners = new Set();
    ws.addEventListener('message', e => {
      const message = JSON.parse(e.data);
      if (message.id) {
        const item = pending.get(message.id);
        if (!item) return;
        pending.delete(message.id); clearTimeout(item.timer);
        if (message.error) item.reject(new Error(JSON.stringify(message.error)));
        else item.resolve(message.result);
      } else listeners.forEach(fn => fn(message));
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const call = (method, params) => send(method, params, sessionId);
    await call('Page.enable');
    await call('Runtime.enable');
    await call('Page.addScriptToEvaluateOnNewDocument', { source: preload });

    server = createServer(async (req, res) => {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : decodeURIComponent(pathname)));
      if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      try {
        const body = await readFile(file);
        const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }[path.extname(file)];
        res.writeHead(200, { 'Content-Type': `${mime || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
        res.end(body);
      } catch { res.writeHead(404).end(); }
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const fileURL = pathToFileURL(path.join(root, 'index.html')).href;
    const evaluate = async expression => {
      const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const navigate = async (url, width = 1280, height = 720, dpr = 1) => {
      await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
      const loaded = new Promise((resolve, reject) => {
        const handler = msg => {
          if (msg.sessionId === sessionId && msg.method === 'Page.loadEventFired') {
            clearTimeout(timer); listeners.delete(handler); resolve();
          }
        };
        const timer = setTimeout(() => { listeners.delete(handler); reject(new Error(`Page load timeout: ${url}`)); }, 15000);
        listeners.add(handler);
      });
      await call('Page.navigate', { url });
      await loaded;
      await evaluate('document.fonts.ready.then(() => true)');
    };
    return { base, fileURL, call, evaluate, navigate,
      async close() {
        await send('Browser.close');
        ws.close();
        if (chrome.exitCode === null) await once(chrome, 'exit');
        await new Promise(resolve => server.close(resolve));
        await rm(profile, { recursive: true, force: true });
      },
    };
  } catch (error) {
    ws?.close(); chrome.kill(); server?.close();
    if (chrome.exitCode === null) await once(chrome, 'exit');
    await rm(profile, { recursive: true, force: true });
    throw error;
  }
}

module.exports = { launch };
