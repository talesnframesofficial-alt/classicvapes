/* ===========================================================
   ClassicVapes — FINAL CHECKOUT.JS  (Supabase Integrated)
   =========================================================== */

const SUPABASE_URL = "https://njflcjdgowjmvfipexwy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZmxjamRnb3dqbXZmaXBleHd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNzE4OTcsImV4cCI6MjA3ODg0Nzg5N30.dKKMdJIvN8avxUMtr9gZECnbLLJO6HjEGWuYeNFqh-g";

/* ---------- CART ---------- */
function getCart(){ try{return JSON.parse(localStorage.getItem("cart"))||[]}catch{return[]} }
function saveCart(c){ localStorage.setItem("cart",JSON.stringify(c)) }

/* ---------- LOCAL ORDERS ---------- */
function getOrders(){ try{return JSON.parse(localStorage.getItem("orders"))||[]}catch{return[]} }
function saveOrders(o){ localStorage.setItem("orders",JSON.stringify(o)) }

/* ---------- HELPERS ---------- */
const formatDate = d => `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
const generateOrderId = ()=> "CV"+Math.floor(Math.random()*90000+10000);

/* ---------- RENDER SUMMARY ---------- */
function renderSummary(){
  const cart = getCart();
  const items = document.getElementById("order-items");
  const totalEl = document.getElementById("order-total");
  if(!items||!totalEl) return;

  items.innerHTML = "";
  if(!cart.length){
    items.innerHTML = "<p>Your cart is empty.</p>";
    totalEl.innerText = "0";
    return;
  }

  let total = 0;

  cart.forEach((it,i)=>{
    const qty = Number(it.qty||1);
    const price = Number(it.price||0);
    const line = price*qty;
    total += line;

    const div = document.createElement("div");
    div.className = "order-item";

    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <img src="${it.image||"images/logo.png"}" width="55" height="55" style="border-radius:14px" onerror="this.src='images/logo.png'">
        <strong>${it.name}${it.variant?` (${it.variant})`:""} × ${qty}</strong>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <strong>₹${line}</strong>
        <button class="remove-btn">🗑</button>
      </div>
    `;

    div.querySelector(".remove-btn").onclick = ()=> removeItem(i);
    items.appendChild(div);
  });

  totalEl.innerText = total;
}

function removeItem(i){
  const cart = getCart();
  cart.splice(i,1);
  saveCart(cart);
  renderSummary();
}

/* ---------- FORM VALIDATION ---------- */
function validateForm(name,phone,addr,state,pin,txn){
  if(!name) return "Enter full name";
  if(!/^\d{10}$/.test(phone)) return "Phone must be 10 digits";
  if(!addr) return "Enter address";
  if(!state) return "Select state";
  if(!/^\d{6}$/.test(pin)) return "Pincode must be 6 digits";
  if(!txn) return "Enter UPI Transaction ID";
  return "";
}

/* ---------- MODAL ---------- */
function showModal(html){
  const modal = document.getElementById("order-modal");
  const body = document.getElementById("modal-body");
  body.innerHTML = html;
  modal.style.display = "flex";
  modal.classList.add("popup-show");
}
function hideModal(){
  const modal = document.getElementById("order-modal");
  modal.style.display = "none";
  modal.classList.remove("popup-show");
}

/* ---------- SUPABASE INSERT ---------- */
async function insertOrderToSupabase(order){
  const url = `${SUPABASE_URL}/rest/v1/orders`;

  try{
    const res = await fetch(url,{
      method:"POST",
      headers:{
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type":"application/json",
        "Prefer":"return=minimal"
      },
      body: JSON.stringify(order)
    });

    return res.ok;
  }catch(err){
    console.error("Supabase error:",err);
    return false;
  }
}

/* ---------- MAIN ---------- */
document.addEventListener("DOMContentLoaded",()=>{

  renderSummary();

  // Input masks  
  document.getElementById("cus-phone")?.addEventListener("input",e=>{
    e.target.value = e.target.value.replace(/\D/g,"").slice(0,10);
  });
  document.getElementById("cus-pincode")?.addEventListener("input",e=>{
    e.target.value = e.target.value.replace(/\D/g,"").slice(0,6);
  });

  // Modal events  
  document.querySelector(".popup-close")?.addEventListener("click", hideModal);
  document.getElementById("order-modal")?.addEventListener("click",e=>{
    if(e.target===e.currentTarget) hideModal();
  });
  document.getElementById("modal-home")?.addEventListener("click",()=>{
    hideModal();
    window.location.href="index.html";
  });

  // PLACE ORDER  
  document.getElementById("place-order")?.addEventListener("click", async ()=>{

    const name = document.getElementById("cus-name").value.trim();
    const phone = document.getElementById("cus-phone").value.trim();
    const address = document.getElementById("cus-address-line").value.trim();
    const state = document.getElementById("cus-state").value.trim();
    const pincode = document.getElementById("cus-pincode").value.trim();
    const txn = document.getElementById("txn-id").value.trim();
    const msg = document.getElementById("checkout-msg");

    const err = validateForm(name,phone,address,state,pincode,txn);
    if(err){ msg.innerText = err; msg.style.color="red"; return; }

    const cart = getCart();
    if(!cart.length){ msg.innerText="Cart is empty"; msg.style.color="red"; return; }

    const total = cart.reduce((s,i)=> s + (Number(i.price)*Number(i.qty)), 0);
    const productsStr = cart.map(i=> `${i.name} x${i.qty}`).join(", ");
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

    // Save locally  
    const orders = getOrders();
    orders.push(orderObj);
    saveOrders(orders);

    // Insert to Supabase  
    const ok = await insertOrderToSupabase(orderObj);
    console.log("Supabase insert:", ok);

    // Clear cart and update UI  
    localStorage.removeItem("cart");
    renderSummary();

    // Modal  
    showModal(`
      <p style="margin-bottom:6px;color:#444">We're verifying your payment.</p>
      <div style="background:#fff;padding:12px;border-radius:12px;margin-bottom:10px;box-shadow:0 6px 18px rgba(0,0,0,0.05)">
        <strong>Order ID:</strong> ${orderId}<br>
        <strong>Total:</strong> ₹${total}<br>
        <strong>Products:</strong> ${productsStr}
      </div>
      <small style="color:#777">Thank you for shopping with ClassicVapes!</small>
    `);

    msg.innerText = "";
  });

});
