/* js/home.js
  - Fetches products CSV (from saved CSV URL)
  - Renders featured products
  - Desktop: group-slide (5 visible), auto slide per group
  - Mobile: vertical column (scrollable)
  - Product popup: Image, name, description, variant buttons, Add to Cart
  - Image fallback: shows placeholder box with "No Image"
*/

/* CONFIG */
const PRODUCTS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT15M2LZhCAW1EXXp1oRB9oFn5Enj2DvuReH7tlPPlq3rkSffsRy12r09TsmCLgapn4jG01U9bcv6-2/pub?output=csv";
const FALLBACK_TEXT = "No Image";
const FEATURE_LIMIT = 10;
const GROUP_DESKTOP = 5; // number of cards visible in desktop group slide
const AUTO_MS = 3000; // 3s

/* small logger */
function log(...args){ console.log("[home.js]", ...args); }

/* CSV parser */
function csvToJson(csv){
  if(!csv) return [];
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h=>h.trim());
  return lines.map(line=>{
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,"").trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h]=cols[i]!==undefined ? cols[i] : "");
    return obj;
  });
}

/* fetch products */
async function fetchProducts(){
  try{
    log("Fetching products CSV...");
    const res = await fetch(PRODUCTS_CSV_URL);
    if(!res.ok) throw new Error("Network error " + res.status);
    const txt = await res.text();
    const raw = csvToJson(txt);
    log("Rows fetched:", raw.length);
    // normalize
    return raw.map(r => ({
      id: (r.ProductID || r.ProductId || r.id || ("PROD" + Math.floor(Math.random()*90000))).toString().trim(),
      name: r.Name || r.name || "Unnamed",
      image: (r.Image || r.image || "").trim(),
      mrp: parseFloat(r.MRP || r.mrp || "0") || 0,
      offer: parseFloat(r.OfferPrice || r.offerPrice || "0") || 0,
      variants: (r.Variants || r.variant || "").split(",").map(s=>s.trim()).filter(Boolean),
      featured: String(r.Featured || r.featured || "").toLowerCase().startsWith("y"),
      description: r.Description || r.description || ""
    }));
  }catch(e){
    console.error("[home.js] fetch error:", e);
    return [];
  }
}

/* helper to create element with class */
function el(tag, cls){ const d=document.createElement(tag); if(cls) d.className = cls; return d; }

/* render featured */
function renderFeatured(products){
  const wrap = document.getElementById("featured-carousel-wrap") || null;
  let container = document.getElementById("featured-carousel");
  if(!container){
    // create wrapper structure if missing
    if(wrap){
      container = el("div","featured-carousel");
      container.id = "featured-carousel";
      wrap.appendChild(container);
    } else {
      // fallback: append to body
      container = el("div","featured-carousel");
      container.id = "featured-carousel";
      document.body.appendChild(container);
    }
  }
  container.innerHTML = "";

  const featured = products.filter(p => p.featured).slice(0, FEATURE_LIMIT);
  if(featured.length === 0){
    container.innerHTML = `<div style="padding:18px;color:#666">No featured products yet. Mark Featured = Yes in sheet.</div>`;
    return;
  }

  featured.forEach(product => {
    const card = el("div", "product-card");
    // image / fallback
    if(product.image && /^https?:\/\//i.test(product.image)){
      const img = el("img");
      img.src = product.image;
      img.alt = product.name;
      img.loading = "lazy";
      img.onerror = function(){
        this.remove();
        const ph = el("div","no-image");
        ph.classList.add("no-image");
        ph.innerText = FALLBACK_TEXT;
        // insert at top of card
        card.insertBefore(ph, card.firstChild);
      };
      card.appendChild(img);
    } else if (product.image){
      // treat as filename inside images/products/
      const img = el("img");
      img.src = `images/products/${product.image}`;
      img.alt = product.name;
      img.loading = "lazy";
      img.onerror = function(){ this.remove(); const ph = el("div","no-image"); ph.innerText = FALLBACK_TEXT; card.insertBefore(ph, card.firstChild); };
      card.appendChild(img);
    } else {
      const ph = el("div","no-image");
      ph.innerText = FALLBACK_TEXT;
      card.appendChild(ph);
    }

    // info block
    const info = el("div");
    const title = el("h3"); title.textContent = product.name;
    const desc = el("p"); desc.className = "desc"; desc.textContent = product.description || "";
    const priceRow = el("div","price-row");
    if(product.offer && product.offer > 0){
      const mrp = el("span","mrp"); mrp.textContent = `₹${product.mrp}`;
      const offer = el("span","offer"); offer.textContent = `₹${product.offer}`;
      priceRow.appendChild(mrp); priceRow.appendChild(offer);
    } else {
      const offer = el("span","offer"); offer.textContent = `₹${product.mrp}`;
      priceRow.appendChild(offer);
    }
    info.appendChild(title);
    info.appendChild(desc);
    info.appendChild(priceRow);

    card.appendChild(info);

    // actions + variants (variants will show in popup - but show small variants preview)
    const actions = el("div","card-actions");
    const view = el("button","view-btn"); view.textContent = "View";
    const add = el("button","buy-btn"); add.textContent = "Add";
    actions.appendChild(view); actions.appendChild(add);
    card.appendChild(actions);

    // click behavior: whole card opens popup (you selected 1.A with variant buttons)
    card.addEventListener("click", (e)=>{
      // if click was on Add, treat as add (don't open popup)
      if(e.target === add) {
        const price = product.offer && product.offer > 0 ? product.offer : product.mrp;
        window.addToCart && window.addToCart({ id: product.id, name: product.name, price, qty:1, image: product.image });
        showToast && showToast("Added to cart");
        return;
      }
      showProductPopup(product);
    });

    // add to container
    container.appendChild(card);
  });

  // after render, init carousel behaviour and auto group slide on desktop
  initFeaturedBehavior();
}

/* featured behavior: desktop group-slide, mobile vertical list */
let featuredTimer = null;
function initFeaturedBehavior(){
  const container = document.getElementById("featured-carousel");
  if(!container) return;
  // Clear any previous transform
  container.style.transform = "";

  // detect mobile
  const isMobile = window.innerWidth < 900;
  if(isMobile){
    // vertical: set flex-direction via CSS already (js ensures smoothness)
    container.style.flexDirection = "column";
    container.style.overflow = "auto";
    // no auto-slide on mobile (user scroll)
    if(featuredTimer){ clearInterval(featuredTimer); featuredTimer=null; }
    return;
  }

  // desktop: horizontal + auto group slide
  container.style.flexDirection = "row";
  container.style.overflow = "hidden";

  const cards = Array.from(container.children);
  const perGroup = GROUP_DESKTOP;
  const cardWidth = cards[0] ? cards[0].getBoundingClientRect().width + 14 : 240;
  let idx = 0;
  function slideTo(index){
    const maxIdx = Math.max(0, cards.length - perGroup);
    idx = Math.max(0, Math.min(index, maxIdx));
    const x = idx * (cardWidth);
    container.style.transform = `translateX(-${x}px)`;
  }

  // start auto slide groups
  if(featuredTimer) clearInterval(featuredTimer);
  featuredTimer = setInterval(()=> {
    slideTo(idx + perGroup);
    // if reached end, go back to start
    if(idx >= Math.max(0, cards.length - perGroup)) slideTo(0);
  }, AUTO_MS);

  // pause on hover
  container.addEventListener("mouseenter", ()=> { if(featuredTimer) clearInterval(featuredTimer); });
  container.addEventListener("mouseleave", ()=> {
    if(featuredTimer) clearInterval(featuredTimer);
    featuredTimer = setInterval(()=> { slideTo(idx + perGroup); if(idx >= Math.max(0, cards.length - perGroup)) slideTo(0); }, AUTO_MS);
  });

  // allow manual prev/next by simple swipe detection
  let startX = null, scrolled = 0;
  container.addEventListener("touchstart", (e)=> { startX = e.touches[0].clientX; scrolled = container.scrollLeft; if(featuredTimer) clearInterval(featuredTimer); });
  container.addEventListener("touchmove", (e)=> {
    if(startX === null) return;
    const dx = startX - e.touches[0].clientX;
    container.scrollLeft = scrolled + dx;
  });
  container.addEventListener("touchend", ()=> { startX = null; });
}

/* ---------- PRODUCT POPUP ---------- */
function createPopupIfMissing(){
  if(document.getElementById("product-popup")) return;
  const pop = document.createElement("div"); pop.id = "product-popup"; pop.className = "product-popup";
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
    </div>
  `;
  document.body.appendChild(pop);
  // events
  pop.querySelector(".popup-close").addEventListener("click", hidePopup);
  pop.querySelector("#pp-close").addEventListener("click", hidePopup);
  pop.addEventListener("click", (e)=> { if(e.target === pop) hidePopup(); });
}

function showProductPopup(product){
  createPopupIfMissing();
  const pop = document.getElementById("product-popup");
  pop.style.display = "flex";
  const imgEl = document.getElementById("pp-img");
  // set image or show placeholder if missing
  if(product.image && /^https?:\/\//i.test(product.image)){
    imgEl.src = product.image;
    imgEl.style.display = "block";
    imgEl.onerror = function(){ imgEl.style.display = "none"; /* show no-image fallback */ showPopupNoImage(); };
    removePopupNoImage();
  } else if(product.image){
    imgEl.src = `images/products/${product.image}`;
    imgEl.style.display = "block";
    imgEl.onerror = function(){ imgEl.style.display = "none"; showPopupNoImage(); };
    removePopupNoImage();
  } else {
    imgEl.style.display = "none";
    showPopupNoImage();
  }

  document.getElementById("pp-name").innerText = product.name;
  document.getElementById("pp-desc").innerText = product.description || "";
  const priceTxt = (product.offer && product.offer>0) ? `₹${product.offer}  <span style="text-decoration:line-through;color:#999;margin-left:8px">₹${product.mrp}</span>` : `₹${product.mrp}`;
  document.getElementById("pp-price").innerHTML = priceTxt;

  // variants as buttons
  const variantsWrap = document.getElementById("pp-variants");
  variantsWrap.innerHTML = "";
  const variants = product.variants && product.variants.length ? product.variants : ["Default"];
  let selectedVariant = variants[0];
  variants.forEach((v,i)=>{
    const btn = document.createElement("button"); btn.className = "variant-btn"; btn.innerText = v;
    if(i===0) btn.classList.add("selected");
    btn.addEventListener("click", ()=> {
      // clear selected
      Array.from(variantsWrap.children).forEach(c=>c.classList.remove("selected"));
      btn.classList.add("selected");
      selectedVariant = v;
    });
    variantsWrap.appendChild(btn);
  });

  // Add to cart handler
  const addBtn = document.getElementById("pp-add");
  addBtn.onclick = ()=> {
    const price = (product.offer && product.offer>0) ? product.offer : product.mrp;
    window.addToCart && window.addToCart({ id: product.id, name: product.name + (selectedVariant ? ` (${selectedVariant})` : ""), price, qty:1, image: product.image });
    showToast && showToast("Added to cart");
    hidePopup();
  };
}

function showPopupNoImage(){
  // if placeholder not present create and show
  let ph = document.querySelector(".popup-media .no-image");
  if(!ph){
    const media = document.querySelector(".popup-media");
    if(!media) return;
    ph = document.createElement("div"); ph.className = "no-image"; ph.innerText = "No Image";
    ph.style.cssText = "width:100%;height:320px;border-radius:8px;background:#f2f2f2;display:flex;align-items:center;justify-content:center;color:#888;font-weight:700";
    media.appendChild(ph);
  }
  ph.style.display = "flex";
}
function removePopupNoImage(){
  const ph = document.querySelector(".popup-media .no-image");
  if(ph) ph.style.display = "none";
}
function hidePopup(){
  const pop = document.getElementById("product-popup");
  if(pop) { pop.style.display = "none"; }
}

/* ---------- TOAST ---------- */
function showToast(msg, t=1800){
  let el = document.getElementById("toast");
  if(!el){ el = document.createElement("div"); el.id="toast"; document.body.appendChild(el); }
  el.innerText = msg; el.style.display = "block";
  setTimeout(()=> el.style.display = "none", t);
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", async ()=>{
  // insert wrapper id to match CSS if not present
  if(!document.getElementById("featured-carousel-wrap")){
    const s = document.createElement("div"); s.id = "featured-carousel-wrap";
    const target = document.querySelector("section .section-title");
    if(target && target.parentElement) target.parentElement.appendChild(s);
    else document.body.appendChild(s);
    // add inner container
    const c = document.createElement("div"); c.id="featured-carousel"; s.appendChild(c);
  }
  const products = await fetchProducts();
  renderFeatured(products);

  // init hero slider
  try{
    const slides = Array.from(document.querySelectorAll(".hero-slide, .slide"));
    if(slides.length){
      // unify to hero-slide class
      slides.forEach(s=> s.classList.add("hero-slide"));
      let idx = 0;
      const dotsWrap = document.getElementById("hero-dots");
      dotsWrap.innerHTML = "";
      slides.forEach((_,i)=>{ const d=document.createElement("button"); d.className="hero-dot"; d.onclick=()=> go(i); dotsWrap.appendChild(d); });
      function show(i){
        slides.forEach(s=> s.style.display="none");
        slides[i].style.display="block";
        Array.from(dotsWrap.children).forEach((d,di)=> d.classList.toggle("active", di===i));
        idx=i;
      }
      function go(i){ show((i+slides.length)%slides.length); }
      show(0);
      let t = setInterval(()=> go(idx+1), AUTO_MS);
      const hero = document.querySelector(".hero-slider");
      hero && hero.addEventListener("mouseenter", ()=> clearInterval(t));
      hero && hero.addEventListener("mouseleave", ()=> t = setInterval(()=> go(idx+1), AUTO_MS));
    }
  }catch(e){ log("hero init error", e); }
});
