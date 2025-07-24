// comprarproduto.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { PRODUTOS } from "./products.js";

const DAY_MS = 24 * 60 * 60 * 1000; // 24h

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;
  const userRef = ref(db, `usuarios/${uid}`);
  const snap = await get(userRef);
  if (!snap.exists()) return;

  const data = snap.val();
  const saldo = data.saldo || 0;
  document.getElementById("saldo-disponivel").textContent = formatKz(saldo);

  renderProdutosComprados(data.compras || {});
});

function renderProdutosComprados(compras) {
  const container = document.getElementById("produtos-container");
  container.innerHTML = "";

  let totalComissaoGerada = 0;

  Object.entries(compras).forEach(([prodId, prodData]) => {
    const produto = PRODUTOS.find(p => p.id === prodId);
    if (!produto) return;

    Object.values(prodData.items || {}).forEach((item) => {
      // ===== NOVA LÓGICA: comissão total já gerada/paga =====
      const compradoEm = item.compradoEm || 0;
      const lastPayAt = item.lastPayAt || compradoEm;
      const diasCreditados = Math.max(0, Math.floor((lastPayAt - compradoEm) / DAY_MS));
      const earned = diasCreditados * (item.comissao || 0);
      totalComissaoGerada += earned;

      const card = document.createElement("div");
      card.className = "produto";
      card.innerHTML = `
        <div class="produto-info">
          <p><strong>${produto.nome}</strong></p>
          <p>Comissão diária: ${formatKz(produto.comissao)}</p>
          <p style="color: orange">${formatKz(produto.preco)}</p>
          <p class="status">Comprado em: ${formatDate(compradoEm)}</p>
          <p class="timer" data-lastpay="${lastPayAt}">00:00:00</p>
        </div>
      `;
      container.appendChild(card);
    });
  });

  // Mostra o total que JÁ FOI GERADO
  document.getElementById("total-comissao").textContent = formatKz(totalComissaoGerada);

  startTimers();
}

function startTimers() {
  const timers = document.querySelectorAll(".timer");
  setInterval(() => {
    timers.forEach(timer => {
      const lastPay = parseInt(timer.dataset.lastpay, 10);
      const now = Date.now();
      const elapsed = now - lastPay;
      const remaining = DAY_MS - elapsed;
      if (remaining > 0) {
        timer.textContent = formatCountdown(remaining);
      } else {
        timer.textContent = "Pronto para sacar!";
      }
    });
  }, 1000);
}

function formatKz(value) {
  return `Kz ${Number(value || 0).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleString("pt-PT");
}

function formatCountdown(ms) {
  let totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  totalSec %= 3600;
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
