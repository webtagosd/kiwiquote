/**
 * KiwiQuote lead handler (Google Apps Script Web App)
 *
 * What it does when the website form is submitted:
 *   1. Appends the lead as a new row to the "Leads" sheet (one column per field).
 *   2. Emails the lead to NOTIFY_EMAIL so the team gets it straight away.
 *
 * Setup instructions are in README.md (5 minutes, no coding needed).
 */

// TESTING: leads go to the WebTag inbox while we trial the site.
// GO-LIVE: change this to 'admin@kiwiquote.co.nz', then redeploy a new version
//          (Deploy -> Manage deployments -> Edit -> New version -> Deploy).
var NOTIFY_EMAIL = 'info@webtag.co.nz';
var SHEET_NAME = 'Leads';

// Columns, in order. The header row is created automatically on first run.
var COLUMNS = [
  'Timestamp',
  'Name',
  'Phone',
  'Email',
  'Interested in',
  'Currently insured',
  'Age',
  'Best time to call',
  'Notes',
  'Source'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // avoid two submissions writing the same row

  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(COLUMNS);
      sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var now = new Date();
    sheet.appendRow([
      now,
      p.name || '',
      p.phone || '',
      p.email || '',
      p.interest || '',
      p.hasInsurance || '',
      p.age || '',
      p.callTime || '',
      p.notes || '',
      p.source || ''
    ]);

    var body =
      'New KiwiQuote lead\n\n' +
      'Name: ' + (p.name || '') + '\n' +
      'Phone: ' + (p.phone || '') + '\n' +
      'Email: ' + (p.email || '') + '\n' +
      'Interested in: ' + (p.interest || '') + '\n' +
      'Currently insured: ' + (p.hasInsurance || '') + '\n' +
      'Age: ' + (p.age || '') + '\n' +
      'Best time to call: ' + (p.callTime || '') + '\n' +
      'Notes: ' + (p.notes || '') + '\n\n' +
      'Received: ' + now;

    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'New lead: ' + (p.name || 'Website enquiry'),
      body: body,
      replyTo: p.email || NOTIFY_EMAIL
    });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Lets you open the Web App URL in a browser to confirm it's live.
function doGet() {
  return ContentService
    .createTextOutput('KiwiQuote lead handler is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}
