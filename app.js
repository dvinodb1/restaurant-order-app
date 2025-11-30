// === CONFIGURATION ===
// 🔗 Replace with your PUBLISHED Google Sheet CSV URL (File > Share > Publish to web > CSV)
const MENU_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSgt2py8ONY_7lLQcVsVQcnCO7lgpeIWT1bzUcvK0Vc-95Ll-27YbUTRdgH4XnBw5HhT_7IjUpGEeav/pub?gid=1477636374&single=true&output=csv';

// 🔗 Replace with your Google Apps Script Web App URL (from deployment)
const ORDER_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzjJ8hdWZBNco8B7stc2ZA2nWkX90wSIi73ot_B_fGeseWUTXmKO1uf_GNVGmY70OksPA/exec';

// ======================

let MENU = [];
let cart = {}; // { "Pizza": { qty: 2, price: 12 }, ... }

// --- CSV Parser ---
function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
    const item = {};
    headers.forEach((h, i) => {
      let val = values[i] || '';
      if (h === 'Price' || h === 'Quantity') val = isNaN(val) ? 0 : Number(val);
      item[h] = val;
    });
    return item;
  });
}

// --- Load Menu ---
async function loadMenu() {
  try {
    const res = await fetch(MENU_CSV_URL);
    const text = await res.text();
    MENU = parseCSV(text).filter(item => item['Item Name']);
    
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('menu-section').classList.remove('hidden');
    renderMenu();
    updateCartUI();
  } catch (err) {
    console.error('Menu load failed:', err);
    document.getElementById('loading').textContent = '❌ Failed to load menu.';
  }
}

// --- Render Menu ---
function renderMenu() {
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = '';

  MENU.forEach(item => {
    const isAvailable = item.Quantity > 0;
    const div = document.createElement('div');
    div.className = 'menu-item';
    div.innerHTML = `
      <h3>${item['Item Name']}</h3>
      <div class="price">$${item.Price}</div>
      <div class="stock">${isAvailable ? `✅ ${item.Quantity} available` : '❌ Out of stock'}</div>
      <div class="qty-controls">
        <button class="qty-btn" ${isAvailable ? '' : 'disabled'} 
                onclick="updateQty('${item['Item Name']}', -1)">−</button>
        <span class="qty-display" id="qty-${item['Item Name']}">0</span>
        <button class="qty-btn" ${isAvailable ? '' : 'disabled'} 
                onclick="updateQty('${item['Item Name']}', 1)">+</button>
      </div>
    `;
    grid.appendChild(div);
  });
}

// --- Cart Logic ---
function updateQty(itemName, delta) {
  const item = MENU.find(i => i['Item Name'] === itemName);
  if (!item || item.Quantity <= 0) return;

  const current = cart[itemName]?.qty || 0;
  const newQty = Math.max(0, current + delta);
  
  if (newQty === 0) {
    delete cart[itemName];
  } else {
    cart[itemName] = { qty: newQty, price: item.Price };
  }

  document.getElementById(`qty-${itemName}`).textContent = newQty;
  updateCartUI();
}

function updateCartUI() {
  const cartItemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('total-amount');
  const checkoutBtn = document.getElementById('checkout-btn');
  const cartEl = document.getElementById('cart');

  if (Object.keys(cart).length === 0) {
    cartEl.classList.add('hidden');
    return;
  }

  cartEl.classList.remove('hidden');
  let total = 0;
  let html = '';

  for (const [name, { qty, price }] of Object.entries(cart)) {
    const subtotal = qty * price;
    total += subtotal;
    html += `<div class="cart-item"><span>${name} × ${qty}</span> <span>$${subtotal}</span></div>`;
  }

  cartItemsEl.innerHTML = html;
  totalEl.textContent = total.toFixed(2);
  checkoutBtn.disabled = total === 0;
}

// --- Navigation & Order Submission ---
document.getElementById('checkout-btn')?.addEventListener('click', () => {
  document.getElementById('menu-section').classList.add('hidden');
  document.getElementById('cart').classList.add('hidden');
  document.getElementById('order-form').classList.remove('hidden');
});

document.getElementById('back-to-cart')?.addEventListener('click', () => {
  document.getElementById('order-form').classList.add('hidden');
  document.getElementById('menu-section').classList.remove('hidden');
  document.getElementById('cart').classList.remove('hidden');
});

document.getElementById('submit-order').addEventListener('click', () => {
  const name = document.getElementById('name')?.value.trim();
  const phone = document.getElementById('phone')?.value.trim();
  const address = document.getElementById('address')?.value.trim();

  if (!name || !phone) {
    showStatus('Please fill in name and phone.', 'error');
    return;
  }

  const items = Object.entries(cart)
    .map(([name, { qty }]) => `${name} (x${qty})`)
    .join(', ');

  const submitBtn = document.getElementById('submit-order');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '📤 Sending...';

  fetch(ORDER_WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, address, items })
  })
  .then(() => {
    setTimeout(() => {
      showStatus('🎉 Order received! We’ll call you shortly.', 'success');
      // ✅ Now reset() works!
      document.getElementById('order-form').reset(); // ← Works because it's a <form>
      cart = {};
      document.getElementById('order-form').classList.add('hidden');
      document.getElementById('cart').classList.add('hidden');
      document.getElementById('menu-section').classList.remove('hidden');
      updateCartUI();
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }, 800);
  })
  .catch((err) => {
    console.error('Submission failed:', err);
    showStatus('❌ Failed to send. Check your internet and try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  });
});

function showStatus(message, type) {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = `status-${type}`;
}

// Make updateQty globally accessible for inline onclick
window.updateQty = updateQty;

// Start loading menu
document.addEventListener('DOMContentLoaded', loadMenu);
