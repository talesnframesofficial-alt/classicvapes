/* checkout.js
   Loads cart from localStorage ('cart'),
   validates form,
   generates OrderID CVxxxxx,
   saves order to localStorage key 'cv_orders',
   optionally POSTs to server if POST_URL is provided.
*/

/* ---------- CONFIG ----------
 * If you have an Apps Script web app URL that accepts JSON POST,
 * set POST_URL to that string (including https://...). If left empty,
 * the code will skip server POST but still save to local storage.
 */
const POST_URL = ""; // <-- OPTIONAL: set your Apps Script POST URL here (e.g. "https://script.google.com/macros/s/XXXX/exec")

/* ---------- Helpers ---------- */
function getCart(){
  try { return JSON.parse(localStorage.getItem('cart')) || []; }
  catch(e){ return []; }
}
function setOrders(arr){ localStorage.setItem('cv_orders', JSON.stringify(arr)); }
function getOrders(){ try { return JSON.parse(localStorage.getItem('cv_orders')) || []; } catch(e){ return []; } }

function formatDate(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return dd + '-' + mm + '-' + yyyy;
}
function generateOrderId(){
  const num = Math.floor(Math.random()*90000) + 10000;
  return 'CV' + String(num);
}

/* ---------- Render cart summary ---------- */
function renderSummary(){
  const cart = getCart();
  const itemsEl = document.getElementById('order-items');
  const totalEl = document.getElementById('order-total');
  itemsEl.innerHTML = '';
  if(!cart || cart.length === 0){
    itemsEl.innerHTML = '<p>Your cart is empty.</p>';
    totalEl.innerText = '0';
    return;
  }
  let total = 0;
  cart.forEach(it => {
    const line = document.createElement('div');
    line.className = 'order-item';
    const left = document.createElement('div');
    left.style.display = 'flex'; left.style.alignItems = 'center'; left.style.gap = '10px';
    const img = document.createElement('img');
    img.src = it.image || 'images/logo.png';
    img.width = 56; img.height = 56; img.style.borderRadius = '12px';
    img.onerror = function(){ this.src = 'images/logo.png'; };
    const name = document.createElement('div');
    name.innerText = `${it.name} × ${it.qty}`;
    left.appendChild(img); left.appendChild(name);

    const right = document.createElement('div');
    right.innerText = '₹' + (Number(it.price) * Number(it.qty)).toFixed(0);

    line.appendChild(left); line.appendChild(right);
    itemsEl.appendChild(line);

    total += Number(it.price) * Number(it.qty);
  });
  totalEl.innerText = total.toFixed(0);
}

/* ---------- Validate ---------- */
function validateForm(name, phone, addr, state, pin, txn){
  if(!name) return "Enter full name";
  if(!/^\d{10}$/.test(phone)) return "Phone must be 10 digits";
  if(!addr) return "Enter address line";
  if(!state) return "Select state";
  if(!/^\d{6}$/.test(pin)) return "Pincode must be 6 digits";
  if(!txn) return "Enter Transaction ID";
  return "";
}

/* ---------- Submit order ---------- */
async function submitOrder(orderObj){
  // Save locally first
  const orders = getOrders();
  orders.unshift(orderObj); // new on top
  setOrders(orders);

  // Try POST if configured (best-effort, ignore failures)
  if(POST_URL && POST_URL.trim()){
    try{
      const resp = await fetch(POST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderObj)
      });
      // try to read JSON; not all scripts return JSON
      try { const j = await resp.json(); console.log('post result', j); } catch(e){ console.log('post ok'); }
    }catch(err){
      console.warn('POST to server failed (this is okay if Apps Script has CORS or other issues):', err);
    }
  }
}

/* ---------- UI Logic ---------- */
document.addEventListener('DOMContentLoaded', () => {
  renderSummary();

  // Fill phone input maxlength control
  const phoneInput = document.getElementById('cus-phone');
  phoneInput.addEventListener('input', () => { phoneInput.value = phoneInput.value.replace(/[^\d]/g,'').slice(0,10); });

  const pinInput = document.getElementById('cus-pincode');
  // NOTE: in this layout pincode is #cus-pincode on other variants: but here we used #cus-pincode earlier? safe check
  const pincodeEl = document.getElementById('cus-pincode');
  if(pincodeEl){
    pincodeEl.addEventListener('input', ()=> { pincodeEl.value = pincodeEl.value.replace(/[^\d]/g,'').slice(0,6); });
  }

  // Buttons for UPI apps (attempt open handlers)
  document.getElementById('gpay-btn').addEventListener('click', ()=> {
    // upi intent (will open app if available)
    const upi = 'upi://pay?pa=zerabathool4@oksbi&pn=ClassicVapes&cu=INR';
    window.location.href = upi;
  });
  document.getElementById('phonepe-btn').addEventListener('click', ()=> {
    const upi = 'phonepe://pay?pa=zerabathool4@oksbi&pn=ClassicVapes&cu=INR';
    window.location.href = upi;
  });
  document.getElementById('paytm-btn').addEventListener('click', ()=> {
    const upi = 'paytmmp://pay?pa=zerabathool4@oksbi&pn=ClassicVapes&cu=INR';
    window.location.href = upi;
  });

  // Place order click
  document.getElementById('place-order').addEventListener('click', async () => {
    const name = document.getElementById('cus-name').value.trim();
    const phone = document.getElementById('cus-phone').value.trim();
    const addressLine = document.getElementById('cus-address-line').value.trim();
    const state = document.getElementById('cus-state').value;
    const pincode = document.getElementById('cus-pincode') ? document.getElementById('cus-pincode').value.trim() : (document.getElementById('cus-pincode')||{value:''}).value;
    const txn = document.getElementById('txn-id').value.trim();

    const err = validateForm(name, phone, addressLine, state, pincode, txn);
    const msgEl = document.getElementById('checkout-msg');
    if(err){
      msgEl.innerText = err;
      msgEl.style.color = 'red';
      return;
    }
    msgEl.innerText = 'Placing order...';
    msgEl.style.color = '#666';

    const cart = getCart();
    if(!cart || cart.length === 0){
      msgEl.innerText = 'Cart is empty';
      msgEl.style.color = 'red';
      return;
    }

    const total = cart.reduce((s,i)=> s + (Number(i.price) * Number(i.qty)),0);
    const productsStr = cart.map(i => `${i.name} x${i.qty}`).join(', ');

    const orderId = generateOrderId();
    const orderObj = {
      orderId,
      date: formatDate(new Date()),
      name,
      phone,
      address: `${addressLine}, ${state} - ${pincode}`,
      products: productsStr,
      total: Number(total),
      txnId: txn,
      status: 'Pending'
    };

    try{
      await submitOrder(orderObj);
      // Clear cart after saving
      localStorage.removeItem('cart');
      renderSummary();

      // show success modal
      const modal = document.getElementById('order-modal');
      const body = document.getElementById('modal-body');
      body.innerHTML = `Order placed! Verifying payment. ID: <strong>${orderId}</strong><br><small>We'll notify you after verification.</small>`;
      modal.style.display = 'flex';

      // modal buttons
      document.getElementById('modal-orders').onclick = () => {
        modal.style.display='none';
        window.location.href = 'orders.html';
      };
      document.getElementById('modal-home').onclick = () => {
        modal.style.display='none';
        window.location.href = 'index.html';
      };
      // close btn
      modal.querySelector('.popup-close').onclick = () => modal.style.display='none';

      msgEl.innerText = '';
    }catch(e){
      console.error('Error saving order:', e);
      msgEl.innerText = 'Failed to place order. Try again.';
      msgEl.style.color = 'red';
    }
  });
});
