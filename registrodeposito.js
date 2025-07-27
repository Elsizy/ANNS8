// registrodeposito.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const listEl = document.getElementById("list");
  const sk = document.getElementById("skeleton");

  try {
    // === ALTERAÇÃO: buscamos em depositRequests e filtramos pelo uid do usuário ===
    const snap = await get(ref(db, "depositRequests"));
    const data = snap.exists() ? snap.val() : {};

    const arr = Object.values(data)
      .filter((d) => d.uid === user.uid)
      .map((d) => ({
        ...d,
        status: normalizeStatus(d.status)
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    listEl.innerHTML = "";

    if (!arr.length) {
      listEl.innerHTML = `<p style="opacity:.7">Nenhum depósito encontrado.</p>`;
    } else {
      arr.forEach(dep => {
        const div = document.createElement("div");
        div.className = "item";

        const statusKey = dep.status || "pending";

        div.innerHTML = `
          <div class="row1">
            <span class="amount">Kz ${formatNumber(dep.amountExact || dep.amountBase || 0)}</span>
            <span class="status ${statusKey}">${statusLabel(statusKey)}</span>
          </div>
          <div class="row2">
            Método: ${dep.method || "-"}<br/>
            Banco: ${dep.bank || "-"} • ${dep.bankData?.iban ? maskIban(dep.bankData.iban) : "IBAN xxxx"}<br/>
            Enviado em: ${formatDate(dep.createdAt)}
          </div>
        `;
        listEl.appendChild(div);
      });
    }
  } catch (e) {
    console.error(e);
    listEl.innerHTML = "<p>Falha ao carregar registros.</p>";
  } finally {
    sk.style.display = "none";
    listEl.classList.remove("hidden");
  }
});

function normalizeStatus(st) {
  if (!st) return "pending";
  const s = String(st).toLowerCase();
  if (["pending", "processing", "done", "rejected"].includes(s)) return s;
  // casos antigos, tipo "pendente", "concluído"
  if (s.startsWith("pend")) return "pending";
  if (s.startsWith("conc")) return "done";
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

function formatNumber(v) {
  return Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function formatDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("pt-PT");
}
function maskIban(iban) {
  const digits = (iban || "").replace(/\D+/g, "");
  if (digits.length <= 7) return digits;
  const visible = digits.slice(0, 7);
  const hiddenCount = Math.max(0, digits.length - 7);
  return `${visible}${"•".repeat(hiddenCount)}`;
}
