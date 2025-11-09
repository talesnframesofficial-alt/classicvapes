/* js/home.js — final */
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT15M2LZhCAW1EXXp1oRB9oFn5Enj2DvuReH7tlPPlq3rkSffsRy12r09TsmCLgapn4jG01U9bcv6-2/pub?output=csv";
const AUTO_MS = 3000;
const GROUP_DESKTOP = 5;
const FEATURE_LIMIT = 10;
function el(t,c){const e=document.createElement(t); if(c) e.className=c; return e;}
function log(...a){console.log("[home]",...a);}
function csvToJson(csv){ if(!csv) return []; const lines = csv.trim().split(/\r?\n/); const headers = lines.shift().split(",").map(h=>h.trim()); return lines.map(line=>{ const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,"").trim()); const obj={}; headers.forEach((h,i)=> obj[h]=cols[i]!==undefined?cols[i]:""); return obj; }); }

async function fetchProducts(){
  try{
    const res = await fetch(CSV_URL);
    if(!res.ok) throw new Error("CSV fetch failed " + res.status);
    const txt = await res.text();
    const rows = csvToJson(txt);
    return rows.map(r => ({
      id: (r.ProductID || r.ProductId || r.id || ("PROD"+Math.random().toString(36).slice(2,7))).toString().trim(),
      name: r.Name || r.name || "Unnamed",
      image: (r.Image || r.image || "").trim(),
      mrp: parseFloat(r.MRP || r.mrp || "0") || 0,
      offer: parseFloat(r.OfferPrice || r.offerPrice || "0") || 0,
      variants: (r.Variants || r.variants || "").split(",").map(s=>s.trim()).filter(Boolean),
      featured: String(r.Featured || r.featured || "").toLowerCase().startsWith("y"),
      description: r.Description || r.description || ""
    }));
  }catch(err){ console.error("[home] fetchProducts", err); return []; }
}

/* HERO init: dots + autoplay (we show dots but no arrows) */
function initHero(){
  const slides = Array.from(document.querySelectorAll(".hero-slide"));
  if(!slides.length) return;
  let idx = 0;
  const dots = document.getElementById("hero-dots");
  dots.innerHTML = "";
  slides.forEach((_,i)=>{ const b = el("button","hero-dot"); b.onclick=()=> go(i); dots.appendChild(b); });
  function show(i){ slides.forEach(s=> s.style.display="none"); slides[i].style.display="block"; Array.from(dots.children).forEach((d,di)=> d.classList.toggle("active", di===i)); idx=i; }
  function go(i){ show((i+slides.length)%slides.length); }
  show(0);
  let t = setInterval(()=> go(idx+1), AUTO_MS);
  const slider = document.querySelector(".hero-slider");
  slider.addEventListener("mouseenter", ()=> clearInterval(t));
  slider.addEventListener("mouseleave", ()=> t = setInterval(()=> go(idx+1), AUTO_MS));
}

/* RENDER featured */
let featuredTimer = null;
function renderFeatured(products){
  let container = document.getElementById("featured-carousel");
  if(!container){
    const wrap = document.getElementById("featured-carousel-wrap") || document.body;
    container = el("div","featured-carousel"); container.id="featured-carousel"; wrap.appendChild(container);
  }
  container.innerHTML = "";

  const featured = products.filter(p=>p.featured).slice(0, FEATURE_LIMIT);
  if(!featured.length){ container.innerHTML = `<div style="padding:18px;color:#666">No featured products. Mark Featured = Yes in sheet.</div>`; return; }

  featured.forEach(p => {
    const card = el("div","product-card");
    // image or fallback (show gray "No Image" box if fail)
    if(p.image){
      const src = /^https?:\/\//i.test(p.image) ? p.image : `images/products/${p.image}`;
      const img = el("img"); img.src = src; img.alt = p.name; img.loading="lazy";
      img.onerror = function(){ this.remove(); const ph = el("div","no-image"); ph.innerText="No Image"; card.insertBefore(ph, card.firstChild); };
      card.appendChild(img);
    } else {
      const ph = el("div","no-image"); ph.innerText="No Image"; card.appendChild(ph);
    }

    const info = el("div");
    const title = el("h3"); title.innerText = p.name;
    const desc = el("p"); desc.className="desc"; desc.innerText = p.description || "";
    const priceRow = el("div","price-row");
    const final = p.offer && p.offer>0 ? p.offer : p.mrp;
    if(p.offer && p.offer>0){ const mrp = el("span","mrp"); mrp.innerText=`₹${p.mrp}`; const off = el("span","offer"); off.innerText=`₹${p.offer}`; priceRow.appendChild(mrp); priceRow.appendChild(off); }
    else { const off = el("span","offer"); off.innerText=`₹${final}`; priceRow.appendChild(off); }
    info.appendChild(title); info.appendChild(desc); info.appendChild(priceRow);
    card.appendChild(info);

    const actions = el("div","card-actions");
    const view = el("button","view-btn"); view.innerText="View";
    const add = el("button","buy-btn"); add.innerText="Add";
    actions.appendChild(view); actions.appendChild(add);
    card.appendChild(actions);

    // whole card click opens popup except clicking Add button
    card.addEventListener("click", (ev)=> {
      if(ev.target === add){ window.addToCart && window.addToCart({ id:p.id, name:p.name, price: final, qty:1, image: p.image || 'images/logo.png' }); showToast("Added to cart"); return; }
      showProductPopup(p);
    });

    container.appendChild(card);
  });

  initFeaturedBehavior();
}

/* FEATURED behavior: no auto-scroll; arrows + swipe on desktop; mobile vertical */
function initFeaturedBehavior(){
  const container = document.getElementById("featured-carousel");
  if(!container) return;
  container.style.transform = "";
  const isMobile = window.innerWidth < 900;

  if(isMobile){
    container.style.flexDirection = "column";
    container.style.overflow = "auto";
    if(featuredTimer){ clearInterval(featuredTimer); featuredTimer = null; }
    return;
  }

  // desktop horizontal with arrows + swipe
  container.style.flexDirection = "row";
  container.style.overflow = "hidden";
  const cards = Array.from(container.children);
  if(!cards.length) return;
  const cardWidth = cards[0].getBoundingClientRect().width + 14;
  let idx = 0;
  function slideTo(i){
    const maxIdx = Math.max(0, cards.length - GROUP_DESKTOP);
    idx = Math.max(0, Math.min(i, maxIdx));
    container.style.transform = `translateX(-${idx * cardWidth}px)`;
  }

  // create arrows if not present
  if(!document.getElementById("featured-prev")){
    const wrap = document.getElementById("featured-carousel-wrap");
    if(wrap){
      const controls = el("div","featured-controls");
      const prev = el("button","featured-arrow"); prev.id="featured-prev"; prev.innerText="◀";
      const next = el("button","featured-arrow"); next.id="featured-next"; next.innerText="▶";
      prev.onclick = ()=> slideTo(idx - GROUP_DESKTOP);
      next.onclick = ()=> slideTo(idx + GROUP_DESKTOP);
      controls.appendChild(prev); controls.appendChild(next);
      wrap.insertBefore(controls, wrap.firstChild);
    }
  }

  // swipe support
  let startX = null, scrolled = 0;
  container.addEventListener("touchstart", (e)=> { startX = e.touches[0].clientX; scrolled = container.scrollLeft; });
  container.addEventListener("touchmove", (e)=> { if(startX===null) return; const dx = startX - e.touches[0].clientX; container.scrollLeft = scrolled + dx; });
  container.addEventListener("touchend", ()=> { startX = null; });
}

/* PRODUCT POPUP (glass + fade+zoom) */
function createPopup(){
  if(document.getElementById("product-popup")) return;
  const pop = el("div","product-popup"); pop.id = "product-popup";
  pop.innerHTML = `
    <div class="popup-card" role="dialog" aria-modal="true">
      <button class="popup-close" aria-label="Close">✕</button>
      <div class="popup-grid">
        <div class="popup-media"><img id="pp-img" alt="product image"></div>
        <div class="popup-info">
          <h3 id="pp-name"></h3>
          <p id="pp-desc" class="desc"></p>
          <div id="pp-price" class="popup-price"></div>
          <div id="pp-variants" class="variants-row"></div>
          <div class="popup-actions">
            <button id="pp-add" class="buy-btn">Add to Cart</button>
            <button id="pp-close" class="view-btn">Close</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(pop);
  pop.querySelector(".popup-close").addEventListener("click", hidePopup);
  pop.querySelector("#pp-close").addEventListener("click", hidePopup);
  pop.addEventListener("click", (e)=> { if(e.target === pop) hidePopup(); });
}

function showPopupNoImage(){
  const media = document.querySelector(".popup-media");
  if(!media) return;
  if(media.querySelector(".no-image")) { media.querySelector(".no-image").style.display="flex"; return; }
  const ph = el("div","no-image"); ph.style.height="340px"; ph.innerText="No Image"; media.appendChild(ph);
}
function removePopupNoImage(){ const ph = document.querySelector(".popup-media .no-image"); if(ph) ph.style.display="none"; }

function showProductPopup(p){
  createPopup();
  const pop = document.getElementById("product-popup");
  pop.style.display = "flex";
  pop.classList.add("popup-show");
  const img = document.getElementById("pp-img");
  if(p.image){
    img.src = /^https?:\/\//i.test(p.image) ? p.image : `images/products/${p.image}`;
    img.style.display = "block";
    img.onerror = function(){ img.style.display='none'; showPopupNoImage(); };
    removePopupNoImage();
  } else {
    img.style.display = "none";
    showPopupNoImage();
  }
  document.getElementById("pp-name").innerText = p.name;
  document.getElementById("pp-desc").innerText = p.description || "";
  const final = p.offer && p.offer>0 ? p.offer : p.mrp;
  document.getElementById("pp-price").innerHTML = `₹${final}${p.offer && p.offer>0 ? ` <span style="text-decoration:line-through;color:#999;margin-left:8px">₹${p.mrp}</span>` : ''}`;

  const variantsWrap = document.getElementById("pp-variants");
  variantsWrap.innerHTML = "";
  // if no variants -> hide variants area (you chose 1.A)
  if(!p.variants || !p.variants.length){ variantsWrap.style.display = "none"; }
  else {
    variantsWrap.style.display = "flex";
    let selected = p.variants[0];
    p.variants.forEach((v,i)=> {
      const b = el("button","variant-btn"); b.innerText = v;
      if(i===0) b.classList.add("selected");
      b.addEventListener("click", ()=> { Array.from(variantsWrap.children).forEach(n=>n.classList.remove("selected")); b.classList.add("selected"); selected = v; });
      variantsWrap.appendChild(b);
    });
    document.getElementById("pp-add").onclick = ()=> {
      window.addToCart && window.addToCart({ id: p.id, name: `${p.name} (${selected})`, price: final, qty: 1, image: p.image || 'images/logo.png' });
      showToast("Added to cart"); hidePopup();
    };
  }

  // if no variants, bind add directly
  if(!p.variants || !p.variants.length){
    document.getElementById("pp-add").onclick = ()=> { window.addToCart && window.addToCart({ id: p.id, name: p.name, price: final, qty:1, image: p.image || 'images/logo.png' }); showToast("Added to cart"); hidePopup(); };
  }
}

function hidePopup(){
  const pop = document.getElementById("product-popup");
  if(pop){ pop.classList.remove("popup-show"); setTimeout(()=> pop.style.display="none", 260); }
}

function showToast(msg, t=1500){
  let elToast = document.getElementById("toast");
  if(!elToast){ elToast = el("div"); elToast.id="toast"; document.body.appendChild(elToast); }
  elToast.innerText = msg; elToast.style.display = "block"; setTimeout(()=> elToast.style.display = "none", t);
}

/* INIT */
document.addEventListener("DOMContentLoaded", async ()=>{
  initHero();
  const products = await fetchProducts();
  renderFeatured(products);
});
