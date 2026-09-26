/* Nusrat Jahan portfolio
   1. nav   2. one line hero text   3. try my model (review routing)   4. hero background
   5. hand to code   6. reveal on scroll   7. story line   8. project filters */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. nav ---------- */
const nav = $('#nav');
const onScrollNav = () => nav.classList.toggle('solid', scrollY > 40);
addEventListener('scroll', onScrollNav, { passive: true }); onScrollNav();
$('#navToggle').addEventListener('click', () => $('.nav-links').classList.toggle('open'));
$$('.nav-links a').forEach(a => a.addEventListener('click', () => $('.nav-links').classList.remove('open')));

/* ---------- 2. keep the hero lines on one line ----------
   Each .fit line shrinks its font until it fits the space it has.
   If a line gets too small, it splits at a chosen point (never in a random place). */
function fitLine(el) {
  const max = +el.dataset.max, min = +el.dataset.min, room = el.parentElement.clientWidth;
  el.classList.remove('split');
  el.style.fontSize = max + 'px';
  let size = Math.min(max, max * room / el.offsetWidth);
  if (size < min && el.querySelector('.seg')) {
    el.classList.add('split'); el.style.fontSize = max + 'px';
    size = Math.min(max, max * room / el.offsetWidth);
  }
  el.style.fontSize = Math.floor(size * 10) / 10 + 'px';
}
function fitAll() {
  $$('.fit').forEach(fitLine);
  const groups = {};                           // lines in the same group share one size
  $$('.fit[data-group]').forEach(el => (groups[el.dataset.group] ||= []).push(el));
  Object.values(groups).forEach(g => {
    const split = g.some(el => el.classList.contains('split'));
    if (split) g.forEach(el => { if (!el.classList.contains('split')) { el.classList.add('split'); } });
    if (split) g.forEach(fitLineKeepSplit);
    const size = Math.min(...g.map(el => parseFloat(el.style.fontSize)));
    g.forEach(el => el.style.fontSize = size + 'px');
  });
}
function fitLineKeepSplit(el) {                // refit a line that must stay split
  const max = +el.dataset.max, room = el.parentElement.clientWidth;
  el.style.fontSize = max + 'px';
  el.style.fontSize = Math.floor(Math.min(max, max * room / el.offsetWidth) * 10) / 10 + 'px';
}

/* ---------- 3. try my model: which hotel team should handle this review? ----------
   A small Naive Bayes text classifier, trained on the 80 example reviews below.
   It is the same idea as my Hotel Review Routing project, rebuilt in plain JavaScript
   so it runs instantly on this page. It also shows WHY: the words that pushed the decision. */
const TEAMS = {
  Housekeeping: { color: '#2F8F96', data: [
    'the room was dirty when we arrived', 'sheets had stains on them', 'bathroom was not cleaned', 'no clean towels in the room',
    'dust everywhere and hair in the sink', 'the carpet smelled bad', 'please change the bed linen', 'room was spotless and fresh',
    'housekeeping never came to clean', 'trash was not emptied', 'we needed extra pillows and blankets', 'the room smelled of smoke',
    'lovely clean room and soft bed', 'towels were dirty', 'bed was not made all day', 'saw a spider in the bathroom',
    'the maid did a great job', 'bed bugs in the mattress', 'toilet was dirty', 'fresh towels every morning thank you'] },
  'Front Desk': { color: '#1C3446', data: [
    'check in took forever', 'staff at reception were rude', 'they lost our booking', 'we were charged twice on the bill',
    'the receptionist was so friendly', 'waited an hour to check in', 'could not get a late checkout', 'wrong room type given',
    'key card stopped working at the desk', 'nobody answered the phone at reception', 'great welcome from the front desk team', 'refund still not received',
    'booking was cancelled without telling us', 'invoice had extra fees', 'upgrade was promised but not given', 'the manager fixed our reservation quickly',
    'long line at check out', 'staff helped us book a taxi', 'payment problem at checkout', 'reception gave us wrong information'] },
  Restaurant: { color: '#B07A3B', data: [
    'breakfast was cold', 'the food was delicious', 'dinner took an hour to arrive', 'coffee was terrible',
    'waiter forgot our order', 'buffet had very little choice', 'amazing breakfast buffet', 'restaurant was closed early',
    'the pasta was overcooked', 'room service food arrived cold', 'bar drinks were overpriced', 'no vegetarian options on the menu',
    'eggs were raw at breakfast', 'lovely dinner with great service', 'the chef made a special meal for my son', 'juice and bread were stale',
    'tables were not cleared in the restaurant', 'breakfast ran out of food', 'our lunch was too salty', 'the wine list was great'] },
  Maintenance: { color: '#A83A3A', data: [
    'the shower was broken', 'air conditioning did not work', 'no hot water in the morning', 'the tv remote was broken',
    'toilet kept running all night', 'light in the bathroom flickered', 'the heater made a loud noise', 'window would not close',
    'wifi kept dropping', 'the elevator was out of order', 'leak from the ceiling', 'door lock was broken',
    'sink was blocked', 'fridge was not cold', 'power socket did not work', 'the fan was very noisy',
    'nobody came to fix the shower', 'water pressure was too low', 'the ac was fixed fast', 'room was too hot and the thermostat was broken'] },
};
const STOP = new Set('a an the and or but was were is are be been to of in on at for with we our us i my me it this that there they them from so all very too not no nobody never did do had has have just when then than by as up out into'.split(' '));
const stem = w => w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '').replace(/(.)\1$/, '$1') : w;
const tokens = t => (t.toLowerCase().match(/[a-z]+/g) || []).filter(w => w.length > 1 && !STOP.has(w)).map(stem);
const NEG = new Set(['dirty','rude','broken','cold','lost','terrible','never','slow','wrong','bad','stain','forever','noisy','leak','blocked','stale','raw','overpriced','charged','twice','wait','waited','smell','smelled','flicker','hot','problem','closed','forgot','overcook','overcooked','loud','drop','dropping','salty','late','nobody','not','no']);
const POS = new Set(['great','lovely','amazing','delicious','friendly','spotless','fresh','thank','thanks','clean','fast','quick','quickly','helpful','perfect','excellent','nice','good','best','love','loved','kind','comfortable','soft','special','helped']);

// train: word counts per team, with add one smoothing
const model = { vocab: new Set(), teams: {} };
Object.entries(TEAMS).forEach(([t, v]) => {
  const counts = {}; let total = 0;
  v.data.forEach(s => tokens(s).forEach(w => { counts[w] = (counts[w] || 0) + 1; total++; model.vocab.add(w); }));
  model.teams[t] = { counts, total };
});
const V = model.vocab.size;
const logp = (t, w) => Math.log(((model.teams[t].counts[w] || 0) + 1) / (model.teams[t].total + V));

function classify(text) {
  const ws = tokens(text).filter(w => model.vocab.has(w));
  if (!ws.length) return null;
  const names = Object.keys(TEAMS), scores = names.map(t => ws.reduce((s, w) => s + logp(t, w), 0));
  const mx = Math.max(...scores), ex = scores.map(s => Math.exp(s - mx)), sum = ex.reduce((a, b) => a + b, 0);
  const probs = names.map((t, i) => ({ t, p: ex[i] / sum })).sort((a, b) => b.p - a.p);
  const winner = probs[0].t;
  // a word counts as a reason if it is much more likely for the winning team than for the others
  const why = new Set(ws.filter(w => names.every(o => o === winner || logp(winner, w) - logp(o, w) > .4)));
  return { probs, winner, why };
}

const nlpIn = $('#nlpText');
function show(text) {
  const r = classify(text), words = text.split(/(\s+)/);
  if (!r) {
    $('#nlpTeam').textContent = text.trim() ? 'not sure yet' : '…';
    $('#nlpMood').textContent = '';
    $('#nlpBars').innerHTML = Object.keys(TEAMS).map(t => bar(t, 0, false)).join('');
    $('#nlpWhy').textContent = text.trim() ? 'I do not know these words yet. Try words like room, shower, breakfast or check in.' : 'type something above, or pick an example';
    return;
  }
  if ($('#nlpTeam').textContent !== r.winner) rippleFrom($('#nlp'));
  $('#nlpTeam').textContent = r.winner;
  $('#nlpTeam').style.color = TEAMS[r.winner].color;
  const all = (text.toLowerCase().match(/[a-z]+/g) || []);
  const neg = all.filter(w => NEG.has(w) || NEG.has(stem(w))).length, pos = all.filter(w => POS.has(w) || POS.has(stem(w))).length;
  $('#nlpMood').textContent = neg > pos ? 'guest sounds unhappy' : pos > neg ? 'guest sounds happy' : 'neutral';
  $('#nlpBars').innerHTML = r.probs.map((x, i) => bar(x.t, x.p, i === 0)).join('');
  const col = TEAMS[r.winner].color;
  $('#nlpWhy').innerHTML = words.map(w => {
    const clean = w.toLowerCase().replace(/[^a-z]/g, '');
    return r.why.has(stem(clean)) && clean && !STOP.has(clean) ? `<mark style="border-color:${col};color:${col}">${esc(w)}</mark>` : esc(w);
  }).join('');
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const bar = (t, p, top) => `<div class="bar${top ? ' top' : ''}"><span>${t}</span><div class="track"><div class="fill" style="width:${Math.round(p * 100)}%;background:${TEAMS[t].color}"></div></div><span class="pct">${Math.round(p * 100)}%</span></div>`;

const SAMPLES = ['The shower was broken and nobody came to fix it', 'Breakfast was cold and the coffee was terrible', 'Check in took forever and the staff were rude', 'Lovely clean room, fresh towels every day'];
const CHIPS = ['broken shower', 'cold breakfast', 'slow check in', 'clean room'];
$('#nlpSamples').innerHTML = CHIPS.map((c, i) => `<button type="button" data-i="${i}">try: ${c}</button>`).join('');
let touched = false, demoTimer = null;
$$('#nlpSamples button').forEach(b => b.addEventListener('click', () => { touched = true; clearTimeout(demoTimer); nlpIn.value = SAMPLES[+b.dataset.i]; show(nlpIn.value); }));
nlpIn.addEventListener('input', () => { touched = true; clearTimeout(demoTimer); show(nlpIn.value); });
nlpIn.addEventListener('focus', () => { touched = true; clearTimeout(demoTimer); });

// until someone touches it, the box types example reviews by itself
let demoIdx = 0;
function typeDemo() {
  if (touched) return;
  const s = SAMPLES[demoIdx++ % SAMPLES.length]; let k = 0;
  const step = () => {
    if (touched) return;
    nlpIn.value = s.slice(0, ++k); show(nlpIn.value);
    demoTimer = setTimeout(k < s.length ? step : typeDemo, k < s.length ? (still ? 0 : 45) : 3200);
  };
  step();
}
show('');

/* ---------- 4. page background: falling snowflakes that wake up into a network ----------
   Near your cursor the snowflakes light up and link to each other, and tiny maple leaves run between them.
   With no cursor, a slow "attention" point wanders by itself. When the model decides, a ripple goes out. */
const bg = $('#bg'), bctx = bg.getContext('2d');
// a real snowflake: six arms, each with two pairs of branches and a round tip, around a small hexagon.
// It is drawn once at a large size and then reused, so hundreds of flakes stay smooth.
function makeFlake(color) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); x.translate(32, 32);
  x.strokeStyle = x.fillStyle = color; x.lineWidth = 3.4; x.lineCap = x.lineJoin = 'round';
  for (let i = 0; i < 6; i++) {
    x.save(); x.rotate(i * Math.PI / 3);
    x.beginPath(); x.moveTo(0, -6); x.lineTo(0, -25);                          // the arm
    for (const [at, len] of [[-12, 8], [-19, 6]]) {                            // two pairs of branches
      x.moveTo(0, at); x.lineTo(-len * .7, at - len);
      x.moveTo(0, at); x.lineTo(len * .7, at - len);
    }
    x.stroke(); x.beginPath(); x.arc(0, -26, 2.8, 0, 7); x.fill();           // round tip
    x.restore();
  }
  x.beginPath();                                                             // hexagon in the middle
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; x.lineTo(Math.cos(a) * 7, Math.sin(a) * 7); }
  x.closePath(); x.fill();
  return c;
}
const FLAKE = { calm: makeFlake('rgb(110,145,170)'), lit: makeFlake('rgb(47,143,150)') };

// a small maple leaf shape (about 20 units tall), used for the signals that run between snowflakes
const LEAF = new Path2D('M0 -10 L2 -6 L4 -7 L3 -2 L7 -4 L6 -2 L9 -1 L7 1 L8 3 L3 2 L3.5 4.5 L0.6 3.6 L0.6 9 L-0.6 9 L-0.6 3.6 L-3.5 4.5 L-3 2 L-8 3 L-7 1 L-9 -1 L-6 -2 L-7 -4 L-3 -2 L-4 -7 L-2 -6 Z');
let BW = 0, BH = 0, dots = [], sparks = [], ripples = [], focus = { x: 0, y: 0, on: false };
function sizeBg() {
  const d = Math.min(devicePixelRatio || 1, 2);
  BW = innerWidth; BH = innerHeight;
  bg.width = BW * d; bg.height = BH * d; bctx.setTransform(d, 0, 0, d, 0, 0);
  const gap = BW < 600 ? 44 : 56; dots = [];
  for (let y = gap / 2; y < BH; y += gap) for (let x = gap / 2; x < BW; x += gap)
    dots.push({ x0: x + (Math.random() - .5) * 14, y0: y + (Math.random() - .5) * 14, ph: Math.random() * 6.28, x, y, glow: 0,
      v: .12 + Math.random() * .3, s: 3.5 + Math.random() * 2.5, rot: Math.random() * 6.28, vr: (Math.random() - .5) * .01 });
}
addEventListener('pointermove', e => { focus.x = e.clientX; focus.y = e.clientY; focus.on = true; }, { passive: true });
document.addEventListener('pointerleave', () => { focus.on = false; });
document.addEventListener('mouseout', e => { if (!e.relatedTarget) focus.on = false; });
function rippleFrom(el) {
  if (still) return;
  const r = el.getBoundingClientRect();
  ripples.push({ x: r.left + r.width / 2, y: r.top + r.height / 3, r: 0 });
}

function bgFrame(t) {
  if (BW && !document.hidden) {
    bctx.clearRect(0, 0, BW, BH);
    // where attention is: your cursor, or a slow wandering point
    const fx = focus.on ? focus.x : BW * (.5 + .38 * Math.sin(t / 5200)), fy = focus.on ? focus.y : BH * (.5 + .34 * Math.sin(t / 3700 + 1));
    const R = BW < 600 ? 110 : 160;
    const near = [];
    dots.forEach(p => {
      if (!still) { p.y0 += p.v; p.rot += p.vr; if (p.y0 > BH + 12) { p.y0 = -12; p.x0 = Math.random() * BW; } }   // snow falls
      p.x = p.x0 + Math.sin(t / 1900 + p.ph) * 7; p.y = p.y0;
      const d = Math.hypot(p.x - fx, p.y - fy);
      let g = d < R ? 1 - d / R : 0;
      ripples.forEach(rp => { const k = Math.abs(Math.hypot(p.x - rp.x, p.y - rp.y) - rp.r); if (k < 26) g = Math.max(g, (1 - k / 26) * (1 - rp.r / 700)); });
      p.glow += (g - p.glow) * .12;
      if (p.glow > .05) near.push(p);
    });
    // links between lit dots
    for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
      const a = near[i], b = near[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 84) {
        const al = Math.min(a.glow, b.glow) * (1 - d / 84) * (BW < 960 ? .3 : .55);
        bctx.strokeStyle = `rgba(47,143,150,${al})`; bctx.lineWidth = 1;
        bctx.beginPath(); bctx.moveTo(a.x, a.y); bctx.lineTo(b.x, b.y); bctx.stroke();
        if (!still && Math.random() < .0025 * a.glow) sparks.push({ a, b, t: 0, spin: Math.random() * 6.28 });
      }
    }
    // signals running along the links
    sparks = sparks.filter(s => {
      s.t += .012; if (s.t > 1) return false;          // slow and gentle, like a leaf drifting
      const x = s.a.x + (s.b.x - s.a.x) * s.t, y = s.a.y + (s.b.y - s.a.y) * s.t;
      bctx.save(); bctx.translate(x, y); bctx.rotate(Math.sin(s.t * 9 + s.spin) * .45); bctx.scale(.6, .6);   // a tiny maple leaf
      bctx.fillStyle = 'rgba(168,58,58,.95)'; bctx.fill(LEAF); bctx.restore();
      return true;
    });
    // the dots themselves
    dots.forEach(p => {
      const g = p.glow, r = p.s + g * 3;               // each dot is a little snowflake
      bctx.save(); bctx.translate(p.x, p.y); bctx.rotate(p.rot); const k = r / 28;
      bctx.globalAlpha = .38 + g * .2; bctx.drawImage(FLAKE.calm, -32 * k, -32 * k, 64 * k, 64 * k);
      if (g > .05) { bctx.globalAlpha = Math.min(1, g * 1.3); bctx.drawImage(FLAKE.lit, -32 * k, -32 * k, 64 * k, 64 * k); }
      bctx.restore();
    });
    ripples = ripples.filter(rp => (rp.r += 7) < 700);
  }
  requestAnimationFrame(bgFrame);
}

/* ---------- 5. story: my handwriting slowly turns into code, by itself ---------- */
const sent = $('#sent'), morphBox = $('#morph'), GL = '01{}[]<>=+*/_#';
const words = sent.textContent.trim().split(' ');
sent.innerHTML = words.map(w => `<span class="w">${[...w].map(ch => `<span class="l" data-c="${ch}">${ch}</span>`).join('')}</span>`).join(' ');
const letters = $$('.l', sent);
let mx = -999, my = -999, scan = -0.3, morphVisible = false;
morphBox.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });
morphBox.addEventListener('pointerleave', () => { mx = my = -999; });
new IntersectionObserver(([en]) => { morphVisible = en.isIntersecting; }).observe(morphBox);
function morphTick() {
  if (morphVisible && !still) {
    const r = sent.getBoundingClientRect(), now = performance.now();
    if (mx < 0) { scan += .01; if (scan > 1.9) scan = -0.3; }   // a slow sweep every few seconds
    letters.forEach(s => {
      const b = s.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const lineT = ((cx - r.left) / r.width + (cy - r.top) / r.height) / 2;   // sweep goes line by line
      const near = mx > 0 ? Math.hypot(cx - mx, cy - my) < 70 : Math.abs(lineT - scan) < .06;
      if (near) { s.classList.add('code'); s.textContent = Math.random() < .25 ? GL[Math.random() * GL.length | 0] : s.dataset.c; s.t = now; }
      else if (s.classList.contains('code') && now - s.t > 700) { s.classList.remove('code'); s.textContent = s.dataset.c; }
    });
  }
  setTimeout(morphTick, 50);
}

let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { fitAll(); sizeBg(); drawTimeline(); }, 120); });

/* ---------- 6. reveal on scroll ---------- */
const io = new IntersectionObserver(list => list.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
}), { threshold: .12 });
$$('.reveal').forEach(el => io.observe(el));

/* ---------- 7. story: a hand drawn line that grows as you scroll ---------- */
const tl = $('#timeline'), tlSvg = $('#tlLine'), tlPath = $('#tlPath');
let tlLen = 0;
function drawTimeline() {
  const h = tl.offsetHeight, dot = $('.tl-dot', tl);
  const x0 = dot.getBoundingClientRect().left - tl.getBoundingClientRect().left + dot.offsetWidth / 2;
  tlSvg.setAttribute('viewBox', `0 0 40 ${h}`);
  let d = `M${x0},0`;
  for (let y = 30; y <= h; y += 30) d += ` L${(x0 + Math.sin(y / 47) * 3 + Math.sin(y / 13) * 1.2).toFixed(1)},${y}`;
  tlPath.setAttribute('d', d);
  tlLen = tlPath.getTotalLength();
  tlPath.style.strokeDasharray = tlLen;
  growTimeline();
}
function growTimeline() {
  const r = tl.getBoundingClientRect();
  const p = still ? 1 : Math.max(0, Math.min(1, (innerHeight * .75 - r.top) / r.height));
  tlPath.style.strokeDashoffset = tlLen * (1 - p);
}
addEventListener('scroll', growTimeline, { passive: true });

/* ---------- 8. project filters ---------- */
$$('.chip').forEach(c => c.addEventListener('click', () => {
  $$('.chip').forEach(x => x.classList.remove('on')); c.classList.add('on');
  $$('.card').forEach(card => card.classList.toggle('hide', c.dataset.f !== 'all' && card.dataset.cat !== c.dataset.f));
}));


/* ---------- start ---------- */
fitAll();
const start = () => { fitAll(); sizeBg(); requestAnimationFrame(bgFrame); drawTimeline(); morphTick(); setTimeout(typeDemo, 900); };
(document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
