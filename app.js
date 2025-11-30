// === CONFIG ===
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbylwEnuPCibAsoQtpojMBwrh9KmUXmw1FdzFtwiMdbCJqlEtSplbJqV7_j5l_LblzeYUQ/exec';
// Replace with your actual Google Apps Script Web App URL

// Sample static menu (replace with dynamic fetch later if needed)
const MENU = [
  { name: "Margherita Pizza", price: 12 },
  { name: "Chicken Burger", price: 10 },
  { name: "Caesar Salad", price: 8 },
  { name: "Garlic Bread", price: 5 }
];

// Render menu
const menuList = document.getElementById('menu-list');
MENU.forEach(item => {
  const li = document.createElement('li');
  li.innerHTML = `<strong>${item.name}</strong> — $${item.price}`;
  menuList.appendChild(li);
});

// Build order checkboxes
const orderItemsDiv = document.getElementById('order-items');
MENU.forEach((item, i) => {
  const label = document.createElement('label');
  label.innerHTML = `
    <input type="checkbox" name="item" value="${item.name}|${item.price}"> 
    ${item.name} ($${item.price})
  `;
  orderItemsDiv.appendChild(label);
  orderItemsDiv.appendChild(document.createElement('br'));
});

// Handle form submit
document.getElementById('order-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const phone = document.getElementById('phone').value;
  const address = document.getElementById('address').value;

  const selectedItems = Array.from(document.querySelectorAll('input[name="item"]:checked'))
    .map(cb => cb.value);

  if (selectedItems.length === 0) {
    showStatus('Please select at least one item.', 'error');
    return;
  }

  const order = {
    name,
    phone,
    address,
    items: selectedItems.join(', ')
  };

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors' // Required for Google Apps Script (but limits response visibility)
    });

    // Due to no-cors, we can't read response body — assume success
    showStatus('Order submitted! We’ll call you soon. 🎉', 'success');
    document.getElementById('order-form').reset();
    document.querySelectorAll('input[name="item"]:checked').forEach(el => el.checked = false);
  } catch (err) {
    showStatus('Failed to send order. Try again.', 'error');
  }
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status-${type}`;
}
