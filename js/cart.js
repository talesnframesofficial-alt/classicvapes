/* cart.js — ClassicVapes Smart Cart Manager */

const CART_KEY = "cart";

/* Helpers */
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch (e) { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function updateCartCount() {
  const countEl = document.getElementById("cart-count");
  if (countEl) {
    const count = getCart().reduce((sum, i) => sum + i.qty, 0);
    countEl.innerText = count;
  }
}

/* Add to cart */
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

/* Remove */
function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
  updateCartCount();
}

/* Render Cart */
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
    left.className = "cart-left";

    const img = document.createElement("img");
    img.src = it.image || "images/logo.png";
    img.alt = it.name;
    img.width = 48;
    img.height = 48;
    img.style.borderRadius = "10px";
    img.onerror = () => (img.src = "images/logo.png");

    const name = document.createElement("div");
    const lineTotal = (Number(it.price) * Number(it.qty)).toFixed(0);
    name.innerText = `${it.name}${it.variant ? " (" + it.variant + ")" : ""} × ${it.qty} = ₹${lineTotal}`;

    left.appendChild(img);
    left.appendChild(name);

    const right = document.createElement("div");
    right.className = "cart-right";
    const price = document.createElement("span");
    price.className = "cart-price";
    price.innerText = "₹" + lineTotal;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.innerText = "🗑";
    removeBtn.title = "Remove item";
    removeBtn.onclick = () => removeFromCart(idx);

    right.appendChild(price);
    right.appendChild(removeBtn);

    div.appendChild(left);
    div.appendChild(right);
    container.appendChild(div);

    total += Number(it.price) * Number(it.qty);
  });

  totalEl.innerText = total.toFixed(0);
  updateCartCount();
}

/* Toast */
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => (t.style.opacity = "1"), 10);
  setTimeout(() => (t.style.opacity = "0"), 2000);
  setTimeout(() => t.remove(), 2500);
}

/* Toggle cart popup */
function toggleCart() {
  const cart = document.getElementById("cart");
  if (cart) {
    const visible = cart.style.display === "block";
    cart.style.display = visible ? "none" : "block";
    if (!visible) renderCart();
  }
}

/* Init */
document.addEventListener("DOMContentLoaded", updateCartCount);
window.addToCart = addToCart;
window.toggleCart = toggleCart;
window.renderCart = renderCart;
window.showToast = showToast;
