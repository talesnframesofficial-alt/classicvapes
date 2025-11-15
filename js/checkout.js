/* checkout.js — ClassicVapes Order Summary + UPI Verification + Item Removal
   Updated: modal show/hide, orders persistence, view orders inside modal
*/

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

/* Remove an item from cart */
function removeItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderSummary();
}

/* Render Checkout Summary */
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
    // left: image + name
    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "12px";

    const img = document.createElement("img");
    img.src = it.image || "images/logo.png";
    img.width = 55;
    img.height = 55;
    img.style.borderRadius = "12px";
    img.onerror = () => (img.src = "images/logo.png");

    const nameWrap = document.createElement("div");
    nameWrap.style.fontSize = "15px";
    nameWrap.style.color = "var(--text)";
    nameWrap.style.fontWeight = "600";
    nameWrap.innerText = `${it.name || "Item"}${it.variant ? " (" + it.variant + ")" : ""} × ${qtyNum}`;

    left.appendChild(img);
    left.appendChild(nameWrap);

    // right: price + remove
    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "10px";

    const price = document.createElement("span");
    price.innerText = "₹" + lineTotal.toFixed(0);
    price.style.fontWeight = "700";

    const remove = document.createElement("button");
    remove.className = "remove-btn";
    remove.title = "Remove item";
    remove.innerText = "🗑";
    remove.style.cursor = "pointer";
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

/* Validation */
function validateForm(name, phone, addr, state, pin, txn) {
  if (!name) return "Enter full name";
  if (!/^\d{10}$/.test(phone)) return "Phone must be 10 digits";
  if (!addr) return "Enter address";
  if (!state) return "Select state";
  if (!/^\d{6}$/.test(pin)) return "Pincode must be 6 digits";
  if (!txn) return "Enter transaction ID";
  return "";
}

/* Modal helpers */
function showModal(contentHtml) {
  const modal = document.getElementById("order-modal");
  const body = document.getElementById("modal-body");
  if (!modal || !body) return;
  body.innerHTML = contentHtml;
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

/* Build orders HTML list (for View Orders) */
function buildOrdersHtml() {
  const orders = getOrders();
  if (!orders.length) return "<div style='text-align:center;padding:12px;color:#666'>No orders yet.</div>";

  const list = orders.slice().reverse().map(o => {
    return `
      <div style="border-radius:10px;padding:10px;margin:8px 0;background:#fff;box-shadow:0 6px 18px rgba(0,0,0,0.04)">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <div style="font-weight:700">${o.name}</div>
          <div style="font-weight:800">₹${Number(o.total).toFixed(0)}</div>
        </div>
        <div style="font-size:13px;color:#666;margin-top:6px">${o.products}</div>
        <div style="font-size:12px;color:#777;margin-top:8px;display:flex;justify-content:space-between">
          <div>${o.date}</div>
          <div style="font-weight:700">${o.orderId}</div>
        </div>
      </div>
    `;
  }).join("");

  return `<div style="max-height:60vh;overflow:auto;padding:6px">${list}</div>`;
}

/* Submit Order */
document.addEventListener("DOMContentLoaded", () => {
  renderSummary();

  const phoneEl = document.getElementById("cus-phone");
  if (phoneEl)
    phoneEl.addEventListener("input", () => {
      phoneEl.value = phoneEl.value.replace(/[^\d]/g, "").slice(0, 10);
    });

  const pinEl = document.getElementById("cus-pincode");
  if (pinEl)
    pinEl.addEventListener("input", () => {
      pinEl.value = pinEl.value.replace(/[^\d]/g, "").slice(0, 6);
    });

  // UPI quick buttons
  const upiId = document.getElementById("upi-id") ? document.getElementById("upi-id").innerText.trim() : "";
  const upiURI = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("ClassicVapes")}`;

  const gpay = document.getElementById("gpay-btn");
  if (gpay) gpay.addEventListener("click", () => {
    // GPay deep link - will work on mobile if app installed
    window.open(`https://pay.google.com/intl/en_in/about/`,'_blank');
    // also try upi intent
    setTimeout(() => window.open(upiURI, "_self"), 300);
  });

  const phonepe = document.getElementById("phonepe-btn");
  if (phonepe) phonepe.addEventListener("click", () => {
    // PhonePe web landing (safer) then try UPI
    window.open("https://www.phonepe.com/", "_blank");
    setTimeout(() => window.open(upiURI, "_self"), 300);
  });

  const paytm = document.getElementById("paytm-btn");
  if (paytm) paytm.addEventListener("click", () => {
    window.open("https://pay.paytm.com/", "_blank");
    setTimeout(() => window.open(upiURI, "_self"), 300);
  });

  // Modal close binding (close icon and background click)
  const modal = document.getElementById("order-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      // close when clicking outside the popup-card
      if (e.target === modal) hideModal();
    });
    const closeBtn = modal.querySelector(".popup-close");
    if (closeBtn) closeBtn.addEventListener("click", hideModal);
  }

  // modal action buttons
  document.getElementById("modal-home")?.addEventListener("click", () => {
    hideModal();
    window.location.href = "index.html";
  });

  document.getElementById("modal-orders")?.addEventListener("click", () => {
    const html = `<h3 style="text-align:center;margin:6px 0 12px">Your Orders</h3>` + buildOrdersHtml();
    showModal(html);
  });

  // Place order button
  const orderBtn = document.getElementById("place-order");
  if (orderBtn) {
    orderBtn.addEventListener("click", async () => {
      const name = (document.getElementById("cus-name")?.value || "").trim();
      const phone = (document.getElementById("cus-phone")?.value || "").trim();
      const address = (document.getElementById("cus-address-line")?.value || "").trim();
      const state = (document.getElementById("cus-state")?.value || "").trim();
      const pincode = (document.getElementById("cus-pincode")?.value || "").trim();
      const txn = (document.getElementById("txn-id")?.value || "").trim();
      const msg = document.getElementById("checkout-msg");

      if (msg) { msg.innerText = ""; msg.style.color = "#666"; }

      const err = validateForm(name, phone, address, state, pincode, txn);
      if (err) {
        if (msg) { msg.innerText = err; msg.style.color = "red"; }
        return;
      }

      const cart = getCart();
      if (!cart.length) {
        if (msg) { msg.innerText = "Cart is empty"; msg.style.color = "red"; }
        return;
      }

      const total = cart.reduce((s, i) => s + (Number(i.price || 0) * Number(i.qty || 1)), 0);
      const productsStr = cart.map(i => `${i.name || "Item"} x${i.qty || 1}`).join(", ");
      const orderId = generateOrderId();

      const orderObj = {
        orderId,
        date: formatDate(new Date()),
        name,
        phone,
        address: `${address}, ${state} - ${pincode}`,
        products: productsStr,
        total: total,
        txnId: txn,
        status: "Pending"
      };

      // Save order to localStorage orders list
      const orders = getOrders();
      orders.push(orderObj);
      saveOrders(orders);

      // Clear cart after placing order
      localStorage.removeItem("cart");
      renderSummary();

      // show styled modal content (matches your popup look)
      const modalHtml = `
        <div style="text-align:center;padding:6px 0">
          <p style="margin:6px 0 10px;color:#666">We're verifying your payment. Keep the transaction ID handy.</p>
          <div style="background:#fff;border-radius:12px;padding:12px;margin:8px 0;box-shadow:0 8px 20px rgba(0,0,0,0.05);text-align:left">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div style="font-weight:800">Order ID</div>
              <div style="font-weight:800">${orderId}</div>
            </div>
            <div style="font-size:14px;color:#444;margin-bottom:6px"><strong>Amt: </strong>₹${Number(total).toFixed(0)}</div>
            <div style="font-size:13px;color:#666"><strong>Name:</strong> ${name}</div>
            <div style="font-size:13px;color:#666;margin-top:6px"><strong>Products:</strong> ${productsStr}</div>
          </div>
          <small style="color:#777">You will receive a confirmation shortly. Thank you for shopping with ClassicVapes.</small>
        </div>
      `;
      showModal(modalHtml);

      if (msg) { msg.innerText = ""; }
    });
  }
});
