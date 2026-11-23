/**
 * What to draw next. The only command you need to remember.
 * Run: node scripts/next.mjs [count]
 */
import { canvasOf } from '../lib/validate.mjs';
import { loadQueue } from '../lib/queue.mjs';

const want = Number(process.argv[2]) || 3;
const B = s => `\x1b[1m${s}\x1b[0m`, D = s => `\x1b[2m${s}\x1b[0m`;
const G = s => `\x1b[32m${s}\x1b[0m`, R = s => `\x1b[31m${s}\x1b[0m`, Y = s => `\x1b[33m${s}\x1b[0m`;

const { classes, state, queue } = await loadQueue();

const n = k => state.filter(x => x.st === k).length;
const today = state.filter(x => x.s.blocks === 'today');
const todayLeft = today.filter(x => x.st !== 'done').length;
console.log(`\n${B('Mayorly art')}   ${G(n('done') + ' done')}  ${Y(n('started') + ' started')}  ` +
  `${n('todo')} todo  ${n('broken') ? R(n('broken') + ' broken') : ''}`);
console.log(D(`${todayLeft} of today's ${today.length} still to draw\n`));

const broken = state.filter(x => x.st === 'broken');
if (broken.length) {
  console.log(R('Fix these first:'));
  for (const b of broken) {
    console.log(`  ${B(b.s.id)}`);
    for (const w of b.why) console.log(D(`    ${w}`));
  }
  console.log();
}


if (!queue.length) { console.log(G('Everything is drawn. In the app: npm run art, then ship.\n')); process.exit(0); }

console.log(B(`Next ${Math.min(want, queue.length)}:`));
console.log(D("today's first, in the order they show most: the pet, the coin, then the icons.\n"));
for (const { s, st } of queue.slice(0, want)) {
  const c = classes[s.class], d = canvasOf(c);
  console.log(`${B(s.id)}  ${s.blocks === 'today' ? R('[today]') : D('[later]')}` +
    (st === 'started' ? Y('  [started]') : ''));
  const cell = c.grid ? `  ${D(`= a ${c.grid.replace(' dirs x ', ' x ')} grid of ${c.w / 4}x${c.h / 4} cells`)}` : '';
  console.log(`  ${B(d.w + 'x' + d.h)}${cell}`);
  console.log(`  ${c.frames > 1 ? c.frames + ' frames' + (c.strip ? ', stacked top to bottom' : '') + '  ' : ''}` +
    `max ${c.colors} colours  anchor ${c.anchor}`);
  console.log(D('  ' + s.brief.replace(/(.{78}\s)/g, '$1\n  ')));
  console.log(D(`  tf scaffold${queue[0]?.s.id === s.id ? '' : ' ' + s.id}\n`));
}
