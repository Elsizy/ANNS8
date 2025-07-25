// comprarproduto.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { PRODUTOS } from "./products.js";

const DAY_MS = 24 * 60 * 60 * 1000; // 24h

/* ===== CACHE ===== */
const CACHE_MAX_AGE = 60_000;
const CACHE_KEY = (uid) => `compras_user_${uid}`;

function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), data }));
  } catch (_) {}
}
function loadCache(key, maxAge = CACHE_MAX_AGE) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj?.t || Date.now() - obj.t > maxAge) return null;
    return obj.data;
  } catch {
    return null;
  }
}

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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;
  const key = CACHE_KEY(uid);

  // 1) tenta cache primeiro
  const cache = loadCache(key);
  if (cache) {
    document.getElementById("saldo-disponivel").textContent = formatKz(cache.saldo || 0);
    renderProdutosComprados(cache.compras || {});
    showSkeleton(false);
  } else {
    showSkeleton(true);
  }

  // 2) busca dados frescos
  const userRef = ref(db, `usuarios/${uid}`);
  const snap = await get(userRef);
  if (!snap.exists()) {
    showSkeleton(false);
    return;
  }

  const data = snap.val();
  const saldo = data.saldo || 0;
  document.getElementById("saldo-disponivel").textContent = formatKz(saldo);

  renderProdutosComprados(data.compras || {});
  saveCache(key, data);

  showSkeleton(false);
});

function renderProdutosComprados(compras) {
  const container = document.getElementById("produtos-container");
  container.innerHTML = "";

  let totalComissaoGerada = 0;

  Object.entries(compras).forEach(([prodId, prodData]) => {
    const produto = PRODUTOS.find(p => p.id === prodId);
    if (!produto) return;

    Object.values(prodData.items || {}).forEach((item) => {
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
