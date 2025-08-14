// Acordeão: mantém só um item aberto + rola para o item ao abrir
(function () {
  const list = document.querySelector(".faq-list");
  if (!list) return;

  const items = Array.from(list.querySelectorAll(".faq-item"));

  // Se vier com hash (#faq-3), abre esse
  const fromHash = document.getElementById(location.hash.replace("#",""));
  if (fromHash && fromHash.tagName.toLowerCase() === "details") {
    fromHash.setAttribute("open", "");
    requestAnimationFrame(() => fromHash.scrollIntoView({behavior:"smooth", block:"start"}));
  }

  items.forEach((it) => {
    it.addEventListener("toggle", () => {
      if (it.open) {
        // fecha os outros
        items.forEach(o => { if (o !== it) o.open = false; });
        // rola para o item aberto (suave)
        it.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
})();

// Busca no FAQ (case-insensitive e ignora acentos)
(function () {
  const list       = document.querySelector(".faq-list");
  if (!list) return;

  const searchInput = document.getElementById("faq-search");
  const clearBtn    = document.getElementById("faq-clear");
  const emptyMsg    = document.getElementById("faq-empty");
  const items       = Array.from(list.querySelectorAll(".faq-item"));

  function norm(str){
    return (str || "")
      .toString()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  }

  function applyFilter(q){
    const n = norm(q);
    let visible = 0;

    items.forEach(it => {
      const text = norm(it.textContent);
      const hit  = !n || text.includes(n);
      it.style.display = hit ? "" : "none";
      if (hit) visible++;

      // ao limpar a busca, recolhe os <details>
      if (!n && it.tagName.toLowerCase() === "details") it.open = false;
    });

    if (emptyMsg) emptyMsg.style.display = (n && visible === 0) ? "block" : "none";
  }

  searchInput?.addEventListener("input", () => applyFilter(searchInput.value));
  clearBtn?.addEventListener("click", () => {
    searchInput.value = "";
    applyFilter("");
    searchInput.focus();
  });

  // inicializa sem filtro
  applyFilter("");
})();
