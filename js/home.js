document.addEventListener("DOMContentLoaded", function(){

  // Preloader
  const preloader = document.getElementById('preloader');
  window.onload = () => {
    preloader.style.opacity = '0';
    setTimeout(()=> preloader.style.display='none',500);
  };

  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const cartCount = document.getElementById('cart-count');
  const cartItemsDiv = document.getElementById('cart-items');
  const totalSpan = document.getElementById('total');
  const featuredProductsDiv = document.getElementById('featured-products');

  const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzCGPTrW4zd05lttIJ765wVP0ztyfvAjqVONlqytw8tMkWBygETNfm_BhGdpOKj1EZe-w/exec";
  let allProducts = [];

  async function fetchProducts(){
    try{
      const res = await fetch(GOOGLE_SHEET_URL);
      const data = await res.json();
      allProducts = data;
      displayFeatured(allProducts.slice(0,7));
    }catch(err){
      console.error(err);
      featuredProductsDiv.innerHTML="<p style='color:#777;'>Error loading featured products.</p>";
    }
  }

  function displayFeatured(products){
    featuredProductsDiv.innerHTML='';
    products.forEach(product=>{
      const card=document.createElement('div');
      card.className='product-card';
      const imgName = product.image || 'placeholder.png';
      card.innerHTML=`
        <img src="images/${imgName}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>₹${product.offer_price || product.price}</p>
        <button class="view-btn">View</button>
      `;
      featuredProductsDiv.appendChild(card);

      card.querySelector('.view-btn').addEventListener('click',()=> openPopup(product));
    });
  }

  function openPopup(product){
    const popup=document.createElement('div');
    popup.className='product-popup';
    popup.innerHTML=`
      <div class="popup-content">
        <button class="close-btn">&times;</button>
        <img src="images/${product.image||'placeholder.png'}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p class="popup-price">₹${product.offer_price||product.price}</p>
        <p class="popup-desc">${product.description||''}</p>
        <div class="variants"></div>
        <button class="buy-btn">Add to Cart</button>
      </div>
    `;
    document.body.appendChild(popup);

    popup.querySelector('.close-btn').addEventListener('click',()=>popup.remove());

    // Variants
    const variantsDiv = popup.querySelector('.variants');
    if(product.variants){
      product.variants.split(',').forEach(v=>{
        const btn=document.createElement('button');
        btn.className='variant-btn';
        btn.textContent=v.trim();
        btn.addEventListener('click',()=>{
          variantsDiv.querySelectorAll('.variant-btn').forEach(b=>b.classList.remove('selected'));
          btn.classList.add('selected');
        });
        variantsDiv.appendChild(btn);
      });
    }

    popup.querySelector('.buy-btn').addEventListener('click',()=>{
      const selectedVariant = popup.querySelector('.variant-btn.selected')?.textContent||null;
      addToCart(product,selectedVariant);
      popup.remove();
    });
  }

  function addToCart(product,variant=null){
    const existing = cart.find(item=>item.name===product.name && item.variant===variant);
    if(existing) existing.qty++;
    else cart.push({name:product.name,price:parseFloat(product.offer_price||product.price),qty:1,variant});
    localStorage.setItem('cart',JSON.stringify(cart));
    updateCart();
  }

  function updateCart(){
    cartCount.innerText=cart.reduce((a,b)=>a+b.qty,0);
    cartItemsDiv.innerHTML='';
    let total=0;
    cart.forEach(item=>{
      total+=item.price*item.qty;
      const div=document.createElement('div');
      div.className='cart-item';
      div.innerHTML=`<span>${item.name}${item.variant?' ('+item.variant+')':''} x${item.qty}</span>
                     <span>₹${item.price*item.qty}</span>`;
      cartItemsDiv.appendChild(div);
    });
    totalSpan.innerText=total.toFixed(2);
  }

  window.toggleCart=function(){
    const cartDiv=document.getElementById('cart');
    cartDiv.style.display = cartDiv.style.display==='block'?'none':'block';
    updateCart();
  }

  fetchProducts();
  updateCart();

  // Hero slider animation
  const slides = document.querySelectorAll('.hero-slider .slide');
  let current=0;
  setInterval(()=>{
    slides.forEach((s,i)=>s.style.display=i===current?'block':'none');
    current=(current+1)%slides.length;
  },5000);

});
