/* orders.js — show orders from localStorage 'cv_orders' */
function getOrders(){
  try { return JSON.parse(localStorage.getItem('cv_orders')) || []; }
  catch(e){ return []; }
}
function saveOrders(arr){ localStorage.setItem('cv_orders', JSON.stringify(arr)); }

function renderOrders(list){
  const container = document.getElementById('orders-list');
  container.innerHTML = '';
  if(!list.length){
    container.innerHTML = '<div style="padding:18px;color:#666">No orders yet.</div>';
    return;
  }
  list.forEach(o => {
    const row = document.createElement('div'); row.className = 'order-row';
    const left = document.createElement('div'); left.className = 'order-left';
    const title = document.createElement('div'); title.innerHTML = `<strong>${o.orderId}</strong> — ₹${o.total}`;
    const meta = document.createElement('div'); meta.className = 'order-meta';
    meta.innerText = `${o.date} • ${o.name} • ${o.phone} • ${o.products}`;
    left.appendChild(title); left.appendChild(meta);

    const right = document.createElement('div'); right.style.display='flex'; right.style.alignItems='center'; right.style.gap='8px';
    const status = document.createElement('div'); status.className = `status-pill status-${o.status || 'Pending'}`; status.innerText = o.status || 'Pending';
    const viewBtn = document.createElement('button'); viewBtn.className = 'small-btn'; viewBtn.innerText = 'View';
    const markBtn = document.createElement('button'); markBtn.className = 'small-btn'; markBtn.innerText = 'Mark Verified';

    viewBtn.onclick = ()=> {
      alert(`Order ${o.orderId}\n\nName: ${o.name}\nPhone: ${o.phone}\nAddress: ${o.address}\nProducts: ${o.products}\nTotal: ₹${o.total}\nTxnID: ${o.txnId}\nStatus: ${o.status}`);
    };

    markBtn.onclick = ()=> {
      const orders = getOrders();
      const idx = orders.findIndex(x=>x.orderId === o.orderId);
      if(idx === -1) return;
      const cur = orders[idx];
      // toggle between Pending -> Verified -> Failed -> Pending
      if(cur.status === 'Pending') cur.status = 'Verified';
      else if(cur.status === 'Verified') cur.status = 'Failed';
      else cur.status = 'Pending';
      saveOrders(orders);
      renderOrders(orders);
    };

    right.appendChild(status); right.appendChild(viewBtn); right.appendChild(markBtn);
    row.appendChild(left); row.appendChild(right);
    container.appendChild(row);
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  let orders = getOrders();
  renderOrders(orders);

  document.getElementById('orders-search').addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    if(!q) return renderOrders(orders);
    const filtered = orders.filter(o => (o.orderId||'').toLowerCase().includes(q) || (o.phone||'').toLowerCase().includes(q) || (o.products||'').toLowerCase().includes(q));
    renderOrders(filtered);
  });
});
