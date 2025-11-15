/* ===========================================================
   ClassicVapes — FINAL CHECKOUT.JS (Google Sheets + Modal)
   =========================================================== */

function getCart() {
  try { return JSON.parse(localStorage.getItem("cart")) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function getOrders() {
  try { return JSON.parse(localStorage.getItem("orders")) || []; }
  catch { return []; }
}

function saveOrders(orders) {
  localStorage.setItem("orders", JSON.stringify(orders));
}

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

/* RENDER CHECKOUT SUMMARY */
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

    const name = document.createElement("div");
    name.style.fontWeight = "600";
    name.innerText = `${it.name}${it.variant ? " ("+it.variant+")" : ""} × ${qtyNum}`;

    left.appendChild(img);
    left.appendChild(name);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "10px";

    const price = document.createElement("span");
    price.innerText = "₹" + lineTotal;

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

  totalEl.innerText = total;
}

/* VALIDATION */
function validateForm(name, phone, addr, state, pin, txn) {
  if (!name) return "Enter full name";
  if (!/^\d{10}$/.test(phone)) return "Phone must be 10 digits";
  if (!addr) return "Enter address";
  if (!state) return "Select state";
  if (!/^\d{6}$/.test(pin)) return "Pincode must be 6 digits";
  if (!txn) return "Enter transaction ID";
  return "";
}

/* MODAL */
function showModal(html) {
  const modal = document.getElementById("order-modal");
  const body = document.getElementById("modal-body");
  body.innerHTML = html;
  modal.style.display = "flex";
  modal.classList.add("popup-show");
}

function hideModal() {
  const modal = document.getElementById("order-modal");
  modal.style.display = "none";
  modal.classList.remove("popup-show");
}

/* VIEW ORDERS LIST */
function buildOrdersHtml() {
  const orders = getOrders();
  if (!orders.length) return "<p>No orders yet.</p>";

  return `
    <div style="max-height:60vh;overflow:auto;">
      ${orders.slice().reverse().map(o => `
        <div style="background:#fff;margin-bottom:10px;padding:12px;border-radius:12px;box-shadow:0 8px 20px rgba(0,0,0,0.05)">
          <strong>${o.orderId}</strong><br>
          <span style="font-size:14px;color:#444">${o.products}</span><br>
          <span style="font-size:12px;color:#666">${o.date}</span>
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
    phoneEl.value = phoneEl.value.replace(/\D/g, "").slice(0, 10);
  });

  const pinEl = document.getElementById("cus-pincode");
  if (pinEl) pinEl.addEventListener("input", () => {
    pinEl.value = pinEl.value.replace(/\D/g, "").slice(0, 6);
  });

  /* CLOSE MODAL */
  const modal = document.getElementById("order-modal");
  const closeBtn = document.querySelector(".popup-close");
  if (closeBtn) closeBtn.addEventListener("click", hideModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) hideModal();
  });

  document.getElementById("modal-home")?.addEventListener("click", () => {
    hideModal();
    window.location.href = "index.html";
  });

  document.getElementById("modal-orders")?.addEventListener("click", () => {
    showModal("<h3>Your Orders</h3>" + buildOrdersHtml());
  });

  /* PLACE ORDER */
  const btn = document.getElementById("place-order");
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

    /* SEND TO GOOGLE SHEET (NO-CORS FIX) */
    fetch("https://script.google.com/macros/s/AKfycbwvY6jQatuREzKr-sMdgD8PZqvPUeEG5uuaqXd-jjGE8Hq_w_UB-7HwYBjUSn8Lyiue/exec", {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderObj)
    });

    /* CLEAR CART */
    localStorage.removeItem("cart");
    renderSummary();

    /* SHOW SUCCESS MODAL */
    showModal(`
      <p>We're verifying your payment.</p>
      <div style="background:#fff;padding:12px;border-radius:12px;margin:10px 0">
        <strong>Order ID:</strong> ${orderId}<br>
        <strong>Total:</strong> ₹${total}<br>
        <strong>Products:</strong> ${productsStr}
      </div>
      <small>Thank you for shopping with ClassicVapes!</small>
    `);

    msg.innerText = "";
  });
});
