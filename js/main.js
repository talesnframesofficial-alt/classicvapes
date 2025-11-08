// ===== PRELOADER =====
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  setTimeout(() => preloader.classList.add("fade-out"), 800);
});

// ===== HERO SLIDER =====
const slides = document.querySelectorAll(".hero-slide");
let currentSlide = 0;

function showSlide(index) {
  slides.forEach((s, i) => s.classList.toggle("active", i === index));
}

document.getElementById("heroNext").addEventListener("click", () => {
  currentSlide = (currentSlide + 1) % slides.length;
  showSlide(currentSlide);
});

document.getElementById("heroPrev").addEventListener("click", () => {
  currentSlide = (currentSlide - 1 + slides.length) % slides.length;
  showSlide(currentSlide);
});

setInterval(() => {
  currentSlide = (currentSlide + 1) % slides.length;
  showSlide(currentSlide);
}, 5000);
