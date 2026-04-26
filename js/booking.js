// Booking flow state
let bfState = { tone:null, date:null, dateChosen:false, time:null, prestige:2, styles:[], assignment:null, artist:null, artists:[], peopleCount:1, bringOwnProducts:false, address:null, authSource:'splash', payMethod:null };

function bfIsMobileLayout() {
  return window.matchMedia('(max-width: 900px)').matches;
}

function bfSaveState() {
  const s = bfState;
  if (s.tone != null) localStorage.setItem('mday_tone', s.tone);
  if (s.dateChosen && s.date) {
    localStorage.setItem('mday_bf_date', s.date);
    localStorage.setItem('mday_bf_date_chosen', '1');
  } else {
    localStorage.removeItem('mday_bf_date');
    localStorage.removeItem('mday_bf_date_chosen');
  }
  if (s.dateChosen && s.time) localStorage.setItem('mday_bf_time', s.time);
  else localStorage.removeItem('mday_bf_time');
  localStorage.setItem('mday_bf_prestige', s.prestige);
  if (s.styles.length) localStorage.setItem('mday_bf_styles', JSON.stringify(s.styles));
  if (s.address) localStorage.setItem('mday_bf_address', s.address);
}

function bfRestoreState() {
  const tone = localStorage.getItem('mday_tone');
  if (tone) bfState.tone = +tone;
  const dateChosen = localStorage.getItem('mday_bf_date_chosen') === '1';
  const date = localStorage.getItem('mday_bf_date');
  bfState.dateChosen = dateChosen;
  bfState.date = dateChosen && date ? date : null;
  const time = localStorage.getItem('mday_bf_time');
  bfState.time = dateChosen && time ? time : null;
  const prestige = localStorage.getItem('mday_bf_prestige');
  if (prestige != null) bfState.prestige = +prestige;
  const styles = localStorage.getItem('mday_bf_styles');
  if (styles) try { bfState.styles = JSON.parse(styles); } catch(e) {}
  const address = localStorage.getItem('mday_bf_address');
  if (address) { bfState.address = address; const inp = document.getElementById('bfAbujaAddress'); if (inp) inp.value = address; }
}

function openBookingFlow(preStyle, preBrand) {
  bfRestoreState();
  if (preStyle && !bfState.styles.includes(preStyle)) bfState.styles = [preStyle];
  bfState.assignment = null; bfState.artist = null; bfState.artists = []; bfState.authSource = 'splash'; bfState.payMethod = null; bfState.bringOwnProducts = false;
  bfInitTones(); bfInitDates(); bfInitTimeSlots(); bfInitPrestige(); bfInitStyles();
  document.getElementById('bookingFlow').classList.add('open');
  lockScroll();
  bfGoToStep('0');
  bfDetectLocation();
}

function closeBookingFlow() {
  document.getElementById('bookingFlow').classList.remove('open');
  unlockScroll();
}

function bfBackdropClick(e) {
  if (e.target === document.getElementById('bookingFlow')) closeBookingFlow();
}

function bfGoToStep(step) {
  document.querySelectorAll('.bf-panel').forEach(p => {
    p.classList.remove('active');
    p.style.display = '';
  });
  const panel = document.getElementById('bfStep' + step);
  if (panel) {
    panel.classList.add('active');
    if (step === '0' || step === '0b' || step === 'auth') panel.style.display = 'flex';
  }
  const isSplash = step === '0' || step === '0b' || step === 'auth';
  if (step === 'auth') bfSwitchAuthTab('signin');
  document.querySelector('.bf-header').style.display = isSplash ? 'none' : '';
  const titles = {'0':'','0b':'','auth':'',1:'Skin Tone',2:'Date & Time',3:'Brand Prestige',4:'Makeup Style',5:'Assignment',6:'Choose Artist',7:'Booking Summary',8:'Payment',9:'Receipt'};
  document.getElementById('bfHeaderTitle').textContent = titles[step] || 'Book an Artist';
  const dotsEl = document.getElementById('bfSteps');
  dotsEl.innerHTML = '';
  if (!isSplash && typeof step === 'number' && step >= 1 && step <= 5) {
    for (let i = 1; i <= 5; i++) {
      const d = document.createElement('div');
      d.className = 'bf-step-dot' + (i < step ? ' done' : i === step ? ' active' : '');
      dotsEl.appendChild(d);
    }
  }
  if (step === 5) {
    bfInitStep5();
  }
  if (step === 7) {
    bfPrefillContactDetails();
    const a = bfState.artist;
    if (a && bfState._signupEmail) {
      postToSheet('booking_started', {
        email: bfState._signupEmail,
        name:  bfState._signupName || '',
        artist: a.name,
        date:   bfState.date || 'Today',
        time:   bfState.time || 'Flexible'
      });
    }
  }
  document.querySelector('.bf-box').scrollTo({top:0,behavior:'smooth'});
}

function bfDetectLocation() {
  const lbl = document.getElementById('bfLocationLabel');
  if (!lbl) return;
  fetch('https://ipapi.co/json/')
    .then(r => r.json())
    .then(d => {
      const city = d.city || '';
      const region = d.region || '';
      lbl.textContent = [city, region].filter(Boolean).join(', ') || 'your location';
    })
    .catch(() => { lbl.textContent = 'your location'; });
}

function bfSaveAddress() {
  const input = document.getElementById('bfAbujaAddress');
  const addr = input.value.trim();
  if (!addr) { showToast('Please enter your Abuja address', true); return; }
  bfState.address = addr;
  input.blur();
  bfSaveState();
  if (bfIsMobileLayout()) {
    bfResetMobileViewport();
    setTimeout(() => {
      bfResetMobileViewport();
      bfGoToStep(1);
    }, 180);
    return;
  }
  bfGoToStep(1);
}

function bfNextStep(from) {
  if (from === 1) {
    bfSaveState();
    bfGoToStep(2);
  } else if (from === 2) {
    if (!bfState.date) { showToast('Please select a date', true); return; }
    if (!bfState.time) { showToast('Please pick a time slot', true); return; }
    bfSaveState();
    bfGoToStep(3);
  } else if (from === 3) {
    bfSaveState();
    bfGoToStep(4);
  } else if (from === 4) {
    if (!bfState.styles.length) { showToast('Select at least one style', true); return; }
    bfSaveState();
    bfGoToStep(5);
  } else if (from === 6) {
    const need = bfState.peopleCount || 1;
    if (!bfState.artist) { showToast('Please select an artist', true); return; }
    if (need > 1 && bfState.artists.length < need) { showToast(`Please select ${need} artists`, true); return; }
    bfBuildConfirmation(); bfGoToStep(7);
  }
}

function bfPrevStep(from) {
  if (from === 1) { bfGoToStep('0b'); return; }
  if (from === 6) { bfGoToStep(5); return; }
  if (from === 7) { bfGoToStep(bfState.assignment === 'custom' ? 6 : 5); return; }
  bfGoToStep(from - 1);
}

// Step 1: Skin Tone
function bfInitTones() {
  document.getElementById('bfTones').innerHTML = SKIN_TONES.map(t =>
    `<button class="bf-tone-btn${bfState.tone===t.tone?' selected':''}" style="background:${t.bg}" data-tone="${t.tone}" title="Shade ${t.tone}" onclick="bfSelectTone(this)"></button>`
  ).join('');
}

function bfSelectTone(btn) {
  document.querySelectorAll('.bf-tone-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  bfState.tone = +btn.dataset.tone;
}

// Step 2: Date & Time
let _bfCalY, _bfCalM;
function bfInitDates() {
  const today = new Date(); today.setHours(0,0,0,0);
  if (bfIsMobileLayout()) {
    _bfCalY = today.getFullYear(); _bfCalM = today.getMonth();
    bfState.date = null;
    bfState.dateChosen = false;
  } else if (bfState.date) {
    const d = new Date(bfState.date);
    _bfCalY = d.getFullYear(); _bfCalM = d.getMonth();
  } else {
    _bfCalY = today.getFullYear(); _bfCalM = today.getMonth();
    bfState.date = today.toDateString();
    bfState.dateChosen = false;
  }
  bfRenderCal();
}
function bfRenderCal() {
  const today = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setFullYear(maxDate.getFullYear() + 1);
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const y = _bfCalY, m = _bfCalM;
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const canPrev = new Date(y, m - 1, 1) >= new Date(today.getFullYear(), today.getMonth(), 1);
  const canNext = new Date(y, m + 1, 1) <= new Date(today.getFullYear() + 1, today.getMonth(), 1);
  const sel = bfState.date ? new Date(bfState.date) : null;
  let html = `<div class="bf-cal-header">
    <button class="bf-cal-nav" onclick="bfCalNav(-1)" ${canPrev?'':'disabled'}>‹</button>
    <span class="bf-cal-month-lbl">${MONTHS[m]} ${y}</span>
    <button class="bf-cal-nav" onclick="bfCalNav(1)" ${canNext?'':'disabled'}>›</button>
  </div>
  <div class="bf-cal-dow"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
  <div class="bf-cal-grid">`;
  for (let i = 0; i < firstDow; i++) html += `<div></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(y, m, day); d.setHours(0,0,0,0);
    const past = d < today, future = d > maxDate;
    const isToday = d.getTime() === today.getTime();
    const active = sel && d.toDateString() === sel.toDateString();
    html += `<button class="bf-cal-day${isToday?' today':''}${active?' active':''}" ${past||future?'disabled':''} onclick="bfSelectCalDate('${d.toDateString()}')">${day}</button>`;
  }
  html += `</div>`;
  document.getElementById('bfDateRow').innerHTML = html;
}
function bfCalNav(dir) {
  _bfCalM += dir;
  if (_bfCalM < 0) { _bfCalM = 11; _bfCalY--; }
  if (_bfCalM > 11) { _bfCalM = 0; _bfCalY++; }
  bfRenderCal();
}
function bfSelectCalDate(dateStr) {
  bfState.date = dateStr;
  bfState.dateChosen = true;
  bfRenderCal();
  if (bfIsMobileLayout()) {
    requestAnimationFrame(() => bfScrollToTimeSection());
  }
}

function bfInitTimeSlots() {
  const slots = [
    '6:00 am','7:00 am','8:00 am','9:00 am','10:00 am','11:00 am',
    '12:00 pm','1:00 pm','2:00 pm','3:00 pm','4:00 pm','5:00 pm',
    '6:00 pm','7:00 pm','8:00 pm','9:00 pm'
  ];
  const saved = bfState.time;
  document.getElementById('bfTimeGrid').innerHTML = slots.map(t =>
    `<div class="bf-t-slot${saved===t?' active':''}" onclick="bfSelectTime(this,'${t}')">${t}</div>`
  ).join('');
}

function bfSelectTime(el, time) {
  document.querySelectorAll('.bf-t-slot').forEach(s=>s.classList.remove('active'));
  el.classList.add('active'); bfState.time = time;
}

function bfResetMobileViewport() {
  if (!bfIsMobileLayout()) return;
  const viewport = window.visualViewport;
  if (!viewport || viewport.scale <= 1) return;
  const meta = document.querySelector('meta[name="viewport"]');
  const original = meta?.getAttribute('content');
  if (!meta || !original) return;
  meta.setAttribute('content', 'width=device-width,initial-scale=1.0,maximum-scale=1.0');
  setTimeout(() => meta.setAttribute('content', original), 120);
}

function bfScrollToTimeSection() {
  const container = document.querySelector('#bfStep2 .bf-fill-scroll');
  const target = document.getElementById('bfTimeSection');
  if (!container || !target) return;
  container.scrollTo({ top: Math.max(0, target.offsetTop - 10), behavior: 'smooth' });
}

// Step 3: Prestige
function bfInitByo() {
  const row = document.getElementById('bfByoRow');
  const check = document.getElementById('bfByoCheck');
  if (row) row.classList.toggle('on', !!bfState.bringOwnProducts);
  if (check) check.textContent = bfState.bringOwnProducts ? '✓' : '';
}

function bfInitPrestige() {
  bfInitByo();
  document.getElementById('bfPrestigeLabels').innerHTML = PRESTIGE_DATA.map((p,i) =>
    `<button class="bf-prestige-tab${i===bfState.prestige?' active':''}" onclick="bfSetPrestige(${i})">
      <span class="bf-prestige-tab-name">${p.label}</span>
    </button>`
  ).join('');
  bfRenderBrandGrid();
}

function bfSetPrestige(idx) {
  bfState.prestige = idx;
  document.querySelectorAll('.bf-prestige-tab').forEach((t,i) => t.classList.toggle('active', i===idx));
  bfRenderBrandGrid();
}

function bfRenderBrandGrid() {
  const pd = PRESTIGE_DATA[bfState.prestige];
  document.getElementById('bfBrandGrid').innerHTML = pd.brands.map(b =>
    `<div class="bf-brand-card" style="background-image:url('${b.img}');background-color:#111">
      <div class="bf-brand-check">✓</div>
      <div class="bf-brand-inner">
        <div class="bf-brand-name">${b.name}</div>
        <div class="bf-brand-about">${b.about}</div>
      </div>
    </div>`
  ).join('');
}

// Step 4: Styles
function bfInitStyles() {
  document.getElementById('bfStyleGrid').innerHTML = STYLE_DATA.map(s =>
    `<div class="bf-style-card${bfState.styles.includes(s.id)?' selected':''}" data-id="${s.id}" onclick="bfToggleStyle('${s.id}',this)"
      style="background-image:linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.38) 55%,rgba(0,0,0,.12) 100%),url('${s.img}');background-color:#111">
      <div class="bf-style-check">${bfState.styles.includes(s.id)?'✓':''}</div>
      <div class="bf-style-name">${s.name}</div>
      <div class="bf-style-desc">${s.desc}</div>
    </div>`
  ).join('');
}

function bfToggleStyle(id, card) {
  if (bfState.styles.includes(id)) {
    bfState.styles = bfState.styles.filter(s=>s!==id);
    card.classList.remove('selected'); card.querySelector('.bf-style-check').textContent='';
  } else {
    bfState.styles.push(id);
    card.classList.add('selected'); card.querySelector('.bf-style-check').textContent='✓';
  }
}

// People counter
function bfChangePeople(delta) {
  bfState.peopleCount = Math.max(1, Math.min(10, (bfState.peopleCount || 1) + delta));
  const el = document.getElementById('bfPeopleNum');
  if (el) el.textContent = bfState.peopleCount;
}

// Bring own products toggle
function bfToggleByo(row) {
  bfState.bringOwnProducts = !bfState.bringOwnProducts;
  row.classList.toggle('on', bfState.bringOwnProducts);
  const check = document.getElementById('bfByoCheck');
  if (check) check.textContent = bfState.bringOwnProducts ? '✓' : '';
}

// Step 5: Assignment
function bfChooseAssignment(type) {
  bfState.assignment = type;
  document.querySelectorAll('.bf-assign-card').forEach(c=>c.classList.remove('selected'));
  document.getElementById({fastest:'assignFastest',rated:'assignRated',cheapest:'assignCheapest',costliest:'assignCostliest',custom:'assignCustom'}[type]).classList.add('selected');
  setTimeout(() => {
    bfState.authSource = 'step5';
    bfGoToStep('auth');
  }, 280);
}

// Reset people counter display when step 5 opens
function bfInitStep5() {
  const el = document.getElementById('bfPeopleNum');
  if (el) el.textContent = bfState.peopleCount || 1;
}

// Step 6: Custom select
function bfFilteredArtists() {
  let list = ARTIST_DATA.filter(a => {
    const styleOk = !bfState.styles.length || bfState.styles.some(s=>a.styles.includes(s));
    const lvl = bfState.prestige + 1;
    const prestigeOk = a.prestige.some(p => Math.abs(p - lvl) <= 1);
    return styleOk && prestigeOk;
  });
  return list.length ? list : [...ARTIST_DATA];
}

function bfPopulateArtists(sortBy) {
  let artists = bfFilteredArtists();
  if (sortBy === 'rating') artists.sort((a,b)=>b.rating-a.rating);
  else if (sortBy === 'price') artists.sort((a,b)=>a.priceNum-b.priceNum);
  else if (sortBy === 'available') artists.sort((a,b)=>a.avail==='now'?-1:1);
  else artists.sort((a,b)=>a.dist-b.dist);

  const need = bfState.peopleCount || 1;
  const sub = document.getElementById('bfStep6Sub');
  if (sub) sub.textContent = need > 1 ? `Select ${need} artists — one per person. Filtered by your style and brand preferences.` : 'Filtered by your style and brand preferences.';

  document.getElementById('bfArtistList').innerHTML = artists.map(a => {
    const idx = ARTIST_DATA.indexOf(a);
    const isSelected = bfState.artists.includes(a) || bfState.artist === a;
    const dotColor = a.avail==='now'?'#00C48C':'#FF9500';
    const brandsHtml = a.brands.slice(0,3).map(b=>`<span style="font-size:.65rem;background:var(--bg);color:var(--ink3);padding:2px 8px;border-radius:20px">${b}</span>`).join('');
    return `<div class="bf-a-card${isSelected?' selected':''}" onclick="bfSelectArtist(${idx},this)">
      <div class="bf-a-img">
        <img src="${a.img}" alt="${a.name}" loading="lazy"/>
        <div class="bf-a-avail"><span style="width:6px;height:6px;border-radius:50%;background:${dotColor};flex-shrink:0;display:inline-block"></span>${a.availText}</div>
      </div>
      <div class="bf-a-body">
        <div class="bf-a-top"><div class="bf-a-name">${a.name}</div><div class="bf-a-price">${a.price}</div></div>
        <div class="bf-a-spec">${a.spec}</div>
        <div class="bf-a-row">
          <span class="bf-a-rating">★ ${a.rating} <span style="font-weight:400;color:var(--ink3)">(${a.revs})</span></span>
          <span class="bf-a-dist">${a.area} · ${a.dist} km</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${brandsHtml}</div>
        <button class="bf-a-select-btn">${isSelected ? '✓ Selected' : 'Select ' + a.name.split(' ')[0] + ' →'}</button>
      </div>
    </div>`;
  }).join('');
}

function bfSelectArtist(idx, card) {
  const a = ARTIST_DATA[idx];
  const need = bfState.peopleCount || 1;
  if (need === 1) {
    // Single select — repopulate to reset all cards cleanly
    bfState.artists = [a];
    bfState.artist = a;
    bfPopulateArtists();
    const confirmBtn = document.getElementById('bfSelectArtistBtn');
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirm MUA →'; }
  } else {
    // Multi select — toggle
    const pos = bfState.artists.indexOf(a);
    if (pos >= 0) {
      bfState.artists.splice(pos, 1);
      card.classList.remove('selected');
      const btn = card.querySelector('.bf-a-select-btn');
      if (btn) btn.textContent = 'Select ' + a.name.split(' ')[0] + ' →';
    } else if (bfState.artists.length < need) {
      bfState.artists.push(a);
      card.classList.add('selected');
      const btn = card.querySelector('.bf-a-select-btn');
      if (btn) btn.textContent = '✓ Selected';
    } else {
      showToast(`You've already selected ${need} MUA${need>1?'s':''}`, true);
      return;
    }
    bfState.artist = bfState.artists[0] || null;
  }
  const selectedCount = bfState.artists.length;
  const confirmBtn = document.getElementById('bfSelectArtistBtn');
  confirmBtn.disabled = selectedCount === 0;
  confirmBtn.textContent = need > 1
    ? `Confirm ${selectedCount} / ${need} MUA${selectedCount!==1?'s':''} →`
    : 'Confirm MUA →';
}

function bfSort(by, btn) {
  document.querySelectorAll('.bf-sort-chip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); bfPopulateArtists(by);
}

function bfAutoAssign(type) {
  let pool = bfFilteredArtists();
  if (type === 'fastest') pool.sort((a,b)=>a.dist-b.dist);
  else if (type === 'cheapest') pool.sort((a,b)=>a.priceNum-b.priceNum);
  else if (type === 'costliest') pool.sort((a,b)=>b.priceNum-a.priceNum);
  else pool.sort((a,b)=>b.rating-a.rating);
  const need = bfState.peopleCount || 1;
  bfState.artists = pool.slice(0, need);
  bfState.artist = bfState.artists[0];
  bfBuildConfirmation(); bfGoToStep(7);
}

function bfBuildConfirmation() {
  const a = bfState.artist; if (!a) return;
  const artists = bfState.artists.length ? bfState.artists : [a];
  const styleName = bfState.styles.map(s=>STYLE_DATA.find(d=>d.id===s)?.name).filter(Boolean).join(', ') || 'Any style';
  const toneName  = bfState.tone ? `Shade ${bfState.tone}` : 'Not specified';
  const assignLabel = {fastest:'Fastest Arrival',rated:'Highest Rated',cheapest:'Most Affordable',costliest:'Most Expensive',custom:'Custom Select'}[bfState.assignment] || '';
  const totalNum = artists.reduce((sum, ar) => sum + ar.priceNum, 0);
  const depositNum = Math.round(totalNum * 0.5);
  const fmt = n => '₦' + n.toLocaleString();

  // Show artist(s) in confirm area
  const confirmEl = document.getElementById('bfConfirmArtist');
  confirmEl.style.flexDirection = artists.length > 1 ? 'column' : '';
  confirmEl.innerHTML = artists.map(ar =>
    `<div style="display:flex;align-items:center;gap:14px${artists.length>1?';border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:4px':''}">
       <img class="bf-confirm-img" src="${ar.img}" alt="${ar.name}"/>
       <div>
         <div class="bf-confirm-name">${ar.name}</div>
         <div class="bf-confirm-spec">${ar.spec}</div>
         <div class="bf-confirm-rating">★ ${ar.rating} · ${ar.area} · ${ar.price}</div>
       </div>
     </div>`
  ).join('');

  const rows = [
    {label:'Address',    val: bfState.address || 'To be confirmed'},
    {label:'Date',       val: bfState.date || 'Today'},
    {label:'Time',       val: bfState.time || 'Flexible'},
    {label:'Style',      val: styleName},
    {label:'Brand level',val: PRESTIGE_DATA[bfState.prestige]?.label},
    {label:'Skin tone',  val: toneName},
    ...(bfState.peopleCount > 1 ? [{label:'People', val: bfState.peopleCount + ' people · ' + artists.length + ' artist' + (artists.length!==1?'s':'')}] : []),
    ...(bfState.bringOwnProducts ? [{label:'Products', val: 'Client bringing own products'}] : []),
    {label:'Total',      val: fmt(totalNum)},
    {label:'Deposit due today (50%)', val: fmt(depositNum)},
    {label:'Balance on day', val: fmt(totalNum - depositNum)},
  ];
  document.getElementById('bfSummaryRows').innerHTML = rows.map(r=>
    `<div class="bf-summary-row"><span class="bf-summary-label">${r.label}</span><span class="bf-summary-val">${r.val}</span></div>`
  ).join('');

  // Store deposit for payment step
  bfState._totalNum = totalNum;
  bfState._depositNum = depositNum;
}

function bfAuthBack() {
  bfGoToStep(bfState.authSource === 'step5' ? 5 : '0');
}

function bfAfterStep5Auth() {
  if (bfState.assignment === 'custom') {
    bfPopulateArtists();
    bfGoToStep(6);
  } else {
    bfAutoAssign(bfState.assignment);
  }
}

function bfAuthSuccess() {
  if (bfState.authSource === 'step5') {
    bfAfterStep5Auth();
  } else {
    bfGoToStep('0b');
    showToast('Welcome! Continue your booking.');
  }
}

function bfPrefillContactDetails() {
  const nameEl  = document.getElementById('bfDetailName');
  const emailEl = document.getElementById('bfDetailEmail');
  const phoneEl = document.getElementById('bfDetailPhone');
  if (nameEl  && bfState._signupName  && !nameEl.value)  nameEl.value  = bfState._signupName;
  if (emailEl && bfState._signupEmail && !emailEl.value) emailEl.value = bfState._signupEmail;
  if (phoneEl && bfState._signupPhone && !phoneEl.value) phoneEl.value = bfState._signupPhone;
}

function bfGoToPayment() {
  const name  = document.getElementById('bfDetailName').value.trim();
  const phone = document.getElementById('bfDetailPhone').value.trim();
  const email = document.getElementById('bfDetailEmail').value.trim();
  if (!name || !phone || !email) { showToast('Please fill in all your details', true); return; }
  const a = bfState.artist; if (!a) return;
  const artists = bfState.artists.length ? bfState.artists : [a];
  const depositNum = bfState._depositNum || Math.round(a.priceNum * 0.5);
  const totalNum = bfState._totalNum || a.priceNum;
  const fmt = n => '₦' + n.toLocaleString();
  const artistNames = artists.map(ar => ar.name.split(' ')[0]).join(' + ');
  document.getElementById('bfPayRecap').innerHTML =
    `<img src="${a.img}" alt="${a.name}" style="width:48px;height:48px;border-radius:10px;object-fit:cover;flex-shrink:0"/>
     <div style="flex:1;min-width:0">
       <div style="font-size:.92rem;font-weight:700;color:var(--ink)">${artistNames}</div>
       <div style="font-size:.76rem;color:var(--ink3);margin-top:1px">${bfState.date || 'Today'} · ${bfState.time || 'Flexible'}</div>
       <div style="margin-top:4px;display:flex;align-items:center;gap:8px">
         <span style="font-size:.92rem;font-weight:800;color:var(--pink)">${fmt(depositNum)} <span style="font-size:.72rem;font-weight:500;color:var(--ink3)">deposit</span></span>
         <span style="font-size:.72rem;color:var(--ink3)">of ${fmt(totalNum)} total</span>
       </div>
     </div>`;
  bfGoToStep(8);
}

function bfSelectPayMethod(method, btn) {
  bfState.payMethod = method;
  document.querySelectorAll('.bf-pay-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('bfCardFields').style.display = method === 'card' ? '' : 'none';
}

async function bfCompletePayment() {
  if (!bfState.payMethod) { showToast('Please select a payment method', true); return; }
  const btn = document.getElementById('bfPayBtn');
  btn.disabled = true; btn.textContent = 'Processing…';
  const name  = document.getElementById('bfDetailName').value.trim();
  const phone = document.getElementById('bfDetailPhone').value.trim();
  const email = document.getElementById('bfDetailEmail').value.trim();
  const a = bfState.artist;
  const artists = bfState.artists.length ? bfState.artists : [a];
  const depositNum = bfState._depositNum || Math.round(a.priceNum * 0.5);
  const totalNum = bfState._totalNum || a.priceNum;
  await postToSheet('booking', {
    name, phone, email,
    artist: artists.map(ar=>ar.name).join(', '), area: a.area, price: a.price,
    date: bfState.date || 'Today', time: bfState.time || 'Flexible',
    address: bfState.address || '', styles: bfState.styles.join(', '),
    prestige: PRESTIGE_DATA[bfState.prestige]?.label,
    payMethod: bfState.payMethod,
    peopleCount: bfState.peopleCount || 1,
    bringOwnProducts: bfState.bringOwnProducts,
    depositAmount: '₦' + depositNum.toLocaleString(),
    totalAmount: '₦' + totalNum.toLocaleString(),
  });
  btn.disabled = false; btn.textContent = 'Pay Deposit →';
  bfBuildReceipt(name, a);
  bfGoToStep(9);
}

function bfBuildReceipt(name, a) {
  const artists = bfState.artists.length ? bfState.artists : [a];
  const depositNum = bfState._depositNum || Math.round(a.priceNum * 0.5);
  const totalNum = bfState._totalNum || a.priceNum;
  const fmt = n => '₦' + n.toLocaleString();
  const rows = [
    ['Artist',        artists.map(ar=>ar.name).join(' · ')],
    ['Date',          bfState.date || 'Today'],
    ['Time',          bfState.time || 'Flexible'],
    ['Address',       bfState.address || 'To be confirmed'],
    ['Payment method',{card:'Card',transfer:'Bank Transfer',cash:'Pay on Arrival'}[bfState.payMethod]],
    ['Deposit paid',  fmt(depositNum)],
    ['Balance on day',fmt(totalNum - depositNum)],
  ];
  document.getElementById('bfReceiptBox').innerHTML =
    `<div style="font-size:.78rem;font-weight:700;color:var(--ink3);letter-spacing:.4px;text-transform:uppercase;margin-bottom:12px">Booking #${Math.random().toString(36).slice(2,8).toUpperCase()}</div>`
    + rows.map(([l,v]) =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
         <span style="font-size:.82rem;color:var(--ink3)">${l}</span>
         <span style="font-size:.84rem;font-weight:600;color:var(--ink)">${v}</span>
       </div>`).join('')
    + `<div style="padding-top:14px;font-size:.82rem;color:var(--ink3)">Confirmation sent to <strong style="color:var(--ink)">${document.getElementById('bfDetailEmail').value.trim()}</strong></div>`;
}
