/* js/home.js — robust, debug-friendly version
   - Fetches CSV (from your saved URL)
   - Parses robustly and logs helpful errors
   - Renders featured products (uses Featured = Yes/YES/yes)
   - Shows a helpful message if none found
*/

const PRODUCTS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT15M2LZhCAW1EXXp1oRB9oFn5Enj2DvuReH7tlPPlq3rkSffsRy12r09TsmCLgapn4jG01U9bcv6-2/pub?output=csv";
const FALLBACK_IMAGE = "images/products/default.jpg";
const FEATURE_LIMIT = 10;

function log(...args){ console.log("[home.js]", ...args); }

function csvToJson(csv){
  if(!csv || !csv.trim()) return [];
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h=>h.trim());
  const rows = lines.map(line=>{
    // split on commas but ignore commas inside quotes
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g,"").trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h] = cols[i] !== undefined ? cols[i] : "");
    return obj;
  });
  return rows;
}

async function fetchProducts(){
  try{
    log("Fetching products CSV...");
    const res = await fetch(PRODUCTS_CSV_URL);
    if(!res.ok){
      throw new Error("Network response not ok: " + res.status + " " + res.statusText);
    }
    const text = await res.text();
    if(!text || text.length < 10) {
      throw new Error("CSV is empty or too small");
    }
    const raw = csvToJson(text);
    log("CSV parsed rows:", raw.length);
    return raw.map(p => {
      return {
        id: (p.ProductID || p.id || p.ProductId || ("UNK"+Math.random().toString(36).slice(2,7))).toString(),
        name: p.Name || p.name || p["Product Name"] || "Unnamed",
        image: (p.Image || p.image || "").trim(),
        mrp: parseFloat(p.MRP || p.mrp || p.Price || p.price || "0") || 0,
        offer: parseFloat(p.OfferPrice || p.offerPrice || p.Offer || "0") || 0,
        variants: (p.Variants || p.variant || "").split(",").map(s=>s.trim()).filter(Boolean),
        featured: String(p.Featured || p.featured || "").toLowerCase().startsWith("y"),
        description: p.Description || p.description || ""
      };
    });
  } catch(err) {
    console.error("[home.js] fetchProducts error:", err);
    return []; // empty → fallback rendering logic will run
  }
}

function clearFeaturedContainer(){
  const container = document.getElementById("featured-carousel");
  if(container) container.innerHTML = "";
}

function renderNoFeaturedMessage(msg){
  const container = document.getElementById("featured-carousel");
  if(container) container.innerHTML = `<div style="padding:18px;color:#666;text-align:center">${msg}</div>`;
}

function renderFeatured(products){
  const container = document.getElementById("featured-carousel");
  if(!container){
    log("No #featured-carousel element found in DOM");
    return;
  }
  container.innerHTML = "";
  const featured = products.filter(p=>p.featured).slice(0, FEATURE_LIMIT);
  if(featured.length === 0){
    log("No featured products found in CSV");
    renderNoFeaturedMessage("No featured products yet. Please mark products as Featured = Yes in the sheet.");
    return;
  }

  featured.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    // resolve image
    let imgSrc = p.image || "";
    if(imgSrc && !/^https?:\/\//i.test(imgSrc)){
      imgSrc = `images/products/${imgSrc}`;
    }
    if(!imgSrc) imgSrc = FALLBACK_IMAGE;

    const priceHTML = (p.offer && p.offer > 0)
      ? `<div class="price-row"><span class="mrp">₹${p.mrp}</span><span class="offer">₹${p.offer}</span></div>`
      : `<div class="price-row"><span class="offer">₹${p.mrp}</span></div>`;

    card.innerHTML = `
      <img src="${imgSrc}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
      <div>
        <h3>${escapeHtml(p.name)}</h3>
        <p style="color:#666;font-size:0.9rem;margin:6px 0">${escapeHtml(p.description||"")}</p>
        ${priceHTML}
      </div>
    `;
    // card click opens popup
    card.addEventListener("click", () => {
      // call popup with full data
      try { showProductPopup && showProductPopup(p); } catch(e){ log("Popup error:", e); }
    });
    // add small actions area (view/add)
    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.innerHTML = `<button class="view-btn">View</button><button class="buy-btn">Add</button>`;
    // attach event listeners
    actions.querySelector(".view-btn").addEventListener("click", (ev) => {
      ev.stopPropagation();
      showProductPopup && showProductPopup(p);
    });
    actions.querySelector(".buy-btn").addEventListener("click", (ev) => {
      ev.stopPropagation();
      const price = p.offer && p.offer > 0 ? p.offer : p.mrp;
      if(window.addToCart) {
        window.addToCart({ id: p.id, name: p.name, price, qty: 1, image: p.image });
        showToast && showToast("Added to cart");
      } else {
        alert("Cart not available. Please ensure js/cart.js is loaded.");
      }
    });

    card.appendChild(actions);
    container.appendChild(card);
  });
}

// helper
function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

async function initHome(){
  clearFeaturedContainer();
  const prods = await fetchProducts();
  if(!prods || prods.length===0){
    renderNoFeaturedMessage("No products found. Check CSV URL, publishing or sheet headers.");
    return;
  }
  renderFeatured(prods);
  // delay initializing carousel until DOM children exist
  setTimeout(()=> {
    try { initFeaturedAutoSlide && initFeaturedAutoSlide(); } catch(e){ log("initFeaturedAutoSlide error:", e); }
  }, 250);
}

// small hero init (kept simple)
function initHeroSlider(){
  try{
    const slides = document.querySelectorAll(".hero-slider .slide");
    if(!slides || slides.length===0) return;
    let idx = 0;
    const dotsWrap = document.getElementById("hero-dots");
    dotsWrap.innerHTML = "";
    slides.forEach((_,i)=>{
      const b = document.createElement("button");
      b.className = "hero-dot";
      b.addEventListener("click", ()=> goTo(i));
      dotsWrap.appendChild(b);
    });
    function show(i){
      slides.forEach(s=> s.style.display = "none");
      slides[i].style.display = "block";
      Array.from(dotsWrap.children).forEach((d,di)=> d.classList.toggle("active", di===i));
      idx = i;
    }
    function goTo(i){ show((i+slides.length)%slides.length); }
    show(0);
    let t = setInterval(()=> goTo(idx+1), 3000);
    const slider = document.querySelector(".hero-slider");
    slider.addEventListener("mouseenter", ()=> clearInterval(t));
    slider.addEventListener("mouseleave", ()=> t = setInterval(()=> goTo(idx+1), 3000));
  }catch(e){ console.warn("Hero init error", e); }
}

document.addEventListener("DOMContentLoaded", () => {
  initHeroSlider();
  initHome();
});
