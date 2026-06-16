var STATUS_OPTIONS = ['New', 'Contacted', 'Quoted', 'In progress', 'Completed', 'Cancelled'];

var SHEET_NAMES = ['Marketing opt-in', 'Not opted in'];


// ==========================
// SAFE HEADER FINDER
// ==========================
function getColumnIndex(sheet, headerName) {
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === headerName) {
      return i + 1;
    }
  }
  return 0;
}


// ==========================
// CREATE SHEET IF NOT EXISTS (WITH HEADERS)
// ==========================
function ensureSheet(ss, name) {
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);

    sheet.getRange(1, 1, 1, 9).setValues([[
      'Date',
      'Name',
      'Email',
      'Phone',
      'Postcode',
      'Project type',
      'Description',
      'Enquiry ID',
      'Status'
    ]]);
  }

  return sheet;
}


// ==========================
// APPLY DROPDOWN
// ==========================
function applyStatusValidation(sheet) {
  var statusCol = getColumnIndex(sheet, 'Status');
  if (!statusCol) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange(2, statusCol, lastRow - 1, 1)
    .setDataValidation(rule);
}


// ==========================
// MIGRATION (RUN ONCE)
// ==========================
function migrateExistingSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  SHEET_NAMES.forEach(function(name) {
    var sheet = ensureSheet(ss, name);

    var statusCol = getColumnIndex(sheet, 'Status');
    if (!statusCol) {
      statusCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, statusCol).setValue('Status');
    }

    var lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      var range = sheet.getRange(2, statusCol, lastRow - 1, 1);
      var values = range.getValues();

      for (var i = 0; i < values.length; i++) {
        if (!values[i][0]) values[i][0] = 'New';
      }

      range.setValues(values);
    }

    applyStatusValidation(sheet);
  });
}


// ==========================
// MAIN WEBHOOK
// ==========================
function doPost(e) {
  try {
    if (!e || !e.postData) {
      return json({ ok: false, error: 'No POST data received' });
    }

    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // STATUS UPDATE FLOW
    if (data.action === 'update_status') {
      return updateStatus(ss, data);
    }

    // NORMAL INSERT FLOW
    var sheetName = data.marketingOptIn ? 'Marketing opt-in' : 'Not opted in';
    var sheet = ensureSheet(ss, sheetName);

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.postcode || '',
      data.projectType || '',
      data.description || '',
      data.enquiryId || '',
      'New'
    ]);

    applyStatusValidation(sheet);

    return json({ ok: true });

  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}


// ==========================
// STATUS UPDATE
// ==========================
function updateStatus(ss, data) {
  var enquiryId = data.enquiryId;
  var status = data.status;

  if (!enquiryId || !status) {
    return json({ ok: false, error: 'Missing enquiryId or status' });
  }

  for (var i = 0; i < SHEET_NAMES.length; i++) {
    var sheet = ss.getSheetByName(SHEET_NAMES[i]);
    if (!sheet) continue;

    var idCol = getColumnIndex(sheet, 'Enquiry ID');
    var statusCol = getColumnIndex(sheet, 'Status');

    if (!idCol || !statusCol) continue;

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    var ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();

    for (var r = 0; r < ids.length; r++) {
      if (String(ids[r][0]) === String(enquiryId)) {
        sheet.getRange(r + 2, statusCol).setValue(status);

        return json({ ok: true });
      }
    }
  }

  return json({ ok: false, error: 'Enquiry not found' });
}


// ==========================
// JSON HELPER
// ==========================
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}