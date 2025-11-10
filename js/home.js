/* js/home.js — final featured + hero + popup
   Rules implemented:
   - Desktop (>=1200): featured shown as static grid of up to 8 items (no auto scroll)
   - Tablet (600-1199): carousel 4 per view, auto-scroll (3s) + swipe; auto stops on touch
   - Mobile portrait (<600): carousel 2 per view, auto-scroll (3s) + swipe; auto stops on touch
   - Mobile landscape: 4 per view (handled by media queries)
*/
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT15M2LZhCAW1EXXp1oRB9oFn5Enj2DvuReH7tlPPlq3rkSffsRy12r09TsmCLgapn4jG01U9bcv6-2/pub?output=csv";
const AUTO_MS = 3000;
const MOBILE_BREAK = 600;
const TABLET_BREAK = 1199;

function el(tag, cls){ const d=document.createElement(tag); if(cls) d.className = cls; return d; }

function csvToJson(csv){
  if(!csv) return [];
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h=>h.trim());
  return lines.map(line => {
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,"").trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h] = cols[i] !== undefined ? cols[i] : "");
    return obj;
  });
}

async function fetchProducts(){
  try{
    const res = await fetch(CSV_URL);
    if(!res.ok) throw new Error("CSV fetch failed " + res.status);
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
  }catch(e){
    console.error("fetchProducts error", e);
    return [];
  }
}

/* HERO */
function initHero(){
  const slides = Array.from(document.querySelectorAll(".hero-slide"));
  if(!slides.length) return;
  let idx=0;
  const dots = document.getElementById("hero-dots");
  if(dots) dots.innerHTML="";
  slides.forEach((_,i)=>{
    const b = el("button","hero-dot"); b.type="button";
    b.onclick = ()=> show(i);
    if(dots) dots.appendChild(b);
  });
  function show(i){
    slides.forEach(s=> s.style.display="none");
    slides[i].style.display="block";
    if(dots) Array.from(dots.children).forEach((d,di)=> d.classList.toggle("active", di===i));
    idx = i;
  }
  show(0);
  let t = setInterval(()=> show((idx+1) % slides.length), AUTO_MS);
  const slider = document.querySelector(".hero-slider");
  if(slider){
    slider.addEventListener("mouseenter", ()=> clearInterval(t));
    slider.addEventListener("mouseleave", ()=> t = setInterval(()=> show((idx+1) % slides.length), AUTO_MS));
  }
}

/* Wait images */
function imagesLoaded(container){
  const imgs = Array.from(container.querySelectorAll("img"));
  if(!imgs.length) return Promise.resolve();
  return Promise.all(imgs.map(img => {
    if(img.complete) return Promise.resolve();
    return new Promise(res => { img.addEventListener("load", res); img.addEventListener("error", res); });
  }));
}

/* Featured logic */
let autoTimer = null;
let userTouched = false;

async function renderFeatured(products){
  let container = document.getElementById("featured-carousel");
  if(!container){
    const wrap = document.getElementById("featured-carousel-wrap") || document.body;
    container = el("div","featured-carousel"); container.id = "featured-carousel"; wrap.appendChild(container);
  }
  container.innerHTML = "";

  const featured = products.filter(p => p.featured).slice(0, 12); // collect up to 12
  if(!featured.length){
    container.innerHTML = '<div style="padding:18px;color:#666">No featured products. Mark Featured = Yes in sheet.</div>';
    return;
  }

  featured.forEach(p => {
    const card = el("div","product-card");
    const media = el("div","product-media");
    if(p.image){
      const src = /^https?:\/\//i.test(p.image) ? p.image : ('images/products/' + p.image);
      const img = el("img"); img.src = src; img.alt = p.name; img.loading = "lazy";
      img.onerror = function(){ this.remove(); const ph = el("div","no-image"); ph.innerText="No Image"; media.appendChild(ph); };
      media.appendChild(img);
    } else {
      const ph = el("div","no-image"); ph.innerText="No Image"; media.appendChild(ph);
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

    card.appendChild(title); card.appendChild(desc); card.appendChild(priceRow);

    // actions area
    const actions = el("div","card-actions");
    const view = el("button","view-btn"); view.type="button"; view.innerText="View";
    const add = el("button","buy-btn"); add.type="button"; add.innerText="Add";
    actions.appendChild(view); actions.appendChild(add);
    card.appendChild(actions);

    // clicks
    card.addEventListener("click", (ev) => {
      if(ev.target === add){
        window.addToCart && window.addToCart({ id: p.id, name: p.name, price: final, qty:1, image: p.image || 'images/logo.png' });
        (window.showToast||(()=>{}))("Added to cart");
        return;
      }
      // open popup
      showProductPopup(p);
    });

    container.appendChild(card);
  });

  await imagesLoaded(container);
  initFeaturedBehavior();
}

function initFeaturedBehavior(){
  const container = document.getElementById("featured-carousel");
  if(!container) return;
  container.style.transform = "";
  container.scrollLeft = 0;
  if(autoTimer){ clearInterval(autoTimer); autoTimer = null; }
  userTouched = false;

  const width = window.innerWidth;
  if(width >= 1200){
    // Desktop: static grid handled by CSS (grid set in CSS via media query). No auto/drag behavior.
    // Ensure any overflow hidden and remove listeners
    container.style.overflow = "visible";
    const dots = document.getElementById("featured-dots"); if(dots) dots.style.display = "none";
    return;
  }

  // For mobile/tablet we use horizontal carousel with snap
  container.style.overflowX = "auto";
  container.style.scrollSnapType = "x mandatory";
  const cards = Array.from(container.children);
  if(!cards.length) return;

  // compute perView based on breakpoints + orientation
  let perView = 2;
  if(width >= 600 && width <= 1199) perView = 4; // tablet portrait -> 4
  if(width >= 900 && width <= 1199 && window.innerHeight < window.innerWidth) perView = 8; // tablet landscape show 8 if fits

  // ensure card min-width to display perView
  cards.forEach(c => {
    if(width < 600) c.style.minWidth = `calc((100% - var(--gap)) / 2)`; // 2 per view
    else if(width >= 600 && width < 1200) c.style.minWidth = `calc((100% - (var(--gap) * 3)) / 4)`; // 4 per view
    else c.style.minWidth = ''; // desktop handled by CSS grid
  });

  // dots
  renderFeaturedDots(container, cards, perView);

  // auto scroll: advance one card at a time, stops if user touches (you chose B)
  let idx = 0;
  autoTimer = setInterval(()=> {
    if(userTouched) return;
    idx = (idx + 1) % cards.length;
    cards[idx].scrollIntoView({ behavior: 'smooth', inline: 'start' });
  }, AUTO_MS);

  // stop on touch
  container.addEventListener("touchstart", ()=> { userTouched = true; if(autoTimer){ clearInterval(autoTimer); autoTimer = null; } }, { passive:true });

  // allow swipe: no additional code needed due to native overflow-x scrolling and scroll-snap
}

/* featured dots helper */
function renderFeaturedDots(container, cards, perView){
  let dotsArea = document.getElementById("featured-dots");
  if(dotsArea) dotsArea.remove();
  const dotsWrap = el("div","featured-dots"); dotsWrap.id = "featured-dots";
  if(container.parentElement) container.parentElement.appendChild(dotsWrap);
  const pages = Math.max(1, Math.ceil(cards.length / (perView || 1)));
  dotsWrap.innerHTML = "";
  for(let i=0;i<pages;i++){
    const d = el("button","hero-dot"); d.type="button";
    d.onclick = ()=> {
      const targetIndex = i * (perView || 1);
      cards[Math.min(targetIndex, cards.length-1)].scrollIntoView({ behavior: 'smooth', inline: 'start' });
    };
    dotsWrap.appendChild(d);
  }
  // activate first
  updateFeaturedDots(0, perView);
  // update on scroll
  container.addEventListener('scroll', throttle(()=> {
    let left = container.scrollLeft;
    const cardW = cards[0].getBoundingClientRect().width + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 14);
    const idx = Math.round(left / cardW);
    updateFeaturedDots(idx, perView);
  }, 120));
}
function updateFeaturedDots(indexVal, perView){
  const dotsWrap = document.getElementById("featured-dots");
  if(!dotsWrap) return;
  const children = Array.from(dotsWrap.children);
  const page = Math.floor(indexVal / (perView || 1));
  children.forEach((d,i)=> d.classList.toggle("active", i === page));
}

/* tiny throttle */
function throttle(fn, wait){ let t=0; return function(){ const now = Date.now(); if(now - t > wait){ t = now; fn.apply(this,arguments); } } }

/* POPUP (shared) */
function createPopupIfMissing(){
  if(document.getElementById("product-popup")) return;
  const pop = el("div","product-popup"); pop.id = "product-popup";
  pop.innerHTML = ''
    + '<div class="popup-card">'
    + '  <button class="popup-close" aria-label="Close">✕</button>'
    + '  <div class="popup-grid">'
    + '    <div class="popup-media"><img id="pp-img" alt="product image"></div>'
    + '    <div class="popup-info">'
    + '      <h3 id="pp-name"></h3>'
    + '      <p id="pp-desc" class="desc"></p>'
    + '      <div id="pp-price" class="popup-price"></div>'
    + '      <div id="pp-variants" class="variants-row"></div>'
    + '      <div class="popup-actions">'
    + '        <button id="pp-add" class="buy-btn">Add to Cart</button>'
    + '        <button id="pp-close" class="view-btn">Close</button>'
    + '      </div>'
    + '    </div>'
    + '  </div>'
    + '</div>';
  document.body.appendChild(pop);
  pop.querySelector(".popup-close").addEventListener("click", hidePopup);
  pop.querySelector("#pp-close").addEventListener("click", hidePopup);
  pop.addEventListener("click", (e)=> { if(e.target === pop) hidePopup(); });
}
function showPopupNoImage(){ const media = document.querySelector(".popup-media"); if(!media) return; if(media.querySelector(".no-image")) { media.querySelector(".no-image").style.display="flex"; return; } const ph = el("div","no-image"); ph.style.height="100%"; ph.innerText="No Image"; media.appendChild(ph); }
function removePopupNoImage(){ const ph = document.querySelector(".popup-media .no-image"); if(ph) ph.style.display="none"; }

function showProductPopup(p){
  createPopupIfMissing();
  const pop = document.getElementById("product-popup"); pop.style.display = "flex"; pop.classList.add("popup-show");
  const img = document.getElementById("pp-img");
  if(p.image){
    img.src = /^https?:\/\//i.test(p.image) ? p.image : ('images/products/' + p.image);
    img.style.display = "block";
    img.onerror = function(){ img.style.display='none'; showPopupNoImage(); };
    removePopupNoImage();
  } else { img.style.display='none'; showPopupNoImage(); }
  document.getElementById("pp-name").innerText = p.name;
  document.getElementById("pp-desc").innerText = p.description || "";
  const final = (p.offer && p.offer>0) ? p.offer : p.mrp;
  var priceHtml = "₹" + final;
  if(p.offer && p.offer>0) priceHtml += ' <span style="text-decoration:line-through;color:#999;margin-left:8px">₹' + p.mrp + '</span>';
  document.getElementById("pp-price").innerHTML = priceHtml;
  const variantsWrap = document.getElementById("pp-variants");
  variantsWrap.innerHTML = "";
  if(!p.variants || !p.variants.length){
    variantsWrap.style.display = "none";
    document.getElementById("pp-add").onclick = function(){ window.addToCart && window.addToCart({ id: p.id, name: p.name, price: final, qty:1, image: p.image || 'images/logo.png' }); (window.showToast||(()=>{}))("Added to cart"); hidePopup(); };
  } else {
    variantsWrap.style.display = "flex";
    let selected = p.variants[0];
    p.variants.forEach((v,i)=> {
      const b = el("button","variant-btn"); b.type="button"; b.innerText = v;
      if(i===0) b.classList.add("selected");
      b.addEventListener("click", ()=> { Array.from(variantsWrap.children).forEach(n=>n.classList.remove("selected")); b.classList.add("selected"); selected = v; });
      variantsWrap.appendChild(b);
    });
    document.getElementById("pp-add").onclick = function(){ window.addToCart && window.addToCart({ id: p.id, name: (p.name + " (" + selected + ")"), price: final, qty:1, image: p.image || 'images/logo.png' }); (window.showToast||(()=>{}))("Added to cart"); hidePopup(); };
  }
}
function hidePopup(){ const pop = document.getElementById("product-popup"); if(pop){ pop.classList.remove("popup-show"); setTimeout(()=> pop.style.display="none", 260); } }

/* INIT */
document.addEventListener("DOMContentLoaded", async ()=>{
  initHero();
  const products = await fetchProducts();
  await renderFeatured(products);

  let resizeTimer = null;
  window.addEventListener("resize", ()=> { if(resizeTimer) clearTimeout(resizeTimer); resizeTimer = setTimeout(()=> { renderFeatured(products); }, 350); });

  // expose globally for products page to call
  window.showProductPopup = showProductPopup;
});
