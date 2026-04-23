// ── SCROLL LOCK ──
let _savedScrollY = 0;
let _scrollLockDepth = 0;
function lockScroll() {
  if (_scrollLockDepth === 0) {
    _savedScrollY = window.scrollY;
    document.body.style.top = '-' + _savedScrollY + 'px';
    document.body.classList.add('no-scroll');
  }
  _scrollLockDepth += 1;
}
function unlockScroll() {
  if (_scrollLockDepth === 0) return;
  _scrollLockDepth -= 1;
  if (_scrollLockDepth > 0) return;
  document.body.classList.remove('no-scroll');
  document.body.style.top = '';
  window.scrollTo(0, _savedScrollY);
}

// ── HERO CYCLING WORD ──
const words = ['Owambe','Bridal','Editorial','Aso-ebi','Everyday'];
let wi = 0;
const wordEl = document.getElementById('cycleWord');
setInterval(() => {
  wordEl.classList.add('out');
  setTimeout(() => {
    wi = (wi + 1) % words.length;
    wordEl.textContent = words[wi];
    wordEl.classList.remove('out');
    wordEl.classList.add('in');
    requestAnimationFrame(() => requestAnimationFrame(() => wordEl.classList.remove('in')));
  }, 350);
}, 2800);

// ── HERO PARALLAX (mouse) ──
document.getElementById('footYear').textContent = new Date().getFullYear();
const heroContent = document.getElementById('heroContent');
const heroSlides = document.querySelectorAll('.hero-slide');
document.addEventListener('mousemove', e => {
  if (document.body.classList.contains('no-scroll')) return;
  const x = (e.clientX / window.innerWidth - .5) * 18;
  const y = (e.clientY / window.innerHeight - .5) * 10;
  heroSlides.forEach(s => {
    s.style.transform = `translate(${x * .28}px,${y * .18}px) scale(1.12)`;
  });
  heroContent.style.transform = `translate(${x * .1}px,${y * .1}px)`;
});

// ── SCROLL PARALLAX + NAV ──
const nav = document.getElementById('nav');
const navBookBtn = document.getElementById('navBookBtn');
const navJoinBtn = document.getElementById('navJoinBtn');
const navLogo    = document.querySelector('.nav-logo');

function centerNavLogo() {
  const navW  = nav.offsetWidth;
  const logoL = navLogo.offsetLeft;
  const logoW = navLogo.offsetWidth;
  navLogo.style.transform = `translateX(${navW / 2 - logoL - logoW / 2}px)`;
}

function updateLogoPosition() {
  const isSolid  = nav.classList.contains('solid');
  const hasBtns  = nav.classList.contains('btns-visible');
  if (isSolid && !hasBtns) { centerNavLogo(); } else { navLogo.style.transform = ''; }
}

function setNavBtns(visible) {
  [navBookBtn, navJoinBtn].forEach(b => {
    if (!b) return;
    b.style.opacity = visible ? '1' : '0';
    b.style.pointerEvents = visible ? 'all' : 'none';
  });
  nav.classList.toggle('btns-visible', visible);
  updateLogoPosition();
}

new IntersectionObserver(([entry]) => {
  setNavBtns(!entry.isIntersecting);
}, { threshold: 0 }).observe(document.getElementById('heroCtas'));

window.addEventListener('scroll', () => {
  if (document.body.classList.contains('no-scroll')) return;
  nav.classList.toggle('solid', window.scrollY > 40);
  updateLogoPosition();
}, { passive: true });

// ── HERO DOTS SYNC ──
const dots = document.querySelectorAll('.hero-dot');
let dotIdx = 0;
setInterval(() => {
  dots[dotIdx].classList.remove('active');
  dotIdx = (dotIdx + 1) % 4;
  dots[dotIdx].classList.add('active');
}, 7000);

// ── REVEAL ON SCROLL ──
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: .12 });
document.querySelectorAll('.reveal,.reveal-left').forEach(el => io.observe(el));

// ── GOOGLE SHEETS URL ──
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxUqABXtyXizqWoIb4FCIcQpzHMGLc7E_znMDxD_XJp9LDZTwlnzJCCdaE3nwP4yXqpwA/exec';

(async function loadArtists() {
  try {
    const res  = await fetch(SHEET_URL + '?sheet=artists', { redirect: 'follow' });
    const data = await res.json();
    if (data.artists && data.artists.length) {
      ARTIST_DATA.splice(0, ARTIST_DATA.length, ...data.artists);
    }
  } catch (_) { /* use preset ARTIST_DATA */ }
})();

async function postToSheet(action, data) {
  try {
    await fetch(SHEET_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, ...data, timestamp: new Date().toISOString() })
    });
    return { success: true };
  } catch (e) {
    console.warn('Sheet save failed:', e);
    return { success: false };
  }
}

async function callSheet(params) {
  try {
    const qs  = new URLSearchParams(params).toString();
    const res = await fetch(SHEET_URL + '?' + qs, { redirect: 'follow' });
    return await res.json();
  } catch (e) {
    console.warn('Sheet call failed:', e);
    return { success: false, error: 'Network error' };
  }
}

// ── HEART ──
function toggleHeart(btn) {
  btn.classList.toggle('liked');
  btn.textContent = btn.classList.contains('liked') ? '♥' : '♡';
}

// ── BOOKING SHEET (artist detail bottom sheet) ──
function openSheet(name, spec, price, rating, revs, dist, brands, img) {
  document.getElementById('sheetName').textContent = name;
  document.getElementById('sheetSpec').textContent = spec;
  document.getElementById('sheetDist').textContent = dist;
  document.getElementById('sheetRating').textContent = rating;
  document.getElementById('sheetRevs').textContent = '(' + revs + ')';
  document.getElementById('sheetBasePrice').textContent = price;
  document.getElementById('sheetTotal').textContent = price;
  document.getElementById('sheetHeroImg').src = img;

  const br = document.getElementById('sheetBrands');
  br.innerHTML = brands.map(b => `<span class="a-brand lux">${b}</span>`).join('');

  const dr = document.getElementById('dateRow');
  dr.innerHTML = '';
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const chip = document.createElement('div');
    chip.className = 'date-chip' + (i === 0 ? ' active' : '');
    chip.innerHTML = `<div class="dc-day">${i===0?'Today':days[d.getDay()]}</div><div class="dc-num">${d.getDate()} ${months[d.getMonth()]}</div>`;
    chip.addEventListener('click', function() {
      dr.querySelectorAll('.date-chip').forEach(x => x.classList.remove('active'));
      this.classList.add('active');
    });
    dr.appendChild(chip);
  }

  document.getElementById('overlay').classList.add('open');
  lockScroll();
}

function closeSheet(e) {
  if (e.target === document.getElementById('overlay')) closeSheetDirect();
}
function closeSheetDirect() {
  document.getElementById('overlay').classList.remove('open');
  unlockScroll();
}

function selectSlot(el) {
  document.querySelectorAll('.t-slot').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

function toggleSvc(row) {
  const cb = row.querySelector('input[type=checkbox]');
  cb.checked = !cb.checked;
  updateTotal();
}

function updateTotal() {
  const base = parseInt(document.getElementById('sheetBasePrice').textContent.replace(/[^\d]/g,'')) || 0;
  let extras = 0;
  if (document.getElementById('sv2').checked) extras += 3000;
  if (document.getElementById('sv3').checked) extras += 4000;
  if (document.getElementById('sv4').checked) extras += 5000;
  document.getElementById('sheetTotal').textContent = '₦' + (base + extras).toLocaleString();
}

document.querySelectorAll('.svc-row input').forEach(cb => {
  cb.addEventListener('change', updateTotal);
});

function selectTone(btn) {
  document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function confirmBooking() {
  const name = document.getElementById('sheetName').textContent;
  const total = document.getElementById('sheetTotal').textContent;
  const toneBtn = document.querySelector('.tone-btn.selected');
  const toneNote = toneBtn ? `\nSkin tone: Shade ${toneBtn.dataset.tone}` : '';
  closeSheetDirect();
  setTimeout(() => {
    alert(`Booking confirmed with ${name}!\n\nTotal: ${total}${toneNote}\n\nYou'll receive a WhatsApp confirmation shortly.`);
  }, 300);
}

// ── MOBILE TABS ──
function mobTab(tab, section) {
  document.querySelectorAll('.mob-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  if (section === 'browse') document.getElementById('aesthetics').scrollIntoView({behavior:'smooth'});
  if (section === 'book')   openBookingFlow();
}

// ── SHEET TAB (BOOKING MODAL) ──
function switchSheetTab(tab) {
  document.querySelectorAll('.s-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sheet-panel').forEach(p => p.classList.remove('active'));
  if (tab === 'book') {
    document.getElementById('tabBook').classList.add('active');
    document.getElementById('panelBook').classList.add('active');
  } else {
    document.getElementById('tabReviews').classList.add('active');
    document.getElementById('panelReviews').classList.add('active');
  }
}

// ── REVIEW SUBMIT ──
let userRating = 0;
function setRating(n) {
  userRating = n;
  document.querySelectorAll('#starInput span').forEach((s,i) => s.classList.toggle('lit', i < n));
}
function submitReview() {
  const name = document.getElementById('revName').value.trim();
  const text = document.getElementById('revText').value.trim();
  if (!name || !text || !userRating) { showToast('Fill in your name, rating, and review', true); return; }
  showToast('Review posted, thank you!');
  document.getElementById('revName').value = '';
  document.getElementById('revText').value = '';
  userRating = 0;
  document.querySelectorAll('#starInput span').forEach(s => s.classList.remove('lit'));
}

// ── TOAST ──
function showToast(msg, isError = false) {
  const old = document.getElementById('mdToast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = 'mdToast';
  t.className = 'md-toast';
  t.textContent = msg;
  t.style.background = isError ? '#FF3B30' : '#0A0A0A';
  t.style.color = '#fff';
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}

// ── UTIL ──
function scrollTo_(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ── MAKEUP BRUSH STROKES ──
// Wide, slow, tapered sweeps rendered only inside the hero, beneath the overlay/content.
// No ctx.filter/blur — two-pass soft-edge approach instead (fast, GPU-friendly).
// Higher concurrency keeps the hero feeling alive at a 1s spawn cadence.
(function brushStrokes() {
  const hero = document.getElementById('hero');
  const heroOverlay = document.getElementById('heroOverlay');
  if (!hero || !heroOverlay) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:multiply';
  hero.insertBefore(canvas, heroOverlay);
  const ctx = canvas.getContext('2d', { willReadFrequently: false });

  // Half-resolution for performance — CSS scales it back up
  let W, H;
  function resize() {
    W = Math.max(1, Math.round(hero.clientWidth / 2));
    H = Math.max(1, Math.round(hero.clientHeight / 2));
    canvas.width  = W;
    canvas.height = H;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const COLORS = [
    [210,  80, 115],  // blush
    [196, 149, 106],  // bronze
    [212, 184, 150],  // champagne
    [205, 100,  80],  // coral
    [185,  60,  95],  // rose
    [173, 106,  84],  // cinnamon
    [227, 142,  98],  // apricot
    [166,  76, 102],  // mauve
    [154, 103,  56],  // caramel
    [142,  52,  74],  // berry
    [236, 167, 133],  // peach
    [126,  74,  98],  // plum
    [190, 118,  92],  // terracotta
    [215, 196, 166],  // ivory beige
    [119,  58,  44],  // cocoa
    [230, 120, 150],  // petal pink
    [176,  86,  34],  // copper
    [160, 122, 132],  // dusty rose
    [142,  32,  58],  // burgundy
    [183, 156, 126],  // warm sand
  ];
  const MAX_STROKES = 10;
  const SPAWN_INTERVAL_MS = 1000;
  const RECENT_ANCHOR_LIMIT = 8;

  const strokes = [];
  const recentAnchors = [];
  let lastSpawn = performance.now();

  function pickSpawnAnchor() {
    const padX = Math.min(40, W * 0.18);
    const padY = Math.min(40, H * 0.18);
    const usableW = Math.max(20, W - padX * 2);
    const usableH = Math.max(20, H - padY * 2);
    const minDist = Math.max(50, Math.min(W, H) * 0.24);
    let best = null;
    let bestDist = -1;

    for (let i = 0; i < 18; i++) {
      const x = padX + Math.random() * usableW;
      const y = padY + Math.random() * usableH;
      const nearest = recentAnchors.length
        ? Math.min(...recentAnchors.map(p => Math.hypot(p.x - x, p.y - y)))
        : Infinity;

      if (nearest >= minDist) return { x, y };
      if (nearest > bestDist) {
        best = { x, y };
        bestDist = nearest;
      }
    }

    return best || { x: W / 2, y: H / 2 };
  }

  function spawn() {
    if (strokes.length >= MAX_STROKES) return;
    const col   = COLORS[Math.floor(Math.random() * COLORS.length)];
    const angle = (Math.random() * 0.7 - 0.35) + (Math.random() > 0.5 ? 0 : Math.PI);
    const len   = (80 + Math.random() * 100) / 2;   // in canvas-space (half-res)
    const maxW  = (30 + Math.random() * 30) / 2;
    const curve = (Math.random() - 0.5) * 0.3;
    const { x, y } = pickSpawnAnchor();
    recentAnchors.unshift({ x, y });
    if (recentAnchors.length > RECENT_ANCHOR_LIMIT) recentAnchors.length = RECENT_ANCHOR_LIMIT;
    // Pre-compute segment geometry so animate() never re-derives it
    const N = 40;
    const segs = [];
    for (let i = 1; i <= N; i++) {
      const t0 = (i - 1) / N, t1 = i / N;
      segs.push({
        x0: x + Math.cos(angle + t0 * curve) * len * t0,
        y0: y + Math.sin(angle + t0 * curve) * len * t0,
        x1: x + Math.cos(angle + t1 * curve) * len * t1,
        y1: y + Math.sin(angle + t1 * curve) * len * t1,
        taper: Math.pow(Math.sin(t1 * Math.PI), 0.4),
      });
    }
    strokes.push({ col, segs, maxW, progress: 0, opacity: 0,
      phase: 'in', holdTick: 0, speed: 0.003 + Math.random() * 0.003 });
  }

  function drawStroke(s) {
    const drawn = Math.floor(s.progress * s.segs.length);
    if (drawn < 2) return;
    const [cr, cg, cb] = s.col;
    ctx.lineCap = 'round';

    // Outer halo pass — wider, more transparent (soft edge, no blur needed)
    for (let i = 0; i < drawn; i++) {
      const { x0, y0, x1, y1, taper } = s.segs[i];
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${s.opacity * 0.12})`;
      ctx.lineWidth   = Math.max(1, s.maxW * 2.0 * taper);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    // Core pass — exact width, fuller opacity
    for (let i = 0; i < drawn; i++) {
      const { x0, y0, x1, y1, taper } = s.segs[i];
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${s.opacity * 0.25})`;
      ctx.lineWidth   = Math.max(0.5, s.maxW * taper);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  }

  let raf;
  function animate(now) {
    if (document.body.classList.contains('no-scroll')) { raf = requestAnimationFrame(animate); return; }
    ctx.clearRect(0, 0, W, H);

    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      if (s.phase === 'in') {
        s.progress = Math.min(1, s.progress + s.speed);
        s.opacity  = Math.min(1, s.opacity  + 0.025);
        if (s.progress >= 1) s.phase = 'hold';
      } else if (s.phase === 'hold') {
        if (++s.holdTick > 100) s.phase = 'out';
      } else {
        s.opacity -= 0.010;
        if (s.opacity <= 0) { strokes.splice(i, 1); continue; }
      }
      drawStroke(s);
    }

    if (now - lastSpawn > SPAWN_INTERVAL_MS) { spawn(); lastSpawn = now; }
    raf = requestAnimationFrame(animate);
  }

  spawn();
  raf = requestAnimationFrame(animate);
})();

// ── MOBILE REVIEWS: strip reveal so cards show immediately ──
if (window.innerWidth <= 600) {
  document.querySelectorAll('.reviews-grid .r-card').forEach(c => {
    c.classList.remove('reveal');
    c.classList.add('visible');
  });
}

// ── REVIEWS SCROLL DYNAMIC PADDING ──
(function reviewsEdgeScroll() {
  const reviewsScroll = document.querySelector('.reviews-grid');
  if (!reviewsScroll || window.innerWidth > 600) return;
  const PAD_MAX = 20;
  reviewsScroll.addEventListener('scroll', () => {
    const newPad = Math.max(0, PAD_MAX - reviewsScroll.scrollLeft);
    reviewsScroll.style.paddingLeft = newPad + 'px';
  }, { passive: true });
})();

// ── BRAND SCROLL DYNAMIC PADDING ──
(function brandEdgeScroll() {
  const brandScroll = document.getElementById('brandsGrid');
  if (!brandScroll) return;

  const PAD_MAX = 32; // matches the container padding

  brandScroll.addEventListener('scroll', () => {
    const scrollLeft = brandScroll.scrollLeft;
    // Fade the left padding from 32px to 0px over the first 32px of scroll
    const newPad = Math.max(0, PAD_MAX - scrollLeft);
    brandScroll.style.paddingLeft = newPad + 'px';
  }, { passive: true });
})();
