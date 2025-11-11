/* js/checkout.js */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR_iyowIpHMFuMfTUmzY74gpIr15qPZdYG98mCTjWBL-aWk9iMg0PqT9YedzANSO69rguaIRYl0N7n/pub?output=csv";
const POST_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"; // replace with your Apps Script Web App URL

let cart = JSON.parse(localStorage.getItem('cart')) || [];

function formatDate(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return dd + '-' + mm + '-' + yyyy;
}

function generateOrderId(){
  const num = Math.floor(Math.random()*90000) + 10000;
  return 'CV' + num;
}

function showSummary(){
  const itemsDiv = document.getElementById('summary-items');
  const totalSpan = document.getElementById('summary-total');
  itemsDiv.innerHTML = '';
  let total = 0;
  cart.forEach(item=>{
    const price = item.price * item.qty;
    total += price;
    const p = document.createElement('p');
    p.innerText = `${item.name} x${item.qty} — ₹${price}`;
    itemsDiv.appendChild(p);
  });
  totalSpan.innerText = total;
}

document.addEventListener('DOMContentLoaded', () => {
  showSummary();

  document.getElementById('checkout-form').addEventListener('submit', async (e)=>{
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const house = document.getElementById('house').value.trim();
    const city = document.getElementById('city').value.trim();
    const state = document.getElementById('state').value;
    const pincode = document.getElementById('pincode').value.trim();
    const txnId = document.getElementById('txn-id').value.trim();

    if(!name || !phone.match(/^\d{10}$/) || !house || !city || !state || !pincode.match(/^\d{6}$/) || !txnId){
      document.getElementById('checkout-msg').innerText = "Please fill all details correctly.";
      document.getElementById('checkout-msg').style.color = 'red';
      return;
    }

    const orderId = generateOrderId();
    const date = formatDate(new Date());
    const address = `${house}, ${city}, ${state} – ${pincode}`;
    const products = cart.map(i=>`${i.name} x${i.qty}`).join(', ');
    const total = cart.reduce((s,i)=> s + i.price * i.qty, 0);

    const data = {
      OrderID: orderId,
      Date: date,
      Name: name,
      Phone: phone,
      Address: address,
      Products: products,
      Total: total,
      TxnID: txnId,
      Status: 'Pending'
    };

    document.getElementById('checkout-msg').innerText = "Submitting your order…";
    document.getElementById('checkout-msg').style.color = '#666';

    try {
      const res = await fetch(POST_URL, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if(json.success){
        document.getElementById('checkout-msg').innerHTML = `Order placed! Verifying payment. ID: <strong>${orderId}</strong>`;
        document.getElementById('checkout-msg').style.color = 'green';
        localStorage.removeItem('cart');
        document.getElementById('checkout-form').reset();

        // maybe redirect or offer button
      } else {
        throw new Error('Server failed');
      }
    } catch(err){
      console.error(err);
      document.getElementById('checkout-msg').innerText = "Error submitting order. Please try again.";
      document.getElementById('checkout-msg').style.color = 'red';
    }
  });

  document.getElementById('gpay-btn').addEventListener('click', ()=> {
    window.location.href = 'upi://pay?pa=zerabathool4@oksbi&pn=ClassicVapes&cu=INR';
  });
  document.getElementById('phonepe-btn').addEventListener('click', ()=> {
    window.location.href = 'phonepe://pay?pa=zerabathool4@oksbi&pn=ClassicVapes&cu=INR';
  });
  document.getElementById('paytm-btn').addEventListener('click', ()=> {
    window.location.href = 'tezos://upi?pa=zerabathool4@oksbi&pn=ClassicVapes&cu=INR';
  });
});
