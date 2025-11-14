/* checkout.js — ClassicVapes Order Summary + UPI Verification + Item Removal */

function getCart() {
  try { return JSON.parse(localStorage.getItem("cart")) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
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
  itemsEl.innerHTML = "";

  if (!cart.length) {
    itemsEl.innerHTML = "<p>Your cart is empty.</p>";
    totalEl.innerText = "0";
    return;
  }

  let total = 0;

  cart.forEach((it, i) => {
    const lineTotal = Number(it.price) * Number(it.qty);

    const line = document.createElement("div");
    line.className = "order-item";
    line.style.display = "flex";
    line.style.alignItems = "center";
    line.style.justifyContent = "space-between";
    line.style.borderBottom = "1px solid #eee";
    line.style.padding = "10px 0";
    line.style.gap = "10px";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "10px";

    const img = document.createElement("img");
    img.src = it.image || "images/logo.png";
    img.width = 50;
    img.height = 50;
    img.style.borderRadius = "10px";
    img.onerror = () => (img.src = "images/logo.png");

    const name = document.createElement("div");
    name.style.fontWeight = "600";
    name.style.fontSize = "14px";
    name.innerText = `${it.name}${it.variant ? " (" + it.variant + ")" : ""} × ${it.qty} = ₹${lineTotal}`;

    left.appendChild(img);
    left.appendChild(name);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "10px";

    const price = document.createElement("span");
    price.innerText = "₹" + lineTotal;
    price.style.fontWeight = "600";

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

  const orderBtn = document.getElementById("place-order");
  if (orderBtn) {
    orderBtn.addEventListener("click", async () => {
      const name = document.getElementById("cus-name").value.trim();
      const phone = document.getElementById("cus-phone").value.trim();
      const address = document.getElementById("cus-address-line").value.trim();
      const state = document.getElementById("cus-state").value;
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

      const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
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

      // Clear cart after placing order
      localStorage.removeItem("cart");
      renderSummary();

      const modal = document.getElementById("order-modal");
      const body = document.getElementById("modal-body");
      if (modal && body) {
        body.innerHTML = `
          <div style="text-align:center;">
            <h3 style="margin-bottom:8px;">Order Placed!</h3>
            <p>We're verifying your payment.</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <small>We'll confirm soon. Thank you!</small>
          </div>`;
        modal.style.display = "flex";
      }

      msg.innerText = "";
    });
  }
});
