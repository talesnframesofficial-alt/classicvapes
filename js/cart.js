/* js/cart.js - safe cart implementation (replaceable) */
let cart = JSON.parse(localStorage.getItem("classicvapes_cart_v1") || "[]");

function saveCart(){ localStorage.setItem("classicvapes_cart_v1", JSON.stringify(cart)); }
function calcTotal(){ return cart.reduce((s,i)=> s + (Number(i.price)||0) * (i.qty||1), 0); }

function updateCartUI(){
  const itemsBox = document.getElementById("cart-items");
  const countEl = document.getElementById("cart-count");
  const totalEl = document.getElementById("total") || document.querySelector(".cart-total span") || document.getElementById("cart-total");

  if(itemsBox) itemsBox.innerHTML = "";
  let total = 0;
  cart.forEach(it => {
    total += (Number(it.price)||0) * (it.qty||1);
    if(itemsBox){
      const div = document.createElement("div"); div.className = "cart-item";
      div.innerHTML = `<div style="flex:1">${it.name} × ${it.qty}</div><div>₹${(it.price*it.qty).toFixed(2)} <button style="margin-left:8px" onclick="removeCartItem('${it.id}')">✕</button></div>`;
      itemsBox.appendChild(div);
    }
  });
  if(countEl) countEl.innerText = cart.length || 0;
  if(totalEl) totalEl.innerText = total.toFixed(2);
}

function addToCart(item){
  // item: {id,name,price,qty,image}
  const existing = cart.find(c=> c.id === item.id && c.name === item.name);
  if(existing) existing.qty = (existing.qty||1) + (item.qty||1);
  else cart.push({ ...item, qty: item.qty || 1 });
  saveCart();
  updateCartUI();
  showToast && showToast("Added to cart");
}

function removeCartItem(id){
  cart = cart.filter(c => c.id !== id);
  saveCart();
  updateCartUI();
}

function toggleCart(){
  const c = document.getElementById("cart");
  if(!c) return;
  c.style.display = c.style.display === "block" ? "none" : "block";
}

function clearCart(){ cart = []; saveCart(); updateCartUI(); }

window.addToCart = addToCart;
window.removeCartItem = removeCartItem;
window.toggleCart = toggleCart;
window.showToast = (msg)=> {
  let t = document.getElementById("toast");
  if(!t){ t = document.createElement("div"); t.id="toast"; document.body.appendChild(t); }
  t.innerText = msg; t.style.display = "block";
  setTimeout(()=> t.style.display = "none", 1800);
};

document.addEventListener("DOMContentLoaded", updateCartUI);
