// Replace with your Google Sheet ID (from URL)
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    const postData = typeof e.postData.contents === 'string' 
      ? JSON.parse(e.postData.contents) 
      : {};

    const timestamp = new Date();
    const name = postData.name || 'Anonymous';
    const phone = postData.phone || '';
    const address = postData.address || '';
    const items = postData.items || '';

    sheet.appendRow([timestamp, name, phone, address, items, 'Pending']);
    
    // Must return valid CORS response if you ever switch to 'cors' mode
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional: Allow testing via browser
function doGet() {
  return HtmlService.createHtmlOutput('Restaurant Order Backend – Ready!');
}
