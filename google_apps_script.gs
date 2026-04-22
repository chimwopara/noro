// ═══════════════════════════════════════════════════════════
//  NoroCare — Google Apps Script
//  Paste this into Extensions > Apps Script in your Sheet,
//  then deploy as a Web App (Execute as: Me, Access: Anyone).
//  Copy the Web App URL into SHEET_URL in index.html.
// ═══════════════════════════════════════════════════════════

const SPREADSHEET_ID = '1ZTgofkE4RsHKYJSxXQenxZmuQiRv1A6uVD9GlLZ4qQc';
const PLATFORM_NAME  = 'NoroCare';
const PLATFORM_URL   = 'https://YOUR_DEPLOYED_SITE_URL'; // replace after going live

// ── ENTRY POINT ──────────────────────────────────────────────
function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'signup')             handleSignup(data);
    else if (action === 'artist_application') handleArtistApplication(data);
    else if (action === 'forgot_password')    handleForgotPassword(data);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('NoroCare API is running.');
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
      .setBackground('#E8175A')
      .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── ACTION HANDLERS ───────────────────────────────────────────
function handleSignup(data) {
  const sheet = getOrCreateSheet('Signups', ['Timestamp', 'Name', 'Email', 'Phone']);
  sheet.appendRow([data.timestamp || new Date().toISOString(), data.name, data.email, data.phone]);
  sendWelcomeEmail(data.email, data.name);
  sendVerifyEmail(data.email, data.name);
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

function handleForgotPassword(data) {
  const sheet = getOrCreateSheet('Password Resets', ['Timestamp', 'Email']);
  sheet.appendRow([new Date().toISOString(), data.email]);
  sendForgotPasswordEmail(data.email);
}

// ── EMAIL: WELCOME (CLIENT) ───────────────────────────────────
function sendWelcomeEmail(email, name) {
  const firstName = firstName_(name);
  const subject   = `Welcome to ${PLATFORM_NAME}, ${firstName}! ✨`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden">
  <tr><td style="background:#E8175A;padding:28px 32px;text-align:center">
    <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-.5px">Noro<span style="opacity:.75">Care</span></div>
    <div style="font-size:12px;color:rgba(255,255,255,.75);margin-top:4px">Abuja's Makeup Artist Booking Platform</div>
  </td></tr>
  <tr><td style="padding:32px 32px 0">
    <p style="font-size:22px;color:#0A0A0A;font-weight:700;margin:0 0 8px">Welcome, ${firstName}! ✨</p>
    <p style="font-size:15px;color:#3C3C3C;line-height:1.65;margin:0 0 24px">You're now part of NoroCare — book verified makeup artists in Abuja by brand and vibe.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF0F4;border-radius:12px;margin-bottom:24px">
      <tr><td style="padding:20px 24px">
        <p style="font-size:12px;font-weight:700;color:#E8175A;letter-spacing:.5px;text-transform:uppercase;margin:0 0 12px">What you can do now</p>
        <p style="font-size:14px;color:#3C3C3C;margin:0 0 8px">📍 Browse 200+ verified artists near you</p>
        <p style="font-size:14px;color:#3C3C3C;margin:0 0 8px">🎨 Filter by brand — Fenty, MAC, Zaron &amp; more</p>
        <p style="font-size:14px;color:#3C3C3C;margin:0 0 8px">💄 Book bridal, owambe, editorial, everyday</p>
        <p style="font-size:14px;color:#3C3C3C;margin:0">🟢 See live availability — no DM chaos</p>
      </td></tr>
    </table>
    <a href="${PLATFORM_URL}" style="display:block;background:#E8175A;color:#fff;text-decoration:none;padding:16px 32px;border-radius:50px;font-size:15px;font-weight:700;text-align:center;margin-bottom:24px">Start Exploring →</a>
  </td></tr>
  <tr><td style="padding:24px 32px;border-top:1px solid #EBEBEB">
    <p style="font-size:12px;color:#8A8A8A;margin:0;text-align:center">© 2026 NoroCare Ltd · Abuja, Nigeria<br/>Questions? Just reply to this email.</p>
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
<html><body style="margin:0;padding:0;background:#F7F5F2;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden">
  <tr><td style="background:#E8175A;padding:24px 32px;text-align:center">
    <div style="font-size:20px;font-weight:800;color:#fff">NoroCare</div>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="font-size:20px;color:#0A0A0A;font-weight:700;margin:0 0 12px">Verify your email ✉️</p>
    <p style="font-size:14px;color:#3C3C3C;line-height:1.65;margin:0 0 24px">Hi ${firstName}, click below to verify your email address and activate your account. This link expires in 24 hours.</p>
    <a href="${verifyLink}" style="display:block;background:#E8175A;color:#fff;text-decoration:none;padding:16px 32px;border-radius:50px;font-size:15px;font-weight:700;text-align:center;margin-bottom:20px">Verify My Email →</a>
    <p style="font-size:12px;color:#8A8A8A;margin:0">Didn't create a NoroCare account? You can safely ignore this email.</p>
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #EBEBEB">
    <p style="font-size:11px;color:#8A8A8A;margin:0;text-align:center">© 2026 NoroCare Ltd · Abuja, Nigeria</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  GmailApp.sendEmail(email, subject, `Hi ${firstName}, verify your account: ${verifyLink}`, { htmlBody: html, name: PLATFORM_NAME });
}

// ── EMAIL: FORGOT PASSWORD ────────────────────────────────────
function sendForgotPasswordEmail(email) {
  const token     = Utilities.base64Encode(email + ':reset:' + Date.now());
  const resetLink = `${PLATFORM_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const subject   = `Reset your ${PLATFORM_NAME} password`;

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F7F5F2;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden">
  <tr><td style="background:#0A0A0A;padding:24px 32px;text-align:center">
    <div style="font-size:20px;font-weight:800;color:#fff">Noro<span style="color:#E8175A">Care</span></div>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="font-size:20px;color:#0A0A0A;font-weight:700;margin:0 0 12px">Reset your password 🔐</p>
    <p style="font-size:14px;color:#3C3C3C;line-height:1.65;margin:0 0 24px">We received a request to reset your password. Click below to choose a new one. This link expires in 1 hour.</p>
    <a href="${resetLink}" style="display:block;background:#0A0A0A;color:#fff;text-decoration:none;padding:16px 32px;border-radius:50px;font-size:15px;font-weight:700;text-align:center;margin-bottom:20px">Reset My Password →</a>
    <p style="font-size:12px;color:#8A8A8A;margin:0;line-height:1.6">Didn't request a reset? Ignore this — your account is safe.</p>
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #EBEBEB">
    <p style="font-size:11px;color:#8A8A8A;margin:0;text-align:center">© 2026 NoroCare Ltd · Abuja, Nigeria</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  GmailApp.sendEmail(email, subject, `Reset your NoroCare password: ${resetLink} (expires in 1 hour)`, { htmlBody: html, name: PLATFORM_NAME });
}

// ── EMAIL: ARTIST WELCOME ─────────────────────────────────────
function sendArtistWelcomeEmail(email, name) {
  const firstName = firstName_(name);
  const subject   = `Application received — ${PLATFORM_NAME} Artist Program`;

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F7F5F2;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden">
  <tr><td style="background:#E8175A;padding:28px 32px;text-align:center">
    <div style="font-size:20px;font-weight:800;color:#fff">NoroCare · Artist</div>
    <div style="font-size:12px;color:rgba(255,255,255,.75);margin-top:4px">Artist Program</div>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="font-size:22px;color:#0A0A0A;font-weight:700;margin:0 0 8px">Application received, ${firstName}! ✨</p>
    <p style="font-size:14px;color:#3C3C3C;line-height:1.65;margin:0 0 20px">We're excited to review your application. Here's what happens next:</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:12px 0;border-bottom:1px solid #EBEBEB">
        <span style="font-size:14px;color:#3C3C3C"><strong style="color:#E8175A">Step 1:</strong> Our team reviews your application (within 48 hours)</span>
      </td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid #EBEBEB">
        <span style="font-size:14px;color:#3C3C3C"><strong style="color:#E8175A">Step 2:</strong> We may reach out to verify your portfolio</span>
      </td></tr>
      <tr><td style="padding:12px 0">
        <span style="font-size:14px;color:#3C3C3C"><strong style="color:#E8175A">Step 3:</strong> Once approved, you'll get access to your artist dashboard</span>
      </td></tr>
    </table>
    <p style="font-size:13px;color:#8A8A8A;margin:20px 0 0;line-height:1.6">While you wait, keep your Instagram portfolio updated — we love seeing your work!</p>
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #EBEBEB">
    <p style="font-size:11px;color:#8A8A8A;margin:0;text-align:center">© 2026 NoroCare Ltd · Abuja, Nigeria</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  GmailApp.sendEmail(email, subject,
    `Hi ${firstName}, your NoroCare artist application has been received. We'll review it within 48 hours.`,
    { htmlBody: html, name: `${PLATFORM_NAME} Artist Program` }
  );
}

// ── HELPERS ───────────────────────────────────────────────────
function firstName_(name) {
  return name ? name.trim().split(' ')[0] : 'there';
}

function stripHtml_(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s{2,}/g, ' ').trim();
}
