// ── INLINE CARD AUTH (inside artist modal) ──
function artistShowAuth() {
  document.querySelectorAll('.artist-step-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('artStepAuth');
  if (panel) panel.classList.add('active');
  const box = document.getElementById('artistBox');
  if (box) box.classList.add('splash-active');
  switchCardAuthTab('signin');
  artistScrollToTop();
}

function artistHideAuth() {
  artistGoToStep(0);
}

function switchCardAuthTab(tab) {
  const isSignIn = tab === 'signin';
  document.getElementById('cardPanelSignIn').style.display = isSignIn ? '' : 'none';
  document.getElementById('cardPanelSignUp').style.display = isSignIn ? 'none' : '';
  document.getElementById('cardPanelAuthSuccess').style.display = 'none';
  const tabBar = document.getElementById('cardAuthTabs');
  if (tabBar) tabBar.style.display = '';
  const siTab = document.getElementById('cardTabSignIn');
  const suTab = document.getElementById('cardTabSignUp');
  if (siTab) { siTab.style.background = isSignIn ? '#fff' : 'transparent'; siTab.style.color = isSignIn ? 'var(--ink)' : 'rgba(255,255,255,.65)'; siTab.style.fontWeight = isSignIn ? '700' : '600'; }
  if (suTab) { suTab.style.background = isSignIn ? 'transparent' : '#fff'; suTab.style.color = isSignIn ? 'rgba(255,255,255,.65)' : 'var(--ink)'; suTab.style.fontWeight = isSignIn ? '600' : '700'; }
  const title = document.getElementById('cardAuthTitle');
  if (title) title.textContent = isSignIn ? 'Welcome back.' : 'Join HomeMUA.';
}

async function submitCardSignIn(e) {
  e.preventDefault();
  const btn = document.getElementById('cardSiBtn');
  btn.disabled = true; btn.textContent = 'Signing in…';
  await new Promise(r => setTimeout(r, 800));
  btn.disabled = false; btn.textContent = 'Sign In →';
  artistHideAuth();
  showToast('Welcome back!');
}

async function submitCardSignUp(e) {
  e.preventDefault();
  const name  = document.getElementById('cardSuName').value.trim();
  const email = document.getElementById('cardSuEmail').value.trim();
  const phone = document.getElementById('cardSuPhone').value.trim();
  if (!name || !email || !phone) return;
  const btn = document.getElementById('cardSuBtn');
  btn.disabled = true; btn.textContent = 'Creating account…';
  await postToSheet('signup', { name, email, phone });
  btn.disabled = false; btn.textContent = 'Create Account →';
  document.getElementById('cardPanelSignUp').style.display = 'none';
  document.getElementById('cardPanelSignIn').style.display = 'none';
  document.getElementById('cardAuthTabs').style.display = 'none';
  document.getElementById('cardPanelAuthSuccess').style.display = '';
  document.getElementById('cardAuthSuccessTitle').textContent = `Welcome, ${name.split(' ')[0]}!`;
  document.getElementById('cardAuthSuccessText').textContent = 'Your account is created. Check your email for a verification link.';
}

function showCardForgotPassword() {
  const email = document.getElementById('cardSiEmail').value.trim();
  if (!email) { showToast('Enter your email address first', true); return; }
  postToSheet('forgot_password', { email });
  artistHideAuth();
  showToast('Password reset link sent to ' + email);
}

// ── ARTIST APPLICATION ──
let currentArtistStep = 0;
const artRadioValues = {};

function artistScrollToTop() {
  const body = document.getElementById('artistBoxBody');
  if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
}

function artistGoToStep(step) {
  currentArtistStep = step;
  document.querySelectorAll('.artist-step-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('artStep' + step) || document.getElementById('artStepSuccess');
  if (panel) panel.classList.add('active');
  const box = document.getElementById('artistBox');
  if (box) box.classList.toggle('splash-active', step === 0);
  [0,1,2].forEach(i => {
    const el  = document.getElementById('astStep' + i);
    const sep = document.getElementById('astSep' + i);
    if (!el) return;
    el.classList.remove('active','done');
    if (sep) sep.classList.remove('done');
    if (i + 1 < step) { el.classList.add('done'); if (sep) sep.classList.add('done'); }
    if (i + 1 === step) el.classList.add('active');
  });
  artistScrollToTop();
}

function artistNextStep(from) {
  if (from === 1) {
    const name  = document.getElementById('artName').value.trim();
    const email = document.getElementById('artEmail').value.trim();
    const phone = document.getElementById('artPhone').value.trim();
    const pass  = document.getElementById('artPassword').value;
    if (!name || !email || !phone || !pass) { showToast('Please fill in all fields', true); return; }
    if (pass.length < 8) { showToast('Password must be at least 8 characters', true); return; }
  }
  if (from === 2) {
    const specialties = getChecked('specialtiesGrid');
    if (!specialties.length) { showToast('Select at least one specialty', true); return; }
  }
  artistGoToStep(from + 1);
}

function artistPrevStep(from) { artistGoToStep(from - 1); }

function getChecked(gridId) {
  return [...document.querySelectorAll('#' + gridId + ' input:checked')].map(i => i.value);
}

function toggleCheck(item) {
  const cb = item.querySelector('input');
  cb.checked = !cb.checked;
  item.classList.toggle('checked', cb.checked);
}

function selectRadio(groupId, el, value) {
  document.querySelectorAll('#' + groupId + ' .a-radio-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  artRadioValues[groupId] = value;
}

async function submitArtistApplication() {
  const location = document.getElementById('artLocation').value;
  if (!location)                  { showToast('Select your area in Abuja', true); return; }
  if (!artRadioValues['kitRadio'])  { showToast('Tell us about your kit', true); return; }
  if (!artRadioValues['certRadio']) { showToast('Tell us about your training', true); return; }

  const btn = document.getElementById('artSubmitBtn');
  btn.disabled = true; btn.textContent = 'Submitting…';

  const data = {
    name:          document.getElementById('artName').value.trim(),
    email:         document.getElementById('artEmail').value.trim(),
    phone:         document.getElementById('artPhone').value.trim(),
    experience:    document.getElementById('artExperience').value,
    specialties:   getChecked('specialtiesGrid').join(', '),
    brands:        getChecked('brandsCheckGrid').join(', '),
    location,
    hasKit:        artRadioValues['kitRadio']  || '',
    certification: artRadioValues['certRadio'] || '',
    instagram:     document.getElementById('artInstagram').value.trim(),
    referral:      document.getElementById('artReferral').value
  };

  await postToSheet('artist_application', data);
  btn.disabled = false; btn.textContent = 'Submit Application →';

  [0,1,2].forEach(i => {
    const el  = document.getElementById('astStep' + i);
    const sep = document.getElementById('astSep' + i);
    if (el) { el.classList.add('done'); el.classList.remove('active'); }
    if (sep) sep.classList.add('done');
  });
  document.querySelectorAll('.artist-step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('artStepSuccess').classList.add('active');
  artistScrollToTop();
}
