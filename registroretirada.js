// registroretirada.js (substituir totalmente)
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const snap = await get(ref(db, `usuarios/${user.uid}/withdrawals`));
    if (!snap.exists()) {
      showEmpty();
      return;
    }

    const data = snap.val();
    const arr = Object.values(data)
      .map((w) => ({ ...w, status: normalizeStatus(w.status) }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (!arr.length) {
      showEmpty();
      return;
    }

    emptyEl.style.display = "none";
    listEl.innerHTML = "";
    arr.forEach(renderItem);
  } catch (e) {
    console.error("Erro ao carregar retiradas:", e);
    showEmpty("Falha ao carregar os registos.");
  }
});

function renderItem(w) {
  const div = document.createElement("div");
  div.className = "item";

  // badge (ícone + label) como elemento separado
  const badgeEl = document.createElement("span");
  badgeEl.className = `badge ${w.status || 'pending'}`;
  // mantém o texto para compatibilidade com CSS atual
  badgeEl.innerHTML = `<span class="badge-icon" aria-hidden="true"></span><span class="badge-label">${statusLabel(w.status)}</span>`;

  // header com o nome do banco (apenas o nome; sem badge aqui)
  const header = document.createElement("div");
  header.className = "item-header";
  const bankSpan = document.createElement("span");
  bankSpan.className = "bank";
  bankSpan.textContent = w.bank || "-";
  header.appendChild(bankSpan);

  // values
  const values = document.createElement("div");
  values.className = "values";
  values.innerHTML = `
    <div class="row">
      <span>Saque solicitado</span>
      <span>${formatKz(w.amountGross || 0)}</span>
    </div>
    <div class="row">
      <span>Taxa (15%)</span>
      <span>${formatKz(w.fee || 0)}</span>
    </div>
    <div class="row total">
      <span>Recebeu</span>
      <span>${formatKz(w.amountNet || 0)}</span>
    </div>
  `;

  // dates
  const dates = document.createElement("div");
  dates.className = "dates";
  dates.innerHTML = `<span>Solicitado em: ${formatDate(w.createdAt)}</span>` +
    (w.paidAt ? `<span>Pago em: ${formatDate(w.paidAt)}</span>` : "");

  // ordem: badge (à esquerda absoluta), header (top center), values, dates
  div.appendChild(badgeEl);
  div.appendChild(header);
  div.appendChild(values);
  div.appendChild(dates);

  listEl.appendChild(div);
             }

  values.appendChild(makeRow("Saque solicitado", formatKz(w.amountGross || 0)));
  values.appendChild(makeRow("Taxa (15%)", formatKz(w.fee || 0)));
  values.appendChild(makeRow("Recebeu", formatKz(w.amountNet || 0), true));

  // Datas
  const dates = document.createElement("div");
  dates.className = "dates";
  const req = document.createElement("div");
  req.textContent = `Solicitado: ${formatDate(w.createdAt)}`;
  dates.appendChild(req);
  if (w.paidAt) {
    const paid = document.createElement("div");
    paid.textContent = `Pago: ${formatDate(w.paidAt)}`;
    dates.appendChild(paid);
  }

  // monta o item
  div.appendChild(badge);
  div.appendChild(header);
  div.appendChild(values);
  div.appendChild(dates);

  listEl.appendChild(div);
}

function normalizeStatus(st) {
  if (!st) return "pending";
  const s = String(st).toLowerCase();
  if (["pending", "processing", "done", "rejected"].includes(s)) return s;
  if (s.startsWith("proc")) return "processing";
  if (s.startsWith("conc") || s.startsWith("done")) return "done";
  if (s.startsWith("rej")) return "rejected";
  return "pending";
}

function statusLabel(st) {
  switch (st) {
    case "processing":
      return "Processando";
    case "done":
      return "Concluído";
    case "rejected":
      return "Rejeitado";
    default:
      return "Pendente";
  }
}

function showEmpty(msg) {
  if (emptyEl) {
    emptyEl.style.display = "block";
    emptyEl.textContent = msg || "Nenhum registo de retirada.";
  }
  if (listEl) listEl.innerHTML = "";
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("pt-PT");
  }
