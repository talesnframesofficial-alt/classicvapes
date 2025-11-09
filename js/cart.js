/* ===== SAFE CART WITH NO ERRORS ===== */

let cart = JSON.parse(localStorage.getItem("cart") || "[]");

function saveCart(){
  localStorage.setItem("cart", JSON.stringify(cart));
}

function addToCart(item){
  const found = cart.find(x => x.id === item.id);
  if(found){
    found.qty += 1;
  } else {
    cart.push({...item, qty:1});
  }
  saveCart();
  updateCartUI();
  showToast("Added to cart ✅");
}

function removeCart(id){
  cart = cart.filter(x => x.id !== id);
  saveCart();
  updateCartUI();
}

function updateCartUI(){
  const box = document.getElementById("cart-items");
  const count = document.getElementById("cart-count");
  const totalUI = document.getElementById("total");

  if(!box) return;
  box.innerHTML = "";

  let total = 0;
  cart.forEach(p => {
    total += p.price * p.qty;
    box.innerHTML += `
      <div class="cart-item">
        <span>${p.name} × ${p.qty}</span>
        <span>₹${p.price * p.qty}</span>
        <button onclick="removeCart('${p.id}')">✕</button>
      </div>`;
  });

  if(count) count.innerText = cart.length;
  if(totalUI) totalUI.innerText = total;
}

function toggleCart(){
  const c = document.getElementById("cart");
  if(c) c.style.display = c.style.display === "block" ? "none" : "block";
}

function showToast(msg){
  let t = document.getElementById("toast");
  if(!t){
    t = document.createElement("div");
    t.id="toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display="block";
  setTimeout(()=>t.style.display="none",2000);
}

document.addEventListener("DOMContentLoaded", updateCartUI);
window.addToCart = addToCart;
window.removeCart = removeCart;
window.toggleCart = toggleCart;
window.showToast = showToast;
