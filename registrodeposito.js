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
    const snap = await get(ref(db, `usuarios/${user.uid}/deposits`));
    const data = snap.exists() ? snap.val() : {};

    const arr = Object.values(data).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    listEl.innerHTML = "";
    arr.forEach(dep => {
      const div = document.createElement("div");
      div.className = "item";

      const statusClass = dep.status?.toLowerCase() || "pendente";

      div.innerHTML = `
        <div class="row1">
          <span class="amount">Kz ${formatNumber(dep.amountExact || dep.amountBase || 0)}</span>
          <span class="status ${statusClass}">${dep.status || "pendente"}</span>
        </div>
        <div class="row2">
          Método: ${dep.method || "-"}<br/>
          Banco: ${dep.bank || "-"} • ${dep.bankData?.iban ? maskIban(dep.bankData.iban) : "IBAN xxxx"}<br/>
          Enviado em: ${formatDate(dep.createdAt)}
        </div>
      `;
      listEl.appendChild(div);
    });
  } catch (e) {
    console.error(e);
    listEl.innerHTML = "<p>Falha ao carregar registros.</p>";
  } finally {
    sk.style.display = "none";
    listEl.classList.remove("hidden");
  }
});

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
