// bottom-nav.js

// Função para marcar a aba atual baseada na URL
function highlightActiveTab() {
  const currentPage = window.location.pathname.split("/").pop(); 
  const items = document.querySelectorAll(".bottom-nav .nav-item");

  items.forEach(item => {
    item.classList.remove("active");
    const href = item.getAttribute("href");
    if (href === currentPage) {
      item.classList.add("active");
    }
  });
}

// Executa ao carregar a página
document.addEventListener("DOMContentLoaded", highlightActiveTab);
