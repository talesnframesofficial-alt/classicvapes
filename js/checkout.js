/* ===========================================================
   ClassicVapes — FULL CHECKOUT.JS (FINAL VERSION)
   With:
   ✔ Order Summary
   ✔ Validation
   ✔ Modal Popup
   ✔ Local Order Save
   ✔ Google Sheet Integration
   =========================================================== */

/* CART FUNCTIONS */
function getCart() {
  try { return JSON.parse(localStorage.getItem("cart")) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

/* ORDERS (local) */
function getOrders() {
  try { return JSON.parse(localStorage.getItem("orders")) || []; }
  catch { return []; }
}

function saveOrders(orders) {
  localStorage.setItem("orders", JSON.stringify(orders));
}

/* UTILS */
function formatDate(d) {
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
}

function generateOrderId() {
  return "CV" + Math.floor(Math.random() * 90000 + 10000);
}

/* REMOVE ITEM */
function removeItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderSummary();
}

/* RENDER SUMMARY */
function renderSummary() {
  const cart = getCart();
  const itemsEl = document.getElementById("order-items");
  const totalEl = document.getElementById("order-total");

  if (!itemsEl || !totalEl) return;

  itemsEl.innerHTML = "";

  if (!cart.length) {
    itemsEl.innerHTML = "<p>Your cart is empty.</p>";
    totalEl.innerText = "0";
    return;
  }

  let total = 0;

  cart.forEach((it, i) => {
    const priceNum = Number(it.price || 0);
    const qtyNum = Number(it.qty || 1);
    const lineTotal = priceNum * qtyNum;

    const line = document.createElement("div");
    line.className = "order-item";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "12px";

    const img = document.createElement("img");
    img.src = it.image || "images/logo.png";
    img.onerror = () => (img.src = "images/logo.png");

    const nameWrap = document.createElement("div");
    nameWrap.style.fontWeight = "600";
    nameWrap.innerText = `${it.name}${it.variant ? " (" + it.variant + ")" : ""} × ${qtyNum}`;

    left.appendChild(img);
    left.appendChild(nameWrap);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "10px";

    const price = document.createElement("span");
    price.innerText = "₹" + lineTotal.toFixed(0);

    const remove = document.createElement("button");
    remove.className = "remove-btn";
    remove.innerText = "🗑";
    remove.onclick = () => removeItem(i);

    right.appendChild(price);
    right.appendChild(remove);

    line.appendChild(left);
    line.appendChild(right);
    itemsEl.appendChild(line);

    total += lineTotal;
  });

  totalEl.innerText = total.toFixed(0);
}

/* FORM VALIDATION */
function validateForm(name, phone, addr, state, pin, txn) {
  if (!name) return "Enter full name";
  if (!/^\d{10}$/.test(phone)) return "Phone must be 10 digits";
  if (!addr) return "Enter address";
  if (!state) return "Select state";
  if (!/^\d{6}$/.test(pin)) return "Pincode must be 6 digits";
  if (!txn) return "Enter transaction ID";
  return "";
}

/* MODAL FUNCTIONS */
function showModal(html) {
  const modal = document.getElementById("order-modal");
  const body = document.getElementById("modal-body");

  if (!modal || !body) return;

  body.innerHTML = html;

  modal.style.display = "flex";
  modal.classList.add("popup-show");
  modal.setAttribute("aria-hidden", "false");
}

function hideModal() {
  const modal = document.getElementById("order-modal");
  if (!modal) return;
  modal.style.display = "none";
  modal.classList.remove("popup-show");
  modal.setAttribute("aria-hidden", "true");
}

/* VIEW ORDERS HTML */
function buildOrdersHtml() {
  const orders = getOrders();
  if (!orders.length) return "<p style='text-align:center;color:#666'>No orders yet.</p>";

  return `
    <div style="max-height:60vh;overflow:auto;padding:8px">
      ${orders.slice().reverse().map(o => `
        <div style="background:#fff;border-radius:12px;padding:12px;box-shadow:0 8px 20px rgba(0,0,0,0.05);margin-bottom:10px">
          <strong>${o.orderId}</strong>
          <div style="font-size:14px;margin:4px 0;color:#444">${o.products}</div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#666">
            <span>${o.date}</span>
            <span>₹${o.total}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

/* MAIN */
document.addEventListener("DOMContentLoaded", () => {

  renderSummary();

  const phoneEl = document.getElementById("cus-phone");
  if (phoneEl) phoneEl.addEventListener("input", () => {
    phoneEl.value = phoneEl.value.replace(/[^\d]/g, "").slice(0, 10);
  });

  const pinEl = document.getElementById("cus-pincode");
  if (pinEl) pinEl.addEventListener("input", () => {
    pinEl.value = pinEl.value.replace(/[^\d]/g, "").slice(0, 6);
  });

  /* CLOSE MODAL */
  const modal = document.getElementById("order-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hideModal();
    });
    const closeBtn = modal.querySelector(".popup-close");
    if (closeBtn) closeBtn.addEventListener("click", hideModal);
  }

  document.getElementById("modal-home")?.addEventListener("click", () => {
    hideModal();
    window.location.href = "index.html";
  });

  document.getElementById("modal-orders")?.addEventListener("click", () => {
    showModal(`<h3 style="text-align:center">Your Orders</h3>${buildOrdersHtml()}`);
  });

  /* PLACE ORDER */
  const btn = document.getElementById("place-order");
  if (!btn) return;

  btn.addEventListener("click", () => {

    const name = document.getElementById("cus-name").value.trim();
    const phone = document.getElementById("cus-phone").value.trim();
    const address = document.getElementById("cus-address-line").value.trim();
    const state = document.getElementById("cus-state").value.trim();
    const pincode = document.getElementById("cus-pincode").value.trim();
    const txn = document.getElementById("txn-id").value.trim();
    const msg = document.getElementById("checkout-msg");

    const err = validateForm(name, phone, address, state, pincode, txn);
    if (err) {
      msg.innerText = err;
      msg.style.color = "red";
      return;
    }

    const cart = getCart();
    if (!cart.length) {
      msg.innerText = "Cart is empty";
      msg.style.color = "red";
      return;
    }

    const total = cart.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
    const productsStr = cart.map(i => `${i.name} x${i.qty}`).join(", ");
    const orderId = generateOrderId();

    const orderObj = {
      orderId,
      date: formatDate(new Date()),
      name,
      phone,
      address: `${address}, ${state} - ${pincode}`,
      products: productsStr,
      total,
      txnId: txn,
      status: "Pending"
    };

    /* SAVE LOCALLY */
    const orders = getOrders();
    orders.push(orderObj);
    saveOrders(orders);

    /* SEND TO GOOGLE SHEET */
  fetch("https://script.google.com/macros/s/AKfycbwvY6jQatuREzKr-sMdgD8PZqvPUeEG5uuaqXd-jjGE8Hq_w_UB-7HwYBjUSn8Lyiue/exec", {
  method: "POST",
  mode: "no-cors",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(orderObj)
});
.catch(err => console.error(err));

    /* CLEAR CART */
    localStorage.removeItem("cart");
    renderSummary();

    /* SHOW SUCCESS MODAL */
    showModal(`
      <p style="color:#666;margin-bottom:10px">We're verifying your payment.</p>
      <div style="background:#fff;padding:12px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,0.05);margin-bottom:8px">
        <div style="display:flex;justify-content:space-between">
          <strong>Order ID</strong>
          <strong>${orderId}</strong>
        </div>
        <div style="margin-top:6px;font-size:14px;color:#444">Amount: ₹${total}</div>
        <div style="margin-top:4px;font-size:13px;color:#666"><strong>Products:</strong> ${productsStr}</div>
      </div>
      <small style="color:#777">We’ll confirm shortly. Thank you!</small>
    `);

    msg.innerText = "";
  });
});
