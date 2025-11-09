/* js/products.js */
const CSV_URL_PRODUCTS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT15M2LZhCAW1EXXp1oRB9oFn5Enj2DvuReH7tlPPlq3rkSffsRy12r09TsmCLgapn4jG01U9bcv6-2/pub?output=csv";
async function fetchAllProducts(){
  const res = await fetch(CSV_URL_PRODUCTS);
  const txt = await res.text();
  const rows = txt.trim().split(/\r?\n/);
  const headers = rows.shift().split(",").map(h=>h.trim());
  return rows.map(line=>{
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g,"").trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h] = cols[i]||"");
    return {
      id: obj.ProductID || obj.ProductId || obj.id,
      name: obj.Name || obj.name,
      image: obj.Image || obj.image,
      mrp: parseFloat(obj.MRP||"0")||0,
      offer: parseFloat(obj.OfferPrice||"0")||0,
      variants: (obj.Variants||"").split(",").map(s=>s.trim()).filter(Boolean),
      featured: String(obj.Featured||"").toLowerCase().startsWith("y"),
      description: obj.Description || obj.description || ""
    };
  });
}

function el(tag,cls){const d=document.createElement(tag); if(cls) d.className=cls; return d;}

async function renderProductsGrid(){
  const prods = await fetchAllProducts();
  const grid = document.getElementById("products-grid");
  if(!grid) return;
  grid.innerHTML = "";
  prods.forEach(p => {
    const card = el("div","product-card");
    if(p.image) {
      const src = /^https?:\/\//i.test(p.image) ? p.image : `images/products/${p.image}`;
      const img = el("img"); img.src = src; img.onerror = function(){ this.remove(); const ph = el("div","no-image"); ph.innerText="No Image"; card.insertBefore(ph, card.firstChild); };
      card.appendChild(img);
    } else {
      const ph = el("div","no-image"); ph.innerText="No Image"; card.appendChild(ph);
    }
    const title = el("h3"); title.innerText = p.name;
    const desc = el("p"); desc.className="desc"; desc.innerText = p.description || "";
    const priceRow = el("div","price-row");
    if(p.offer && p.offer>0){ const mrp = el("span","mrp"); mrp.innerText = `₹${p.mrp}`; const off = el("span","offer"); off.innerText = `₹${p.offer}`; priceRow.appendChild(mrp); priceRow.appendChild(off);} else { const off = el("span","offer"); off.innerText = `₹${p.mrp}`; priceRow.appendChild(off); }
    const actions = el("div","card-actions");
    const view = el("button","view-btn"); view.innerText="View";
    const add = el("button","buy-btn"); add.innerText="Add";
    actions.appendChild(view); actions.appendChild(add);

    card.appendChild(title); card.appendChild(desc); card.appendChild(priceRow); card.appendChild(actions);
    card.addEventListener("click",(e)=>{ if(e.target===add){ const final = p.offer && p.offer>0? p.offer : p.mrp; window.addToCart && window.addToCart({id:p.id,name:p.name,price:final,qty:1,image:p.image}); showToast && showToast("Added to cart"); return;} showProductPopup(p); });
    grid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", renderProductsGrid);
