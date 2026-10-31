/* =========================================================
   Constellation Memory Map
   - HTML5 Canvas rendering
   - 2D vector physics: spring-gravity between nearby stars,
     collision repulsion, damping, wall bounce, drag & throw
   - Constellations found with union-find over the links
   - Saved in localStorage, export / import as JSON
   ========================================================= */

// ---------- Small 2D vector helper ----------
const Vec = {
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  len: (v) => Math.hypot(v.x, v.y),
  scale: (v, s) => ({ x: v.x * s, y: v.y * s }),
  norm: (v) => { const l = Math.hypot(v.x, v.y) || 1; return { x: v.x / l, y: v.y / l }; }
};

// ---------- Settings ----------
const COLORS = ['#a5b4fc', '#f9a8d4', '#fde68a', '#86efac', '#67e8f9', '#fca5a5'];
const STORAGE_KEY = 'constellation_memory_map';
const settings = {
  gravity: 1,          // strength of attraction between linked stars
  linkDist: 180,       // stars closer than this get a constellation line
  restDist: 95,        // distance linked stars settle at
  damping: 0.9,        // velocity multiplier per frame (friction)
  showLabels: true
};

// ---------- State ----------
let stars = [];               // user's memory stars
let links = [];               // pairs of linked stars (recomputed each frame)
let groups = [];              // constellations (arrays of stars)
let bgStars = [];             // decorative twinkling background
let shooting = null;          // current shooting star animation
let dragging = null;          // star being dragged
let hovered = null;
let selected = null;
let editing = null;           // star being edited in the composer
let pendingPos = null;        // where a new star will be placed
let pointer = { x: 0, y: 0, prevX: 0, prevY: 0, downX: 0, downY: 0 };
let searchTerm = '';
let W = 0, H = 0, DPR = 1, time = 0;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const canvas = $('sky');
const ctx = canvas.getContext('2d');
const tooltip = $('tooltip');

// =========================================================
//  Storage
// =========================================================
function save() {
  const data = stars.map(({ id, x, y, text, type, color, created, done }) =>
    ({ id, x: x / W, y: y / H, text, type, color, created, done }));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
}

function load() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { data = null; }
  if (!Array.isArray(data)) data = sampleSky();
  stars = data.map(fromData);
}

// Positions are stored as 0-1 fractions so the sky fits any screen size
function fromData(d) {
  return {
    id: d.id || uid(),
    x: (d.x ?? Math.random()) * W,
    y: (d.y ?? Math.random()) * H,
    vx: 0, vy: 0,
    text: String(d.text || '').slice(0, 200),
    type: d.type === 'goal' ? 'goal' : 'memory',
    color: COLORS.includes(d.color) ? d.color : COLORS[0],
    created: d.created || Date.now(),
    done: !!d.done,
    phase: Math.random() * Math.PI * 2
  };
}

function sampleSky() {
  const now = Date.now();
  return [
    { x: 0.30, y: 0.40, text: 'First day of college – got lost finding the lab', type: 'memory', color: COLORS[0], created: now },
    { x: 0.36, y: 0.52, text: 'Won the inter-college hackathon with my team', type: 'memory', color: COLORS[2], created: now },
    { x: 0.24, y: 0.55, text: 'Late-night coding sessions with friends', type: 'memory', color: COLORS[1], created: now },
    { x: 0.66, y: 0.38, text: 'Learn Django and build a full-stack app', type: 'goal', color: COLORS[3], created: now },
    { x: 0.72, y: 0.50, text: 'Land a summer internship', type: 'goal', color: COLORS[4], created: now },
    { x: 0.55, y: 0.72, text: 'Trip to the mountains after exams', type: 'memory', color: COLORS[5], created: now }
  ];
}

function uid() { return Math.random().toString(36).slice(2, 10); }

// =========================================================
//  Canvas setup
// =========================================================
function resize() {
  const oldW = W, oldH = H;
  DPR = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // keep stars in the same relative place after a resize
  if (oldW && oldH) stars.forEach(s => { s.x *= W / oldW; s.y *= H / oldH; });

  bgStars = Array.from({ length: Math.round((W * H) / 2500) }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.2 + 0.2,
    tw: Math.random() * Math.PI * 2,
    sp: Math.random() * 0.03 + 0.005
  }));
}

function radius(s) { return s.type === 'goal' ? 9 : 7; }

// =========================================================
//  Physics
// =========================================================
function physics() {
  const g = settings.gravity;
  const L = settings.linkDist;

  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const a = stars[i], b = stars[j];
      const delta = Vec.sub(b, a);
      const d = Vec.len(delta) || 0.01;
      const dir = Vec.norm(delta);
      let force = 0;

      // 1) Collision: stars push each other away when overlapping
      const minDist = radius(a) + radius(b) + 18;
      if (d < minDist) force -= (minDist - d) * 0.25;

      // 2) Gravity: within link range, stars are pulled toward a resting
      //    distance (like a soft spring), so constellations settle neatly
      if (d < L) force += (d - settings.restDist) * 0.004 * g * (1 - d / L);

      const f = Vec.scale(dir, force);
      if (a !== dragging) { a.vx += f.x; a.vy += f.y; }
      if (b !== dragging) { b.vx -= f.x; b.vy -= f.y; }
    }
  }

  stars.forEach(s => {
    if (s === dragging) return;
    s.vx *= settings.damping;
    s.vy *= settings.damping;
    s.x += s.vx;
    s.y += s.vy;
    // bounce off the screen edges (top edge leaves room for the HUD)
    const r = radius(s), top = 80;
    if (s.x < r) { s.x = r; s.vx *= -0.6; }
    if (s.x > W - r) { s.x = W - r; s.vx *= -0.6; }
    if (s.y < top) { s.y = top; s.vy *= -0.6; }
    if (s.y > H - r) { s.y = H - r; s.vy *= -0.6; }
  });
}

// Links + constellations (union-find)
function computeLinks() {
  links = [];
  const parent = new Map(stars.map(s => [s, s]));
  const find = (s) => { while (parent.get(s) !== s) s = parent.get(s); return s; };

  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const d = Vec.len(Vec.sub(stars[i], stars[j]));
      if (d < settings.linkDist) {
        links.push({ a: stars[i], b: stars[j], strength: 1 - d / settings.linkDist });
        parent.set(find(stars[i]), find(stars[j]));
      }
    }
  }

  const byRoot = new Map();
  stars.forEach(s => {
    const r = find(s);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r).push(s);
  });
  groups = [...byRoot.values()].filter(g => g.length > 1);
}

// =========================================================
//  Drawing
// =========================================================
function matches(s) {
  return !searchTerm || s.text.toLowerCase().includes(searchTerm);
}

function drawBackground() {
  ctx.clearRect(0, 0, W, H);
  bgStars.forEach(b => {
    b.tw += b.sp;
    ctx.globalAlpha = 0.35 + Math.sin(b.tw) * 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawShootingStar() {
  if (!shooting && Math.random() < 0.003) {
    shooting = { x: Math.random() * W * 0.7, y: Math.random() * H * 0.3, life: 1 };
  }
  if (!shooting) return;
  const s = shooting;
  const tail = 120;
  const grad = ctx.createLinearGradient(s.x, s.y, s.x - tail, s.y - tail * 0.4);
  grad.addColorStop(0, `rgba(255,255,255,${s.life})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x - tail, s.y - tail * 0.4);
  ctx.stroke();
  s.x += 9; s.y += 3.6; s.life -= 0.015;
  if (s.life <= 0) shooting = null;
}

function drawLinks() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  links.forEach(({ a, b, strength }) => {
    const dim = matches(a) && matches(b) ? 1 : 0.15;
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, a.color);
    grad.addColorStop(1, b.color);
    ctx.globalAlpha = (0.2 + strength * 0.7) * dim;
    ctx.strokeStyle = grad;
    ctx.shadowColor = a.color;
    ctx.shadowBlur = 12 * strength;
    ctx.lineWidth = 0.6 + strength * 1.8;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });
  ctx.restore();
}

function drawStar(s) {
  const r = radius(s);
  const pulse = 1 + Math.sin(time * 0.05 + s.phase) * 0.12;
  const dim = matches(s) ? 1 : 0.2;
  const highlight = s === hovered || s === selected || s === dragging;

  ctx.save();
  ctx.globalAlpha = dim;

  // soft glow halo
  const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 5 * pulse);
  glow.addColorStop(0, s.color + 'aa');
  glow.addColorStop(1, s.color + '00');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(s.x, s.y, r * 5 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // star body: memories are round, goals are 4-point sparkles
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = s.color;
  ctx.shadowBlur = highlight ? 30 : 15;
  ctx.beginPath();
  if (s.type === 'goal') {
    const R = r * 1.6 * pulse, inner = r * 0.45;
    for (let k = 0; k < 8; k++) {
      const ang = (Math.PI / 4) * k - Math.PI / 2;
      const rad = k % 2 === 0 ? R : inner;
      ctx.lineTo(s.x + Math.cos(ang) * rad, s.y + Math.sin(ang) * rad);
    }
    ctx.closePath();
  } else {
    ctx.arc(s.x, s.y, r * 0.8 * pulse, 0, Math.PI * 2);
  }
  ctx.fill();

  // achieved goals get a ring
  if (s.type === 'goal' && s.done) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 2.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (highlight) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = s.color;
    ctx.setLineDash([3, 4]);
    ctx.lineDashOffset = -time * 0.3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 3.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (settings.showLabels) {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = dim * 0.75;
    ctx.fillStyle = '#dbe0ff';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    const label = s.text.length > 22 ? s.text.slice(0, 21) + '…' : s.text;
    ctx.fillText(label, s.x, s.y + r * 3 + 10);
  }
  ctx.restore();
}

function updateStats() {
  $('statStars').textContent = stars.length;
  $('statLinks').textContent = links.length;
  $('statGroups').textContent = groups.length;
}

function loop() {
  time++;
  physics();
  computeLinks();
  drawBackground();
  drawShootingStar();
  drawLinks();
  stars.forEach(drawStar);
  if (time % 15 === 0) updateStats();
  if (time % 120 === 0) save();   // periodic save keeps settled positions
  requestAnimationFrame(loop);
}

// =========================================================
//  Interaction
// =========================================================
function starAt(x, y) {
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    if (Vec.len(Vec.sub(s, { x, y })) < radius(s) * 2.5) return s;
  }
  return null;
}

canvas.addEventListener('pointerdown', (e) => {
  pointer.downX = pointer.prevX = pointer.x = e.clientX;
  pointer.downY = pointer.prevY = pointer.y = e.clientY;
  const s = starAt(e.clientX, e.clientY);
  if (s) {
    dragging = s;
    s.vx = s.vy = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.className = 'grabbing';
    // bring dragged star to the top of the draw order
    stars.splice(stars.indexOf(s), 1);
    stars.push(s);
  }
});

canvas.addEventListener('pointermove', (e) => {
  pointer.prevX = pointer.x; pointer.prevY = pointer.y;
  pointer.x = e.clientX; pointer.y = e.clientY;

  if (dragging) {
    dragging.x = e.clientX;
    dragging.y = Math.max(80, e.clientY);
    hideTooltip();
    return;
  }
  hovered = starAt(e.clientX, e.clientY);
  canvas.className = hovered ? 'grab' : '';
  if (hovered) showTooltip(hovered, e.clientX, e.clientY);
  else hideTooltip();
});

canvas.addEventListener('pointerup', (e) => {
  if (!dragging) return;
  const moved = Math.hypot(e.clientX - pointer.downX, e.clientY - pointer.downY);
  if (moved < 4) {
    openDetail(dragging);                 // treat as a click
  } else {
    // "throw": release velocity is the last pointer movement
    dragging.vx = (pointer.x - pointer.prevX) * 0.6;
    dragging.vy = (pointer.y - pointer.prevY) * 0.6;
    save();
  }
  dragging = null;
  canvas.className = '';
});

canvas.addEventListener('dblclick', (e) => {
  if (starAt(e.clientX, e.clientY)) return;
  openComposer(null, { x: e.clientX, y: Math.max(90, e.clientY) });
});

function showTooltip(s, x, y) {
  const date = new Date(s.created).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  tooltip.innerHTML = '';
  tooltip.append(document.createTextNode(s.text));
  const small = document.createElement('small');
  small.textContent = (s.type === 'goal' ? (s.done ? '🎯 Goal · achieved' : '🎯 Goal') : '🌙 Memory') + ' · ' + date;
  tooltip.append(small);
  tooltip.classList.remove('hidden');
  const tx = Math.min(x + 16, W - tooltip.offsetWidth - 8);
  const ty = Math.min(y + 16, H - tooltip.offsetHeight - 8);
  tooltip.style.left = tx + 'px';
  tooltip.style.top = ty + 'px';
}
function hideTooltip() { tooltip.classList.add('hidden'); }

// ---------- Composer ----------
let chosenColor = COLORS[0];
function buildColorPicker() {
  const wrap = $('colorPicker');
  wrap.innerHTML = '';
  COLORS.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (c === chosenColor ? ' active' : '');
    b.style.background = c;
    b.style.boxShadow = `0 0 10px ${c}`;
    b.setAttribute('aria-label', 'Colour ' + c);
    b.onclick = () => { chosenColor = c; buildColorPicker(); };
    wrap.append(b);
  });
}

function openComposer(star, pos) {
  editing = star;
  pendingPos = pos;
  $('composerTitle').textContent = star ? 'Edit this star' : 'Drop a starlight memory';
  $('fText').value = star ? star.text : '';
  document.querySelector(`input[name="fType"][value="${star ? star.type : 'memory'}"]`).checked = true;
  chosenColor = star ? star.color : COLORS[Math.floor(Math.random() * COLORS.length)];
  buildColorPicker();
  $('composer').classList.remove('hidden');
  $('fText').focus();
}
function closeComposer() { $('composer').classList.add('hidden'); editing = null; }

$('composerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('fText').value.trim();
  if (!text) return;
  const type = document.querySelector('input[name="fType"]:checked').value;
  if (editing) {
    Object.assign(editing, { text, type, color: chosenColor });
    openDetail(editing);
  } else {
    const p = pendingPos || { x: W / 2 + (Math.random() - 0.5) * 200, y: H / 2 + (Math.random() - 0.5) * 200 };
    stars.push(fromData({ x: p.x / W, y: p.y / H, text, type, color: chosenColor, created: Date.now() }));
    fadeHelp();
  }
  save();
  closeComposer();
});
$('btnCancel').onclick = closeComposer;
$('composer').addEventListener('click', (e) => { if (e.target.id === 'composer') closeComposer(); });
$('btnNew').onclick = () => openComposer(null, null);

// ---------- Detail panel ----------
function openDetail(s) {
  selected = s;
  $('dType').textContent = s.type === 'goal' ? '🎯 Goal' : '🌙 Memory';
  $('dText').textContent = s.text;
  const group = groups.find(g => g.includes(s));
  $('dMeta').textContent = 'Added ' + new Date(s.created).toLocaleString() +
    (group ? ` · part of a ${group.length}-star constellation` : ' · a lone star');
  $('goalDoneWrap').classList.toggle('hidden', s.type !== 'goal');
  $('dDone').checked = !!s.done;
  $('detail').classList.remove('hidden');
}
function closeDetail() { selected = null; $('detail').classList.add('hidden'); }

$('btnCloseDetail').onclick = closeDetail;
$('btnEdit').onclick = () => selected && openComposer(selected, null);
$('btnDelete').onclick = () => {
  if (!selected || !confirm('Let this star fade away?')) return;
  stars = stars.filter(s => s !== selected);
  closeDetail();
  save();
};
$('dDone').onchange = (e) => { if (selected) { selected.done = e.target.checked; save(); } };

// ---------- Menu & settings ----------
$('btnMenu').onclick = () => $('menu').classList.toggle('hidden');
$('gravity').oninput = (e) => { settings.gravity = +e.target.value; };
$('linkDist').oninput = (e) => {
  settings.linkDist = +e.target.value;
  settings.restDist = settings.linkDist * 0.53;
};
$('showLabels').onchange = (e) => { settings.showLabels = e.target.checked; };
$('search').oninput = (e) => { searchTerm = e.target.value.trim().toLowerCase(); };

$('btnExport').onclick = () => {
  save();
  let json = '[]';
  try { json = localStorage.getItem(STORAGE_KEY) || '[]'; } catch (e) { /* ignore */ }
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'my-constellations.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

$('fileImport').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('bad file');
      stars = data.map(fromData);
      closeDetail();
      save();
    } catch (err) {
      alert('That file is not a valid constellation map.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
};

$('btnClear').onclick = () => {
  if (!confirm('Clear every star from the sky?')) return;
  stars = [];
  closeDetail();
  save();
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeComposer(); closeDetail(); $('menu').classList.add('hidden'); }
});

function fadeHelp() { $('help').style.opacity = '0'; }

// =========================================================
//  Start
// =========================================================
window.addEventListener('resize', resize);
resize();
load();
loop();
