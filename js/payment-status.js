document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");  // e.g. ?status=success
  const orderId = params.get("orderId") || Math.floor(Math.random() * 900000 + 100000);

  const statusTitle = document.getElementById("status-title");
  const statusMessage = document.getElementById("status-message");
  const statusIcon = document.getElementById("status-icon");
  const orderIdEl = document.getElementById("order-id");

  orderIdEl.textContent = `#${orderId}`;

  if (status === "success") {
    statusIcon.textContent = "✅";
    statusTitle.textContent = "Payment Successful!";
    statusMessage.textContent = "Thank you for your order. We’ll contact you soon!";
    document.body.style.background = "#e6ffed";
  } else if (status === "failed") {
    statusIcon.textContent = "❌";
    statusTitle.textContent = "Payment Failed";
    statusMessage.textContent = "Something went wrong. Please try again.";
    document.body.style.background = "#ffecec";
  } else {
    statusIcon.textContent = "ℹ️";
    statusTitle.textContent = "Payment Status Unknown";
    statusMessage.textContent = "We couldn’t determine your payment status.";
  }

  document.getElementById("back-home-btn").addEventListener("click", () => {
    window.location.href = "index.html";
  });
});
