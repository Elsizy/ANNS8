// comprarproduto.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { PRODUTOS } from "./products.js";

const DAY_MS = 24 * 60 * 60 * 1000; // 24h

// --- Função para exibir/ocultar skeleton ---
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
// Injetar CSS embutido (apenas uma vez)
function ensureProductCardStyles() {
  const id = 'prod-card-inline-styles';
  if (document.getElementById(id)) return; // já injetado

  const css = `
  /* estilos embutidos para renderProdutosComprados */
  .produto { position: relative; padding: 16px 18px 16px 16px; border-radius: 14px; margin-bottom: 14px; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02)); border:1px solid rgba(255,255,255,0.04); box-shadow: 0 6px 22px rgba(0,0,0,0.45); color: #fff; }
  .produto-head { font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 8px; }
  .produto-info-grid { display: flex; gap: 12px; align-items: flex-start; font-size: 12px; }
  .prod-left { flex: 1; }
  .prod-left .row { display:flex; justify-content:space-between; align-items:center; padding: 2px 0; }
  .prod-left .label { color: #ffffff; font-weight:500; font-size:12px; }
  .prod-left .value { color: #2fa6ff; font-weight:700; font-size:12px; }
  .prod-right { width: 130px; text-align: right; display:flex; flex-direction:column; justify-content:center; align-items:flex-end; gap:6px; }
  .prod-right .small { color: #ffffff; font-size:12px; }
  .prod-right .big { color: #2fa6ff; font-weight:800; font-size:14px; }
  /* espaço para o timer absoluto */
  .produto { padding-right: 110px; }
  .produto .timer { position: absolute; top: 12px; right: 14px; color: #2dd67a; font-weight:700; font-family: 'Courier New', monospace; font-size:13px; text-shadow: 0 1px 0 rgba(0,0,0,0.4); }
  `;

  const s = document.createElement('style');
  s.id = id;
  s.textContent = css;
  document.head.appendChild(s);
}
function renderProdutosComprados(compras) {
  // garante que o CSS embutido esteja presente
  ensureProductCardStyles();

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

      // ===== cálculos/fallbacks para Taxa / Renda diária / Renda total / Expiração
      // 1) taxaPercent: usa produto.taxa se existir, senão tenta derivar de produto.comissao/preco, senão 10% fallback
      const precoNum = Number(produto.preco || 0);
      const comissaoProduto = (produto.comissao !== undefined && produto.comissao !== null) ? Number(produto.comissao) : null;

      const taxaRaw = (produto.taxa !== undefined && produto.taxa !== null)
        ? Number(produto.taxa)
        : (comissaoProduto ? (comissaoProduto / (precoNum || 1)) * 100 : 10);
      const taxaLabel = (Math.abs(taxaRaw - Math.round(taxaRaw)) < 0.01)
        ? `${Math.round(taxaRaw)}%`
        : `${taxaRaw.toFixed(2)}%`;

      // renda diária em Kz: prioriza produto.comissao (se for valor diário), senão calcula por  taxa% do preço
      const rendaDiariaNum = (comissaoProduto !== null) ? comissaoProduto : (precoNum * (taxaRaw / 100));
      const rendaTotalNum = rendaDiariaNum * 60; // Renda diária × 60 dias

      // data de expiração: usa item.expiraEm / item.expiraAt quando existir; caso contrário fallback = compradoEm + 60 dias
      const expiraEm = item.expiraEm || item.expiraAt || item.expiresAt || (compradoEm + (60 * DAY_MS));

      // ===== template HTML (rótulo branco / valor azul, lado a lado; renda total à direita)
      const card = document.createElement("div");
      card.className = "produto";
      card.innerHTML = `
        <div class="produto-head"><strong>${produto.nome}</strong></div>

        <div class="produto-info-grid">
          <div class="prod-left">
            <div class="row"><span class="label">Preço</span><span class="value">${formatKz(precoNum)}</span></div>
            <div class="row"><span class="label">Taxa de retorno</span><span class="value">${taxaLabel}</span></div>
            <div class="row"><span class="label">Renda diária</span><span class="value">${formatKz(rendaDiariaNum)}</span></div>
            <div class="row"><span class="label">Tempo de compra</span><span class="value">${formatDate(compradoEm)}</span></div>
            <div class="row"><span class="label">Data de expiração</span><span class="value">${formatDate(expiraEm)}</span></div>
          </div>

          <div class="prod-right">
            <div class="small">Renda total</div>
            <div class="big">${formatKz(rendaTotalNum)}</div>
          </div>
        </div>

        <p class="timer" data-prod="${prodId}" data-item="${itemId}" data-lastpay="${lastPayAt}" data-comissao="${item.comissao}">
          00:00:00
        </p>
      `;
      container.appendChild(card);
    });
  });

  // atualiza o total de comissão na interface (mantendo o comportamento anterior)
  const totalComissaoEl = document.getElementById("total-comissao");
  if (totalComissaoEl) totalComissaoEl.textContent = formatKz(totalComissaoGerada);

  // esconde skeleton e inicia timers (mesma lógica anterior)
  showSkeleton(false);
  startTimers();
}

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
