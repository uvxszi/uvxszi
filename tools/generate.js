// Generates the animated SVGs in assets/ that the profile README shows.
// Change the text, colours or cards below, then run:  node tools/generate.js
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'assets');
const logo = fs.readFileSync(path.join(__dirname, 'logo.svg'), 'utf8');
fs.mkdirSync(out, { recursive: true });

// The white mark from the logo file (second path), with its own offset.
const mark = /<path d="([^"]+)" fill="#FEFEFE" transform="([^"]+)"/.exec(logo);
if (!mark) throw new Error('logo mark not found');

// Black, white, and three accents. Greys are only for quiet text and hairlines.
const C = {
  bg: '#050505', surface: '#0b0b0b', ink: '#ffffff', muted: '#8f8f8f', line: '#2b2b2b',
  cyan: '#22d3ee', blue: '#4f8dfd', green: '#3ddc84',
};
const palette = [C.cyan, C.blue, C.green];
const FONT = 'ui-monospace, SFMono-Regular, \'Cascadia Mono\', Consolas, \'Liberation Mono\', Menlo, monospace';
const EASE = '0.45 0 0.55 1'; // slow start, slow stop

// Small repeatable random generator, so the files come out the same every time.
let seed = 116;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(random() * list.length)];
const n3 = (value) => Number(value.toFixed(4));

// A border of coloured stripes. The colours take turns glowing softly and fading again;
// nothing moves around the edge. "repeats" is how many times the colours go round.
const stripedBorder = (w, h, repeats) => {
  const stripe = (2 * (w + h)) / (palette.length * repeats);
  return palette.map((color, i) => `<rect x="0.5" y="0.5" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="1.5" `
    + `stroke-dasharray="${stripe} ${stripe * (palette.length - 1)}" stroke-dashoffset="${-i * stripe}" opacity="0.2">`
    + `<animate attributeName="opacity" values="0.2;1;0.2" keyTimes="0;0.5;1" calcMode="spline" keySplines="${EASE};${EASE}" dur="6s" begin="${(i * 6) / palette.length}s" repeatCount="indefinite"/></rect>`).join('\n');
};

/* ---------- banner ---------- */

const W = 840, H = 260;

// The left block: the name on top, then the logo with the two lines of text beside it.
// TRACK is an invisible rounded rectangle around the logo and text. The name rests on its top
// edge, and once per loop the letters ride all the way round it like a train: along the top,
// turning to point down the right side, upside down along the bottom, up the left, and home.
const TRACK = { left: 58, right: 498, top: 98, bottom: 212, corner: 16 };
const NAME = 'uvxszi', NAME_SIZE = 56, CHAR = 36, NAME_X = 72;
const LOOP = 16;                      // seconds for the whole name sequence
const LAP_START = 4, LAP_END = 11;    // when the train sets off and when it is back

const lapPath = (x) => {
  const { left: l, right: r, top: t, bottom: b, corner: c } = TRACK;
  return `M${x} ${t} H${r - c} A${c} ${c} 0 0 1 ${r} ${t + c} V${b - c} A${c} ${c} 0 0 1 ${r - c} ${b} H${l + c} A${c} ${c} 0 0 1 ${l} ${b - c} V${t + c} A${c} ${c} 0 0 1 ${l + c} ${t} H${x}`;
};
// Each letter first lands from very large down to its real size, one after another.
const letters = [...NAME].map((letter, i) => `<g>
<animateMotion dur="${LOOP}s" repeatCount="indefinite" rotate="auto" calcMode="spline" keyTimes="0;${LAP_START / LOOP};${LAP_END / LOOP};1" keyPoints="0;0;1;1" keySplines="0 0 1 1;0.6 0 0.4 1;0 0 1 1" path="${lapPath(NAME_X + CHAR / 2 + i * CHAR)}"/>
<text class="letter letter-${i}" font-size="${NAME_SIZE}" font-weight="700" fill="${C.ink}" text-anchor="middle">${letter}</text>
</g>`).join('\n');

// The logo: a soft glow behind it that breathes and drifts through the three colours.
const LOGO = { x: 72, y: 112, size: 84 };
const colourCycle = palette.concat(palette[0]).join(';');
const logoBlock = `<rect x="${LOGO.x}" y="${LOGO.y}" width="${LOGO.size}" height="${LOGO.size}" fill="${C.cyan}" filter="url(#glow)">
<animate attributeName="fill" values="${colourCycle}" dur="12s" repeatCount="indefinite"/>
<animate attributeName="opacity" values="0.35;0.9;0.35" keyTimes="0;0.5;1" calcMode="spline" keySplines="${EASE};${EASE}" dur="4s" repeatCount="indefinite"/>
</rect>
<rect x="${LOGO.x + 0.5}" y="${LOGO.y + 0.5}" width="${LOGO.size - 1}" height="${LOGO.size - 1}" fill="#000" stroke="${C.cyan}">
<animate attributeName="stroke" values="${colourCycle}" dur="12s" repeatCount="indefinite"/>
</rect>
<g transform="translate(${LOGO.x},${LOGO.y}) scale(${LOGO.size / 2500})"><path d="${mark[1]}" fill="${C.ink}" transform="${mark[2]}"/></g>`;

// The line under "I like making stuff.": each word arrives and leaves in its own way.
const TEXT_X = LOGO.x + LOGO.size + 20;
const words = [
  ['software', C.cyan, 'slide'],
  ['game dev', C.blue, 'drop'],
  ['writing &amp; research', C.green, 'spread'],
  ['art', C.cyan, 'focus'],
  ['content creation', C.blue, 'rise'],
  ['community', C.green, 'grow'],
];
const WORD_SECONDS = 2;
// One shared timetable: arrive (0-4%), stay (to 13%), leave (to 16.5%), then wait for the next turn.
const wordKeyframes = (name, hiddenBefore, hiddenAfter) => '@keyframes ' + name + ' { '
  + '0% { opacity: 0; ' + hiddenBefore + ' } '
  + '4%, 13% { opacity: 1; transform: none; filter: none; letter-spacing: 0; } '
  + '16.5%, 100% { opacity: 0; ' + hiddenAfter + ' } }';

// The style sheets are put together from plain pieces of text, one rule per line.
const styleSheet = (rules) => '<style>\n' + rules.map((rule) => '  ' + rule).join('\n') + '\n</style>';
const fontRule = 'text { font-family: ' + FONT + '; }';

const bannerStyle = styleSheet([
  fontRule,
  // The name: every letter shares one animation and starts a little after the one before it.
  '.letter { opacity: 0; transform-box: fill-box; transform-origin: center; animation: letter ' + LOOP + 's cubic-bezier(0.16, 1, 0.3, 1) infinite both; }',
  '@keyframes letter { 0% { opacity: 0; transform: scale(7); } 3%, 94% { opacity: 1; transform: none; } 98%, 100% { opacity: 0; transform: none; } }',
  ...[...NAME].map((_, i) => '.letter-' + i + ' { animation-delay: ' + (i * 0.14).toFixed(2) + 's; }'),
  // The rotating words: each has its own motion and its own turn.
  '.word { opacity: 0; transform-box: fill-box; transform-origin: 0 50%; animation-duration: ' + words.length * WORD_SECONDS + 's; '
    + 'animation-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1); animation-iteration-count: infinite; animation-fill-mode: both; }',
  ...words.map(([, , motion], i) => '.word-' + i + ' { animation-name: ' + motion + '; animation-delay: ' + i * WORD_SECONDS + 's; }'),
  wordKeyframes('slide', 'transform: translateX(-26px);', 'transform: translateX(26px);'),
  wordKeyframes('drop', 'transform: translateY(-18px);', 'transform: translateY(18px);'),
  wordKeyframes('spread', 'letter-spacing: 9px;', 'letter-spacing: 9px;'),
  wordKeyframes('focus', 'filter: blur(7px);', 'filter: blur(7px);'),
  wordKeyframes('rise', 'transform: translateY(18px);', 'transform: translateY(-18px);'),
  wordKeyframes('grow', 'transform: scale(0.55);', 'transform: scale(1.35);'),
]);

const cardStyle = styleSheet([
  fontRule,
  '.pulse { animation: pulse 3.2s ease-in-out infinite; }',
  '@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }',
]);

// The terminal on the right: lines of random words are typed one after another. When a line is
// done everything scrolls up one row, and whatever leaves the top of the box is gone.
// The lines repeat after LINES of them; the start and end match, so the loop has no visible jump.
const VOCABULARY = [
  'idea', 'sketch', 'draft', 'build', 'script', 'render', 'pixel', 'sprite', 'shader', 'level', 'loop', 'frame',
  'layer', 'signal', 'story', 'chapter', 'panel', 'scene', 'cut', 'edit', 'mix', 'export', 'remix', 'mod',
  'plugin', 'patch', 'commit', 'push', 'deploy', 'debug', 'compile', 'prototype', 'server', 'archive', 'thumbnail',
  'caption', 'outline', 'research', 'notes', 'palette', 'texture', 'model', 'rig', 'bake', 'ship',
];
const TERM = { x: 560, y: 58, w: 252, h: 184, rowHeight: 18, fontSize: 13, charWidth: 7.8, pad: 12 };
const ROWS = Math.floor(TERM.h / TERM.rowHeight); // rows that fit in the box
const LINES = 18, LINE_SECONDS = 1.5, CHAR_SECONDS = 0.05, SCROLL_SECONDS = 0.3;
const TOTAL = LINES * LINE_SECONDS;
const MAX_CHARS = Math.min(Math.floor((TERM.w - 2 * TERM.pad) / TERM.charWidth) - 2, Math.floor((LINE_SECONDS - 0.4) / CHAR_SECONDS));

const lines = [];
for (let i = 0; i < LINES; i++) {
  let text = pick(VOCABULARY);
  for (;;) {
    const next = text + ' ' + pick(VOCABULARY);
    if (next.length > MAX_CHARS || random() < 0.2) break;
    text = next;
  }
  lines.push({ text, color: palette[i % palette.length] });
}

const promptX = TERM.x + TERM.pad;
const textX = promptX + 2 * TERM.charWidth;
const baseline = (row) => TERM.y + 15 + row * TERM.rowHeight;
const lineText = (line, row, extra) => `<text x="${promptX}" y="${baseline(row)}" font-size="${TERM.fontSize}" fill="${line.color}">&gt;</text>`
  + `<text x="${textX}" y="${baseline(row)}" font-size="${TERM.fontSize}" fill="${C.ink}" textLength="${n3(line.text.length * TERM.charWidth)}" lengthAdjust="spacingAndGlyphs"${extra}>${line.text}</text>`;

let typedClips = '';
let terminal = '';
// Already-typed copies of the last lines sit above the first one, so the loop starts where it ends.
for (let row = -(ROWS - 1); row < 0; row++) terminal += lineText(lines[LINES + row], row, '') + '\n';
lines.forEach((line, i) => {
  const start = i * LINE_SECONDS;
  const steps = [...line.text].map((_, j) => j + 1);
  const keyTimes = [0].concat(steps.map((j) => n3((start + j * CHAR_SECONDS) / TOTAL))).join(';');
  const timing = `calcMode="discrete" keyTimes="${keyTimes}" dur="${TOTAL}s" repeatCount="indefinite"`;
  typedClips += `<clipPath id="typed-${i}"><rect x="${textX}" y="${baseline(i) - 13}" width="0" height="${TERM.rowHeight}">`
    + `<animate attributeName="width" values="${[0].concat(steps.map((j) => n3(j * TERM.charWidth))).join(';')}" ${timing}/></rect></clipPath>\n`;
  // The line (and its cursor) only exist from the moment their turn starts.
  terminal += `<g opacity="${i === 0 ? 1 : 0}">`
    + (i === 0 ? '' : `<animate attributeName="opacity" calcMode="discrete" values="0;1" keyTimes="0;${n3(start / TOTAL)}" dur="${TOTAL}s" repeatCount="indefinite"/>`)
    + lineText(line, i, ` clip-path="url(#typed-${i})"`)
    + `<rect x="${textX}" y="${baseline(i) - 11}" width="${TERM.charWidth - 1}" height="13" fill="${line.color}">`
    + `<animate attributeName="x" values="${[textX].concat(steps.map((j) => n3(textX + j * TERM.charWidth))).join(';')}" ${timing}/>`
    + `<animate attributeName="opacity" calcMode="discrete" values="1;0" keyTimes="0;${n3((start + LINE_SECONDS) / TOTAL)}" dur="${TOTAL}s" repeatCount="indefinite"/></rect>`
    + '</g>\n';
});

// Scrolling: just before each new line starts, everything glides up by one row.
const scrollTo = (lineIndex) => (ROWS - 1 - lineIndex) * TERM.rowHeight;
const scrollTimes = [0], scrollValues = [scrollTo(0)];
for (let k = 1; k <= LINES; k++) {
  scrollTimes.push(n3((k * LINE_SECONDS - SCROLL_SECONDS) / TOTAL), n3((k * LINE_SECONDS) / TOTAL));
  scrollValues.push(scrollTo(k - 1), scrollTo(k));
}

const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="title">
<title id="title">uvxszi. I like making stuff: software, game dev, writing and research, art, content creation, community.</title>
${bannerStyle}
<defs>
<filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="10"/></filter>
<clipPath id="terminal"><rect x="${TERM.x + 1}" y="${TERM.y + 1}" width="${TERM.w - 2}" height="${TERM.h - 2}"/></clipPath>
${typedClips}</defs>

<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="${C.bg}" stroke="${C.line}"/>
${stripedBorder(W - 1, H - 1, 12)}

<rect x="20" y="16" width="8" height="8" fill="${C.cyan}"/>
<rect x="34" y="16" width="8" height="8" fill="${C.blue}"/>
<rect x="48" y="16" width="8" height="8" fill="${C.green}"/>
<text x="72" y="25" font-size="12" fill="${C.muted}">~/uvxszi</text>
<text x="${W - 20}" y="25" font-size="12" fill="${C.muted}" text-anchor="end">uvxszi.com</text>
<line x1="1" y1="40.5" x2="${W - 1}" y2="40.5" stroke="${C.line}"/>

${logoBlock}

<text x="${TEXT_X}" y="${LOGO.y + 34}" font-size="16" fill="${C.muted}">I like making stuff.</text>
<text x="${TEXT_X}" y="${LOGO.y + 66}" font-size="16" fill="${C.cyan}">&gt;</text>
${words.map(([word, color], i) => `<text class="word word-${i}" x="${TEXT_X + 22}" y="${LOGO.y + 66}" font-size="16" fill="${color}">${word}</text>`).join('\n')}

${letters}

<rect x="${TERM.x + 0.5}" y="${TERM.y + 0.5}" width="${TERM.w - 1}" height="${TERM.h - 1}" fill="#000" stroke="${C.line}"/>
<g clip-path="url(#terminal)">
<g>
<animateTransform attributeName="transform" type="translate" values="${scrollValues.map((y) => '0 ' + y).join(';')}" keyTimes="${scrollTimes.join(';')}" dur="${TOTAL}s" repeatCount="indefinite"/>
${terminal}</g>
</g>
</svg>
`;
fs.writeFileSync(path.join(out, 'banner.svg'), banner);

/* ---------- cards ---------- */

// card(file name, small label, main text, colour, hint shown top right or '', width)
const card = (file, label, value, color, hint, w) => {
  const h = 64;
  fs.writeFileSync(path.join(out, file), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="title">
<title id="title">${label}: ${value}</title>
${cardStyle}
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="${C.surface}" stroke="${C.line}"/>
${stripedBorder(w - 1, h - 1, 4)}
<rect class="pulse" x="16" y="15" width="8" height="8" fill="${color}"/>
<text x="32" y="23" font-size="10" letter-spacing="1.5" fill="${color}">${label.toUpperCase()}</text>
${hint ? `<text x="${w - 16}" y="23" font-size="11" fill="${C.muted}" text-anchor="end">${hint}</text>` : ''}
<text x="16" y="47" font-size="15" fill="${C.ink}">${value}</text>
</svg>
`);
};
const OPEN = 'open &#8599;';

// Each row of cards adds up to the banner's width (840) and the README puts them
// side by side with no gap, so every row's edges line up.

// Links to GitHub: four across.
card('github.svg', 'GitHub', 'all repositories', C.cyan, OPEN, 210);
card('repo-portfolio.svg', 'Repo', 'portfolio', C.blue, OPEN, 210);
card('repo-sayn.svg', 'Repo', 'sayn.cc', C.green, OPEN, 210);
card('repo-zybooks.svg', 'Repo', 'ZyBooksAutoUltra', C.cyan, OPEN, 210);

// Contact: three across.
card('discord.svg', 'Discord', 'u.v.x', C.blue, '', 280);
card('email.svg', 'Email', 'contact@uvxszi.com', C.green, OPEN, 280);
card('web.svg', 'Web', 'uvxszi.com', C.cyan, OPEN, 280);

for (const file of fs.readdirSync(out)) console.log(file, fs.statSync(path.join(out, file)).size + ' bytes');
