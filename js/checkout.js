/* checkout.js — ClassicVapes Checkout (fixed version)
----------------------------------------------------- */

const POST_URL = ""; // Optional: your Apps Script web app URL

/* ---------- Helpers ---------- */
function getCart() {
  try { return JSON.parse(localStorage.getItem('cart')) || []; }
  catch(e){ console.error("Cart parse error", e); return []; }
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

/* ---------- Render cart summary (FIXED for [object Object]) ---------- */
function renderSummary(){
  const cart = getCart();
  const itemsEl = document.getElementById('order-items');
  const totalEl = document.getElementById('order-total');
  itemsEl.innerHTML = '';

  if(!cart.length){
    itemsEl.innerHTML = '<p class="empty-cart">Your cart is empty. <a href="products.html">Shop now</a></p>';
    totalEl.innerText = '0';
    return;
  }

  let total = 0;

  cart.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'order-item';

    const left = document.createElement('div');
    left.className = 'item-left';

    const img = document.createElement('img');
    img.src = item.image || 'images/logo.png';
    img.alt = item.name || 'Product';
    img.width = 60; img.height = 60;
    img.onerror = () => img.src = 'images/logo.png';

    const name = document.createElement('div');
    name.textContent = `${item.name || "Product"} × ${item.qty || 1}`;

    left.appendChild(img);
    left.appendChild(name);

    // ✅ extract numeric price safely
    let priceNum = 0;
    if (typeof item.price === "object") {
      // handle { mrp: 1000, offer: 800 }
      priceNum = item.price.offer || item.price.mrp || 0;
    } else if (typeof item.price === "string") {
      // handle "800" or "₹800"
      priceNum = parseFloat(item.price.replace(/[^\d.]/g, "")) || 0;
    } else {
      priceNum = Number(item.price) || 0;
    }

    const lineTotal = priceNum * (item.qty || 1);
    total += lineTotal;

    const right = document.createElement('div');
    right.textContent = '₹' + lineTotal.toFixed(0);

    itemDiv.appendChild(left);
    itemDiv.appendChild(right);
    itemsEl.appendChild(itemDiv);
  });

  totalEl.innerText = total.toFixed(0);
}


/* ---------- Validate ---------- */
function validateForm(name, phone, addr, state, pin, txn){
  if(!name) return "Enter full name";
  if(!/^\d{10}$/.test(phone)) return "Phone must be 10 digits";
  if(!addr) return "Enter address";
  if(!state) return "Select state";
  if(!/^\d{6}$/.test(pin)) return "Pincode must be 6 digits";
  if(!txn) return "Enter UPI Transaction ID";
  return "";
}

/* ---------- Submit order ---------- */
async function submitOrder(orderObj){
  const orders = getOrders();
  orders.unshift(orderObj);
  setOrders(orders);

  if(POST_URL && POST_URL.trim()){
    try{
      const resp = await fetch(POST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderObj)
      });
      await resp.text();
    }catch(err){
      console.warn("POST failed (maybe CORS, safe to ignore):", err);
    }
  }
}

/* ---------- Main UI Logic ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderSummary();

  // Input limits
  const phoneInput = document.getElementById('cus-phone');
  if(phoneInput)
    phoneInput.addEventListener('input', () => phoneInput.value = phoneInput.value.replace(/\D/g,'').slice(0,10));

  const pinInput = document.getElementById('cus-pincode');
  if(pinInput)
    pinInput.addEventListener('input', () => pinInput.value = pinInput.value.replace(/\D/g,'').slice(0,6));

  // UPI intent buttons
  const upiBase = "zerabathool4@oksbi";
  const makeUPI = (scheme) => `${scheme}://pay?pa=${upiBase}&pn=ClassicVapes&cu=INR`;

  const gpay = document.getElementById('gpay-btn');
  const phonepe = document.getElementById('phonepe-btn');
  const paytm = document.getElementById('paytm-btn');

  if(gpay) gpay.onclick = ()=> window.location.href = makeUPI("upi");
  if(phonepe) phonepe.onclick = ()=> window.location.href = makeUPI("phonepe");
  if(paytm) paytm.onclick = ()=> window.location.href = makeUPI("paytmmp");

  // Place order
  const placeBtn = document.getElementById('place-order');
  if(placeBtn) placeBtn.addEventListener('click', async ()=>{
    const name = document.getElementById('cus-name').value.trim();
    const phone = document.getElementById('cus-phone').value.trim();
    const addr = document.getElementById('cus-address-line').value.trim();
    const state = document.getElementById('cus-state').value.trim();
    const pin = document.getElementById('cus-pincode').value.trim();
    const txn = document.getElementById('txn-id').value.trim();
    const msgEl = document.getElementById('checkout-msg');

    const err = validateForm(name, phone, addr, state, pin, txn);
    if(err){ msgEl.textContent = err; msgEl.style.color = 'red'; return; }

    const cart = getCart();
    if(!cart.length){ msgEl.textContent = "Cart is empty"; msgEl.style.color = 'red'; return; }

    const total = cart.reduce((sum, i)=> sum + (parseFloat(i.price)||0) * (i.qty||1), 0);
    const productsStr = cart.map(i => `${i.name} x${i.qty}`).join(', ');

    const orderId = generateOrderId();
    const orderObj = {
      orderId,
      date: formatDate(new Date()),
      name,
      phone,
      address: `${addr}, ${state} - ${pin}`,
      products: productsStr,
      total,
      txnId: txn,
      status: 'Pending'
    };

    msgEl.textContent = "Saving order...";
    msgEl.style.color = "#444";

    try {
      await submitOrder(orderObj);
      localStorage.removeItem('cart');
      renderSummary();
      msgEl.textContent = "";

      const modal = document.getElementById('order-modal');
      const body = document.getElementById('modal-body');
      body.innerHTML = `
        ✅ <b>Thank you!</b><br>
        Order <strong>${orderId}</strong> is under payment verification.<br>
        We'll confirm it soon.
      `;
      modal.style.display = "flex";

      document.getElementById('modal-orders').onclick = () => {
        modal.style.display='none';
        window.location.href='orders.html';
      };
      document.getElementById('modal-home').onclick = () => {
        modal.style.display='none';
        window.location.href='index.html';
      };
      modal.querySelector('.popup-close').onclick = () => modal.style.display='none';

    } catch(e){
      console.error("Error saving order", e);
      msgEl.textContent = "Failed to save order. Try again.";
      msgEl.style.color = "red";
    }
  });
});
