/* js/home.js — featured + hero + popup (fixed) */
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT15M2LZhCAW1EXXp1oRB9oFn5Enj2DvuReH7tlPPlq3rkSffsRy12r09TsmCLgapn4jG01U9bcv6-2/pub?output=csv";
const AUTO_MS = 3000;
const MOBILE_VIEW_BREAK = 900;
const MOBILE_PER_VIEW = 2;
const DESKTOP_PER_VIEW = 4;
const FEATURE_LIMIT = 12;

function el(tag, cls){ const d=document.createElement(tag); if(cls) d.className = cls; return d; }

function csvToJson(csv){
  if(!csv) return [];
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h=>h.trim());
  return lines.map(line => {
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g,"").trim());
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
  let idx = 0;
  const dots = document.getElementById("hero-dots");
  if(dots) dots.innerHTML = "";
  slides.forEach((_,i)=>{
    const b = el("button","hero-dot"); b.type="button";
    b.onclick = ()=> go(i);
    if(dots) dots.appendChild(b);
  });
  function show(i){
    slides.forEach(s => s.style.display = "none");
    slides[i].style.display = "block";
    if(dots) Array.from(dots.children).forEach((d,di)=> d.classList.toggle("active", di===i));
    idx = i;
  }
  function go(i){ show((i + slides.length) % slides.length); }
  show(0);
  let t = setInterval(()=> go(idx+1), AUTO_MS);
  const slider = document.querySelector(".hero-slider");
  if(slider){
    slider.addEventListener("mouseenter", ()=> clearInterval(t));
    slider.addEventListener("mouseleave", ()=> t = setInterval(()=> go(idx+1), AUTO_MS));
  }
}

/* FEATURED */
let featuredInterval = null;

function renderFeatured(products){
  let container = document.getElementById("featured-carousel");
  if(!container){
    const wrap = document.getElementById("featured-carousel-wrap") || document.body;
    container = el("div","featured-carousel"); container.id = "featured-carousel"; wrap.appendChild(container);
  }
  container.innerHTML = "";

  const featured = products.filter(p=>p.featured).slice(0, FEATURE_LIMIT);
  if(!featured.length){
    container.innerHTML = '<div style="padding:18px;color:#666">No featured products. Mark Featured = Yes in sheet.</div>';
    return;
  }

  featured.forEach(p=>{
    const card = el("div","product-card");
    // media wrapper (square)
    const media = el("div","product-media");
    if(p.image){
      const src = /^https?:\/\//i.test(p.image) ? p.image : ('images/products/' + p.image);
      const img = el("img"); img.src = src; img.alt = p.name; img.loading="lazy";
      img.onerror = function(){ this.remove(); const ph = el("div","no-image"); ph.innerText = "No Image"; media.appendChild(ph); };
      media.appendChild(img);
    } else {
      const ph = el("div","no-image"); ph.innerText = "No Image"; media.appendChild(ph);
    }
    card.appendChild(media);

    const info = el("div");
    const title = el("h3"); title.innerText = p.name;
    const desc = el("p"); desc.className = "desc"; desc.innerText = p.description || "";
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
    info.appendChild(title); info.appendChild(desc); info.appendChild(priceRow);

    card.appendChild(info);

    const actions = el("div","card-actions");
    const view = el("button","view-btn"); view.type="button"; view.innerText = "View";
    const add = el("button","buy-btn"); add.type="button"; add.innerText = "Add";
    actions.appendChild(view); actions.appendChild(add);
    card.appendChild(actions);

    card.addEventListener("click", (ev)=>{
      if(ev.target === add){
        window.addToCart && window.addToCart({ id: p.id, name: p.name, price: final, qty:1, image: p.image || 'images/logo.png' });
        (window.showToast||(()=>{}))("Added to cart");
        return;
      }
      showProductPopup(p);
    });

    container.appendChild(card);
  });

  initFeaturedBehavior();
}

function initFeaturedBehavior(){
  const container = document.getElementById("featured-carousel");
  if(!container) return;
  container.style.transform = "";
  container.scrollLeft = 0;
  if(featuredInterval){ clearInterval(featuredInterval); featuredInterval = null; }

  const isMobile = window.innerWidth < MOBILE_VIEW_BREAK;
  const perView = isMobile ? MOBILE_PER_VIEW : DESKTOP_PER_VIEW;
  const cards = Array.from(container.children);
  if(!cards.length) return;

  const gap = 14;
  const cardRect = cards[0].getBoundingClientRect();
  const step = Math.round(cardRect.width + gap);

  if(isMobile){
    container.style.flexDirection = "row";
    container.style.overflowX = "auto";
    container.style.scrollSnapType = "x mandatory";
    let idx = 0;
    featuredInterval = setInterval(()=> {
      idx = (idx + 1) % cards.length;
      cards[idx].scrollIntoView({ behavior: 'smooth', inline: 'start' });
    }, AUTO_MS);
    container.addEventListener("touchstart", ()=> { if(featuredInterval){ clearInterval(featuredInterval); featuredInterval = null; } }, { once:true });
    renderFeaturedDots(container, cards, MOBILE_PER_VIEW);
    return;
  }

  container.style.flexDirection = "row";
  container.style.overflow = "hidden";
  const total = cards.length;
  let index = 0;

  const wrap = document.getElementById("featured-carousel-wrap");
  if(wrap && !document.getElementById("featured-prev")){
    const controls = el("div","featured-controls");
    const prev = el("button","featured-arrow"); prev.id="featured-prev"; prev.type="button"; prev.innerText = "◀";
    const next = el("button","featured-arrow"); next.id="featured-next"; next.type="button"; next.innerText = "▶";
    prev.onclick = ()=> { index = Math.max(0, index - perView); slideTo(index); };
    next.onclick = ()=> { index = Math.min(total - perView, index + perView); slideTo(index); };
    controls.appendChild(prev); controls.appendChild(next);
    wrap.insertBefore(controls, wrap.firstChild);
  }

  renderFeaturedDots(container, cards, perView);

  function slideTo(i){
    index = Math.max(0, Math.min(i, Math.max(0, total - perView)));
    const x = index * step;
    container.style.transform = "translateX(-" + x + "px)";
    updateDots(index, perView);
  }

  featuredInterval = setInterval(()=> {
    const nextIndex = (index + perView) > (total - perView) ? 0 : index + perView;
    slideTo(nextIndex);
  }, AUTO_MS);

  container.addEventListener("mouseenter", ()=> { if(featuredInterval){ clearInterval(featuredInterval); featuredInterval=null; } });
  container.addEventListener("mouseleave", ()=> { if(!featuredInterval) featuredInterval = setInterval(()=> { const nextIndex = (index + perView) > (total - perView) ? 0 : index + perView; slideTo(nextIndex); }, AUTO_MS); });

  // simple drag
  let isDown=false, startX=0;
  container.addEventListener('mousedown', (e)=> { isDown=true; startX = e.pageX; });
  container.addEventListener('mousemove', (e)=> { if(!isDown) return; const dx = e.pageX - startX; if(Math.abs(dx) > 40){ if(dx < 0) slideTo(index + 1); else slideTo(index - 1); isDown=false; } });
  container.addEventListener('mouseup', ()=> { isDown=false; });
  container.addEventListener('mouseleave', ()=> { isDown=false; });
}

/* render dots */
function renderFeaturedDots(container, cards, perViewOverride){
  let dotsArea = document.getElementById("featured-dots");
  if(dotsArea) dotsArea.remove();
  const dotsWrap = el("div","featured-dots"); dotsWrap.id = "featured-dots";
  if(container.parentElement) container.parentElement.appendChild(dotsWrap);
  const perView = perViewOverride || MOBILE_PER_VIEW;
  const total = cards.length;
  const pages = Math.max(1, Math.ceil(total / perView));
  dotsWrap.innerHTML = "";
  for(let i=0;i<pages;i++){
    const d = el("button","hero-dot"); d.type="button";
    d.onclick = ()=> {
      const idx = i * perView;
      const targetX = idx * (cards[0].getBoundingClientRect().width + 14);
      container.style.transform = "translateX(-" + targetX + "px)";
      updateDots(idx, perView);
    };
    dotsWrap.appendChild(d);
  }
  updateDots(0, perView);
}
function updateDots(indexVal, perView){
  const dotsWrap = document.getElementById("featured-dots");
  if(!dotsWrap) return;
  const children = Array.from(dotsWrap.children);
  const page = Math.floor(indexVal / (perView || 1));
  children.forEach((d,i)=> d.classList.toggle("active", i === page));
}

/* POPUP: exposes showProductPopup globally (home & products can use) */
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
    document.getElementById("pp-add").onclick = function(){
      window.addToCart && window.addToCart({ id: p.id, name: p.name, price: final, qty:1, image: p.image || 'images/logo.png' });
      (window.showToast||(()=>{}))("Added to cart"); hidePopup();
    };
  } else {
    variantsWrap.style.display = "flex";
    let selected = p.variants[0];
    p.variants.forEach((v,i)=> {
      const b = el("button","variant-btn"); b.type="button"; b.innerText = v;
      if(i===0) b.classList.add("selected");
      b.addEventListener("click", ()=> {
        Array.from(variantsWrap.children).forEach(n=>n.classList.remove("selected"));
        b.classList.add("selected"); selected = v;
      });
      variantsWrap.appendChild(b);
    });
    document.getElementById("pp-add").onclick = function(){
      window.addToCart && window.addToCart({ id: p.id, name: (p.name + " (" + selected + ")"), price: final, qty:1, image: p.image || 'images/logo.png' });
      (window.showToast||(()=>{}))("Added to cart"); hidePopup();
    };
  }
}

function hidePopup(){ const pop = document.getElementById("product-popup"); if(pop){ pop.classList.remove("popup-show"); setTimeout(()=> pop.style.display="none", 260); } }

/* INIT */
document.addEventListener("DOMContentLoaded", async ()=>{
  initHero();
  const products = await fetchProducts();
  renderFeatured(products);

  let resizeTimer = null;
  window.addEventListener("resize", ()=> {
    if(resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(()=> { renderFeatured(products); }, 300);
  });

  // expose globally
  window.showProductPopup = showProductPopup;
});
