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
      card.className = "produto-card";
      card.innerHTML = `
       <!--<div class="produto-card">-->

    <!-- Cabeçalho -->
    <div class="produto-header">

        <div class="produto-title">
            <h2 class="produto-nome">${produto.nome}</h2>
        </div>

        <div class="produto-timer">

            <p class="timer"
                data-prod="${prodId}"
                data-item="${itemId}"
                data-lastpay="${lastPayAt}"
                data-comissao="${item.comissao}">
                00:00:00
            </p>

            <span class="timer-label">
                Próxima comissão
            </span>

        </div>

    </div>

    <!-- Linha horizontal -->
    <div class="produto-divider"></div>


    <!-- Corpo -->
    <div class="produto-body">

        <!-- Coluna esquerda -->
        <div class="produto-column">

            <div class="info-item">

                <div class="info-icon">
                    <svg class="icon-preco"></svg>
                </div>

                <div class="info-content">

                    <span class="info-label">
                        Preço
                    </span>

                    <span class="info-value">
                        ${formatKz(produto.preco)}
                    </span>

                </div>

            </div>



            <div class="info-item">

                <div class="info-icon">
                    <!-- <svg class="icon-lucro"></svg>-->
                    <svg class="icon-lucro" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24" fill="none" stroke="#F2C94C" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2v20"/>
  <path d="M16.5 6.5c0-1.7-1.8-3-4.5-3S7.5 4.8 7.5 6.5 9.3 9 12 9s4.5 1.3 4.5 3-1.8 3-4.5 3S7.5 13.7 7.5 12"/>
</svg>
                </div>

                <div class="info-content">

                    <span class="info-label">
                        Taxa de lucro
                    </span>

                    <span class="info-value">
                        12%
                    </span>

                </div>

            </div>



            <div class="info-item">

                <div class="info-icon">
                    <svg class="icon-ciclo"></svg>
                </div>

                <div class="info-content">

                    <span class="info-label">
                        Ciclo
                    </span>

                    <span class="info-value">
                        45 dias
                    </span>

                </div>

            </div>

        </div>



        <!-- Linha vertical -->
        <div class="produto-divider-vertical"></div>



        <!-- Coluna direita -->
        <div class="produto-column">

            <div class="info-item">

                <div class="info-icon">
                    <svg class="icon-renda-dia"></svg>
                </div>

                <div class="info-content">

                    <span class="info-label">
                        Renda diária
                    </span>

                    <span class="info-value">
                        ${formatKz(produto.preco * 0.12)}
                    </span>

                </div>

            </div>



            <div class="info-item">

                <div class="info-icon">
                    <svg class="icon-renda-total"></svg>
                </div>

                <div class="info-content">

                    <span class="info-label">
                        Renda total
                    </span>

                    <span class="info-value">
                        ${formatKz(produto.preco * 0.12 * 45)}
                    </span>

                </div>

            </div>



            <div class="info-item">

                <div class="info-icon">
                    <svg class="icon-data"></svg>
                </div>

                <div class="info-content">

                    <span class="info-label">
                        Comprado em
                    </span>

                    <span class="info-date">
                        ${formatDate(compradoEm)}
                    </span>

                </div>

            </div>

        </div>

    </div>

<!--</div>-->
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
  const n = Number(value) || 0;
  return `Kz ${n.toLocaleString("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
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
