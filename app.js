// === CONFIGURATION ===
// 🔗 Replace with your PUBLISHED Google Sheet CSV URL (File > Share > Publish to web > CSV)
const MENU_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSgt2py8ONY_7lLQcVsVQcnCO7lgpeIWT1bzUcvK0Vc-95Ll-27YbUTRdgH4XnBw5HhT_7IjUpGEeav/pub?gid=1477636374&single=true&output=csv';

// 🔗 Replace with your Google Apps Script Web App URL (from deployment)
const ORDER_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbylwEnuPCibAsoQtpojMBwrh9KmUXmw1FdzFtwiMdbCJqlEtSplbJqV7_j5l_LblzeYUQ/exec';

// =====================

let MENU = [];

// Parse CSV into array of objects
function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
  return lines.slice(1).map(line => {
    // Handle quoted fields (e.g., "Garlic Bread, Spicy")
    const values = [];
    let insideQuote = false;
    let current = '';
    for (let char of line) {
      if (char === '"' && !insideQuote) insideQuote = true;
      else if (char === '"' && insideQuote) insideQuote = false;
      else if (char === ',' && !insideQuote) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const item = {};
    headers.forEach((header, i) => {
      let val = values[i] || '';
      if (header === 'Price' || header === 'Quantity') {
        val = isNaN(val) ? 0 : Number(val);
      }
      item[header] = val;
    });
    return item;
  });
}

// Load menu from Google Sheet
async function loadMenu() {
  try {
    console.log('Fetching menu from:', MENU_CSV_URL); // 👈 ADD THIS
    const res = await fetch(MENU_CSV_URL);
    console.log('CSV Response status:', res.status); // 👈 ADD THIS
    if (!res.ok) throw new Error('Failed to fetch CSV');
    const csvText = await res.text();
    console.log('Raw CSV:', csvText); // 👈 ADD THIS
     MENU = parseCSV(csvText).filter(item => 
      item['Item Name'] && 
      typeof item['Item Name'] === 'string' && 
      item['Item Name'].trim() !== ''
    );

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('menu-list').classList.remove('hidden');
    document.getElementById('order-form').classList.remove('hidden');

    renderMenu();
    buildOrderCheckboxes();
  } catch (err) {
    console.error('Menu load error:', err);
    document.getElementById('loading').textContent = '❌ Menu unavailable. Check console for details.';
  }
}

function renderMenu() {
  const ul = document.getElementById('menu-list');
  ul.innerHTML = '';
  if (MENU.length === 0) {
    ul.innerHTML = '<li>No items available right now.</li>';
    return;
  }

  MENU.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item['Item Name']} — $${item.Price}`;
    if (item.Quantity <= 0) {
      li.classList.add('out-of-stock');
      li.title = 'Out of stock';
    }
    ul.appendChild(li);
  });
}

function buildOrderCheckboxes() {
  const container = document.getElementById('order-items');
  container.innerHTML = '';

  const inStockItems = MENU.filter(item => item.Quantity > 0);
  if (inStockItems.length === 0) {
    container.innerHTML = '<p>All items are currently out of stock.</p>';
    document.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  inStockItems.forEach(item => {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="checkbox" name="item" value="${item['Item Name']}|${item.Price}">
      ${item['Item Name']} ($${item.Price})
    `;
    container.appendChild(label);
  });

  document.querySelector('button[type="submit"]').disabled = false;
}

// Handle order submission
document.getElementById('order-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();

  const selected = Array.from(document.querySelectorAll('input[name="item"]:checked'))
    .map(cb => cb.value);

  if (selected.length === 0) {
    showStatus('Please select at least one item.', 'error');
    return;
  }

  const order = { name, phone, address, items: selected.join('; ') };

  try {
    // Use no-cors because Google Apps Script doesn't support full CORS
    await fetch(ORDER_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });

    // Since no-cors hides response, we assume success
    showStatus('🎉 Order received! We’ll call you shortly.', 'success');
    document.getElementById('order-form').reset();
    document.querySelectorAll('input[name="item"]:checked').forEach(el => el.checked = false);
  } catch (err) {
    showStatus('❌ Failed to submit. Check your connection and try again.', 'error');
  }
});

function showStatus(message, type) {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = `status-${type}`;
}

// Start loading menu when page loads
document.addEventListener('DOMContentLoaded', loadMenu);
