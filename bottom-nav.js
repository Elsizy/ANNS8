// bottom-nav.js
(function () {
  const map = {
    "home.html": "home",
    "comprarproduto.html": "produtos",
    "equipa.html": "equipa",
    "pessoal.html": "pessoal",
  };

  const path = location.pathname.split("/").pop().toLowerCase() || "home.html";
  const key = map[path] || "home";
  const el = document.querySelector(`.bottom-nav .nav-item[data-key="${key}"]`);
  if (el) el.classList.add("active");
})();
