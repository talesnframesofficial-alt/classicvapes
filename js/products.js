/* js/products.js — products grid + popup fallback
   Grid: mobile portrait 2, mobile landscape 4, tablet 4, desktop 6
*/
const CSV_URL_PRODUCTS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT15M2LZhCAW1EXXp1oRB9oFn5Enj2DvuReH7tlPPlq3rkSffsRy12r09TsmCLgapn4jG01U9bcv6-2/pub?output=csv";

function el(t,c){ const e=document.createElement(t); if(c) e.className = c; return e; }

function csvToJson(csv){
  if(!csv) return [];
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h=>h.trim());
  return lines.map(line=>{
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,"").trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h] = cols[i] !== undefined ? cols[i] : "");
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
  const wrapper = el("div","products-page-wrap");
  const searchWrap = el("div","search-wrap");
  const input = el("input"); input.id = "search-input"; input.type = "search"; input.placeholder = "Search products...";
  searchWrap.appendChild(input);
  const gridEl = el("div","products-grid"); gridEl.id = "products-grid";
  wrapper.appendChild(searchWrap); wrapper.appendChild(gridEl);
  const footer = document.querySelector("footer");
  if(footer) document.body.insertBefore(wrapper, footer);
  else document.body.appendChild(wrapper);
  return gridEl;
}

function renderProductCard(p){
  const card = el("div","product-card");
  card.setAttribute("data-id", p.id);

  const media = el("div","product-media");
  if(p.image){
    const src = /^https?:\/\//i.test(p.image) ? p.image : ('images/products/' + p.image);
    const img = el("img"); img.src = src; img.alt = p.name; img.loading = "lazy";
    img.onerror = function(){ this.remove(); const ph = el("div","no-image"); ph.innerText = "No Image"; media.appendChild(ph); };
    media.appendChild(img);
  } else {
    const ph = el("div","no-image"); ph.innerText = "No Image"; media.appendChild(ph);
  }
  card.appendChild(media);

  const title = el("h3"); title.innerText = p.name;
  const desc = el("p","desc"); desc.innerText = p.description || "";
  const priceRow = el("div","price-row");
  const final = (p.offer && p.offer>0) ? p.offer : p.mrp;
  if(p.offer && p.offer>0){
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

  card.addEventListener("click", (e) => {
    if(e.target === add){
      const priceToAdd = (p.offer && p.offer>0) ? p.offer : p.mrp;
      window.addToCart && window.addToCart({ id: p.id, name: p.name, price: priceToAdd, qty:1, image: p.image || 'images/logo.png' });
      (window.showToast||(()=>{}))("Added to cart"); return;
    }
    if(typeof window.showProductPopup === "function"){
      window.showProductPopup(p);
    } else {
      showProductPopupLocal(p);
    }
  });

  return card;
}

function showProductPopupLocal(p){
  if(!document.getElementById("product-popup-local")){
    const pop = el("div","product-popup"); pop.id = "product-popup-local";
    pop.innerHTML = ''
      + '<div class="popup-card">'
      + '  <button class="popup-close" aria-label="Close">✕</button>'
      + '  <div class="popup-grid">'
      + '    <div class="popup-media"><img id="pp-img-local" alt="product image"></div>'
      + '    <div class="popup-info">'
      + '      <h3 id="pp-name-local"></h3>'
      + '      <p id="pp-desc-local" class="desc"></p>'
      + '      <div id="pp-price-local" class="popup-price"></div>'
      + '      <div id="pp-variants-local" class="variants-row"></div>'
      + '      <div class="popup-actions">'
      + '        <button id="pp-add-local" class="buy-btn">Add to Cart</button>'
      + '        <button id="pp-close-local" class="view-btn">Close</button>'
      + '      </div>'
      + '    </div>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(pop);
    pop.querySelector(".popup-close").addEventListener("click", ()=> hideLocalPopup());
    pop.querySelector("#pp-close-local").addEventListener("click", ()=> hideLocalPopup());
    pop.addEventListener("click", (e)=> { if(e.target === pop) hideLocalPopup(); });
  }
  const pop = document.getElementById("product-popup-local");
  pop.style.display = "flex"; pop.classList.add("popup-show");
  const img = document.getElementById("pp-img-local");
  if(p.image){
    img.src = /^https?:\/\//i.test(p.image) ? p.image : ('images/products/' + p.image);
    img.style.display = "block";
    img.onerror = function(){ img.style.display='none'; const ph = pop.querySelector(".no-image"); if(ph) ph.style.display='flex'; };
  } else img.style.display='none';
  document.getElementById("pp-name-local").innerText = p.name;
  document.getElementById("pp-desc-local").innerText = p.description || "";
  const final = (p.offer && p.offer>0) ? p.offer : p.mrp;
  document.getElementById("pp-price-local").innerHTML = "₹" + final + ((p.offer && p.offer>0) ? (' <span style="text-decoration:line-through;color:#999;margin-left:8px">₹' + p.mrp + '</span>') : '');
  const variantsWrap = document.getElementById("pp-variants-local");
  variantsWrap.innerHTML = "";
  if(!p.variants || !p.variants.length){
    variantsWrap.style.display = "none";
    document.getElementById("pp-add-local").onclick = function(){ window.addToCart && window.addToCart({ id: p.id, name: p.name, price: final, qty:1, image: p.image || 'images/logo.png' }); (window.showToast||(()=>{}))("Added to cart"); hideLocalPopup(); };
  } else {
    variantsWrap.style.display = "flex";
    let selected = p.variants[0];
    p.variants.forEach((v,i)=> {
      const b = el("button","variant-btn"); b.type="button"; b.innerText = v;
      if(i===0) b.classList.add("selected");
      b.addEventListener("click", ()=> { Array.from(variantsWrap.children).forEach(n=>n.classList.remove("selected")); b.classList.add("selected"); selected = v; });
      variantsWrap.appendChild(b);
    });
    document.getElementById("pp-add-local").onclick = function(){ window.addToCart && window.addToCart({ id: p.id, name: (p.name + " (" + selected + ")"), price: final, qty:1, image: p.image || 'images/logo.png' }); (window.showToast||(()=>{}))("Added to cart"); hideLocalPopup(); };
  }
}

function hideLocalPopup(){ const pop = document.getElementById("product-popup-local"); if(pop){ pop.classList.remove("popup-show"); setTimeout(()=> pop.style.display="none", 260); } }

/* RENDER grid */
async function renderProducts(){
  const grid = ensureProductsGrid();
  grid.innerHTML = "<div style='padding:18px;color:#666'>Loading products...</div>";
  const products = await fetchAllProducts();
  if(!products.length){ grid.innerHTML = "<div style='padding:18px;color:#666'>No products found in sheet.</div>"; return; }
  function draw(list){ grid.innerHTML = ""; list.forEach(p => grid.appendChild(renderProductCard(p))); }
  draw(products);
  const input = document.getElementById("search-input");
  input.addEventListener("input", (e)=>{ const q = e.target.value.trim().toLowerCase(); if(!q) return draw(products); const filtered = products.filter(p => (p.name||"").toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q)); draw(filtered); });
}
document.addEventListener("DOMContentLoaded", renderProducts);
