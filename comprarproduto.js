// comprarproduto.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { PRODUTOS } from "./products.js";

const DAY_MS = 24 * 60 * 60 * 1000; // 24h

// - Função para exibir/ocultar skeleton ---
function showSkeleton(show) {
  const sk = document.getElementById("produtos-skeleton");
  const list = document.getElementById("produtos-container");
  if (!sk || !list) return;

  if (show) {
    sk.classList.remove("hidden");
    list.classList.add("hidden");
  } else {
    sk.classList.add("hidden");
    list.classList.remove("hidden");
  }
}

let currentUser = null;
let userData = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  showSkeleton(true); // Mostra skeleton ao iniciar
  await loadUserData();
});

async function loadUserData() {
  const uid = currentUser.uid;
  const userRef = ref(db, `usuarios/${uid}`);
  const snap = await get(userRef);
  if (!snap.exists()) {
    showSkeleton(false);
    return;
  }

  userData = snap.val();
  document.getElementById("saldo-disponivel").textContent = formatKz(userData.saldo || 0);

  renderProdutosComprados(userData.compras || {});
  showSkeleton(false); // Esconde skeleton quando renderizar
}

function renderProdutosComprados(compras) {
  const container = document.getElementById("produtos-container");
  container.innerHTML = "";

  let totalComissaoGerada = 0;

  Object.entries(compras).forEach(([prodId, prodData]) => {
    const produto = PRODUTOS.find(p => p.id === prodId);
    if (!produto) return;

    Object.entries(prodData.items || {}).forEach((itemEntry) => {
      const [itemId, item] = itemEntry;

      const compradoEm = item.compradoEm || 0;
      const lastPayAt = item.lastPayAt || compradoEm;
      const diasCreditados = Math.max(0, Math.floor((lastPayAt - compradoEm) / DAY_MS));
      const earned = diasCreditados * (item.comissao || 0);
      totalComissaoGerada += earned;

      const card = document.createElement("div");
      card.className = "produto";
      card.innerHTML = `
        <div class="produto-info" style="text-align:left; font-size:13px; line-height:1.4;">
          <p class="produto-nome"><strong>${produto.nome}</strong></p>
  
          <p>Preço: <span class="valor">${formatKz(produto.preco)}</span></p>
          <p style="margin:0; color:#fff;">Preço : <span style="color:#3da5ff;">${formatKz(p.preco)}</span></p>
          <p>Ciclo: <span class="valor">60 dias</span></p>
          <p>Taxa de lucro: <span class="valor">10%</span></p>
          <p>Renda diária: <span class="valor">${formatKz(produto.preco * 0.10)}</span></p>
          <p>Renda total (60 dias): <span class="valor">${formatKz(produto.preco * 0.10 * 60)}</span></p>
          <p>Disponível: <span class="valor">9</span></p>

          <p class="status">Comprado em: ${formatDate(compradoEm)}</p>

          <p class="timer" 
            data-prod="${prodId}" 
            data-item="${itemId}" 
            data-lastpay="${lastPayAt}" 
            data-comissao="${item.comissao}">
            00:00:00
          </p>
        </div>
      `;
      container.appendChild(card);
    });
  });

  document.getElementById("total-comissao").textContent = formatKz(totalComissaoGerada);
  startTimers();
}

function startTimers() {
  const timers = document.querySelectorAll(".timer");
  setInterval(async () => {
    for (let timer of timers) {
      const prodId = timer.dataset.prod;
      const itemId = timer.dataset.item;
      const lastPay = parseInt(timer.dataset.lastpay, 10);
      const comissao = parseFloat(timer.dataset.comissao || 0);
      const now = Date.now();
      const elapsed = now - lastPay;
      const remaining = DAY_MS - elapsed;

      if (remaining > 0) {
        timer.textContent = formatCountdown(remaining);
      } else {
        // Credita comissão automaticamente
        await creditItemComissao(prodId, itemId, lastPay, comissao);
        // Atualiza data-lastpay do timer para reiniciar contagem
        const newLast = Date.now();
        timer.dataset.lastpay = newLast;
        timer.textContent = formatCountdown(DAY_MS);
      }
    }
  }, 1000);
}

/**
 * Credita comissão de um item específico no saldo e atualiza total-comissao na tela.
 */
async function creditItemComissao(prodId, itemId, lastPayAt, comissao) {
  try {
    const uid = currentUser.uid;
    const userRef = ref(db, `usuarios/${uid}`);
    const snap = await get(userRef);
    if (!snap.exists()) return;
    const data = snap.val();

    let saldo = data.saldo || 0;
    saldo += comissao;

    // Atualiza no Firebase
    await update(ref(db), {
      [`usuarios/${uid}/saldo`]: saldo,
      [`usuarios/${uid}/compras/${prodId}/items/${itemId}/lastPayAt`]: lastPayAt + DAY_MS
    });

    // Atualiza na tela
    document.getElementById("saldo-disponivel").textContent = formatKz(saldo);

    // Atualiza total de comissão (só para interface, somando +comissão)
    const totalComissaoEl = document.getElementById("total-comissao");
    const currentTotal = parseFloat((totalComissaoEl.textContent || "0").replace(/[^\d,.-]/g, "").replace(",", "."));
    const newTotal = (currentTotal || 0) + comissao;
    totalComissaoEl.textContent = formatKz(newTotal);
  } catch (e) {
    console.error("Erro ao creditar comissão automática:", e);
  }
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
