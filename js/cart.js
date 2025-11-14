/* ---------------- cart.js — ClassicVapes Master Cart ---------------- */

const CART_KEY = "cart";

/* Get / Save / Update */
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function updateCartCount() {
  const el = document.getElementById("cart-count");
  if (el) el.innerText = getCart().reduce((a, i) => a + i.qty, 0);
}

/* Add to Cart */
function addToCart(item) {
  if (!item || !item.name) return;

  const cart = getCart();
  const existing = cart.find(c => c.id === item.id && c.variant === item.variant);

  if (existing) existing.qty += item.qty || 1;
  else cart.push({
    id: item.id,
    name: item.name,
    price: Number(item.price) || 0,
    qty: item.qty || 1,
    image: item.image || "images/logo.png",
    variant: item.variant || null,
  });

  saveCart(cart);
  updateCartCount();
  showToast("Added to cart");
}

/* Remove */
function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
  updateCartCount();
}

/* Render Cart Popup */
function renderCart() {
  const cart = getCart();
  const list = document.getElementById("cart-items");
  const totalEl = document.getElementById("total");
  if (!list || !totalEl) return;

  list.innerHTML = "";
  if (!cart.length) {
    list.innerHTML = "<p>Your cart is empty.</p>";
    totalEl.innerText = "0";
    return;
  }

  let total = 0;
  cart.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "cart-item";

    const left = document.createElement("div");
    left.className = "cart-left";

    const img = document.createElement("img");
    img.src = item.image || "images/logo.png";
    img.alt = item.name;
    img.width = 50;
    img.height = 50;
    img.style.borderRadius = "8px";
    img.onerror = () => (img.src = "images/logo.png");

    const title = document.createElement("div");
    const subtotal = Number(item.price) * Number(item.qty);
    title.innerText = `${item.name}${item.variant ? " (" + item.variant + ")" : ""} × ${item.qty} = ₹${subtotal}`;

    left.appendChild(img);
    left.appendChild(title);

    const right = document.createElement("div");
    right.className = "cart-right";

    const price = document.createElement("span");
    price.className = "cart-price";
    price.innerText = "₹" + subtotal;

    const remove = document.createElement("button");
    remove.className = "remove-btn";
    remove.innerText = "🗑";
    remove.title = "Remove";
    remove.onclick = () => removeFromCart(i);

    right.appendChild(price);
    right.appendChild(remove);

    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);

    total += subtotal;
  });

  totalEl.innerText = total.toFixed(0);
}

/* Cart Toggle */
function toggleCart() {
  const cart = document.getElementById("cart");
  if (!cart) return;
  const visible = cart.style.display === "block";
  cart.style.display = visible ? "none" : "block";
  if (!visible) renderCart();
}

/* Toast Message */
function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = msg;
  document.body.appendChild(toast);
  setTimeout(() => (toast.style.opacity = "1"), 10);
  setTimeout(() => (toast.style.opacity = "0"), 2000);
  setTimeout(() => toast.remove(), 2500);
}

/* Init */
document.addEventListener("DOMContentLoaded", updateCartCount);
window.addToCart = addToCart;
window.renderCart = renderCart;
window.toggleCart = toggleCart;
