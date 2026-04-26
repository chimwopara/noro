// ═══════════════════════════════════════════════════════════
//  HomeMUA — Google Apps Script
//  Paste this into Extensions > Apps Script in your Sheet,
//  then deploy as a Web App (Execute as: Me, Access: Anyone).
//  Copy the Web App URL into SHEET_URL in index.html.
// ═══════════════════════════════════════════════════════════

const SPREADSHEET_ID = '1ZTgofkE4RsHKYJSxXQenxZmuQiRv1A6uVD9GlLZ4qQc';
const PLATFORM_NAME  = 'HomeMUA';
const PLATFORM_URL   = 'https://homemua.com';

// ── ENTRY POINT ──────────────────────────────────────────────
function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action;

    // Basic guard: reject requests with no recognisable action
    const allowed = ['signup','booking','booking_started','artist_application','forgot_password'];
    if (!allowed.includes(action)) return jsonOut_({ success: false, error: 'Unknown action' });

    let result = null;
    if      (action === 'signup')             result = handleSignup(data);
    else if (action === 'booking')            handleBooking(data);
    else if (action === 'booking_started')    handleBookingStarted(data);
    else if (action === 'artist_application') handleArtistApplication(data);
    else if (action === 'forgot_password')    handleForgotPassword(data);

    return jsonOut_(result || { success: true });
  } catch (err) {
    return jsonOut_({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  const p = (e && e.parameter) ? e.parameter : {};
  if (p.sheet === 'artists')         return getArtistsJson();
  if (p.action === 'signin')         return jsonOut_(handleSignIn(p));
  if (p.action === 'verify_otp')     return jsonOut_(handleVerifyOtp(p));
  if (p.action === 'reset_password') return jsonOut_(handleResetPassword(p));
  return jsonOut_({ status: 'ok' });
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getArtistsJson() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Artists');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ artists: [] })).setMimeType(ContentService.MimeType.JSON);
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const artists = rows.slice(1).filter(r => r[0]).map(r => {
    const get = k => { const i = headers.indexOf(k); return i >= 0 ? r[i] : ''; };
    return {
      name:      get('name'),
      spec:      get('spec'),
      price:     get('price'),
      priceNum:  Number(get('pricenum')) || 0,
      rating:    Number(get('rating'))   || 4.9,
      revs:      Number(get('reviews'))  || 0,
      dist:      Number(get('distance')) || 1.0,
      area:      get('area'),
      brands:    get('brands').toString().split(',').map(b => b.trim()).filter(Boolean),
      styles:    get('styles').toString().split(',').map(s => s.trim()).filter(Boolean),
      prestige:  get('prestige').toString().split(',').map(Number).filter(Boolean),
      avail:     get('availability') || 'now',
      availText: get('availtext')    || 'Available',
      img:       get('image')
    };
  });
  return ContentService
    .createTextOutput(JSON.stringify({ artists }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── SHEET HELPERS ─────────────────────────────────────────────
function getOrCreateSheet(name, headers) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#9B7B5A')
      .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── ACTION HANDLERS ───────────────────────────────────────────
function handleSignup(data) {
  const sheet = getOrCreateSheet('Signups', ['Timestamp','Name','Email','Phone','Password Hash']);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][2].toString().toLowerCase() === data.email.toLowerCase()) {
      return { success: false, error: 'Email already registered' };
    }
  }
  const hash = hashPassword_(data.password || '', data.email);
  sheet.appendRow([data.timestamp || new Date().toISOString(), data.name, data.email, data.phone, hash]);
  sendWelcomeEmail(data.email, data.name);
  return { success: true };
}

function handleSignIn(p) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Signups');
  if (!sheet) return { success: false, error: 'No users found' };
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][2].toString().toLowerCase() === (p.email || '').toLowerCase()) {
      const storedHash = rows[i][4] ? rows[i][4].toString() : '';
      const inputHash  = hashPassword_(p.password || '', p.email);
      if (!storedHash || storedHash === inputHash) {
        return { success: true, user: { name: rows[i][1], email: rows[i][2], phone: rows[i][3] } };
      }
      return { success: false, error: 'Wrong password' };
    }
  }
  return { success: false, error: 'Email not found' };
}

function handleArtistApplication(data) {
  const headers = [
    'Timestamp', 'Name', 'Email', 'Phone', 'Experience',
    'Specialties', 'Brands', 'Location', 'Has Kit',
    'Certification', 'Instagram', 'Referral', 'Status'
  ];
  const sheet = getOrCreateSheet('Artist Applications', headers);
  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.name, data.email, data.phone,
    data.experience, data.specialties, data.brands,
    data.location, data.hasKit, data.certification,
    data.instagram, data.referral,
    'Pending Review'
  ]);
  sendArtistWelcomeEmail(data.email, data.name);
  sendVerifyEmail(data.email, data.name);
}

function handleBooking(data) {
  const headers = ['Timestamp','Name','Phone','Email','Artist','Area','Price','Date','Time','Address','Styles','Brand Level','Status'];
  const sheet   = getOrCreateSheet('Bookings', headers);
  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.name, data.phone, data.email,
    data.artist, data.area, data.price,
    data.date, data.time, data.address,
    data.styles, data.prestige, 'Pending'
  ]);
  sendBookingConfirmEmail(data.email, data.name, data);
}

function handleBookingStarted(data) {
  const sheet = getOrCreateSheet('Abandoned Bookings',
    ['Timestamp','Email','Name','Artist','Date','Time','Recovery Sent']);
  sheet.appendRow([
    new Date().toISOString(),
    data.email, data.name, data.artist,
    data.date, data.time, false
  ]);
}

// ── TIME TRIGGER: check abandoned bookings (run every hour) ───
// Setup: Triggers → Add trigger → checkAbandonedBookings → Time-driven → Hour timer → Every 12 hours
function checkAbandonedBookings() {
  const ss       = SpreadsheetApp.openById(SPREADSHEET_ID);
  const abandon  = ss.getSheetByName('Abandoned Bookings');
  const bookings = ss.getSheetByName('Bookings');
  if (!abandon || !bookings) return;

  const aRows = abandon.getDataRange().getValues();
  const bRows = bookings.getDataRange().getValues();
  const now   = new Date();

  // Build set of completed booking keys (email+artist+date)
  const completed = new Set(
    bRows.slice(1).map(r => `${r[3]}|${r[4]}|${r[7]}`.toLowerCase())
  );

  for (let i = 1; i < aRows.length; i++) {
    const [ts, email, name, artist, date, time, sent] = aRows[i];
    if (sent) continue;
    const age = (now - new Date(ts)) / 3600000; // hours
    if (age < 12) continue; // wait 12 hours before sending

    const key = `${email}|${artist}|${date}`.toLowerCase();
    if (!completed.has(key)) {
      sendRecoveryEmail_(email, name, artist, date, time);
    }
    // Mark as sent regardless (don't keep emailing)
    abandon.getRange(i + 1, 7).setValue(true);
  }
}

function sendRecoveryEmail_(email, name, artist, date, time) {
  const firstName = firstName_(name);
  const subject   = `${firstName}, your artist is still waiting 💄`;
  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#EDE7DC;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden">
  <tr><td style="background:#0A0A0A;padding:28px 32px;text-align:center">
    <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-.5px">Home<span style="color:#9B7B5A">MUA</span></div>
    <div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:4px">Abuja's Makeup Artist Booking Platform</div>
  </td></tr>
  <tr><td style="padding:32px 32px 0">
    <p style="font-size:22px;color:#0A0A0A;font-weight:700;margin:0 0 8px">You were so close ✨</p>
    <p style="font-size:15px;color:#3C3C3C;line-height:1.65;margin:0 0 20px">
      Hi ${firstName}, you started booking <strong>${artist}</strong> for <strong>${date}</strong> at <strong>${time}</strong> — but didn't finish.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EDDF;border-radius:14px;margin-bottom:24px">
      <tr><td style="padding:20px 24px">
        <p style="font-size:13px;color:#9B7B5A;font-weight:700;margin:0 0 6px">Your slot is still open</p>
        <p style="font-size:14px;color:#3C3C3C;margin:0;line-height:1.6">Top artists in Abuja book out fast. Pick up where you left off before someone else takes your spot.</p>
      </td></tr>
    </table>
    <a href="${PLATFORM_URL}" style="display:block;background:#9B7B5A;color:#fff;text-decoration:none;padding:16px 32px;border-radius:50px;font-size:15px;font-weight:700;text-align:center;margin-bottom:24px">Complete My Booking →</a>
    <p style="font-size:13px;color:#8A8A8A;line-height:1.6;margin:0">Questions? Just reply to this email — we're here to help.</p>
  </td></tr>
  <tr><td style="background:#C4B5A0;padding:20px 32px">
    <p style="font-size:11px;color:#fff;margin:0;text-align:center">© 2026 HomeMUA Ltd · Abuja, Nigeria</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  GmailApp.sendEmail(email, subject,
    `Hi ${firstName}, you left your booking with ${artist} on ${date} incomplete. Come back and finish it: ${PLATFORM_URL}`,
    { htmlBody: html, name: PLATFORM_NAME }
  );
}

function handleForgotPassword(data) {
  const otp    = generateOtp_();
  const hash   = hashOtp_(data.email, otp);
  const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
  const sheet  = getOrCreateSheet('Password Resets', ['Timestamp','Email','OTP Hash','Expiry','Used']);
  sheet.appendRow([new Date().toISOString(), data.email, hash, expiry, false]);
  sendOtpEmail_(data.email, otp);
}

function handleVerifyOtp(p) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Password Resets');
  if (!sheet) return { success: false, error: 'No resets found' };
  const rows      = sheet.getDataRange().getValues();
  const inputHash = hashOtp_(p.email, p.otp);
  const now       = new Date();
  for (let i = rows.length - 1; i >= 1; i--) {
    const [, email, storedHash, expiry, used] = rows[i];
    if (email.toString().toLowerCase() === (p.email || '').toLowerCase() && storedHash === inputHash) {
      if (used)              return { success: false, error: 'OTP already used' };
      if (now > new Date(expiry)) return { success: false, error: 'OTP expired' };
      return { success: true };
    }
  }
  return { success: false, error: 'Invalid code' };
}

function handleResetPassword(p) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Password Resets');
  if (!sheet) return { success: false, error: 'No resets found' };
  const rows      = sheet.getDataRange().getValues();
  const inputHash = hashOtp_(p.email, p.otp);
  const now       = new Date();
  for (let i = rows.length - 1; i >= 1; i--) {
    const [, email, storedHash, expiry, used] = rows[i];
    if (email.toString().toLowerCase() === (p.email || '').toLowerCase() && storedHash === inputHash) {
      if (used)              return { success: false, error: 'OTP already used' };
      if (now > new Date(expiry)) return { success: false, error: 'OTP expired' };
      // Mark OTP used
      sheet.getRange(i + 1, 5).setValue(true);
      // Update password hash in Signups
      const signups = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Signups');
      if (signups) {
        const sRows = signups.getDataRange().getValues();
        for (let j = 1; j < sRows.length; j++) {
          if (sRows[j][2].toString().toLowerCase() === (p.email || '').toLowerCase()) {
            signups.getRange(j + 1, 5).setValue(hashPassword_(p.newPassword || '', p.email));
            break;
          }
        }
      }
      return { success: true };
    }
  }
  return { success: false, error: 'Invalid code' };
}

// ── EMAIL: WELCOME (CLIENT) ───────────────────────────────────
function sendWelcomeEmail(email, name) {
  const firstName = firstName_(name);
  const subject   = `Welcome to ${PLATFORM_NAME}, ${firstName}! ✨`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#EDE7DC;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden">
  <tr><td style="background:#0A0A0A;padding:28px 32px;text-align:center">
    <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-.5px">Home<span style="color:#9B7B5A">MUA</span></div>
    <div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:4px">Abuja's Makeup Artist Booking Platform</div>
  </td></tr>
  <tr><td style="padding:32px 32px 0">
    <p style="font-size:22px;color:#0A0A0A;font-weight:700;margin:0 0 8px">Welcome, ${firstName}! ✨</p>
    <p style="font-size:15px;color:#3C3C3C;line-height:1.65;margin:0 0 24px">You're now part of HomeMUA — book verified makeup artists in Abuja by brand and vibe.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EDDF;border-radius:12px;margin-bottom:24px">
      <tr><td style="padding:20px 24px">
        <p style="font-size:12px;font-weight:700;color:#9B7B5A;letter-spacing:.5px;text-transform:uppercase;margin:0 0 12px">What you can do now</p>
        <p style="font-size:14px;color:#3C3C3C;margin:0 0 8px">📍 Browse 200+ verified artists near you</p>
        <p style="font-size:14px;color:#3C3C3C;margin:0 0 8px">🎨 Filter by brand — Fenty, MAC, Zaron &amp; more</p>
        <p style="font-size:14px;color:#3C3C3C;margin:0 0 8px">💄 Book bridal, owambe, editorial, everyday</p>
        <p style="font-size:14px;color:#3C3C3C;margin:0">🟢 See live availability — no DM chaos</p>
      </td></tr>
    </table>
    <a href="${PLATFORM_URL}" style="display:block;background:#9B7B5A;color:#fff;text-decoration:none;padding:16px 32px;border-radius:50px;font-size:15px;font-weight:700;text-align:center;margin-bottom:24px">Start Exploring →</a>
  </td></tr>
  <tr><td style="background:#C4B5A0;padding:20px 32px">
    <p style="font-size:12px;color:#fff;margin:0;text-align:center">© 2026 HomeMUA Ltd · Abuja, Nigeria<br/>Questions? Just reply to this email.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  GmailApp.sendEmail(email, subject, stripHtml_(html), { htmlBody: html, name: `${PLATFORM_NAME} ✨` });
}

// ── EMAIL: VERIFY ─────────────────────────────────────────────
function sendVerifyEmail(email, name) {
  const firstName   = firstName_(name);
  const token       = Utilities.base64Encode(email + ':verify:' + Date.now());
  const verifyLink  = `${PLATFORM_URL}/verify?token=${encodeURIComponent(token)}`;
  const subject     = `Verify your ${PLATFORM_NAME} account`;

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#EDE7DC;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden">
  <tr><td style="background:#0A0A0A;padding:24px 32px;text-align:center">
    <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.5px">Home<span style="color:#9B7B5A">MUA</span></div>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="font-size:20px;color:#0A0A0A;font-weight:700;margin:0 0 12px">Verify your email ✉️</p>
    <p style="font-size:14px;color:#3C3C3C;line-height:1.65;margin:0 0 24px">Hi ${firstName}, click below to verify your email address and activate your account. This link expires in 24 hours.</p>
    <a href="${verifyLink}" style="display:block;background:#9B7B5A;color:#fff;text-decoration:none;padding:16px 32px;border-radius:50px;font-size:15px;font-weight:700;text-align:center;margin-bottom:20px">Verify My Email →</a>
    <p style="font-size:12px;color:#8A8A8A;margin:0">Didn't create a HomeMUA account? You can safely ignore this email.</p>
  </td></tr>
  <tr><td style="background:#C4B5A0;padding:16px 32px">
    <p style="font-size:11px;color:#fff;margin:0;text-align:center">© 2026 HomeMUA Ltd · Abuja, Nigeria</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  GmailApp.sendEmail(email, subject, `Hi ${firstName}, verify your account: ${verifyLink}`, { htmlBody: html, name: PLATFORM_NAME });
}


// ── EMAIL: ARTIST WELCOME ─────────────────────────────────────
function sendArtistWelcomeEmail(email, name) {
  const firstName = firstName_(name);
  const subject   = `Application received — ${PLATFORM_NAME} Artist Program`;

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#EDE7DC;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden">
  <tr><td style="background:#0A0A0A;padding:28px 32px;text-align:center">
    <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.5px">Home<span style="color:#9B7B5A">MUA</span> <span style="font-weight:400;color:rgba(255,255,255,.55)">· Artist</span></div>
    <div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:4px">Artist Program</div>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="font-size:22px;color:#0A0A0A;font-weight:700;margin:0 0 8px">Application received, ${firstName}! ✨</p>
    <p style="font-size:14px;color:#3C3C3C;line-height:1.65;margin:0 0 20px">We're excited to review your application. Here's what happens next:</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:12px 0;border-bottom:1px solid #DDD5C5">
        <span style="font-size:14px;color:#3C3C3C"><strong style="color:#9B7B5A">Step 1:</strong> Our team reviews your application (within 48 hours)</span>
      </td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #DDD5C5">
        <span style="font-size:14px;color:#3C3C3C"><strong style="color:#9B7B5A">Step 2:</strong> We may reach out to verify your portfolio</span>
      </td></tr>
      <tr><td style="padding:12px 0">
        <span style="font-size:14px;color:#3C3C3C"><strong style="color:#9B7B5A">Step 3:</strong> Once approved, you'll get access to your artist dashboard</span>
      </td></tr>
    </table>
    <p style="font-size:13px;color:#8A8A8A;margin:20px 0 0;line-height:1.6">While you wait, keep your Instagram portfolio updated — we love seeing your work!</p>
  </td></tr>
  <tr><td style="background:#C4B5A0;padding:16px 32px">
    <p style="font-size:11px;color:#fff;margin:0;text-align:center">© 2026 HomeMUA Ltd · Abuja, Nigeria</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  GmailApp.sendEmail(email, subject,
    `Hi ${firstName}, your HomeMUA artist application has been received. We'll review it within 48 hours.`,
    { htmlBody: html, name: `${PLATFORM_NAME} Artist Program` }
  );
}

// ── EMAIL: BOOKING CONFIRMATION ──────────────────────────────
function sendBookingConfirmEmail(email, name, d) {
  const firstName = firstName_(name);
  const subject   = `Booking confirmed — ${d.artist} · ${PLATFORM_NAME}`;

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#EDE7DC;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden">
  <tr><td style="background:#0A0A0A;padding:28px 32px;text-align:center">
    <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-.5px">Home<span style="color:#9B7B5A">MUA</span></div>
    <div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:4px">Abuja's Makeup Artist Platform</div>
  </td></tr>
  <tr><td style="padding:32px 32px 0">
    <p style="font-size:22px;color:#0A0A0A;font-weight:700;margin:0 0 6px">You're booked, ${firstName}! ✨</p>
    <p style="font-size:14px;color:#3C3C3C;line-height:1.65;margin:0 0 24px">Your artist is being notified. Here's a summary of your booking:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EDDF;border-radius:14px;margin-bottom:24px">
      <tr><td style="padding:20px 24px">
        <p style="font-size:12px;font-weight:700;color:#9B7B5A;letter-spacing:.5px;text-transform:uppercase;margin:0 0 14px">Booking Summary</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#8A8A8A;padding:5px 0;width:40%">Artist</td><td style="font-size:13px;color:#0A0A0A;font-weight:600;padding:5px 0">${d.artist}</td></tr>
          <tr><td style="font-size:13px;color:#8A8A8A;padding:5px 0">Date</td><td style="font-size:13px;color:#0A0A0A;font-weight:600;padding:5px 0">${d.date}</td></tr>
          <tr><td style="font-size:13px;color:#8A8A8A;padding:5px 0">Time</td><td style="font-size:13px;color:#0A0A0A;font-weight:600;padding:5px 0">${d.time}</td></tr>
          <tr><td style="font-size:13px;color:#8A8A8A;padding:5px 0">Address</td><td style="font-size:13px;color:#0A0A0A;font-weight:600;padding:5px 0">${d.address || d.area}</td></tr>
          <tr><td style="font-size:13px;color:#8A8A8A;padding:5px 0">Deposit paid</td><td style="font-size:13px;color:#9B7B5A;font-weight:700;padding:5px 0">${d.deposit || d.price}</td></tr>
          <tr><td style="font-size:13px;color:#8A8A8A;padding:5px 0">Balance on day</td><td style="font-size:13px;color:#0A0A0A;font-weight:600;padding:5px 0">${d.balance || '—'}</td></tr>
        </table>
      </td></tr>
    </table>
    <p style="font-size:13px;color:#3C3C3C;line-height:1.65;margin:0 0 24px">We'll send you a WhatsApp confirmation shortly with your artist's contact details. If you have questions, just reply to this email.</p>
  </td></tr>
  <tr><td style="background:#C4B5A0;padding:20px 32px">
    <p style="font-size:11px;color:#fff;margin:0;text-align:center">© 2026 HomeMUA Ltd · Abuja, Nigeria</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  GmailApp.sendEmail(email, subject, `Hi ${firstName}, your booking with ${d.artist} on ${d.date} at ${d.time} is confirmed. We'll WhatsApp you shortly.`, { htmlBody: html, name: PLATFORM_NAME });
}

// ── SETUP (run once manually) ─────────────────────────────────
function setup() {
  // Create all sheets with correct headers
  getOrCreateSheet('Signups',              ['Timestamp','Name','Email','Phone','Password Hash']);
  getOrCreateSheet('Bookings',             ['Timestamp','Name','Phone','Email','Artist','Area','Price','Date','Time','Address','Styles','Brand Level','Pay Method','Status']);
  getOrCreateSheet('Artist Applications',  ['Timestamp','Name','Email','Phone','Experience','Specialties','Brands','Location','Has Kit','Certification','Instagram','Referral','Status']);
  getOrCreateSheet('Password Resets',      ['Timestamp','Email','OTP Hash','Expiry','Used']);
  getOrCreateSheet('Abandoned Bookings',   ['Timestamp','Email','Name','Artist','Date','Time','Recovery Sent']);

  // Create Artists sheet with the exact column names getArtistsJson() reads
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let artists = ss.getSheetByName('Artists');
  if (!artists) {
    artists = ss.insertSheet('Artists');
    const headers = ['name','spec','price','pricenum','rating','reviews','distance','area','brands','styles','prestige','availability','availtext','image'];
    artists.appendRow(headers);
    artists.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#0A0A0A')
      .setFontColor('#FFFFFF');
    artists.setFrozenRows(1);

    // Sample artist row so the sheet isn't empty
    artists.appendRow([
      'Amaka Obi',
      'Bridal & Editorial',
      '₦25,000',
      25000,
      4.9,
      48,
      1.2,
      'Wuse 2',
      'Fenty Beauty, MAC',
      'bridal, editorial',
      '2,3',
      'now',
      'Available Now',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80'
    ]);
  }

  SpreadsheetApp.getUi().alert('✅ HomeMUA sheets are ready!');
}

// ── ON EDIT TRIGGER (booking status changes) ──────────────────
// Set this up: Triggers → Add trigger → onBookingEdit → From spreadsheet → On edit
function onBookingEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Bookings') return;

  const col = e.range.getColumn();
  const row = e.range.getRow();
  if (row < 2) return; // skip header

  // Status column is col 14 ("Status") — adjust if you reorder columns
  const STATUS_COL = 14;
  if (col !== STATUS_COL) return;

  const newStatus = e.range.getValue();
  const rowData   = sheet.getRange(row, 1, 1, STATUS_COL).getValues()[0];
  const [timestamp, name, phone, email, artist, , , date, time] = rowData;

  if (newStatus === 'Confirmed') {
    sendStatusEmail(email, name, artist, date, time, 'confirmed');
  } else if (newStatus === 'Cancelled') {
    sendStatusEmail(email, name, artist, date, time, 'cancelled');
  }
}

function sendStatusEmail(email, name, artist, date, time, status) {
  const firstName = firstName_(name);
  const isConfirmed = status === 'confirmed';
  const subject = isConfirmed
    ? `✅ Your booking with ${artist} is confirmed — HomeMUA`
    : `Your HomeMUA booking has been cancelled`;

  const body = isConfirmed
    ? `Hi ${firstName}, your booking with ${artist} on ${date} at ${time} is confirmed. They'll be at your address on time. Reply to this email if you need anything.`
    : `Hi ${firstName}, unfortunately your booking with ${artist} on ${date} at ${time} has been cancelled. Please rebook on homemua.com or reply to this email for help.`;

  GmailApp.sendEmail(email, subject, body, { name: PLATFORM_NAME });
}

// ── CRYPTO HELPERS ────────────────────────────────────────────
function hashPassword_(password, email) {
  const input = email.toLowerCase() + ':pw:' + password;
  return sha256_(input);
}

function hashOtp_(email, otp) {
  const input = email.toLowerCase() + ':otp:' + otp;
  return sha256_(input);
}

function sha256_(input) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8
  );
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function generateOtp_() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── EMAIL: OTP RESET ──────────────────────────────────────────
function sendOtpEmail_(email, otp) {
  const subject = `${otp} is your HomeMUA reset code`;
  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#EDE7DC;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:480px;background:#fff;border-radius:20px;overflow:hidden">
  <tr><td style="background:#0A0A0A;padding:24px 32px;text-align:center">
    <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.5px">Home<span style="color:#9B7B5A">MUA</span></div>
  </td></tr>
  <tr><td style="padding:36px 32px;text-align:center">
    <p style="font-size:15px;color:#3C3C3C;margin:0 0 28px">Use the code below to reset your password. It expires in <strong>15 minutes</strong>.</p>
    <div style="display:inline-block;background:#F5EDDF;border-radius:14px;padding:20px 40px;margin-bottom:28px">
      <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#0A0A0A">${otp}</div>
    </div>
    <p style="font-size:12px;color:#8A8A8A;margin:0">Didn't request this? You can safely ignore it.</p>
  </td></tr>
  <tr><td style="background:#C4B5A0;padding:16px 32px">
    <p style="font-size:11px;color:#fff;margin:0;text-align:center">© 2026 HomeMUA Ltd · Abuja, Nigeria</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  GmailApp.sendEmail(email, subject,
    `Your HomeMUA reset code is ${otp}. It expires in 15 minutes.`,
    { htmlBody: html, name: PLATFORM_NAME }
  );
}

// ── HELPERS ───────────────────────────────────────────────────
function firstName_(name) {
  return name ? name.trim().split(' ')[0] : 'there';
}

function stripHtml_(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s{2,}/g, ' ').trim();
}
