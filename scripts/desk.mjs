/**
 * The art desk: every slot on one page, live. What is left to draw in the order to draw it, what is
 * half drawn, what is done; each save in Aseprite re-checked against the standard and shown at once;
 * one button to start a slot, which makes its canvas (as `tf scaffold` does) and opens it in Aseprite
 * beside its sketch, ready to draw. With the app checked out beside this repo, every passing save is
 * also copied into it (the app's `npm run art -- --watch`), so the app shows it straight away.
 *
 * Run: npm run desk   (or tf desk)        http://127.0.0.1:4780, opened in your browser
 *      --no-open      do not open the browser
 *      --no-app       do not copy into the app
 *
 * Node standard library only, like the rest of this repo. It listens on this computer alone.
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, watch, writeFileSync } from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canvasOf, isUntouched, loadPalette, validate } from '../lib/validate.mjs';
import { isBaseOnly, newCanvas } from '../lib/base.mjs';
import { loadQueue } from '../lib/queue.mjs';
import { findAseprite, openFile, openInAseprite } from '../lib/open.mjs';
import { renderSketch } from '../lib/sketch.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const PORT = Number(process.env.DESK_PORT || 4780);
const URL_ = `http://127.0.0.1:${PORT}`;
const args = process.argv.slice(2);
const APP = resolve(root, '..', 'app');
const APP_ART = join(APP, 'src', 'renderer', 'src', 'assets', 'art');
const withApp = !args.includes('--no-app') && existsSync(join(APP, 'scripts', 'art.mjs'));
const time = () => new Date().toTimeString().slice(0, 8);
const log = (...a) => console.log(`\x1b[2m${time()}\x1b[0m`, ...a);

/** The slot being drawn (the last one started or opened here), and the last save of each file. */
let working = null;
const saved = new Map();

// ---------------------------------------------------------------- state

const same = (a, b) => existsSync(a) && existsSync(b) && readFileSync(a).equals(readFileSync(b));

/**
 * Every slot as the page shows it. `phase`: todo (no canvas), blank (a canvas nobody has drawn on),
 * drawing (started, not passing yet), passing (passes, not marked done), done.
 */
async function snapshot() {
  const { state, queue } = await loadQueue();
  const rank = new Map(queue.map((x, i) => [x.s.id, i + 1]));
  const slots = state.map(({ s, cls, st, r }) => {
    const file = `art/${s.id}@1x.png`;
    const has = existsSync(file);
    const { w, h } = canvasOf(cls);
    const phase = st === 'todo' ? 'todo' : st === 'started' ? 'blank' : st === 'broken' ? 'drawing' : s.status === 'done' ? 'done' : 'passing';
    const check = (c) => ({ label: c.label, value: c.value, fix: c.fix ?? null });
    return {
      id: s.id,
      class: s.class,
      w, h,
      frames: cls.frames ?? 1,
      strip: !!cls.strip,
      colors: cls.colors,
      blocks: s.blocks,
      order: s.order ?? null,
      rank: rank.get(s.id) ?? null,
      phase,
      brief: s.brief ?? '',
      use: s.use ?? '',
      sketchNote: s.sketchNote ?? null,
      sketch: !!s.sketch,
      base: s.base?.from ?? null,
      bays: s.bays ? { holds: s.bays.holds, rects: s.bays.rects } : null,
      mtime: has ? Math.round(statSync(file).mtimeMs) : 0,
      saved: saved.get(s.id) ?? null,
      checks: r && phase !== 'blank' ? { ok: r.ok, blocking: r.blocking.map(check), warnings: r.warnings.map(check), used: r.palette?.length ?? null } : null,
      inApp: withApp && (phase === 'passing' || phase === 'done') ? same(file, join(APP_ART, `${s.id}.png`)) : null,
    };
  });
  return { at: Date.now(), working, aseprite: !!findAseprite(), app: withApp, slots };
}

// ---------------------------------------------------------------- live

const clients = new Set();
let last = null;
let timer = null;
/** Recompute and push to every open page, at most once per burst of file events. */
function refresh(delay = 160) {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      last = await snapshot();
      const msg = `data: ${JSON.stringify(last)}\n\n`;
      for (const res of clients) res.write(msg);
    } catch (e) {
      log('\x1b[31mcould not read the slots:\x1b[0m', e.message);
    }
  }, delay);
}

function watchDir(dir, onFile) {
  if (!existsSync(dir)) return;
  try {
    watch(dir, (_, name) => {
      if (name && !String(name).startsWith('.')) onFile?.(String(name));
      refresh();
    });
  } catch (e) {
    log(`not watching ${dir}: ${e.message}`);
  }
}

watchDir('art', (name) => {
  const m = /^(.+)@1x\.png$/.exec(name);
  if (m) saved.set(m[1], Date.now());
});
watchDir('slots');
watchDir('.', (name) => name === 'classes.json');
if (withApp) watchDir(APP_ART);

// ---------------------------------------------------------------- actions

function slotOf(id) {
  if (!/^[\w.-]+$/.test(id) || !existsSync(`slots/${id}.json`)) return null;
  const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
  const slot = JSON.parse(readFileSync(`slots/${id}.json`, 'utf8'));
  return { slot, classes, cls: classes[slot.class], file: `art/${id}@1x.png` };
}

/**
 * Aseprite with these files as tabs, the last one active. On Windows it is started by Explorer, not
 * as a child of this process: a terminal inside a packaged app (the Claude desktop app's) hands its
 * children a private copy of AppData, and Aseprite would come up without your settings and palettes.
 */
function openAseprite(files) {
  const app = findAseprite();
  if (!app) {
    files.forEach(openFile);
    return false;
  }
  if (process.platform !== 'win32') return openInAseprite(files);
  mkdirSync('.desk', { recursive: true });
  for (const f of readdirSync('.desk')) if (f.endsWith('.vbs') && Date.now() - statSync(join('.desk', f)).mtimeMs > 60_000) rmSync(join('.desk', f), { force: true });
  const line = [app, ...files.map((f) => resolve(f))].map((p) => `""${p}""`).join(' ');
  const vbs = resolve('.desk', `open-${Date.now()}.vbs`);
  writeFileSync(vbs, `CreateObject("WScript.Shell").Run "${line}", 1, False\r\n`);
  spawn('explorer.exe', [vbs], { detached: true, stdio: 'ignore' }).unref();
  return true;
}

/**
 * Make the canvas if there is none (indexed, the palette built in, its base placed: the tomato for a
 * pet state), draw the sketch, open both. An empty canvas made before the slot had a base is made
 * again with it; anything with a pixel drawn on it is never touched.
 */
async function start(id) {
  const found = slotOf(id);
  if (!found) return { status: 404, body: { error: `no slot "${id}"` } };
  const { slot, classes, cls, file } = found;
  let created = false;
  const empty = async () => {
    if (!slot.base) return false;
    const bytes = new Uint8Array(readFileSync(file));
    return isUntouched(await validate(bytes, { ...cls, id, bays: slot.bays })) && !(await isBaseOnly(bytes, slot, cls));
  };
  if (!existsSync(file) || (await empty())) {
    const pal = [...loadPalette(readFileSync('palette/resurrect-64.hex', 'utf8'))];
    writeFileSync(file, await newCanvas(slot, cls, pal));
    created = true;
  }
  const ref = slot.sketch ? await renderSketch(slot, classes) : null;
  const opened = openAseprite(ref ? [ref, file] : [file]);
  working = id;
  log(`${created ? 'started' : 'opened'} ${id}${opened ? ' in Aseprite' : ' (Aseprite not found: opened with the default app)'}`);
  refresh(0);
  return { status: 200, body: { created, opened } };
}

const gh = (...a) => new Promise((ok) => execFile('gh', a, { timeout: 8000, windowsHide: true }, (err, out) => ok(err ? null : String(out).trim())));

/** Done: it passes, so the slot is drawn and in use; its GitHub issue is closed when gh can reach it. */
async function done(id) {
  const found = slotOf(id);
  if (!found) return { status: 404, body: { error: `no slot "${id}"` } };
  const { slot, cls, file } = found;
  if (!existsSync(file)) return { status: 409, body: { error: 'Nothing drawn yet.' } };
  const master = loadPalette(readFileSync('palette/resurrect-64.hex', 'utf8'));
  const r = await validate(new Uint8Array(readFileSync(file)), { ...cls, id, masterPalette: master, bays: slot.bays });
  if (!r.ok) return { status: 409, body: { error: `It does not pass yet: ${r.blocking.map((c) => c.label).join(', ')}.` } };
  slot.status = 'done';
  slot.blocks = 'app';
  delete slot.order;
  writeFileSync(`slots/${id}.json`, JSON.stringify(slot, null, 2) + '\n');
  if (working === id) working = null;
  let issue = null;
  const list = await gh('issue', 'list', '--state', 'open', '--limit', '200', '--json', 'number,title');
  const hit = list ? JSON.parse(list).find((i) => i.title === id) : null;
  if (hit && (await gh('issue', 'close', String(hit.number), '-c', `Drawn and passing. ${r.palette?.length ?? '?'} colours.`)) !== null) issue = hit.number;
  log(`done ${id}${issue ? `, closed #${issue}` : ''}`);
  refresh(0);
  return { status: 200, body: { done: true, issue } };
}

/** Back on the list: a slot marked done by mistake, or one to redraw. */
function reopen(id) {
  const found = slotOf(id);
  if (!found) return { status: 404, body: { error: `no slot "${id}"` } };
  const { slot } = found;
  slot.status = 'open';
  slot.blocks = 'today';
  writeFileSync(`slots/${id}.json`, JSON.stringify(slot, null, 2) + '\n');
  log(`reopened ${id}`);
  refresh(0);
  return { status: 200, body: { reopened: true } };
}

// ---------------------------------------------------------------- server

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, URL_);
  const path = decodeURIComponent(url.pathname);
  try {
    if (req.method === 'GET' && path === '/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
      clients.add(res);
      req.on('close', () => clients.delete(res));
      res.write(`data: ${JSON.stringify(last ?? (last = await snapshot()))}\n\n`);
      return;
    }
    if (req.method === 'GET' && path === '/api/state') return send(res, 200, last ?? (last = await snapshot()));
    if (req.method === 'POST' && /^\/api\/(start|done|reopen)\/[\w.-]+$/.test(path)) {
      const [, , verb, id] = path.split('/');
      const out = verb === 'start' ? await start(id) : verb === 'done' ? await done(id) : reopen(id);
      return send(res, out.status, out.body);
    }
    let m = /^\/art\/([\w.-]+)\.png$/.exec(path);
    if (req.method === 'GET' && m) {
      const f = `art/${m[1]}@1x.png`;
      return existsSync(f) ? send(res, 200, readFileSync(f), TYPES['.png']) : send(res, 404, { error: 'not drawn' });
    }
    m = /^\/sketch\/([\w.-]+)\.png$/.exec(path);
    if (req.method === 'GET' && m) {
      const found = slotOf(m[1]);
      if (!found?.slot.sketch) return send(res, 404, { error: 'no sketch' });
      const f = `sketches/${m[1]}.sketch.png`;
      if (!existsSync(f) || statSync(f).mtimeMs < statSync(`slots/${m[1]}.json`).mtimeMs) await renderSketch(found.slot, found.classes);
      return send(res, 200, readFileSync(f), TYPES['.png']);
    }
    const file = path === '/' ? 'desk/index.html' : /^\/[\w.-]+\.(css|js)$/.test(path) ? `desk${path}` : null;
    if (req.method === 'GET' && file && existsSync(file)) return send(res, 200, readFileSync(file), TYPES[file.slice(file.lastIndexOf('.'))]);
    send(res, 404, { error: 'not found' });
  } catch (e) {
    log('\x1b[31merror\x1b[0m', e.message);
    send(res, 500, { error: e.message });
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`The art desk is already running at ${URL_}.`);
    if (!args.includes('--no-open')) openFile(URL_);
    process.exit(0);
  }
  throw e;
});

server.listen(PORT, '127.0.0.1', async () => {
  last = await snapshot();
  const todo = last.slots.filter((s) => s.phase !== 'done').length;
  console.log(`\x1b[1mArt desk\x1b[0m  ${URL_}   ${todo} to draw, ${last.slots.length - todo} done`);
  console.log(`\x1b[2mAseprite: ${findAseprite() ?? 'not found (set ASEPRITE)'}\x1b[0m`);
  if (withApp) {
    // The app's own copier: it copies only what passes, and remakes the icons when the tomato changes.
    const child = spawn(process.execPath, ['scripts/art.mjs', '--watch'], { cwd: APP, stdio: ['ignore', 'pipe', 'pipe'] });
    const pipe = (b) => String(b).split(/\r?\n/).filter(Boolean).forEach((l) => log(`\x1b[36mapp\x1b[0m ${l}`));
    child.stdout.on('data', pipe);
    child.stderr.on('data', pipe);
    const stop = () => { child.kill(); process.exit(0); };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    console.log(`\x1b[2mCopying passing saves into ${APP_ART}\x1b[0m`);
  }
  console.log('\x1b[2mCtrl+C to stop.\x1b[0m');
  if (!args.includes('--no-open')) openFile(URL_);
});
