/* cart.js — shared cart logic for ClassicVapes */

const CART_KEY = "cart";

/* ---------- Helpers ---------- */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function updateCartCount() {
  const countEl = document.getElementById("cart-count");
  if (countEl) countEl.innerText = getCart().reduce((sum, i) => sum + i.qty, 0);
}

/* ---------- Add / Remove ---------- */
function addToCart(item) {
  if (!item || !item.name) return;

  const cart = getCart();
  const existing = cart.find(
    (c) => c.id === item.id && c.variant === item.variant
  );

  if (existing) {
    existing.qty += item.qty || 1;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: Number(item.price) || 0,
      qty: item.qty || 1,
      image: item.image || "images/logo.png",
      variant: item.variant || null,
    });
  }

  saveCart(cart);
  updateCartCount();
  showToast("Added to cart");
}

/* ---------- Remove from cart ---------- */
function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
  updateCartCount();
}

/* ---------- Render cart popup ---------- */
function toggleCart() {
  const cart = document.getElementById("cart");
  if (cart) cart.style.display = cart.style.display === "block" ? "none" : "block";
  renderCart();
}

function renderCart() {
  const items = getCart();
  const container = document.getElementById("cart-items");
  const totalEl = document.getElementById("total");
  if (!container || !totalEl) return;

  container.innerHTML = "";
  let total = 0;

  if (items.length === 0) {
    container.innerHTML = "<p>Your cart is empty.</p>";
    totalEl.innerText = "0";
    updateCartCount();
    return;
  }

  items.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "cart-item";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "10px";

    const img = document.createElement("img");
    img.src = it.image || "images/logo.png";
    img.alt = it.name;
    img.width = 40;
    img.height = 40;
    img.style.borderRadius = "10px";
    img.onerror = function () {
      this.src = "images/logo.png";
    };

    const name = document.createElement("div");
    name.innerText = `${it.name}${it.variant ? " (" + it.variant + ")" : ""}`;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.innerText = "🗑";
    removeBtn.title = "Remove item";
    removeBtn.onclick = () => removeFromCart(idx);

    left.appendChild(img);
    left.appendChild(name);

    const right = document.createElement("div");
    right.innerText = "₹" + (it.price * it.qty).toFixed(0);

    div.appendChild(left);
    div.appendChild(right);
    div.appendChild(removeBtn);
    container.appendChild(div);

    total += Number(it.price) * Number(it.qty);
  });

  totalEl.innerText = total.toFixed(0);
  updateCartCount();
}

/* ---------- Toast ---------- */
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => (t.style.opacity = "1"), 10);
  setTimeout(() => (t.style.opacity = "0"), 2000);
  setTimeout(() => t.remove(), 2500);
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", updateCartCount);
window.addToCart = addToCart;
window.toggleCart = toggleCart;
window.renderCart = renderCart;
window.showToast = showToast;
