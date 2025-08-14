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
