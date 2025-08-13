// Mantido: Firebase
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
    if (!snap.exists()) return showEmpty();

    const data = snap.val();
    const arr = Object.entries(data).map(([id, w]) => ({
      id,
      ...w,
      status: normalizeStatus(w.status),
    })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (!arr.length) return showEmpty();

    emptyEl.style.display = "none";
    listEl.innerHTML = "";
    arr.forEach(renderItem);
  } catch (e) {
    console.error("Erro ao carregar retiradas:", e);
    showEmpty("Falha ao carregar os registos.");
  }
});

/** RENDER — igual à 2ª imagem: status à esquerda, valor grande, datas à direita */
function renderItem(w) {
  const item = document.createElement("div");
  item.className = "item";

  // Coluna esquerda (ícone + legenda)
  const left = document.createElement("div");
  left.className = "status-col";

  const dot = document.createElement("span");
  dot.className = "status-dot " + statusClass(w.status);

  const label = document.createElement("span");
  label.className = "status-text";
  label.textContent = statusLabel(w.status);

  left.appendChild(dot);
  left.appendChild(label);

  // Corpo
  const body = document.createElement("div");
  body.className = "item-body";

  // Linha superior: (opcional) referência à esquerda, datas à direita
  const metaTop = document.createElement("div");
  metaTop.className = "meta-top";

  // Mostra apenas o nome do banco; nunca o UID
  const refSpan = document.createElement("span");
  refSpan.className = "ref";
  const bankName = (w.bankName || w.bank || "").toString().trim();
  if (bankName) refSpan.textContent = bankName;
  
  const dates = document.createElement("div");
  dates.className = "dates";
  const d1 = document.createElement("div");
  d1.className = "line";
  d1.textContent = `Solicitado: ${formatDate(w.createdAt)}`;
  dates.appendChild(d1);
  if (w.paidAt) {
    const d2 = document.createElement("div");
    d2.className = "line";
    d2.textContent = `Pago: ${formatDate(w.paidAt)}`;
    dates.appendChild(d2);
  }

  metaTop.appendChild(refSpan);
  metaTop.appendChild(dates);

  // Valor (apenas o "Saque solicitado")
  const amount = document.createElement("div");
  amount.className = "amount";
  const prefix = document.createElement("span");
  prefix.className = "prefix";
  prefix.textContent = "KZ";
  const value = document.createElement("span");
  value.textContent = formatNumber(chooseAmount(w));

  amount.appendChild(prefix);
  amount.appendChild(value);

  // Monta
  body.appendChild(metaTop);
  body.appendChild(amount);

  item.appendChild(left);
  item.appendChild(body);
  listEl.appendChild(item);
}

/** Escolhe o valor bruto a exibir (fallbacks seguros) */
function chooseAmount(w) {
  // prioridade ao que você já salva como "amountGross"; em falta, tenta "amount" ou "amountNet"
  return Number(
    w.amountGross ?? w.amount ?? w.valor ?? w.amountNet ?? 0
  );
}

function normalizeStatus(st) {
  if (!st) return "pending";
  const s = String(st).toLowerCase();
  if (["pending", "processando", "processing", "done", "concluido", "concluído", "rejected", "rejeitado"].includes(s)) {
    if (s.startsWith("conc") || s === "done") return "done";
    if (s.startsWith("rej")) return "rejected";
    if (s.startsWith("proc")) return "pending"; // tela mostra "Pendente" tal como a 2ª imagem
    return s;
  }
  if (s.startsWith("conc")) return "done";
  if (s.startsWith("rej")) return "rejected";
  return "pending";
}

function statusLabel(st) {
  switch (st) {
    case "done": return "Concluído";
    case "rejected": return "Rejeitado";
    default: return "Pendente";
  }
}
function statusClass(st) {
  switch (st) {
    case "done": return "status-done";
    case "rejected": return "status-rejected";
    default: return "status-pending";
  }
}

function showEmpty(msg) {
  if (emptyEl) {
    emptyEl.style.display = "block";
    emptyEl.textContent = msg || "Nenhum registo de retirada.";
  }
  if (listEl) listEl.innerHTML = "";
}

function formatNumber(v){
  return Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function formatDate(ts) {
  if (!ts) return "—";
  // aceita timestamp numérico, string ISO ou millis
  const d = new Date(Number(ts) || ts);
  // Formato idêntico ao da 2ª imagem: YYYY/MM/DD HH:mm
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
    }
