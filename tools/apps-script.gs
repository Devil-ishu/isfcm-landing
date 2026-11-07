/**
 * ISFCM form router — Google Apps Script web app behind APPS_SCRIPT_URL.
 *
 * Every form on go.isfcm.com posts here with a `form` field.
 * Each form gets its own tab, and values are written by COLUMN NAME,
 * so answers always land under the right header — even when a form
 * gains or loses fields later (new fields become new columns).
 *
 * "All Leads" tab = one row per submission with the same fixed columns
 * for every form, so you can see and sort everyone in one place.
 *
 * Setup: Extensions → Apps Script in the sheet you want, paste this,
 * Deploy → Manage deployments → edit → New version (keeps the same URL).
 */

// Leave blank if this script is opened from the sheet itself (Extensions → Apps Script).
// Otherwise paste the spreadsheet ID from its URL.
var SPREADSHEET_ID = '';

// Where new-lead alerts go. Empty string = no emails.
var ALERT_EMAIL = 'gaurang.misra16@gmail.com';
// Forms that trigger an alert email (audit logs every funnel step, so it's left out).
var ALERT_FORMS = ['questionnaire', 'mentorship', 'executive', 'seminar', 'contact'];

// Voice Diagnosis funnel: alert only once a buyer has booked or sent their recording.
var AUDIT_ALERT_STAGES = ['booked', 'recording_confirmed'];

// form value → tab name
var TABS = {
  questionnaire: 'Diagnosis Questionnaire',
  mentorship:    'Mentorship Applications',
  executive:     'Executive Calls',
  seminar:       'Seminar Enquiries',
  contact:       'Contact',
  istc:          'ISTC Registrations',
  archetype:     'Archetype Test',
  audit:         'Voice Audit Funnel',
  profile:       'Influence Profile'
};

// Booked diagnosis briefs (form "profile", stage "booked") are emailed as HTML and filed
// under this Gmail label, so every call has its brief in one folder.
var BRIEF_LABEL = 'Diagnosis Briefs';

// Columns every tab starts with, in this order. Anything else is appended after.
var LEAD_COLS = ['submitted_at', 'form', 'name', 'phone', 'email', 'stage',
                 'utm_source', 'utm_campaign', 'utm_content', 'source'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    data.form = String(data.form || 'questionnaire').toLowerCase();
    // the questionnaire sends WhatsApp, not phone — keep both, mirror into phone
    if (!data.phone && data.whatsapp) data.phone = data.whatsapp;
    if (!data.submitted_at) data.submitted_at = new Date().toISOString();

    var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID)
                            : SpreadsheetApp.getActiveSpreadsheet();

    // WhatsApp events from Razorpay / Cal.id webhooks: queue and send, no lead row.
    if (data.form === 'wa') return out_(waEvent_(ss, data));

    // Keys starting with "_" carry the call brief; they are emailed, never written as columns.
    var brief = { subject: data._brief_subject, html: data._brief_html, text: data._brief_text };
    Object.keys(data).forEach(function (k) { if (k.charAt(0) === '_') delete data[k]; });

    var tabName = TABS[data.form] || ('Other – ' + data.form);
    // Voice Diagnosis: a manual `outcome` column (show / no-show / closed / not a fit), filled in by hand.
    if (data.form === 'audit' && !('outcome' in data)) data.outcome = '';
    appendByHeader_(ss, tabName, data, LEAD_COLS);
    appendByHeader_(ss, 'All Leads', pick_(data, LEAD_COLS), LEAD_COLS);

    if (ALERT_EMAIL && data.form === 'profile' && data.stage === 'booked') {
      if (brief.html) sendBrief_(brief); else alert_(data, tabName);
    } else if (ALERT_EMAIL && data.form === 'audit' && AUDIT_ALERT_STAGES.indexOf(data.stage) > -1) {
      auditAlert_(data);
    } else if (ALERT_EMAIL && ALERT_FORMS.indexOf(data.form) > -1) {
      alert_(data, tabName);
    }
    // WhatsApp messages started by a form (acknowledgement, profile link, payment nudge).
    // Never lets a WhatsApp problem fail the form.
    try { waFromForm_(ss, data); } catch (waErr) { waAlert_('WhatsApp step failed for a ' + data.form + ' form', String(waErr)); }
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Health check (go.isfcm.com/api/questionnaire opens this).
function doGet() { return out_({ ok: true, service: 'isfcm-forms' }); }

/** Append one row, matching keys to header names; adds missing headers. */
function appendByHeader_(ss, tabName, data, firstCols) {
  var sh = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
  var lastCol = sh.getLastColumn();
  var headers = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];

  if (!headers.length) {
    headers = firstCols.slice();
  }
  Object.keys(data).forEach(function (k) {
    if (headers.indexOf(k) === -1) headers.push(k);
  });
  if (headers.length !== lastCol) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#010066').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }

  var row = headers.map(function (h) {
    var v = data[h];
    if (v == null) return '';
    if (h === 'submitted_at') {
      var d = new Date(v);
      return isNaN(d) ? v : Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');
    }
    // stop Sheets turning +91… phone numbers into formulas/numbers
    if (/^[+=]/.test(String(v)) || h === 'phone' || h === 'whatsapp') return "'" + v;
    return v;
  });
  SpreadsheetApp.flush(); // finish header writes first (appendRow can fail on a just-created tab)
  sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}

function pick_(obj, keys) {
  var o = {};
  keys.forEach(function (k) { if (obj[k] != null) o[k] = obj[k]; });
  return o;
}

function alert_(data, tabName) {
  // Enquiries that also get a WhatsApp acknowledgement go to Sakshi too, so someone follows up within 24 hours.
  var to = WA_ACK_FORMS[data.form] ? WA_TEAM.join(',') : ALERT_EMAIL;
  var lines = Object.keys(data).filter(function (k) { return data[k] !== ''; })
    .map(function (k) { return k + ': ' + data[k]; });
  MailApp.sendEmail(to,
    'New ' + tabName + ' — ' + (data.name || 'no name'),
    lines.join('\n'));
}

/** Voice Diagnosis alert: who booked, their level, and when. Flags bookings we can't verify. */
function auditAlert_(d) {
  var when = '';
  try { if (d.booking) when = Utilities.formatDate(new Date(d.booking), 'Asia/Kolkata', 'EEE d MMM, h:mm a') + ' IST'; } catch (e) { when = d.booking; }
  var check = d.via === 'self_confirm' ? ' · CHECK SLOT' : '';
  var head = d.stage === 'recording_confirmed' ? 'Voice Diagnosis recording sent: ' : 'Voice Diagnosis booked: ';
  var subject = head + (d.name || 'no name') + ' · ' + (d.role || '?') + ' · team ' + (d.team || '?') + check;
  var lines = [
    'Name: ' + (d.name || ''),
    'WhatsApp: ' + (d.phone || ''),
    'Email: ' + (d.email || ''),
    'Role: ' + (d.role || ''),
    'Team: ' + (d.team || ''),
    'Where voice costs them: ' + (d.room || ''),
    'Open to 1-on-1 work: ' + (d.intent || ''),
    'Booking: ' + (when || 'not known'),
    'Booked via: ' + (d.via || '') + (d.via === 'self_confirm' ? '  (they tapped "I\'ve booked" — check Cal.id for a real slot)' : ''),
    'Ad: ' + (d.utm_content || '') + (d.variant ? '  · variant ' + d.variant : ''),
    'Payment: ' + (d.pid || '')
  ];
  MailApp.sendEmail(ALERT_EMAIL, subject, lines.join('\n'));
}

/** Email the call brief and file it under BRIEF_LABEL. A labelling failure never loses the email. */
function sendBrief_(brief) {
  GmailApp.sendEmail(ALERT_EMAIL, brief.subject, brief.text || brief.subject, { htmlBody: brief.html, name: 'ISFCM Call Briefs' });
  try {
    var label = GmailApp.getUserLabelByName(BRIEF_LABEL) || GmailApp.createLabel(BRIEF_LABEL);
    Utilities.sleep(2000); // let the sent message index before searching for it
    var q = 'subject:"' + brief.subject.replace(/"/g, '') + '" newer_than:1d';
    var threads = GmailApp.search(q, 0, 3);
    threads.forEach(function (t) { t.addLabel(label); });
  } catch (e) { /* the brief still arrived; it's just not labelled */ }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ───────────────────────── Clarity daily log ─────────────────────────
 * One row per day in the "Clarity Daily" tab: page-level totals for the
 * Voice Diagnosis funnel (/go/audit/). Totals only — no recordings, no
 * visitor-level data, nothing about individual people.
 *
 * Setup (once):
 *  1. Project Settings (gear) → Time zone: (GMT+05:30) India Standard Time.
 *  2. Project Settings → Script properties → Add: CLARITY_TOKEN = <token from
 *     Clarity → Settings → Data Export>. The token is NEVER written in this file
 *     (the repo is public).
 *  3. Select setupClarityLog in the function menu → Run → allow permissions.
 *     That creates the daily 6 AM trigger and writes today's first row.
 * Uses 1 of Clarity's 10 API calls per day.
 */
var CLARITY_TAB = 'Clarity Daily';
var CLARITY_FUNNEL = '/go/audit/';
var CLARITY_STEPS = { apply: '/go/audit/apply/', book: '/go/audit/book/', confirmed: '/go/audit/confirmed/' };
var CLARITY_COLS = ['day', 'landing_sessions', 'landing_users', 'landing_scroll_pct', 'landing_active_sec',
  'landing_total_sec', 'landing_quickback_pct', 'landing_rage_pct', 'landing_dead_pct',
  'apply_sessions', 'book_sessions', 'confirmed_sessions', 'bot_sessions'];

function setupClarityLog() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'logClarityDaily') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('logClarityDaily').timeBased().everyDays(1).atHour(6).create();
  logClarityDaily();
}

function logClarityDaily() {
  var token = PropertiesService.getScriptProperties().getProperty('CLARITY_TOKEN');
  if (!token) throw new Error('Add CLARITY_TOKEN in Project Settings → Script properties');

  // Label = the day the 24-hour window mostly covers (yesterday, IST)
  var day = Utilities.formatDate(new Date(Date.now() - 12 * 3600 * 1000), 'Asia/Kolkata', 'yyyy-MM-dd');
  var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CLARITY_TAB);
  if (sh && sh.getLastRow() > 1) {
    var days = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues().map(function (r) { return r[0]; });
    if (days.indexOf(day) !== -1) return; // already logged (saves an API call)
  }

  var res = UrlFetchApp.fetch(
    'https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1&dimension1=URL',
    { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    throw new Error('Clarity ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
  }
  var m = {};
  JSON.parse(res.getContentText()).forEach(function (x) { m[x.metricName] = x.information || []; });

  // Strip ad parameters: every ?utm_… variant of a page counts as that page
  function path(u) { return String(u || '').replace(/^https?:\/\/[^\/]+/, '').split(/[?#]/)[0]; }
  var sessions = {}, users = {}, bots = 0, byUrl = {};
  (m.Traffic || []).forEach(function (r) {
    var p = path(r.Url), n = Number(r.totalSessionCount) || 0;
    sessions[p] = (sessions[p] || 0) + n;
    users[p] = (users[p] || 0) + (Number(r.distinctUserCount) || 0);
    bots += Number(r.totalBotSessionCount) || 0;
    byUrl[r.Url] = n;
  });
  // Session-weighted average of one field across all variants of the landing page
  function avg(metric, field) {
    var sum = 0, w = 0;
    (m[metric] || []).forEach(function (r) {
      if (path(r.Url) !== CLARITY_FUNNEL) return;
      var n = Number(r.sessionsCount) || byUrl[r.Url] || 0;
      sum += (Number(r[field]) || 0) * n; w += n;
    });
    return w ? Math.round(sum / w * 10) / 10 : '';
  }

  appendByHeader_(ss, CLARITY_TAB, {
    day: day,
    landing_sessions: sessions[CLARITY_FUNNEL] || 0,
    landing_users: users[CLARITY_FUNNEL] || 0,
    landing_scroll_pct: avg('ScrollDepth', 'averageScrollDepth'),
    landing_active_sec: avg('EngagementTime', 'activeTime'),
    landing_total_sec: avg('EngagementTime', 'totalTime'),
    landing_quickback_pct: avg('QuickbackClick', 'sessionsWithMetricPercentage'),
    landing_rage_pct: avg('RageClickCount', 'sessionsWithMetricPercentage'),
    landing_dead_pct: avg('DeadClickCount', 'sessionsWithMetricPercentage'),
    apply_sessions: sessions[CLARITY_STEPS.apply] || 0,
    book_sessions: sessions[CLARITY_STEPS.book] || 0,
    confirmed_sessions: sessions[CLARITY_STEPS.confirmed] || 0,
    bot_sessions: bots
  }, CLARITY_COLS);
}

/* ───────────────────────── WhatsApp automation ─────────────────────────
 * Sends approved WhatsApp templates from the business number through Kapso
 * (coexistence: the number stays in the WhatsApp Business app on the phone).
 *
 * What starts a message:
 *   Razorpay webhook → /api/rzp-webhook → here   payment confirmed / payment failed
 *   Cal.id webhook   → /api/calid-webhook → here  booked, rescheduled, cancelled, no-show
 *   Forms (this doPost)                          enquiry received, Influence Profile link,
 *                                                unpaid Voice Diagnosis application nudge
 *   waTick (every 5 min)                         24h and 1h call reminders, delayed nudges
 *
 * Every message is a row in the "WA Queue" tab. If WhatsApp rejects a send
 * (Kapso's free 2,000/month used up, template not approved, bad number…),
 * the buyer gets the same message by email and Gaurang + Sakshi get an alert
 * saying what to send by hand from the app. Rows older than 30 days are deleted.
 *
 * Setup (once):
 *  1. Kapso → Integrations → API keys → create a key.
 *  2. Project Settings → Script properties → Add: KAPSO_API_KEY = <that key>.
 *     Never paste the key into this file (the repo is public).
 *  3. Run setupWhatsApp once (creates the 5-minute trigger).
 *  4. Optional test: add script property WA_TEST_PHONE = 91XXXXXXXXXX, run waTestSend.
 */
var WA_PHONE_ID = '1476301752222672';           // Meta phone number ID of +91 62840 65488 (not a secret)
var WA_API = 'https://api.kapso.ai/meta/whatsapp/v24.0/';
var WA_LANG = 'en';
var WA_TAB = 'WA Queue';
var WA_TEAM = ['gaurang.misra16@gmail.com', 'sakshi.isfcm@gmail.com']; // failure alerts
var WA_FORM_DAILY_CAP = 80;   // max form-started messages a day (stops abuse of the public forms)
var WA_KEEP_DAYS = 30;
var WA_COLS = ['id', 'created_at', 'send_at', 'expires_at', 'template', 'phone', 'email', 'name',
  'vars', 'button', 'product', 'ref', 'start', 'key', 'source', 'status', 'sent_at', 'result'];

var WA_PRODUCTS = {
  audit: { label: 'Executive Voice Diagnosis', book: 'go/audit/book/', prepare: 'go/audit/prepare/',
           retry: 'go/audit/book/', rebook: 'go/r?e=audit' },
  diagnosis: { label: 'Private Diagnosis', book: 'go/diagnosis/book/', prepare: 'go/diagnosis/prepare/',
               retry: 'go/diagnosis/', rebook: 'go/r?e=diagnosis' }
};

// Enquiry forms that get an instant "we received it" message, and how they are named in it.
var WA_ACK_FORMS = { mentorship: 'mentorship', executive: 'executive programme',
  seminar: 'seminar', contact: 'contact', istc: 'ISTC coaching' };

// Same wording as the approved templates; used for the email fallback and the team alert.
var WA_TEXT = {
  payment_confirmed: 'Hi {{1}}, your payment of ₹{{2}} for the {{3}} is confirmed. Payment ID: {{4}}.\n\nNext step: choose your call time.',
  booking_confirmed: 'Hi {{1}}, your {{2}} is booked for {{3}} IST.\n\nPlease complete your preparation before the call. It takes about 5 minutes.',
  reminder_24h: 'Hi {{1}}, a reminder that your {{2}} is tomorrow at {{3}} IST.\n\nNeed to change the time? Reply to this message.',
  reminder_1h: 'Hi {{1}}, your {{2}} starts in 1 hour ({{3}} IST). Please join from a quiet place with good network.',
  payment_failed: 'Hi {{1}}, your payment for the {{2}} did not go through. If any amount was deducted, your bank usually reverses it within 5–7 working days.',
  booking_cancelled: 'Hi {{1}}, your {{2}} on {{3}} has been cancelled. Your payment remains valid.',
  profile_result: 'Hi {{1}}, your Influence Profile result is ready.',
  enquiry_received: 'Hi {{1}}, we have received your {{2}} enquiry. Our team will contact you within 24 hours on this number.',
  payment_pending: 'Hi {{1}}, your {{2}} application is received, but payment is not complete yet. Slots are held for a limited time.',
  no_show: 'Hi {{1}}, we missed you at your {{2}} scheduled for {{3}} IST. Your payment remains valid. Pick a new time below.'
};
var WA_BUTTON = { payment_confirmed: 'Book my slot', booking_confirmed: 'Prepare', reminder_24h: 'Join link',
  reminder_1h: 'Join now', payment_failed: 'Try again', booking_cancelled: 'Pick a new time',
  profile_result: 'View my result', payment_pending: 'Complete payment', no_show: 'Pick a new time' };

/** Run once after pasting: 5-minute trigger for reminders and delayed messages. */
function setupWhatsApp() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'waTick') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('waTick').timeBased().everyMinutes(5).create();
  if (!PropertiesService.getScriptProperties().getProperty('KAPSO_API_KEY')) {
    throw new Error('Trigger created. Now add KAPSO_API_KEY in Project Settings → Script properties.');
  }
}

/** Sends one real payment_confirmed template to WA_TEST_PHONE (costs one utility message). */
function waTestSend() {
  var to = PropertiesService.getScriptProperties().getProperty('WA_TEST_PHONE');
  if (!to) throw new Error('Add WA_TEST_PHONE (e.g. 919876543210) in Script properties');
  var r = waApi_(waPhone_(to), 'payment_confirmed', ['Test', '1,999', 'Executive Voice Diagnosis', 'pay_TEST123'], 'go/audit/book/');
  Logger.log(JSON.stringify(r));
}

/* ---------- events ---------- */

/** Razorpay and Cal.id events (posted by the Cloudflare functions). */
function waEvent_(ss, d) {
  if (!WA_PRODUCTS[d.product] && d.uid) {
    // No-show payloads don't say which event type; take it from the booking we already know.
    var seen = waFind_(ss, function (r) { return r.ref === d.uid && r.template === 'booking_confirmed'; });
    if (seen) d.product = seen.product;
  }
  var P = WA_PRODUCTS[d.product];
  if (!P) return { ok: true, ignored: 'product' };
  var phone = waPhone_(d.phone);
  var name = waFirst_(d.name);
  var now = Date.now();
  var base = { phone: phone, email: d.email || '', name: name, product: d.product, source: d.event };

  if (d.event === 'payment_captured') {
    waCancel_(ss, function (r) { return r.phone === phone && /^(payment_pending|payment_failed)$/.test(r.template); });
    if (!phone) return waNoPhone_(d, 'payment confirmed');
    var pid = String(d.pid || '');
    return waQueue_(ss, waRow_(base, {
      template: 'payment_confirmed', key: 'paid:' + pid, ref: pid,
      vars: [name, waMoney_(d.amount), P.label, pid || '—'],
      button: P.book + (pid ? '?pid=' + encodeURIComponent(pid) : '')
    }), true);
  }

  if (d.event === 'payment_failed') {
    if (!phone) return { ok: true, ignored: 'no_phone' };
    // Wait 15 minutes: most people retry straight away, and a success cancels this.
    var at = waQuiet_(now + 15 * 60000);
    return waQueue_(ss, waRow_(base, {
      template: 'payment_failed', key: 'failed:' + (d.oid || phone) + ':' + waDay_(now),
      send_at: at, expires_at: at + 3 * 3600000,
      vars: [name, P.label], button: P.retry
    }), false);
  }

  if (d.event === 'booking_created' || d.event === 'booking_rescheduled') {
    var start = new Date(d.start).getTime();
    if (!start) return { ok: false, error: 'no_start' };
    // A new or moved booking replaces any reminders still waiting for this person and product.
    waCancel_(ss, function (r) {
      return /^reminder_/.test(r.template) && (r.ref === d.uid || r.ref === d.old_uid || (phone && r.phone === phone && r.product === d.product));
    });
    if (!phone) return waNoPhone_(d, 'booking ' + (d.event === 'booking_created' ? 'confirmed' : 'moved') + ' for ' + waWhen_(start));
    var b = { ref: d.uid, start: new Date(start).toISOString() };
    var res = waQueue_(ss, waRow_(base, b, {
      template: 'booking_confirmed', key: 'booked:' + d.uid,
      vars: [name, P.label, waWhen_(start)],
      button: P.prepare + (d.pid ? '?pid=' + encodeURIComponent(d.pid) : '')
    }), true);
    var join = waJoin_(d.join_url, d.product);
    if (start - 24 * 3600000 > now + 30 * 60000) {
      waQueue_(ss, waRow_(base, b, { template: 'reminder_24h', key: 'r24:' + d.uid,
        send_at: start - 24 * 3600000, expires_at: start - 2 * 3600000,
        vars: [name, P.label, waTime_(start)], button: join }), false);
    }
    if (start - 3600000 > now) {
      waQueue_(ss, waRow_(base, b, { template: 'reminder_1h', key: 'r1:' + d.uid,
        send_at: start - 3600000, expires_at: start - 10 * 60000,
        vars: [name, P.label, waTime_(start)], button: join }), false);
    }
    return res;
  }

  if (d.event === 'booking_cancelled' || d.event === 'no_show') {
    var known = waFind_(ss, function (r) { return r.ref === d.uid && r.template === 'booking_confirmed'; });
    if (known) {
      phone = phone || known.phone; base.phone = phone;
      base.email = base.email || known.email; base.name = name = (d.name ? name : known.name || name);
      if (!d.start && known.start) d.start = known.start;
    }
    waCancel_(ss, function (r) { return /^reminder_/.test(r.template) && r.ref === d.uid; });
    var when = d.start ? waWhen_(new Date(d.start).getTime()) : 'your booked time';
    if (!phone) return waNoPhone_(d, d.event === 'no_show' ? 'missed call (no-show)' : 'booking cancelled');
    if (d.event === 'booking_cancelled') {
      return waQueue_(ss, waRow_(base, { template: 'booking_cancelled', key: 'cancel:' + d.uid, ref: d.uid,
        vars: [name, P.label, when], button: P.rebook }), true);
    }
    return waQueue_(ss, waRow_(base, { template: 'no_show', key: 'noshow:' + d.uid, ref: d.uid,
      vars: [name, P.label, when], button: P.rebook }), true);
  }
  return { ok: true, ignored: d.event };
}

/** Messages started by a form submission. */
function waFromForm_(ss, d) {
  var phone = waPhone_(d.phone);
  if (!phone) return;
  var name = waFirst_(d.name);
  var now = Date.now();
  var day = waDay_(now);
  var base = { phone: phone, email: d.email || '', name: name, product: '', source: 'form:' + d.form };

  if (d.form === 'audit') {
    if (d.stage === 'applied') {
      // Not paid 30 minutes after applying → one nudge. A payment cancels it.
      var at = waQuiet_(now + 30 * 60000);
      base.product = 'audit';
      waQueue_(ss, waRow_(base, { template: 'payment_pending', key: 'pending:' + phone + ':' + day,
        send_at: at, expires_at: at + 3 * 3600000,
        vars: [name, WA_PRODUCTS.audit.label], button: WA_PRODUCTS.audit.retry }), false, true);
    } else if (/^paid/.test(d.stage)) {
      waCancel_(ss, function (r) { return r.phone === phone && /^(payment_pending|payment_failed)$/.test(r.template); });
    }
    return;
  }
  if (d.form === 'profile' && d.stage === 'reel' && /^[CMSRPQ]{2}\.[\d.]+\.[a-z]+$/.test(d.result_code || '')) {
    var link = 'go/profile/?r=' + d.result_code + (name !== 'there' ? '&n=' + encodeURIComponent(name) : '');
    waQueue_(ss, waRow_(base, { template: 'profile_result', key: 'profile:' + phone + ':' + day,
      vars: [name], button: link }), true, true);
    return;
  }
  if (WA_ACK_FORMS[d.form]) {
    waQueue_(ss, waRow_(base, { template: 'enquiry_received', key: 'ack:' + d.form + ':' + phone + ':' + day,
      vars: [name, WA_ACK_FORMS[d.form]], button: '' }), true, true);
  }
}

/* ---------- queue ---------- */

function waRow_() {
  var o = { id: Utilities.getUuid().slice(0, 8), created_at: new Date().toISOString(), status: 'pending' };
  for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k];
  if (!o.send_at) o.send_at = Date.now();
  return o;
}

/** Adds a row unless its key already exists. sendNow → sends inside this request. */
function waQueue_(ss, row, sendNow, fromForm) {
  var sh = waSheet_(ss);
  var rows = waRows_(sh);
  for (var i = 0; i < rows.length; i++) if (rows[i].key === row.key) return { ok: true, duplicate: row.key };
  if (fromForm && !waUnderCap_()) {
    waAlert_('WhatsApp daily form limit reached', 'More than ' + WA_FORM_DAILY_CAP + ' form messages today. Skipped: ' + row.template + ' to ' + row.phone + '. If this is real traffic, raise WA_FORM_DAILY_CAP.');
    return { ok: false, error: 'cap' };
  }
  var r = waStore_(sh, row);
  if (sendNow) return waProcess_(sh, r);
  return { ok: true, queued: row.template };
}

/** Every 5 minutes: send what is due, skip what expired, forget old rows. */
function waTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
    var sh = waSheet_(ss);
    var now = Date.now();
    waRows_(sh).forEach(function (r) {
      if (r.status !== 'pending' || waTs_(r.send_at) > now) return;
      if (r.expires_at && waTs_(r.expires_at) < now) { waSet_(sh, r, { status: 'skipped', result: 'expired before sending' }); return; }
      waProcess_(sh, r);
    });
    waPurge_(sh);
  } finally {
    lock.releaseLock();
  }
}

function waProcess_(sh, r) {
  var vars = typeof r.vars === 'string' ? JSON.parse(r.vars || '[]') : (r.vars || []);
  var res = waApi_(r.phone, r.template, vars, r.button);
  if (res.ok) {
    waSet_(sh, r, { status: 'sent', sent_at: new Date().toISOString(), result: res.id || 'ok' });
    return { ok: true, sent: r.template };
  }
  waSet_(sh, r, { status: 'failed', sent_at: new Date().toISOString(), result: String(res.error).slice(0, 300) });
  waFallback_(r, vars, res.error);
  return { ok: false, error: 'whatsapp_failed', template: r.template };
}

/** One template message through Kapso's Meta proxy. */
function waApi_(phone, template, vars, button) {
  var key = PropertiesService.getScriptProperties().getProperty('KAPSO_API_KEY');
  if (!key) return { ok: false, error: 'KAPSO_API_KEY missing in Script properties' };
  if (!phone) return { ok: false, error: 'no phone number' };
  var comps = [];
  if (vars && vars.length) comps.push({ type: 'body', parameters: vars.map(function (v) { return { type: 'text', text: waParam_(v) }; }) });
  if (button) comps.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(button) }] });
  try {
    var res = UrlFetchApp.fetch(WA_API + WA_PHONE_ID + '/messages', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'X-API-Key': key },
      payload: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'template',
        template: { name: template, language: { code: WA_LANG }, components: comps } })
    });
    var code = res.getResponseCode(), text = res.getContentText();
    var body = {}; try { body = JSON.parse(text); } catch (e) {}
    if (code >= 200 && code < 300 && body.messages && body.messages.length) return { ok: true, id: body.messages[0].id };
    var err = (body.error && (body.error.message || body.error.error_user_msg || JSON.stringify(body.error))) || text;
    return { ok: false, error: code + ' ' + String(err).slice(0, 250) };
  } catch (e) {
    return { ok: false, error: 'network: ' + e };
  }
}

/** WhatsApp didn't take it: email the buyer the same words, tell the team what to send by hand. */
function waFallback_(r, vars, why) {
  var text = waRender_(r.template, vars);
  var link = r.button ? waLink_(r.button) : '';
  if (r.email && /@/.test(r.email)) {
    try {
      MailApp.sendEmail(r.email, waSubject_(r.template), text + (link ? '\n\n' + (WA_BUTTON[r.template] || 'Open') + ': ' + link : '') + '\n\n— Gaurang Misra', { name: 'Gaurang Misra' });
    } catch (e) {}
  }
  waAlert_('WhatsApp not sent: ' + r.template + ' to ' + (r.name || '') + ' ' + r.phone,
    'Send this by hand from the WhatsApp Business app to +' + r.phone + ':\n\n' + text + (link ? '\n' + link : '') +
    '\n\nWhy it failed: ' + why + '\n' + (r.email ? 'An email copy went to ' + r.email + '.' : 'No email on file, so they got nothing yet.'));
}

function waNoPhone_(d, what) {
  waAlert_('No WhatsApp number for ' + (d.name || d.email || 'a buyer') + ' (' + what + ')',
    'Event: ' + d.event + '\nProduct: ' + d.product + '\nName: ' + (d.name || '') + '\nEmail: ' + (d.email || '') +
    '\nBooking: ' + (d.uid || '') + '\nPayment: ' + (d.pid || '') +
    '\n\nNo WhatsApp message could go out. Contact them by email or phone.');
  return { ok: true, no_phone: true };
}

function waAlert_(subject, body) {
  try { MailApp.sendEmail(WA_TEAM.join(','), subject, body, { name: 'ISFCM WhatsApp' }); } catch (e) {}
}

/* ---------- sheet helpers ---------- */

function waSheet_(ss) {
  var sh = ss.getSheetByName(WA_TAB);
  if (!sh) {
    sh = ss.insertSheet(WA_TAB);
    sh.getRange(1, 1, 1, WA_COLS.length).setValues([WA_COLS])
      .setFontWeight('bold').setBackground('#010066').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function waRows_(sh) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, WA_COLS.length).getDisplayValues().map(function (v, i) {
    var o = { _row: i + 2 };
    WA_COLS.forEach(function (c, j) { o[c] = v[j]; });
    if (o.phone.charAt(0) === "'") o.phone = o.phone.slice(1);
    return o;
  });
}

function waStore_(sh, row) {
  var o = {};
  WA_COLS.forEach(function (c) { o[c] = row[c] == null ? '' : row[c]; });
  o.vars = JSON.stringify(row.vars || []);
  ['send_at', 'expires_at'].forEach(function (c) { if (o[c]) o[c] = new Date(o[c]).toISOString(); });
  SpreadsheetApp.flush();
  var r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, WA_COLS.length).setNumberFormat('@')
    .setValues([WA_COLS.map(function (c) { return String(o[c]); })]);
  o._row = r;
  return o;
}

function waSet_(sh, r, changes) {
  for (var k in changes) {
    var c = WA_COLS.indexOf(k);
    if (c > -1) sh.getRange(r._row, c + 1).setValue(changes[k]);
    r[k] = changes[k];
  }
}

function waFind_(ss, test) {
  var rows = waRows_(waSheet_(ss)).filter(test);
  return rows.length ? rows[rows.length - 1] : null;
}

function waCancel_(ss, test) {
  var sh = waSheet_(ss);
  waRows_(sh).forEach(function (r) {
    if (r.status === 'pending' && test(r)) waSet_(sh, r, { status: 'cancelled', result: 'no longer needed' });
  });
}

function waPurge_(sh) {
  var cutoff = Date.now() - WA_KEEP_DAYS * 86400000;
  var rows = waRows_(sh);
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    if (r.status !== 'pending' && waTs_(r.created_at) < cutoff) sh.deleteRow(r._row);
  }
}

function waUnderCap_() {
  var p = PropertiesService.getScriptProperties();
  var k = 'wa_cap_' + waDay_(Date.now());
  var n = Number(p.getProperty(k) || 0) + 1;
  p.setProperty(k, String(n));
  return n <= WA_FORM_DAILY_CAP;
}

/* ---------- formatting ---------- */

/** 10-digit Indian numbers get 91; anything else keeps its country code. Digits only. */
function waPhone_(v) {
  var s = String(v || '').replace(/^'/, '');
  var dgt = s.replace(/\D/g, '');
  if (dgt.length === 10 && /^[6-9]/.test(dgt)) return '91' + dgt;
  if (dgt.length === 11 && dgt.charAt(0) === '0') return '91' + dgt.slice(1);
  if (dgt.length >= 11 && dgt.length <= 15) return dgt;
  return '';
}
function waFirst_(n) {
  var f = String(n || '').trim().split(/\s+/)[0] || '';
  f = f.replace(/[^\p{L}\p{M}'-]/gu, '');
  return f ? f.charAt(0).toUpperCase() + f.slice(1).slice(0, 30) : 'there';
}
function waParam_(v) { return String(v == null || v === '' ? '—' : v).replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').slice(0, 200); }
function waMoney_(a) { var n = Number(a) || 0; return n ? n.toLocaleString('en-IN') : '—'; }
function waWhen_(ms) { return Utilities.formatDate(new Date(ms), 'Asia/Kolkata', 'EEE d MMM, h:mm a'); }
function waTime_(ms) { return Utilities.formatDate(new Date(ms), 'Asia/Kolkata', 'h:mm a'); }
function waDay_(ms) { return Utilities.formatDate(new Date(ms), 'Asia/Kolkata', 'yyyyMMdd'); }
function waTs_(v) { var t = new Date(v).getTime(); return isNaN(t) ? 0 : t; }

/** Payment nudges never land at night: 10 PM–8 AM IST moves to 9 AM. */
function waQuiet_(ms) {
  var h = Number(Utilities.formatDate(new Date(ms), 'Asia/Kolkata', 'H'));
  if (h >= 8 && h < 22) return ms;
  var day = Utilities.formatDate(new Date(h >= 22 ? ms + 86400000 : ms), 'Asia/Kolkata', 'yyyy-MM-dd');
  return new Date(day + 'T09:00:00+05:30').getTime();
}

/** Join button suffix: go.isfcm.com/go/r?u=<meeting link> forwards to the call. */
function waJoin_(url, product) {
  if (url && /^https:\/\//.test(url)) return 'go/r?u=' + Utilities.base64EncodeWebSafe(url).replace(/=+$/, '');
  return 'go/r?e=' + product + '&j=1';
}
function waLink_(suffix) { return 'https://go.isfcm.com/' + suffix; }
function waRender_(template, vars) {
  return (WA_TEXT[template] || template).replace(/\{\{(\d)\}\}/g, function (m, i) { return vars[i - 1] == null ? '' : vars[i - 1]; });
}
function waSubject_(template) {
  return ({ payment_confirmed: 'Payment confirmed: book your call', booking_confirmed: 'Your call is booked',
    reminder_24h: 'Reminder: your call is tomorrow', reminder_1h: 'Your call starts in 1 hour',
    payment_failed: 'Your payment did not go through', booking_cancelled: 'Your booking was cancelled',
    profile_result: 'Your Influence Profile', enquiry_received: 'We received your enquiry',
    payment_pending: 'Your application is waiting for payment', no_show: 'We missed you on the call' })[template] || 'Update from Gaurang Misra';
}
