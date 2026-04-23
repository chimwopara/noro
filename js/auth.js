// ── AUTH MODAL ──
function openAuth(mode) {
  if (mode === 'artist') {
    const artistModal = document.getElementById('artistModal');
    if (!artistModal.classList.contains('open')) {
      artistModal.classList.add('open');
      lockScroll();
    }
    artistGoToStep(0);
    return;
  }
  const modal = document.getElementById('authModal');
  if (!modal.classList.contains('open')) {
    modal.classList.add('open');
    lockScroll();
  }
  switchAuthTab(mode === 'signup' ? 'signup' : 'signin');
}

function closeAuth() {
  const modal = document.getElementById('authModal');
  if (!modal.classList.contains('open')) return;
  modal.classList.remove('open');
  unlockScroll();
}

function closeArtistModal() {
  const modal = document.getElementById('artistModal');
  if (!modal.classList.contains('open')) return;
  modal.classList.remove('open');
  unlockScroll();
}

document.getElementById('authModal').addEventListener('click', e => {
  if (e.target === document.getElementById('authModal')) closeAuth();
});
window.addEventListener('scroll', () => {
  if (document.getElementById('authModal').classList.contains('open')) closeAuth();
}, { passive: true });
document.getElementById('artistModal').addEventListener('click', e => {
  if (e.target === document.getElementById('artistModal')) closeArtistModal();
});

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  if (tab === 'signin') {
    document.getElementById('tabSignIn').classList.add('active');
    document.getElementById('panelSignIn').classList.add('active');
    document.getElementById('authTitle').textContent = 'Welcome back';
    document.getElementById('authSub').textContent = 'Sign in to book your artist';
  } else {
    document.getElementById('tabSignUp').classList.add('active');
    document.getElementById('panelSignUp').classList.add('active');
    document.getElementById('authTitle').textContent = 'Join NoroTouch';
    document.getElementById('authSub').textContent = 'Create your free account';
  }
}

async function submitSignIn(e) {
  e.preventDefault();
  const btn = document.getElementById('siBtn');
  btn.disabled = true; btn.textContent = 'Signing in…';
  await new Promise(r => setTimeout(r, 800));
  btn.disabled = false; btn.textContent = 'Sign In →';
  closeAuth();
  showToast('Welcome back!');
}

async function submitSignUp(e) {
  e.preventDefault();
  const name  = document.getElementById('suName').value.trim();
  const email = document.getElementById('suEmail').value.trim();
  const phone = document.getElementById('suPhone').value.trim();
  if (!name || !email || !phone) return;
  const btn = document.getElementById('suBtn');
  btn.disabled = true; btn.textContent = 'Creating account…';
  await postToSheet('signup', { name, email, phone });
  btn.disabled = false; btn.textContent = 'Create Account →';
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panelAuthSuccess').classList.add('active');
  document.getElementById('authSuccessTitle').textContent = `Welcome, ${name.split(' ')[0]}!`;
  document.getElementById('authSuccessText').textContent = 'Your account is created. Check your email for a verification link.';
}

function showForgotPassword() {
  const email = document.getElementById('siEmail').value.trim();
  if (!email) { showToast('Enter your email address first', true); return; }
  postToSheet('forgot_password', { email });
  closeAuth();
  showToast('Password reset link sent to ' + email);
}

// ── INLINE AUTH (inside booking flow card) ──
function bfSwitchAuthTab(tab) {
  const isSignIn = tab === 'signin';
  document.getElementById('bfPanelSignIn').style.display = isSignIn ? '' : 'none';
  document.getElementById('bfPanelSignUp').style.display = isSignIn ? 'none' : '';
  document.getElementById('bfPanelAuthSuccess').style.display = 'none';
  const tabBar = document.getElementById('bfAuthTabBar');
  if (tabBar) tabBar.style.display = '';
  const siTab = document.getElementById('bfTabSignIn');
  const suTab = document.getElementById('bfTabSignUp');
  if (siTab) { siTab.style.background = isSignIn ? '#fff' : 'transparent'; siTab.style.color = isSignIn ? 'var(--ink)' : 'rgba(255,255,255,.65)'; siTab.style.fontWeight = isSignIn ? '700' : '600'; }
  if (suTab) { suTab.style.background = isSignIn ? 'transparent' : '#fff'; suTab.style.color = isSignIn ? 'rgba(255,255,255,.65)' : 'var(--ink)'; suTab.style.fontWeight = isSignIn ? '600' : '700'; }
  const title = document.querySelector('#bfStepauth [style*="Instrument Serif"]');
  if (title) title.textContent = isSignIn ? 'Welcome back.' : 'Join NoroTouch.';
}

async function bfSubmitSignIn(e) {
  e.preventDefault();
  const email    = document.getElementById('bfSiEmail').value.trim();
  const password = document.getElementById('bfSiPassword').value;
  const btn = document.getElementById('bfSiBtn');
  btn.disabled = true; btn.textContent = 'Signing in…';
  const res = await callSheet({ action: 'signin', email, password });
  btn.disabled = false; btn.textContent = 'Sign In →';
  if (!res.success) { showToast(res.error || 'Sign in failed', true); return; }
  const user = res.user || {};
  bfState._signupEmail = user.email || email;
  bfState._signupName  = user.name  || '';
  bfState._signupPhone = user.phone || '';
  showToast('Welcome back!');
  if (bfState.authSource === 'step5') {
    bfAfterStep5Auth();
  } else {
    bfGoToStep('0b');
  }
}

async function bfSubmitSignUp(e) {
  e.preventDefault();
  const name     = document.getElementById('bfSuName').value.trim();
  const email    = document.getElementById('bfSuEmail').value.trim();
  const phone    = document.getElementById('bfSuPhone').value.trim();
  const password = document.getElementById('bfSuPassword').value;
  if (!name || !email || !phone || !password) return;
  const btn = document.getElementById('bfSuBtn');
  btn.disabled = true; btn.textContent = 'Creating account…';
  const res = await postToSheet('signup', { name, email, phone, password });
  btn.disabled = false; btn.textContent = 'Create Account →';
  if (res && res.success === false) { showToast(res.error || 'Sign up failed', true); return; }
  bfState._signupName = name; bfState._signupEmail = email; bfState._signupPhone = phone;
  document.getElementById('bfPanelSignUp').style.display = 'none';
  document.getElementById('bfPanelSignIn').style.display = 'none';
  document.getElementById('bfAuthTabBar').style.display = 'none';
  document.getElementById('bfPanelAuthSuccess').style.display = '';
  document.getElementById('bfAuthSuccessTitle').textContent = `Welcome, ${name.split(' ')[0]}!`;
  document.getElementById('bfAuthSuccessText').textContent = bfState.authSource === 'step5'
    ? 'Account created! Continue to finalize your booking.'
    : 'Your account is created. Check your email for a verification link.';
}

function bfShowForgotPassword() {
  const email = document.getElementById('bfSiEmail').value.trim();
  if (!email) { showToast('Enter your email address first', true); return; }
  postToSheet('forgot_password', { email });
  bfState._resetEmail = email;
  document.getElementById('bfPanelSignIn').style.display = 'none';
  document.getElementById('bfPanelSignUp').style.display = 'none';
  document.getElementById('bfAuthTabBar').style.display = 'none';
  document.getElementById('bfPanelOtpReset').style.display = '';
  showToast('Reset code sent to ' + email);
}

async function bfSubmitOtpReset(e) {
  e.preventDefault();
  const otp         = document.getElementById('bfOtpCode').value.trim();
  const newPassword = document.getElementById('bfOtpNewPw').value;
  if (!otp || !newPassword) return;
  const btn = document.getElementById('bfOtpBtn');
  btn.disabled = true; btn.textContent = 'Resetting…';
  const res = await callSheet({ action: 'reset_password', email: bfState._resetEmail, otp, newPassword });
  btn.disabled = false; btn.textContent = 'Reset Password →';
  if (!res.success) { showToast(res.error || 'Invalid code', true); return; }
  showToast('Password reset! Please sign in.');
  document.getElementById('bfPanelOtpReset').style.display = 'none';
  document.getElementById('bfAuthTabBar').style.display = '';
  bfSwitchAuthTab('signin');
}
