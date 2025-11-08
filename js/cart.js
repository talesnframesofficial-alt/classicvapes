document.addEventListener("DOMContentLoaded", function() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  // Show product popup
  window.viewProduct = function(product) {
    const popup = document.createElement('div');
    popup.className = 'product-popup';
    popup.innerHTML = `
      <div class="popup-content">
        <button class="close-btn" onclick="document.body.removeChild(this.parentElement.parentElement)">×</button>
        <img src="${product.img}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>${product.description || ''}</p>
        <p>₹${product.price}</p>
        <div class="variants">
          ${product.variants ? product.variants.map((v, i) => `<button class="variant-btn" onclick="selectVariant(this)">${v}</button>`).join('') : ''}
        </div>
        <button class="buy-btn" onclick="addToCart('${product.name}', ${product.price}, selectedVariant)">Add to Cart</button>
      </div>
    `;
    document.body.appendChild(popup);
    window.selectedVariant = product.variants ? product.variants[0] : null;
  }

  window.selectVariant = function(btn) {
    document.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    window.selectedVariant = btn.innerText;
  }

  // Add to cart
  window.addToCart = function(name, price, variant = null) {
    const existing = cart.find(item => item.name === name && item.variant === variant);
    if(existing) existing.qty++;
    else cart.push({ name, price, qty:1, variant });
    updateCart();
    alert(`${name} ${variant ? '('+variant+')' : ''} added to cart!`);
  }

  // Remove item
  window.removeItem = function(index) {
    cart.splice(index,1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCart();
  }

  // Update cart UI
  function updateCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    const cartCount = document.getElementById('cart-count');
    if(cartCount) cartCount.innerText = cart.reduce((a,b)=>a+b.qty,0);

    const cartItemsDiv = document.getElementById('cart-items');
    if(cartItemsDiv) {
      cartItemsDiv.innerHTML = '';
      let total = 0;
      cart.forEach((item,i) => {
        total += item.price * item.qty;
        cartItemsDiv.innerHTML += `
          <div class="cart-item">
            <span>${item.name}${item.variant ? ' ('+item.variant+')' : ''} x${item.qty}</span>
            <span>₹${item.price*item.qty}</span>
            <button class="remove-btn" onclick="removeItem(${i})">&times;</button>
          </div>
        `;
      });
      const totalSpan = document.getElementById('total');
      if(totalSpan) totalSpan.innerText = total;
    }
  }

  // Toggle cart visibility
  window.toggleCart = function() {
    const cartDiv = document.getElementById('cart');
    if(cartDiv) {
      cartDiv.style.display = cartDiv.style.display === 'block' ? 'none' : 'block';
    }
    updateCart();
  }

  updateCart();
});
