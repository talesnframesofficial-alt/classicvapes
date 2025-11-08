document.addEventListener("DOMContentLoaded", () => {

  // --- Preloader ---
  setTimeout(()=>document.getElementById("preloader").style.display="none",800);

  // --- Hero Slider ---
  let slideIndex=0;
  const slides=document.querySelectorAll(".hero-slide");
  const nextBtn=document.querySelector(".next");
  const prevBtn=document.querySelector(".prev");
  function showSlide(n){ slides.forEach((s,i)=>s.classList.toggle("active",i===n)); }
  showSlide(slideIndex);
  nextBtn.addEventListener("click",()=>{ slideIndex=(slideIndex+1)%slides.length; showSlide(slideIndex); });
  prevBtn.addEventListener("click",()=>{ slideIndex=(slideIndex-1+slides.length)%slides.length; showSlide(slideIndex); });
  setInterval(()=>{ slideIndex=(slideIndex+1)%slides.length; showSlide(slideIndex); },4000);

  // --- Featured Products Load from Google Sheet ---
  fetch("https://script.google.com/macros/s/AKfycbzCGPTrW4zd05lttIJ765wVP0ztyfvAjqVONlqytw8tMkWBygETNfm_BhGdpOKj1EZe-w/exec")
  .then(res=>res.json())
  .then(data=>{
    const products=data.filter(p=>p.Active==="TRUE").slice(0,7);
    const container=document.getElementById("featured-products");
    container.innerHTML=products.map(p=>`
      <div class="product-card">
        <img src="images/${p.ImageNumber}.jpg" alt="${p.Name}">
        <div class="product-info">
          <h4>${p.Name}</h4>
          <p>₹${p.Price}</p>
          <button class="add-to-cart">Add to Cart</button>
        </div>
      </div>
    `).join("");
  })
  .catch(err=>console.error("Error loading products:",err));

  // --- Featured Products Drag Scroll ---
  const featuredContainer=document.querySelector(".featured-container");
  let isDown=false,startX,scrollLeft;
  featuredContainer.addEventListener("mousedown",e=>{ isDown=true; featuredContainer.classList.add("active"); startX=e.pageX-featuredContainer.offsetLeft; scrollLeft=featuredContainer.scrollLeft; });
  featuredContainer.addEventListener("mouseleave",()=>{ isDown=false; featuredContainer.classList.remove("active"); });
  featuredContainer.addEventListener("mouseup",()=>{ isDown=false; featuredContainer.classList.remove("active"); });
  featuredContainer.addEventListener("mousemove",e=>{ if(!isDown) return; e.preventDefault(); const x=e.pageX-featuredContainer.offsetLeft; const walk=(x-startX)*2; featuredContainer.scrollLeft=scrollLeft-walk; });
});

