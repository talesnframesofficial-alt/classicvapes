/* checkout.js — ClassicVapes verified UPI checkout */

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch (e) {
    return [];
  }
}

function formatDate(d) {
  return `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${d.getFullYear()}`;
}

function generateOrderId() {
  return "CV" + Math.floor(Math.random() * 90000 + 10000);
}

function renderSummary() {
  itemsEl.innerHTML = "";
let total = 0;

cart.forEach((it, idx) => {
  const priceVal =
    typeof it.price === "object"
      ? it.price.offer || it.price.mrp || 0
      : Number(it.price) || 0;

  const line = document.createElement("div");
  line.className = "order-item";

  const left = document.createElement("div");
  left.className = "order-left";

  const img = document.createElement("img");
  img.src = it.image || "images/logo.png";
  img.width = 50;
  img.height = 50;

  const name = document.createElement("div");
  const productName =
    typeof it.name === "object"
      ? it.name.name || JSON.stringify(it.name)
      : it.name;
  name.innerText = `${productName} × ${it.qty}`;

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-btn";
  removeBtn.innerText = "🗑";
  removeBtn.title = "Remove item";
  removeBtn.onclick = () => {
    const updated = getCart();
    updated.splice(idx, 1);
    localStorage.setItem("cart", JSON.stringify(updated));
    renderSummary();
  };

  left.appendChild(img);
  left.appendChild(name);
  line.appendChild(left);
  line.appendChild(removeBtn);

  const right = document.createElement("div");
  right.innerText = "₹" + (priceVal * it.qty).toFixed(0);
  line.appendChild(right);
  itemsEl.appendChild(line);

  total += priceVal * it.qty;
});

  }

  let total = 0;
  cart.forEach((it) => {
    const priceVal =
      typeof it.price === "object"
        ? it.price.offer || it.price.mrp || 0
        : Number(it.price) || 0;

    const line = document.createElement("div");
    line.className = "order-item";

    const left = document.createElement("div");
    left.className = "order-left";

    const img = document.createElement("img");
    img.src = it.image || "images/logo.png";
    img.width = 50;
    img.height = 50;
    img.onerror = function () {
      this.src = "images/logo.png";
    };

    const txt = document.createElement("div");
    const productName =
      typeof it.name === "object"
        ? it.name.name || JSON.stringify(it.name)
        : it.name;
    txt.innerText = `${productName} × ${it.qty}`;

    left.appendChild(img);
    left.appendChild(txt);

    const right = document.createElement("div");
    right.innerText = "₹" + (priceVal * it.qty).toFixed(0);

    line.appendChild(left);
    line.appendChild(right);
    itemsEl.appendChild(line);

    total += priceVal * it.qty;
  });

  totalEl.innerText = total.toFixed(0);
}

function validateForm(name, phone, address, state, pin, txn) {
  if (!name) return "Enter your name";
  if (!/^[0-9]{10}$/.test(phone)) return "Phone must be 10 digits";
  if (!address) return "Enter address";
  if (!state) return "Select a state";
  if (!/^[0-9]{6}$/.test(pin)) return "Pincode must be 6 digits";
  if (!txn) return "Enter Transaction ID";
  return "";
}

function submitOrder(order) {
  const orders = JSON.parse(localStorage.getItem("cv_orders") || "[]");
  orders.unshift(order);
  localStorage.setItem("cv_orders", JSON.stringify(orders));
  localStorage.removeItem("cart");
}

document.addEventListener("DOMContentLoaded", () => {
  renderSummary();

  const phone = document.getElementById("cus-phone");
  const pin = document.getElementById("cus-pincode");
  if (phone)
    phone.addEventListener(
      "input",
      () => (phone.value = phone.value.replace(/\D/g, "").slice(0, 10))
    );
  if (pin)
    pin.addEventListener(
      "input",
      () => (pin.value = pin.value.replace(/\D/g, "").slice(0, 6))
    );

  const gpay = document.getElementById("gpay-btn");
  if (gpay)
    gpay.addEventListener("click", () => {
      window.location.href =
        "upi://pay?pa=zerabathool4@oksbi&pn=ClassicVapes&cu=INR";
    });

  const phonepe = document.getElementById("phonepe-btn");
  if (phonepe)
    phonepe.addEventListener("click", () => {
      window.location.href =
        "phonepe://pay?pa=zerabathool4@oksbi&pn=ClassicVapes&cu=INR";
    });

  const paytm = document.getElementById("paytm-btn");
  if (paytm)
    paytm.addEventListener("click", () => {
      window.location.href =
        "paytmmp://pay?pa=zerabathool4@oksbi&pn=ClassicVapes&cu=INR";
    });

  const placeBtn = document.getElementById("place-order");
  if (placeBtn)
    placeBtn.addEventListener("click", () => {
      const name = document.getElementById("cus-name").value.trim();
      const phone = document.getElementById("cus-phone").value.trim();
      const address = document.getElementById("cus-address-line").value.trim();
      const state = document.getElementById("cus-state").value;
      const pin = document.getElementById("cus-pincode").value.trim();
      const txn = document.getElementById("txn-id").value.trim();
      const msgEl = document.getElementById("checkout-msg");

      const err = validateForm(name, phone, address, state, pin, txn);
      if (err) {
        msgEl.innerText = err;
        msgEl.style.color = "red";
        return;
      }

      const cart = getCart();
      if (!cart.length) {
        msgEl.innerText = "Your cart is empty";
        msgEl.style.color = "red";
        return;
      }

      const total = cart.reduce(
        (sum, it) =>
          sum +
          (typeof it.price === "object"
            ? it.price.offer || it.price.mrp || 0
            : Number(it.price) || 0) *
            (it.qty || 1),
        0
      );

      const orderId = generateOrderId();
      const products = cart.map((i) => `${i.name} × ${i.qty}`).join(", ");

      const orderObj = {
        orderId,
        date: formatDate(new Date()),
        name,
        phone,
        address: `${address}, ${state} - ${pin}`,
        products,
        total,
        txnId: txn,
        status: "Pending Verification",
      };

      submitOrder(orderObj);

      const modal = document.getElementById("order-modal");
      const body = document.getElementById("modal-body");
      body.innerHTML = `Thank you, <b>${name}</b>!<br>Order <b>${orderId}</b> placed.<br>Payment under verification.`;
      modal.style.display = "flex";

      msgEl.innerText = "";
      renderSummary();
    });
});
