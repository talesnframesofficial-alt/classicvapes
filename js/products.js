/* js/products.js — products grid (Desktop 6 / Tablet 4 / Mobile portrait 2 / Mobile landscape 4) */

const CSV_URL_PRODUCTS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT15M2LZhCAW1EXXp1oRB9oFn5Enj2DvuReH7tlPPlq3rkSffsRy12r09TsmCLgapn4jG01U9bcv6-2/pub?output=csv";

function el(t,c){ const e=document.createElement(t); if(c) e.className=c; return e; }

function csvToJson(csv){
  if(!csv) return [];
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h=>h.trim());
  return lines.map(line=>{
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,"").trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h] = cols[i]!==undefined ? cols[i] : "");
    return obj;
  });
}

async function fetchAllProducts(){
  try{
    const res = await fetch(CSV_URL_PRODUCTS);
    if(!res.ok) throw new Error("CSV fetch failed: " + res.status);
    const txt = await res.text();
    const rows = csvToJson(txt);
    return rows.map(r => ({
      id: String(r.ProductID || r.ProductId || r.id || ("PROD"+Math.random().toString(36).slice(2,7))).trim(),
      name: r.Name || r.name || "Unnamed",
      image: (r.Image || r.image || "").trim(),
      mrp: parseFloat(r.MRP || r.mrp || "0") || 0,
      offer: parseFloat(r.OfferPrice || r.offerPrice || "0") || 0,
      variants: (r.Variants || r.variants || "").split(",").map(s=>s.trim()).filter(Boolean),
      featured: String(r.Featured || r.featured || "").toLowerCase().startsWith("y"),
      description: r.Description || r.description || ""
    }));
  }catch(err){
    console.error("[products] fetchAllProducts error", err);
    return [];
  }
}

function ensureProductsGrid(){
  let grid = document.getElementById("products-grid");
  if(grid) return grid;
  // create structure: container with search and grid
  const main = document.querySelector("main") || document.body;
  const wrapper = el("div","products-page-wrap");
  const searchWrap = el("div","search-wrap");
  const input = el("input"); input.id = "search-input"; input.type = "search"; input.placeholder = "Search products...";
  searchWrap.appendChild(input);
  const gridEl = el("div","products-grid"); gridEl.id = "products-grid";
  wrapper.appendChild(searchWrap);
  wrapper.appendChild(gridEl);
  // insert before footer if exists
  const footer = document.querySelector("footer");
  if(footer) document.body.insertBefore(wrapper, footer);
  else document.body.appendChild(wrapper);
  return gridEl;
}

function renderProductCard(p){
  const card = el("div","product-card");
  card.setAttribute("data-id", p.id);

  if(p.image){
    const src = /^https?:\/\//i.test(p.image) ? p.image : ('images/products/' + p.image);
    const img = el("img"); img.src = src; img.alt = p.name; img.loading = "lazy";
    img.onerror = function(){ this.remove(); const ph = el("div","no-image"); ph.innerText = "No Image"; card.insertBefore(ph, card.firstChild); };
    card.appendChild(img);
  } else {
    const ph = el("div","no-image"); ph.innerText = "No Image"; card.appendChild(ph);
  }

  const title = el("h3"); title.innerText = p.name;
  const desc = el("p","desc"); desc.innerText = p.description || "";
  const priceRow = el("div","price-row");
  const final = (p.offer && p.offer > 0) ? p.offer : p.mrp;
  if(p.offer && p.offer > 0){
    const mrp = el("span","mrp"); mrp.innerText = "₹" + p.mrp;
    const off = el("span","offer"); off.innerText = "₹" + p.offer;
    priceRow.appendChild(mrp); priceRow.appendChild(off);
  } else {
    const off = el("span","offer"); off.innerText = "₹" + final;
    priceRow.appendChild(off);
  }

  const actions = el("div","card-actions");
  const view = el("button","view-btn"); view.type="button"; view.innerText = "View";
  const add = el("button","buy-btn"); add.type="button"; add.innerText = "Add";
  actions.appendChild(view); actions.appendChild(add);

  card.appendChild(title); card.appendChild(desc); card.appendChild(priceRow); card.appendChild(actions);

  // click handlers
  card.addEventListener("click", (e) => {
    if(e.target === add){
      // add to cart quick
      const priceToAdd = (p.offer && p.offer>0) ? p.offer : p.mrp;
      window.addToCart && window.addToCart({ id: p.id, name: p.name, price: priceToAdd, qty:1, image: p.image || 'images/logo.png' });
      (window.showToast||(()=>{}))("Added to cart");
      return;
    }
    // open popup (home.js exposes showProductPopup)
    if(typeof window.showProductPopup === "function"){
      window.showProductPopup(p);
    } else {
      // fallback simple alert
      alert("Product: " + p.name + "\nPrice: ₹" + ((p.offer && p.offer>0) ? p.offer : p.mrp));
    }
  });

  return card;
}

async function renderProducts(){
  const grid = ensureProductsGrid();
  grid.innerHTML = "<div style='padding:18px;color:#666'>Loading products...</div>";
  const products = await fetchAllProducts();
  if(!products.length){
    grid.innerHTML = "<div style='padding:18px;color:#666'>No products found in sheet.</div>";
    return;
  }

  function draw(list){
    grid.innerHTML = "";
    list.forEach(p => {
      const card = renderProductCard(p);
      grid.appendChild(card);
    });
  }

  draw(products);

  // search hooking
  const input = document.getElementById("search-input");
  input.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if(!q) return draw(products);
    const filtered = products.filter(p => (p.name||"").toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q));
    draw(filtered);
  });
}

document.addEventListener("DOMContentLoaded", renderProducts);
