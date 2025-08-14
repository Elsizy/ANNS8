// Estrutura básica: mantém o "estado vazio" visível enquanto não houver itens.
// Quando quiser exibir notificações, basta montar objetos e chamar render(items).

(function () {
  const list  = document.getElementById("list");
  const empty = document.getElementById("empty");

  // Lista (vazia por padrão)
  const notifications = []; // ex.: [{title:"Manutenção", desc:"Hoje às 22h...", date:Date.now()}]

  if (!notifications.length) {
    // nada pra mostrar: fica o estado vazio
    empty.style.display = "grid";
    return;
  }

  // Se houver notificações (futuro)
  empty.style.display = "none";
  list.innerHTML = "";
  notifications.forEach(renderItem);

  function renderItem(n) {
    const card = document.createElement("div");
    card.className = "item";

    const left = document.createElement("div");
    left.className = "notif-ico";
    left.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
        <path d="M15 17H9a5 5 0 0 1-5-5V9a7 7 0 1 1 14 0v3a5 5 0 0 1-5 5Z" stroke="currentColor" stroke-width="1.6"/>
        <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    `;

    const body = document.createElement("div");
    body.className = "item-body";
    body.innerHTML = `
      <div class="title">${escapeHTML(n.title || "Notificação")}</div>
      <div class="desc">${escapeHTML(n.desc || "")}</div>
      <div class="date">${formatDate(n.date)}</div>
    `;

    card.appendChild(left);
    card.appendChild(body);
    list.appendChild(card);
  }

  function formatDate(ts){
    if (!ts) return "";
    const d = new Date(Number(ts) || ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    const hh = String(d.getHours()).padStart(2,"0");
    const mi = String(d.getMinutes()).padStart(2,"0");
    return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
  }

  function escapeHTML(s=""){
    return s.replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }
})();
