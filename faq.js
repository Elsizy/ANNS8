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

  // ===== Busca no FAQ (case-insensitive e sem acentos) =====
  const searchInput = document.getElementById("faq-search");
  const clearBtn    = document.getElementById("faq-clear");
  const emptyMsg    = document.getElementById("faq-empty");
  const faqItems    = Array.from(document.querySelectorAll(".faq-item"));

  // Remove acentos e normaliza
  function norm(str){
    return (str || "")
      .toString()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  }

  function applyFilter(q){
    const n = norm(q);
    let visibleCount = 0;

    faqItems.forEach(item => {
      // Pesquisamos em pergunta + resposta
      const text = norm(item.textContent);
      const hit = !n || text.includes(n);

      // Mostra/oculta
      item.style.display = hit ? "" : "none";
      if (hit) visibleCount++;

      // (Opcional) se não há busca, recolhe tudo
      if (!n) item.classList.remove("active");
    });

    // Mensagem "sem resultados"
    emptyMsg.style.display = (n && visibleCount === 0) ? "block" : "none";
  }

  // Digitação
  searchInput?.addEventListener("input", () => applyFilter(searchInput.value));

  // Botão limpar
  clearBtn?.addEventListener("click", () => {
    searchInput.value = "";
    applyFilter("");
    searchInput.focus();
  });

  // Inicializa sem filtro
  applyFilter("");

