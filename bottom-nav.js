// bottom-nav.js
(function () {
  function normalize(file) {
    if (!file) return "home.html";
    // pega só o último segmento, remove query/hash e coloca em minúsculas
    return file.split("/").pop().split("?")[0].split("#")[0].toLowerCase();
  }

  function highlight() {
    const current = normalize(location.pathname);
    const links = document.querySelectorAll(".bottom-nav .nav-item");

    links.forEach((link) => {
      const hrefFile = normalize(link.getAttribute("href"));
      link.classList.toggle("active", hrefFile === current);
    });
  }

  // quando a página carrega normalmente
  window.addEventListener("DOMContentLoaded", highlight);
  // quando volta do histórico (bfcache), garante reavaliar
  window.addEventListener("pageshow", highlight);
})();
