// === Preloader ===
const preloader = document.getElementById("preloader");
window.addEventListener("load", () => {
  setTimeout(() => preloader.style.opacity = "0", 300);
  setTimeout(() => preloader.style.display = "none", 600);
});

// === Cart + Elements ===
const cart = JSON.parse(localStorage.getItem("cart")) || [];
const orderItems = document.getElementById("order-items");
const orderTotal = document.getElementById("order-total");
const placeOrderBtn = document.getElementById("place-order");
const orderMsg = document.getElementById("order-msg");

// ✅ Replace this with your new deployment URL
const scriptURL = "https://script.google.com/macros/s/AKfycbz6U5bkvxd_H22mwtzxpEGPbJNotf7urN0TlPxG879Dhx5QOnHg_eADwwt3y7p6J4yf/exec";

// === Load Cart ===
function loadCart() {
  orderItems.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    orderItems.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }

  cart.forEach((item, i) => {
    const price = parseFloat(item.price) || 0;
    const qty = item.quantity || 1;
    const subtotal = price * qty;
    total += subtotal;

    const div = document.createElement("div");
    div.classList.add("checkout-item");
    div.innerHTML = `
      <span>${item.name} (${item.variant || "Default"})</span>
      <span>₹${subtotal.toFixed(2)}</span>
      <button class="remove" data-index="${i}">&times;</button>
    `;
    orderItems.appendChild(div);
  });

  orderTotal.textContent = `₹${total.toFixed(2)}`;
}

// === Remove Item from Cart ===
orderItems.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove")) {
    const i = e.target.dataset.index;
    cart.splice(i, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
  }
});

// === Place Order ===
placeOrderBtn.addEventListener("click", async () => {
  if (cart.length === 0) {
    orderMsg.textContent = "Cart is empty!";
    orderMsg.style.color = "red";
    return;
  }

  // Collect user details
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const state = document.getElementById("state").value.trim();
  const pincode = document.getElementById("pincode").value.trim();
  const payment = document.getElementById("payment").value;

  if (!name || !email || !phone || !address || !city || !state || !pincode) {
    orderMsg.textContent = "Please fill in all details.";
    orderMsg.style.color = "red";
    return;
  }

  const total = orderTotal.textContent;
  const orderDetails = cart.map(i => `${i.name} (${i.variant || "Default"}) x${i.quantity || 1}`).join(", ");

  const data = {
    Name: name,
    Email: email,
    Phone: phone,
    Address: `${address}, ${city}, ${state}, ${pincode}`,
    Payment: payment,
    Items: orderDetails,
    Total: total,
    Date: new Date().toLocaleString()
  };

  orderMsg.textContent = "Placing your order...";
  orderMsg.style.color = "#666";

  try {
    const response = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.success) {
      const orderId = result.orderId || "CV-XXXX";
      orderMsg.textContent = `✅ Order placed successfully! (Order ID: ${orderId})`;
      orderMsg.style.color = "green";
      localStorage.removeItem("cart");
      setTimeout(() => {
        window.location.href = `success.html?orderID=${encodeURIComponent(orderId)}`;
      }, 2000);
    } else {
      orderMsg.textContent = "❌ Order failed to save. Try again.";
      orderMsg.style.color = "red";
      console.error("Server Error:", result.error);
    }
  } catch (err) {
    orderMsg.textContent = "❌ Order failed. Try again later.";
    orderMsg.style.color = "red";
    console.error("Fetch Error:", err);
  }
});

// === Initialize ===
loadCart();
