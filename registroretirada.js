// registroretirada.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
      .map((w) => ({
        ...w,
        status: normalizeStatus(w.status)
      }))
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

  const badge = `<span class="badge ${w.status || 'pending'}">${statusLabel(w.status)}</span>`;

  div.innerHTML = `
    <div class="item-header">
      <span class="bank">${w.bank || "-"}</span>
      ${badge}
    </div>

    <div class="values">
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
    </div>

    <div class="dates">
      <span>Solicitado em: ${formatDate(w.createdAt)}</span>
      ${w.paidAt ? `<span>Pago em: ${formatDate(w.paidAt)}</span>` : ""}
    </div>
  `;

  listEl.appendChild(div);
}

function normalizeStatus(st) {
  if (!st) return "pending";
  const s = String(st).toLowerCase();
  if (["pending", "processing", "done", "rejected"].includes(s)) return s;
  // compatibilidade com textos antigos
  if (s.startsWith("proc")) return "processing";
  if (s.startsWith("conc")) return "done";
  if (s.startsWith("rej"))  return "rejected";
  return "pending";
}

function statusLabel(st) {
  switch (st) {
    case "processing": return "Processando";
    case "done": return "Concluído";
    case "rejected": return "Rejeitado";
    default: return "Pendente";
  }
}

function showEmpty(msg) {
  emptyEl.style.display = "block";
  if (msg) emptyEl.textContent = msg;
  listEl.innerHTML = "";
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("pt-PT");
      }
