// registrodeposito.js
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
    // Busca todos os depósitos
    const snap = await get(ref(db, "depositRequests"));
    if (!snap.exists()) return showEmpty();

    // Filtra do usuário e ordena (mais recentes primeiro)
    const data = snap.val();
    const arr = Object.values(data)
      .filter(d => (d?.uid === user.uid))
      .map(d => ({
        ...d,
        status: normalizeStatus(d.status)
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (!arr.length) return showEmpty();

    emptyEl.style.display = "none";
    listEl.innerHTML = "";
    arr.forEach(renderItem);
  } catch (e) {
    console.error("Erro ao carregar depósitos:", e);
    showEmpty("Falha ao carregar os registos.");
  }
});

/** RENDER — 100% no estilo da página de retirada */
function renderItem(dep) {
  const item = document.createElement("div");
  item.className = "item";

  // Coluna esquerda (ícone + legenda)
  const left = document.createElement("div");
  left.className = "status-col";

  const dot = document.createElement("span");
  dot.className = "status-dot " + statusClass(dep.status);

  const label = document.createElement("span");
  label.className = "status-text";
  label.textContent = statusLabel(dep.status);

  left.appendChild(dot);
  left.appendChild(label);

  // Corpo (direita)
  const body = document.createElement("div");
  body.className = "item-body";

  // Linha superior: método/banco à esquerda • datas à direita
  const metaTop = document.createElement("div");
  metaTop.className = "meta-top";

  const refSpan = document.createElement("span");
  refSpan.className = "ref";
  // Mostra o que fizer mais sentido como “referência curta”
  const shortRef = (dep.bank || dep.bankName || dep.method || "").toString().trim();
  if (shortRef) refSpan.textContent = shortRef;

  const dates = document.createElement("div");
  dates.className = "dates";
  const d1 = document.createElement("div");
  d1.className = "line";
  d1.textContent = `Enviado: ${formatDate(dep.createdAt)}`;
  dates.appendChild(d1);

  const confirmedAt = chooseConfirmDate(dep);
  if (confirmedAt) {
    const d2 = document.createElement("div");
    d2.className = "line";
    d2.textContent = `Confirmado: ${formatDate(confirmedAt)}`;
    dates.appendChild(d2);
  }

  metaTop.appendChild(refSpan);
  metaTop.appendChild(dates);

  // Valor grande
  const amount = document.createElement("div");
  amount.className = "amount";
  const prefix = document.createElement("span");
  prefix.className = "prefix";
  prefix.textContent = "KZ";
  const value = document.createElement("span");
  value.textContent = formatNumber(chooseAmount(dep));
  amount.appendChild(prefix);
  amount.appendChild(value);

  // Monta
  body.appendChild(metaTop);

  // Linha opcional (IBAN/método) — se existir IBAN, mostre depois do metaTop
  const detailsLine = buildDetails(dep);
  if (detailsLine) body.appendChild(detailsLine);

  body.appendChild(amount);

  item.appendChild(left);
  item.appendChild(body);
  listEl.appendChild(item);
}

/** Valor a exibir (preferências + *fallbacks*) */
function chooseAmount(d) {
  return Number(
    d.amountExact ?? d.amountBase ?? d.amount ?? d.valor ?? d.total ?? 0
  );
}

/** Data de confirmação (vários nomes possíveis no seu backoffice) */
function chooseConfirmDate(d) {
  return d.approvedAt ?? d.confirmedAt ?? d.verifiedAt ?? d.paidAt ?? null;
}

/** Linha de detalhes (banco + IBAN mascarado ou método) */
function buildDetails(d) {
  const bank = d.bank || d.bankName;
  const method = d.method;
  const ibanMasked = d?.bankData?.iban ? maskIban(d.bankData.iban) : null;

  const hasSomething = bank || method || ibanMasked;
  if (!hasSomething) return null;

  const wrap = document.createElement("div");
  wrap.className = "meta-top"; // reaproveita o estilo (mesmo tamanho de fonte)

  const left = document.createElement("span");
  left.className = "ref";
  left.textContent = bank ? `Banco: ${bank}` : (method ? `Método: ${method}` : "");

  const right = document.createElement("div");
  right.className = "dates";
  right.textContent = iban ? `IBAN: ${iban}` : (method && bank ? `Método: ${method}` : "");

  wrap.appendChild(left);
  wrap.appendChild(right);
  return wrap;
}

function normalizeStatus(st) {
  if (!st) return "pending";
  const s = String(st).toLowerCase();
  if (["pending","processando","processing","done","concluido","concluído","rejected","rejeitado"].includes(s)) {
    if (s.startsWith("conc") || s === "done") return "done";
    if (s.startsWith("rej")) return "rejected";
    if (s.startsWith("proc")) return "pending"; // exibimos como "Pendente"
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
    emptyEl.textContent = msg || "Nenhum registo de depósito.";
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
  const d = new Date(Number(ts) || ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

function maskIban(iban) {
  const digits = (iban || "").replace(/\D+/g, "");
  if (digits.length <= 7) return digits;
  const visible = digits.slice(0, 7);
  const hiddenCount = Math.max(0, digits.length - 7);
  return `${visible}${"•".repeat(hiddenCount)}`;
}
