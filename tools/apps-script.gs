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
  var lines = Object.keys(data).filter(function (k) { return data[k] !== ''; })
    .map(function (k) { return k + ': ' + data[k]; });
  MailApp.sendEmail(ALERT_EMAIL,
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
