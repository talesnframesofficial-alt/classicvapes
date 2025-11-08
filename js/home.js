/* js/home.js
 - Loads products from your published CSV (falls back to static data)
 - Renders featured carousel (auto-slide every 3s) with manual swipe support
 - Hero slider auto-plays every 3s, dots active, no arrows
 - Uses fallback image if product image missing
*/

// Config (uses the CSV link you provided)
const PRODUCTS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT15M2LZhCAW1EXXp1oRB9oFn5Enj2DvuReH7tlPPlq3rkSffsRy12r09TsmCLgapn4jG01U9bcv6-2/pub?output=csv";
const FALLBACK_IMAGE = "images/products/default.jpg"; // ensure you have this file
const FEATURE_LIMIT = 10; // show up to 10 featured

// naive CSV parser (works for simple CSVs)
function csvToJson(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h => h.trim());
  return lines.map(line => {
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, "").trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i] || "");
    return obj;
  });
}

async function fetchProducts() {
  try {
    const res = await fetch(PRODUCTS_CSV_URL);
    if (!res.ok) throw new Error("Network error");
    const text = await res.text();
    const items = csvToJson(text).map(p => {
      // Normalize fields to our expected names (support both older and newer sheet formats)
      return {
        id: p.ProductID || p.id || (p.ProductId || p.ID) || ("UNK" + Math.random().toString(36).slice(2,7)),
        name: p.Name || p["Product Name"] || p.name || "Unnamed product",
        image: p.Image || p.image || "",
        mrp: parseFloat(p.MRP || p.price || p.Price || "0") || 0,
        offer: parseFloat(p.OfferPrice || p.offerPrice || p.offer || "0") || 0,
        variants: (p.Variants || p.variant || p.Variants || "").split(",").map(s => s.trim()).filter(Boolean),
        featured: String(p.Featured || p.featured || "").toLowerCase().startsWith("y"),
        description: p.Description || p.description || ""
      };
    });
    return items;
  } catch (err) {
    console.warn("Products CSV fetch failed, using fallback:", err);
    // fallback products
    return [
      { id:"PROD001", name:"Zippo Lighter Classic", image:"images/products/default.jpg", mrp:599, offer:0, variants:["Default"], featured:true, description:"Classic windproof lighter" },
      { id:"PROD002", name:"Davidoff Perfume", image:"images/products/default.jpg", mrp:2499, offer:0, variants:["100ml"], featured:true, description:"Classic scent" },
      { id:"PROD003", name:"Birthday Gift Box", image:"images/products/default.jpg", mrp:999, offer:0, variants:["Default"], featured:true, description:"Gift box" }
    ];
  }
}

// Render featured carousel items
function renderFeatured(products) {
  const container = document.getElementById("featured-carousel");
  container.innerHTML = "";
  const featured = products.filter(p => p.featured).slice(0, FEATURE_LIMIT);
  if (featured.length === 0) {
    container.innerHTML = "<p style='padding:12px;color:#666'>No featured products yet.</p>";
    return;
  }

  featured.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    // resolve image: if absolute URL use it; if filename use images/products/filename
    let imgSrc = p.image && p.image.trim() ? p.image.trim() : "";
    if (imgSrc && !/^https?:\/\//i.test(imgSrc)) {
      imgSrc = `images/products/${imgSrc}`;
    }
    if (!imgSrc) imgSrc = FALLBACK_IMAGE;

    // build price HTML (show offer if present and >0)
    const priceHTML = (p.offer && p.offer > 0)
      ? `<div class="price-row"><span class="mrp">₹${p.mrp}</span><span class="offer">₹${p.offer}</span></div>`
      : `<div class="price-row"><span class="offer">₹${p.mrp}</span></div>`;

    card.innerHTML = `
      <img src="${imgSrc}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
      <div>
        <h3>${escapeHtml(p.name)}</h3>
        <p style="color:#666;font-size:0.9rem;margin:6px 0">${escapeHtml(p.description || "")}</p>
        ${priceHTML}
      </div>
      <div class="card-actions">
        <button class="view-btn" data-id="${p.id}">View</button>
        <button class="buy-btn" data-id="${p.id}">Add</button>
      </div>
    `;
    container.appendChild(card);
  });

  // wire buttons: view -> popup (if popup exists on products page) or alert; add -> use cart
  container.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = btn.getAttribute("data-id");
      const prod = featured.find(x => x.id === id);
      if (prod) {
        // try to open popup if it's present (we create a minimal one here)
        showProductPopup(prod);
      }
    });
  });
  container.querySelectorAll(".buy-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = btn.getAttribute("data-id");
      const prod = featured.find(x => x.id === id);
      if (prod && window.addToCart) {
        const price = prod.offer && prod.offer > 0 ? prod.offer : prod.mrp;
        window.addToCart({ id: prod.id, name: prod.name, price: price, qty: 1, image: prod.image });
        showToast("Added to cart");
      } else {
        alert("Added to cart (cart not available).");
      }
    });
  });
}

// small product popup (zoom pop)
function showProductPopup(p) {
  // create popup if not exists
  if (!document.getElementById("pv-popup")) {
    const pop = document.createElement("div");
    pop.id = "pv-popup";
    pop.className = "product-popup";
    pop.style.position = "fixed";
    pop.style.inset = "0";
    pop.style.display = "flex";
    pop.style.alignItems = "center";
    pop.style.justifyContent = "center";
    pop.style.background = "rgba(0,0,0,0.6)";
    pop.style.zIndex = "2000";
    pop.innerHTML = `
      <div style="width:92%;max-width:520px;background:white;border-radius:8px;padding:14px;transform:scale(0.9);transition:all 200ms;box-shadow:0 12px 40px rgba(0,0,0,0.25)" id="pv-card">
        <button id="pv-close" style="float:right;border:none;background:none;font-size:20px;cursor:pointer">&times;</button>
        <img id="pv-img" src="" style="width:100%;height:220px;object-fit:cover;border-radius:6px" alt="">
        <h3 id="pv-name" style="margin:10px 0 6px"></h3>
        <p id="pv-desc" style="color:#666"></p>
        <div id="pv-price" style="margin-top:10px;font-weight:700"></div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
          <button id="pv-add" class="buy-btn">Add to Cart</button>
          <button id="pv-close2" class="view-btn">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(pop);
    document.getElementById("pv-close").addEventListener("click", hidePopup);
    document.getElementById("pv-close2").addEventListener("click", hidePopup);
    pop.addEventListener("click", (ev) => { if (ev.target === pop) hidePopup(); });
  }
  // fill data
  const img = p.image && p.image.trim() ? (p.image.match(/^https?:\/\//i) ? p.image : `images/products/${p.image}`) : FALLBACK_IMAGE;
  document.getElementById("pv-img").src = img;
  document.getElementById("pv-name").innerText = p.name;
  document.getElementById("pv-desc").innerText = p.description || "";
  const priceText = (p.offer && p.offer > 0) ? `₹${p.offer} (₹${p.mrp})` : `₹${p.mrp}`;
  document.getElementById("pv-price").innerHTML = `<span style="color:${p.offer>0 ? 'var(--accent1)' : '#111'};font-weight:800">${priceText}</span>`;
  // add handler
  document.getElementById("pv-add").onclick = () => {
    const price = p.offer && p.offer > 0 ? p.offer : p.mrp;
    window.addToCart && window.addToCart({ id: p.id, name: p.name, price: price, qty: 1, image: p.image });
    hidePopup();
    showToast("Added to cart");
  };

  // show with zoom animation
  const pop = document.getElementById("pv-popup");
  const card = document.getElementById("pv-card");
  pop.style.display = "flex";
  setTimeout(()=> card.style.transform = "scale(1)", 10);
  function hidePopup(){ card.style.transform = "scale(0.9)"; setTimeout(()=> pop.style.display = "none", 200); }
}

// tiny html escape
function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// toast
function showToast(msg, t=2000){
  let el = document.getElementById("home-toast");
  if (!el){
    el = document.createElement("div");
    el.id = "home-toast";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.transform = "translateX(-50%)";
    el.style.bottom = "28px";
    el.style.background = "#111";
    el.style.color = "#fff";
    el.style.padding = "8px 14px";
    el.style.borderRadius = "20px";
    el.style.zIndex = 2200;
    document.body.appendChild(el);
  }
  el.innerText = msg;
  el.style.display = "block";
  setTimeout(()=> el.style.display = "none", t);
}

/* ---------- HERO SLIDER (auto 3s, dots) ---------- */
function initHeroSlider() {
  const slidesWrap = document.querySelector(".hero-slider .slides");
  const slides = Array.from(document.querySelectorAll(".hero-slider .slide"));
  const dotsWrap = document.getElementById("hero-dots");
  let idx = 0;
  const total = slides.length;
  // create dots
  dotsWrap.innerHTML = "";
  slides.forEach((s,i) => {
    const d = document.createElement("button");
    d.className = "hero-dot";
    d.addEventListener("click", () => { goTo(i); });
    dotsWrap.appendChild(d);
  });
  function updateDots(){ Array.from(dotsWrap.children).forEach((d,i)=> d.classList.toggle("active", i===idx)); }

  function show(i){
    slides.forEach(s => s.style.display = "none");
    slides[i].style.display = "block";
    idx = i;
    updateDots();
  }
  function goTo(i){ show((i+total)%total); }
  // auto-play
  show(0);
  let timer = setInterval(()=> goTo(idx+1), 3000);
  // pause on hover (desktop)
  const slider = document.querySelector(".hero-slider");
  slider.addEventListener("mouseenter", ()=> clearInterval(timer));
  slider.addEventListener("mouseleave", ()=> timer = setInterval(()=> goTo(idx+1), 3000));
}

/* ---------- FEATURED CAROUSEL AUTO-SLIDE + SWIPE ---------- */
function initFeaturedAutoSlide() {
  const wrap = document.getElementById("featured-carousel");
  if (!wrap) return;
  let idx = 0;
  let itemWidth = wrap.querySelector(".product-card") ? wrap.querySelector(".product-card").getBoundingClientRect().width + 14 : 240;
  const visible = () => {
    const w = window.innerWidth;
    if (w >= 1200) return 5;
    if (w >= 900) return 4;
    if (w >= 600) return 3;
    return 2;
  };
  function slideTo(i){
    const per = visible();
    idx = Math.max(0, Math.min(i, Math.max(0, wrap.children.length - per)));
    const x = idx * (wrap.children[0].getBoundingClientRect().width + 14);
    wrap.style.transform = `translateX(-${x}px)`;
  }
  // auto move
  let auto = setInterval(()=> slideTo(idx + 1), 3000);
  wrap.addEventListener("mouseenter", ()=> clearInterval(auto));
  wrap.addEventListener("mouseleave", ()=> auto = setInterval(()=> slideTo(idx + 1), 3000));

  // touch support
  let startX = null, scrolled = 0;
  wrap.addEventListener("touchstart", (e)=> { startX = e.touches[0].clientX; scrolled = wrap.scrollLeft; clearInterval(auto); });
  wrap.addEventListener("touchmove", (e)=> {
    if (startX===null) return;
    const dx = startX - e.touches[0].clientX;
    wrap.scrollLeft = scrolled + dx;
  });
  wrap.addEventListener("touchend", ()=> { startX = null; auto = setInterval(()=> slideTo(idx + 1), 3000); });

  window.addEventListener("resize", ()=> slideTo(idx));
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  initHeroSlider();
  const products = await fetchProducts();
  renderFeatured(products);
  // small safety: init featured slider after render (delay)
  setTimeout(initFeaturedAutoSlide, 200);
});
