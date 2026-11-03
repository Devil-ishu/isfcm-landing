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

// form value → tab name
var TABS = {
  questionnaire: 'Diagnosis Questionnaire',
  mentorship:    'Mentorship Applications',
  executive:     'Executive Calls',
  seminar:       'Seminar Enquiries',
  contact:       'Contact',
  istc:          'ISTC Registrations',
  archetype:     'Archetype Test',
  audit:         'Voice Audit Funnel'
};

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

    var tabName = TABS[data.form] || ('Other – ' + data.form);
    appendByHeader_(ss, tabName, data, LEAD_COLS);
    appendByHeader_(ss, 'All Leads', pick_(data, LEAD_COLS), LEAD_COLS);

    if (ALERT_EMAIL && ALERT_FORMS.indexOf(data.form) > -1) alert_(data, tabName);
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
  sh.appendRow(row);
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

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
