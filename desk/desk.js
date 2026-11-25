// The art desk's page: renders what scripts/desk.mjs pushes over /events, every time a file changes.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private window: forget it */ } },
};

let state = null;
let sel = store.get('desk.sel');
let showBays = store.get('desk.bays') !== '0';
let doneOpen = store.get('desk.doneOpen') === '1';
const seenSave = new Map();

const PHASE = {
  todo: ['to draw', 'todo'],
  blank: ['ready to draw', 'blank'],
  drawing: ['not passing yet', 'bad'],
  passing: ['passes', 'passing'],
  done: ['done', 'done'],
};

/** The slots in the order the page lists them, in their groups. */
function groups(slots) {
  const by = (f) => slots.filter(f);
  const now = by((s) => s.phase === 'blank' || s.phase === 'drawing' || s.phase === 'passing')
    .sort((a, b) => (b.id === state.working) - (a.id === state.working) || b.mtime - a.mtime);
  const rank = (a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || (a.order ?? 999) - (b.order ?? 999) || a.id.localeCompare(b.id);
  const next = by((s) => s.phase === 'todo' && s.blocks === 'today').sort(rank);
  const later = by((s) => s.phase === 'todo' && s.blocks !== 'today').sort(rank);
  const done = by((s) => s.phase === 'done').sort((a, b) => a.id.localeCompare(b.id));
  return [
    { key: 'now', title: 'Drawing now', rows: now, numbered: false },
    { key: 'next', title: 'Up next', rows: next, numbered: true },
    { key: 'later', title: 'Later', rows: later, numbered: false },
    { key: 'done', title: 'Done', rows: done, numbered: false, fold: true },
  ].filter((g) => g.rows.length);
}

/** A drawing (or its sketch) at a whole scale that fits `box`, first frame only, over a checkerboard. */
function pic(src, s, box, { max = 16, bays = false } = {}) {
  const fh = s.strip ? s.h / s.frames : s.h;
  const k = Math.max(1, Math.min(max, Math.floor(Math.min(box / s.w, box / fh))));
  const w = s.w * k, h = fh * k;
  const img = src ? `<div class="px" style="width:${w}px;height:${h}px;background-image:url('${src}');background-size:${w}px ${s.h * k}px"></div>` : '';
  const overlay = bays && s.bays ? s.bays.rects.map(([x, y, bw, bh]) => `<i class="bay" style="left:${x * k}px;top:${y * k}px;width:${bw * k}px;height:${bh * k}px"></i>`).join('') : '';
  return { html: `<div class="frame checker" style="width:${w}px;height:${h}px">${img}${overlay}</div>`, k };
}

const artUrl = (s) => (s.mtime ? `/art/${s.id}.png?v=${s.mtime}` : null);

function primary(s) {
  if (s.phase === 'todo') return { verb: 'start', label: 'Start working', cls: 'go' };
  if (s.phase === 'passing') return { verb: 'done', label: 'Mark done', cls: 'ok' };
  return { verb: 'start', label: 'Open in Aseprite', cls: s.phase === 'done' ? 'ghost' : 'go' };
}

function rowHtml(s, n) {
  const [label, cls] = PHASE[s.phase];
  const thumb = s.mtime && (s.phase !== 'blank' || s.base) ? pic(artUrl(s), s, 64).html : s.sketch ? pic(`/sketch/${s.id}.png`, s, 64).html : `<span class="none">${s.w}x${s.h}</span>`;
  const p = primary(s);
  const bad = s.phase === 'drawing' && s.checks ? `${s.checks.blocking.length} to fix` : label;
  return `
    <div class="row ${s.id === sel ? 'sel' : ''}" data-id="${esc(s.id)}" role="button" tabindex="-1">
      <div class="thumb">${thumb}</div>
      <div class="row-main">
        <div class="row-id">${n ? `<span class="n">${n}</span>` : ''}${esc(s.id)}</div>
        <div class="row-use">${esc(s.use)}</div>
        <div class="row-meta">
          ${s.id === state.working ? '<span class="chip working">on your desk</span>' : ''}
          <span class="chip ${cls}">${esc(bad)}</span>
          <span class="chip">${esc(s.class)} ${s.w}x${s.h}${s.frames > 1 ? `, ${s.frames} frames` : ''}</span>
          ${s.inApp === false ? '<span class="chip">not in the app yet</span>' : s.inApp ? '<span class="chip done">in the app</span>' : ''}
        </div>
      </div>
      <button class="btn ${p.cls}" data-act="${p.verb}" data-id="${esc(s.id)}">${p.label}</button>
    </div>`;
}

function renderList() {
  const gs = groups(state.slots);
  $('list').innerHTML = gs.map((g) => {
    const rows = g.rows.map((s, i) => rowHtml(s, g.numbered ? i + 1 : 0)).join('');
    const head = `<h2>${g.title} <span>${g.rows.length}</span></h2>`;
    return g.fold
      ? `<details class="group" data-key="${g.key}" ${doneOpen ? 'open' : ''}><summary>${head}</summary><div class="rows">${rows}</div></details>`
      : `<section class="group" data-key="${g.key}">${head}<div class="rows">${rows}</div></section>`;
  }).join('');
  const fold = $('list').querySelector('details.group');
  fold?.addEventListener('toggle', () => { doneOpen = fold.open; store.set('desk.doneOpen', doneOpen ? '1' : '0'); });
}

function savedLine(s) {
  if (!s.mtime) return '<span class="saved">no canvas yet</span>';
  const at = new Date(s.saved ?? s.mtime).toTimeString().slice(0, 8);
  if (s.phase === 'blank') return `<span class="saved">${s.base ? `${esc(s.base)} placed` : 'blank'}, made ${at}</span>`;
  const ok = s.checks?.ok;
  return `<span class="saved ${ok ? 'ok' : 'bad'}">saved ${at}, ${ok ? 'passes' : `${s.checks?.blocking.length ?? 0} to fix`}</span>`;
}

function checksHtml(s) {
  if (s.phase === 'todo') return `<p>Nothing drawn yet. Start working makes the canvas, the right size with the palette built in${s.base ? `, with ${esc(s.base)} already placed to draw from` : ''}, and opens it beside its sketch.</p>`;
  if (s.phase === 'blank') return s.base
    ? `<p>${esc(s.base)} is placed, nothing drawn on it yet. Draw over it; every save is checked here as soon as it lands.</p>`
    : '<p>An empty canvas, waiting for you. Every save is checked here as soon as it lands.</p>';
  const c = s.checks;
  const li = (x, cls) => `<li class="${cls}"><b>${esc(x.label)}</b><span class="v">${esc(x.value)}</span>${x.fix ? `<span class="fix">${esc(x.fix)}</span>` : ''}</li>`;
  const used = c.used != null ? `${c.used} of ${s.colors} colours` : '';
  const good = c.ok ? `<li class="good"><b>Passes every check</b><span class="v">${used}</span></li>` : '';
  return `<ul class="checks">${c.blocking.map((x) => li(x, 'bad')).join('')}${good}${c.warnings.map((x) => li(x, 'warn')).join('')}</ul>`;
}

function renderDetail() {
  const s = state.slots.find((x) => x.id === sel);
  if (!s) { $('detail').innerHTML = '<p class="dim">Pick a slot.</p>'; return; }
  const [label, cls] = PHASE[s.phase];
  const p = primary(s);
  const box = 220;
  const drawn = s.mtime ? pic(artUrl(s), s, box, { bays: showBays }) : null;
  const sketch = s.sketch ? pic(`/sketch/${s.id}.png`, s, box, { bays: showBays }) : null;
  const k = drawn?.k ?? sketch?.k;
  const actions = [
    `<button class="btn ${p.cls}" data-act="${p.verb}" data-id="${esc(s.id)}">${p.label} <kbd>${p.verb === 'done' ? 'D' : 'Enter'}</kbd></button>`,
    p.verb === 'done' ? `<button class="btn ghost" data-act="start" data-id="${esc(s.id)}">Open in Aseprite</button>` : '',
    s.phase === 'done' ? `<button class="btn ghost" data-act="reopen" data-id="${esc(s.id)}">Reopen</button>` : '',
  ].join('');
  const bays = s.bays
    ? `<div class="d-section"><h3>What the app draws on it</h3><p>${esc(s.bays.holds)}, in ${s.bays.rects.length === 1 ? 'one area' : `${s.bays.rects.length} areas`}: ${s.bays.rects.map(([x, y, w, h]) => `${w}x${h} at (${x},${y})`).join(', ')}. Keep ${s.bays.rects.length === 1 ? 'it' : 'each'} flat: fully opaque, at most 3 colours.</p></div>`
    : '';
  $('detail').innerHTML = `
    <div class="d-head">
      <div>
        <h2>${esc(s.id)}</h2>
        <div class="chips">
          <span class="chip ${cls}">${esc(label)}</span>
          <span class="chip">${esc(s.class)} ${s.w}x${s.h}${s.frames > 1 ? `, ${s.frames} frames` : ''}</span>
          <span class="chip">up to ${s.colors} colours</span>
          ${s.inApp === false ? '<span class="chip">not in the app yet</span>' : s.inApp ? '<span class="chip done">in the app</span>' : ''}
        </div>
      </div>
      <div class="d-actions">${actions}</div>
    </div>
    <div class="stage ${sketch ? '' : 'one'}">
      <div class="pane">
        <div class="pane-label"><span>Your drawing${k ? `, ${k}x` : ''}</span></div>
        <div class="pane-box">${drawn ? drawn.html : '<span class="dim">No canvas yet</span>'}</div>
        ${savedLine(s)}
      </div>
      ${sketch ? `<div class="pane"><div class="pane-label"><span>The layout sketch</span>${s.bays ? `<label class="toggle" title="Outline the areas the app draws on"><input type="checkbox" id="bays" ${showBays ? 'checked' : ''}> areas</label>` : ''}</div><div class="pane-box">${sketch.html}</div></div>` : ''}
    </div>
    <div class="d-section"><h3>Where it shows</h3><p>${esc(s.use)}</p></div>
    ${s.base ? `<div class="d-section"><h3>Starts from</h3><p>${esc(s.base)}, your drawing, placed on every new canvas where it sits in this one, so you draw over it.</p></div>` : ''}
    <div class="d-section"><h3>The brief</h3><p>${esc(s.brief)}</p></div>
    ${s.sketchNote ? `<div class="d-section"><h3>About the sketch</h3><p>${esc(s.sketchNote)}</p></div>` : ''}
    ${bays}
    <div class="d-section"><h3>Checks</h3>${checksHtml(s)}</div>`;
  $('bays')?.addEventListener('change', (e) => { showBays = e.target.checked; store.set('desk.bays', showBays ? '1' : '0'); renderDetail(); });
}

function renderTop() {
  const n = (f) => state.slots.filter(f).length;
  const today = n((s) => s.phase !== 'done' && s.blocks === 'today');
  const later = n((s) => s.phase !== 'done' && s.blocks !== 'today');
  const done = n((s) => s.phase === 'done');
  $('tally').innerHTML = `<span class="today"><b>${today}</b>to draw today</span><span><b>${later}</b>later</span><span><b>${done}</b>done</span>`;
  $('aseprite').textContent = state.aseprite ? 'Aseprite found' : 'Aseprite not found';
  $('aseprite').classList.toggle('off', !state.aseprite);
  $('app').textContent = state.app ? 'Copying into the app' : 'Not copying into the app';
  $('app').classList.toggle('off', !state.app);
}

function render() {
  if (!state.slots.some((s) => s.id === sel)) {
    const first = groups(state.slots)[0]?.rows[0];
    sel = state.working ?? first?.id ?? null;
  }
  renderTop();
  renderList();
  renderDetail();
  // A save that just landed: its row flashes.
  for (const s of state.slots) {
    if (s.saved && seenSave.has(s.id) && seenSave.get(s.id) !== s.saved) {
      document.querySelector(`.row[data-id="${CSS.escape(s.id)}"]`)?.classList.add('flash');
    }
    seenSave.set(s.id, s.saved);
  }
}

function pick(id, scroll = false) {
  sel = id;
  store.set('desk.sel', id);
  document.querySelectorAll('.row').forEach((r) => r.classList.toggle('sel', r.dataset.id === id));
  renderDetail();
  if (scroll) document.querySelector(`.row[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' });
}

let toastTimer = 0;
function toast(text, bad = false) {
  const t = $('toast');
  t.textContent = text;
  t.classList.toggle('bad', bad);
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 3200);
}

async function act(verb, id) {
  const say = { start: `Opening ${id} in Aseprite`, done: `Marking ${id} done`, reopen: `Putting ${id} back on the list` }[verb];
  toast(say);
  try {
    const res = await fetch(`/api/${verb}/${encodeURIComponent(id)}`, { method: 'POST' });
    const body = await res.json();
    if (!res.ok) return toast(body.error ?? 'That did not work.', true);
    if (verb === 'start') toast(body.created ? `${id}: a fresh canvas, opening in Aseprite` : `${id}: opening in Aseprite`);
    if (verb === 'start' && !body.opened) toast('Aseprite was not found, so it opened with the default app. Set ASEPRITE to its path.', true);
    if (verb === 'done') toast(`${id} is done${body.issue ? `, issue #${body.issue} closed` : ''}`);
    if (verb === 'reopen') toast(`${id} is back on the list`);
  } catch {
    toast('The desk is not answering. Is npm run desk still running?', true);
  }
}

$('list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (btn) { e.stopPropagation(); pick(btn.dataset.id); return void act(btn.dataset.act, btn.dataset.id); }
  const row = e.target.closest('.row');
  if (row) pick(row.dataset.id);
});
$('detail').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (btn) act(btn.dataset.act, btn.dataset.id);
});

document.addEventListener('keydown', (e) => {
  if (!state || e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.('input, textarea')) return;
  const ids = [...document.querySelectorAll('.row')].filter((r) => r.offsetParent).map((r) => r.dataset.id);
  const i = ids.indexOf(sel);
  const s = state.slots.find((x) => x.id === sel);
  if (e.key === 'j' || e.key === 'ArrowDown') pick(ids[Math.min(ids.length - 1, i + 1)] ?? ids[0], true);
  else if (e.key === 'k' || e.key === 'ArrowUp') pick(ids[Math.max(0, i - 1)] ?? ids[0], true);
  else if (e.key === 'Enter' && s) act('start', s.id);
  else if (e.key === 'd' && s?.phase === 'passing') act('done', s.id);
  else return;
  e.preventDefault();
});

function connect() {
  const live = $('live');
  const es = new EventSource('/events');
  es.onopen = () => { live.classList.add('on'); live.lastElementChild.textContent = 'live'; };
  es.onmessage = (m) => { state = JSON.parse(m.data); render(); };
  es.onerror = () => { live.classList.remove('on'); live.lastElementChild.textContent = 'reconnecting'; };
}
connect();
