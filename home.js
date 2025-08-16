// home.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  update,
  push,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { PRODUTOS, MAX_COMPRAS_POR_PRODUTO } from "./products.js";



// --- Modal de SUCESSO de compra (injetado via JS) ---
const PURCHASE_SUCCESS_DELAY_MS = 3000; // << ajuste aqui o tempo antes de recarregar (ms)

function ensureBuySuccessModal() {
  if (document.getElementById("buy-success-overlay")) return;

  const style = document.createElement("style");
  style.id = "buy-success-style";
  style.textContent = `
    .buy-overlay{position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.6); z-index:9999}
    .buy-card{background:#fff; border-radius:14px; padding:24px 20px; max-width:360px; width:92%; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,.18)}
    .buy-title{font-size:18px; margin:8px 0 6px; color:#111}
    .buy-desc{font-size:14px; color:#555; margin:0 0 4px}
    .buy-hint{font-size:12px; color:#777}
    .buy-icon{width:44px; height:44px}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "buy-success-overlay";
  overlay.className = "buy-overlay";
  overlay.innerHTML = `
    <div class="buy-card" role="dialog" aria-modal="true" aria-labelledby="buy-title" tabindex="-1">
      <svg class="buy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:#2ecc71">
        <path d="M20 6L9 17l-5-5"/>
        <circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle>
      </svg>
      <h3 id="buy-title" class="buy-title">Compra concluída</h3>
      <p id="buy-desc" class="buy-desc"></p>
      <p class="buy-hint">A página será atualizada automaticamente…</p>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showBuySuccessModal({ productName, price }) {
  ensureBuySuccessModal();
  const ov = document.getElementById("buy-success-overlay");
  const desc = document.getElementById("buy-desc");
  if (desc) desc.innerHTML = `Você adquiriu <strong>${productName}</strong> por <strong>${formatKz(price)}</strong>.`;
  ov.style.display = "flex";
  ov.querySelector(".buy-card")?.focus?.();
}

function hideBuySuccessModal() {
  const ov = document.getElementById("buy-success-overlay");
  if (ov) ov.style.display = "none";
}

// --- Modal de CONFIRMAÇÃO de compra (injetado via JS) ---
function ensureBuyConfirmModal() {
  if (document.getElementById("buy-confirm-overlay")) return;

  const style = document.createElement("style");
  style.id = "buy-confirm-style";
  style.textContent = `
    .buy-overlay{position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.6); z-index:9999}
    .buy-confirm-card{background:#fff; border-radius:14px; padding:22px 18px; max-width:380px; width:92%; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,.18)}
    .buy-title{font-size:18px; margin:6px 0 4px; color:#111}
    .buy-desc{font-size:14px; color:#555; margin:0}
    .buy-actions{display:flex; gap:10px; margin-top:16px}
    .buy-btn{flex:1; border:0; border-radius:10px; padding:10px 14px; font-weight:600; cursor:pointer}
    .buy-btn-cancel{background:#f2f3f5; color:#333}
    .buy-btn-ok{background:#6f66ff; color:#fff}
    .buy-btn:focus{outline:2px solid rgba(111,102,255,.35); outline-offset:2px}
    .buy-icon{width:40px; height:40px; color:#6f66ff}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "buy-confirm-overlay";
  overlay.className = "buy-overlay";
  overlay.innerHTML = `
    <div class="buy-confirm-card" role="dialog" aria-modal="true" aria-labelledby="buy-confirm-title" tabindex="-1">
      <svg class="buy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle>
        <path d="M12 8v5"></path><circle cx="12" cy="16" r="1"></circle>
      </svg>
      <h3 id="buy-confirm-title" class="buy-title">Confirmar compra</h3>
      <p id="buy-confirm-desc" class="buy-desc"></p>
      <div class="buy-actions">
        <button id="buy-confirm-cancel" class="buy-btn buy-btn-cancel" type="button">Cancelar</button>
        <button id="buy-confirm-ok" class="buy-btn buy-btn-ok" type="button">Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function confirmPurchaseUI({ productName, price }) {
  ensureBuyConfirmModal();

  const ov = document.getElementById("buy-confirm-overlay");
  const desc = document.getElementById("buy-confirm-desc");
  const btnCancel = document.getElementById("buy-confirm-cancel");
  const btnOk = document.getElementById("buy-confirm-ok");
  const card = ov.querySelector(".buy-confirm-card");

  desc.innerHTML = `Você vai usar <strong>${formatKz(price)}</strong> para comprar <strong>${productName}</strong>. Deseja continuar?`;
  ov.style.display = "flex";
  card?.focus?.();

  return new Promise((resolve) => {
    let done = false;
    const finish = (val) => {
      if (done) return;
      done = true;
      ov.style.display = "none";
      // limpa handlers
      btnCancel.onclick = null;
      btnOk.onclick = null;
      ov.onclick = null;
      document.removeEventListener("keydown", onKey);
      resolve(val);
    };
    const onKey = (e) => {
      if (e.key === "Escape") finish(false);
      if (e.key === "Enter") finish(true);
    };

    btnCancel.onclick = () => finish(false);
    btnOk.onclick = () => finish(true);
    ov.onclick = (e) => { if (e.target === ov) finish(false); };
    document.addEventListener("keydown", onKey);
    btnOk.focus();
  });
}

const ICON_EYE = `
  <svg class="icon-eye" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
`;
const ICON_EYE_OFF = `
  <svg class="icon-eye-off" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.87 21.87 0 0 1 5.06-6.94"></path>
    <path d="M1 1l22 22"></path>
  </svg>
`;

/** 24h em ms */
const DAY_MS = 24 * 60 * 60 * 1000;
/** Percentuais de rede aplicados SOBRE O PREÇO do produto */
const REF_PERC_ON_PURCHASE = { A: 0.25, B: 0.03, C: 0.01 };

/* =========================
   CACHE (TTL = 60s)
========================= */
const CACHE_MAX_AGE = 60_000; // 60s
const CACHE_KEY_HOME = (uid) => `home_user_${uid}`;

function saveCache(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ t: Date.now(), data })
    );
  } catch (_) {}
}
function loadCache(key, maxAge = CACHE_MAX_AGE) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.t || Date.now() - obj.t > maxAge) return null;
    return obj.data;
  } catch {
    return null;
  }
}

/* ======= HELPERS para mostrar/ocultar ======= */
const MASKED_TEXT = "Kz ••••";

function setFieldValue(id, formatted) {
  const el = document.getElementById(id);
  if (!el) return;
  el.dataset.formatted = formatted; // guarda o valor real já formatado
  if (isHidden(id)) {
    el.textContent = MASKED_TEXT;
  } else {
    el.textContent = formatted;
  }
}

function toggleField(id, btn) {
  const hidden = isHidden(id);
  localStorage.setItem(`hide_${id}`, hidden ? "0" : "1");
  applyVisibility(id, btn);
}

function isHidden(id) {
  return localStorage.getItem(`hide_${id}`) === "1";
}

function applyVisibility(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const hidden = isHidden(id);
  el.textContent = hidden ? MASKED_TEXT : (el.dataset.formatted || el.textContent);
  if (btn) {
    btn.innerHTML = hidden ? ICON_EYE_OFF : ICON_EYE;
  }
}

function setupEyes() {
  document.querySelectorAll(".eye-btn").forEach(btn => {
    const targetId = btn.dataset.target;
    applyVisibility(targetId, btn);
    btn.onclick = () => toggleField(targetId, btn);
  });
}

function hideProductsSkeleton() {
  const sk = document.getElementById("produtos-skeleton");
  if (sk) sk.style.display = "none";
}

/* ========== NOVO: log de movimentos ========== */
async function pushMovement(uid, movement) {
  try {
    const mvRef = push(ref(db, `usuarios/${uid}/movimentos`));
    await update(ref(db), {
      [`usuarios/${uid}/movimentos/${mvRef.key}`]: {
        id: mvRef.key,
        ...movement
      }
    });
  } catch (e) {
    console.warn("Falha ao registrar movimento:", e);
  }
}
/* =========================================== */

/* ------------------------------------------------------------------
   1) Tenta desenhar instantaneamente a partir do cache
-------------------------------------------------------------------*/
(function renderFromCacheIfAny() {
  // Não sabemos o uid aqui ainda; então tentaremos ler o "último" cache usado.
  // Para simplificar, varremos as chaves e pegamos a mais recente home_user_*
  let newest = null;
  let newestKey = null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith("home_user_")) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = JSON.parse(raw);
      if (!obj?.t) continue;
      if (!newest || obj.t > newest.t) {
        newest = obj;
        newestKey = k;
      }
    }
  } catch (_) {}

  if (!newest || Date.now() - newest.t > CACHE_MAX_AGE) return;

  const data = newest.data;
  if (!data) return;

  // Render rápido
  setFieldValue("saldo", formatKz(data.saldo || 0));
  setFieldValue("investimento-total", formatKz(data.totalInvestido || 0));
  setFieldValue("comissao-total", formatKz(data.totalComissaoDiaria || 0));
  setupEyes();

  renderProdutos({
    uid: data.uid,
    saldo: data.saldo || 0,
    compras: data.compras || {}
  });

  hideProductsSkeleton();
})();

/* ------------------------------------------------------------------
   2) Fluxo normal com Firebase
-------------------------------------------------------------------*/
(async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    console.warn("Não foi possível configurar persistência LOCAL:", e);
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const uid = user.uid;
    const cacheKey = CACHE_KEY_HOME(uid);
    const userRef = ref(db, `usuarios/${uid}`);

    // Acredita comissões diárias pendentes antes de renderizar
    await creditDailyCommissionIfNeeded(uid);

    const snap = await get(userRef);
    if (!snap.exists()) return;
    const data = snap.val();

    // ---------------------------
    // BACKFILL de totais (NOVO)
    // ---------------------------
    const needsBackfill =
      typeof data.totalInvestido === "undefined" ||
      typeof data.totalComissaoDiaria === "undefined";

    let totalInvestido = data.totalInvestido;
    let totalComissaoDiaria = data.totalComissaoDiaria;

    if (needsBackfill) {
      totalInvestido = calcTotalInvestido(data);
      totalComissaoDiaria = calcTotalComissaoDiaria(data);
      try {
        await update(userRef, {
          totalInvestido,
          totalComissaoDiaria,
        });
      } catch (e) {
        console.warn("Falha ao fazer backfill dos totais:", e);
      }
    }

    // ====== setando valores com suporte a ocultar/mostrar ======
    setFieldValue("saldo", formatKz(data.saldo || 0));
    setFieldValue("investimento-total", formatKz(totalInvestido || 0));
    setFieldValue("comissao-total", formatKz(totalComissaoDiaria || 0));

    setupEyes();

    renderProdutos({
      uid,
      saldo: data.saldo || 0,
      compras: data.compras || {}
    });

    // cacheia para próximos loads
    saveCache(cacheKey, {
      uid,
      ...data,
      totalInvestido,
      totalComissaoDiaria
    });

    hideProductsSkeleton();
  });
})();

/**
 * Renderiza cards de produtos,
 * mostra quantas vezes o usuário já comprou cada Nex
 * e limita a 3 compras por produto.
 */
function renderProdutos({ uid, saldo, compras }) {
  const container = document.getElementById("produtos-container");
  if (!container) return;
  container.innerHTML = "";

  PRODUTOS.forEach((p) => {
    const infoCompra = compras?.[p.id];
    const count = infoCompra?.count || 0;
    const disabled = count >= MAX_COMPRAS_POR_PRODUTO;

    const div = document.createElement("div");
    div.className = "produto";
    div.innerHTML = `
      <div class="produto-info" style="text-align:left; font-size:13px; line-height:1.4;">
      <p><strong>${p.nome}</strong></p>
  <p style="margin:0; color:#fff;">Preço : <span style="color:#3da5ff;">${formatKz(p.preco)}</span></p>
  <p style="margin:0; color:#fff;">Ciclo : <span style="color:#3da5ff;">60 dias</span></p>
  <p style="margin:0; color:#fff;">Taxa de lucro : <span style="color:#3da5ff;">10%</span></p>
  <p style="margin:0; color:#fff;">Renda diária : <span style="color:#3da5ff;">${formatKz(p.preco * 0.10)}</span></p>
  <p style="margin:0; color:#fff;">Disponivel : <span style="color:#3da5ff;">9</span></p>
  
  </div>
</div>
      <button class="btn-buy" ${disabled ? "disabled" : ""} data-id="${p.id}">
        ${disabled ? "Limite atingido" : "Comprar"}
      </button>
      
    `;
    container.appendChild(div);
  });

  container.querySelectorAll(".btn-buy").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      if (btn.disabled) return;

      // 1) Identifica o produto
const productId = e.currentTarget.dataset.id;
const product = PRODUTOS.find(x => x.id === productId);
if (!product) return;

// 2) Atualiza dados do usuário do DB (evita usar 'saldo' antigo)
const uSnap = await get(ref(db, `usuarios/${uid}`));
if (!uSnap.exists()) return alert("Usuário não encontrado no DB.");

const userData = uSnap.val();
const saldoAtual = userData.saldo || 0;
const comprasAtuais = userData.compras || {};
const countAtual = comprasAtuais[productId]?.count || 0;

// 3) Regras/validações rápidas
if (countAtual >= MAX_COMPRAS_POR_PRODUTO) {
  alert("Você já atingiu o limite de 9 compras para este produto.");
  return;
}
if (saldoAtual < product.preco) {
  alert("Saldo insuficiente para esta compra, faça um deposito.");
  return;
}

// 4) Pergunta no modal ESTILIZADO (substitui o confirm nativo)
const ok = await confirmPurchaseUI({ productName: product.nome, price: product.preco });
if (!ok) return;

// 5) Só agora bloqueia o botão e mostra "Processando..."
btn.disabled = true;
btn.textContent = "Processando...";

   
      
// Mantém sua UX de reativar em 4s
setTimeout(() => {
  btn.disabled = false;
  btn.textContent = "Comprar";
}, 4000);

      try {
        // Monta a compra
        const compraRef = ref(db, `usuarios/${uid}/compras/${productId}/items`);
        const newItemRef = push(compraRef);
        const agora = Date.now();

        const updates = {};

        // saldo
        const novoSaldo = saldoAtual - product.preco;
        updates[`usuarios/${uid}/saldo`] = novoSaldo;

        // atualiza contagem do produto
        const novoCount = countAtual + 1;
        updates[`usuarios/${uid}/compras/${productId}/count`] = novoCount;
        updates[`usuarios/${uid}/compras/${productId}/items/${newItemRef.key}`] = {
          preco: product.preco,
          comissao: product.comissao,
          compradoEm: agora,
          lastPayAt: agora
        };

        // recomputa os totais
        const totalInvestido = calcTotalInvestido({
          ...userData,
          compras: {
            ...comprasAtuais,
            [productId]: {
              count: novoCount,
              items: {
                ...(comprasAtuais[productId]?.items || {}),
                [newItemRef.key]: { preco: product.preco, comissao: product.comissao }
              }
            }
          }
        });

        const totalComissaoDiaria = calcTotalComissaoDiaria({
          ...userData,
          compras: {
            ...comprasAtuais,
            [productId]: {
              count: novoCount,
              items: {
                ...(comprasAtuais[productId]?.items || {}),
                [newItemRef.key]: { preco: product.preco, comissao: product.comissao }
              }
            }
          }
        });

        updates[`usuarios/${uid}/totalInvestido`] = totalInvestido;
        updates[`usuarios/${uid}/totalComissaoDiaria`] = totalComissaoDiaria;

        // efetua o update em lote
        await update(ref(db), updates);

        // paga comissão de rede (A/B/C) no ato da compra
        await payReferralCommissions(uid, product);

        showBuySuccessModal({ productName: product.nome, price: product.preco });
        setTimeout(() => {
          window.location.href = "comprarproduto.html";
        }, PURCHASE_SUCCESS_DELAY_MS);
      } catch (err) {
        console.error("Erro ao comprar produto:", err);
        showFeedback("error", "Erro ao comprar produto.");
      }
    });
  });
}

/**
 * Se já passou 1 ou mais dias desde o último pagamento
 * de cada compra, acredita (n * comissao) no saldo do usuário.
 */
async function creditDailyCommissionIfNeeded(uid) {
  const userRef = ref(db, `usuarios/${uid}`);
  const snap = await get(userRef);
  if (!snap.exists()) return;
  const data = snap.val();

  const compras = data.compras || {};
  let saldo = data.saldo || 0;
  let anyCredit = false;

  let totalCredited = 0; // NOVO
  const updates = {};
  const now = Date.now();

  Object.entries(compras).forEach(([prodId, prodData]) => {
    if (!prodData?.items) return;

    Object.entries(prodData.items).forEach(([itemId, item]) => {
      const lastPayAt = item.lastPayAt || item.compradoEm || now;
      const diff = now - lastPayAt;

      if (diff >= DAY_MS) {
        const dias = Math.floor(diff / DAY_MS);

        const credit = (item.comissao || 0) * dias;
        if (credit > 0) {
          saldo += credit;
          totalCredited += credit; // NOVO
          anyCredit = true;

          const newLast = lastPayAt + (dias * DAY_MS);
          updates[`usuarios/${uid}/compras/${prodId}/items/${itemId}/lastPayAt`] = newLast;
        }
      }
    });
  });

  if (anyCredit) {
    updates[`usuarios/${uid}/saldo`] = saldo;
    updates[`usuarios/${uid}/lastDailyCheckAt`] = now;
    await update(ref(db), updates);

    // ===== NOVO: registrar movimento de comissão diária
    await pushMovement(uid, {
      type: "commission",
      direction: "in",
      amount: totalCredited,
      balanceAfter: saldo,
      meta: { source: "daily_commission" },
      createdAt: now
    });
  } else {
    await update(ref(db), { [`usuarios/${uid}/lastDailyCheckAt`]: now });
  }
}

/**
 * Paga comissão de rede (A/B/C) com base **no PREÇO do produto**.
 */
async function payReferralCommissions(buyerUid, product) {
  try {
    const buyerSnap = await get(ref(db, `usuarios/${buyerUid}`));
    if (!buyerSnap.exists()) return;

    const buyer = buyerSnap.val();
    const base = product.preco || 0;

    const uidA = buyer.invitedBy;
    if (!uidA) return;

    const creditA = Math.floor(base * REF_PERC_ON_PURCHASE.A);
    if (creditA > 0) {
      await addToSaldo(uidA, creditA, "A", buyerUid, product.id);
    }

    const snapA = await get(ref(db, `usuarios/${uidA}`));
    const userA = snapA.exists() ? snapA.val() : null;
    const uidB = userA?.invitedBy;
    if (uidB) {
      const creditB = Math.floor(base * REF_PERC_ON_PURCHASE.B);
      if (creditB > 0) {
        await addToSaldo(uidB, creditB, "B", buyerUid, product.id);
      }

      const snapB = await get(ref(db, `usuarios/${uidB}`));
      const userB = snapB.exists() ? snapB.val() : null;
      const uidC = userB?.invitedBy;
      if (uidC) {
        const creditC = Math.floor(base * REF_PERC_ON_PURCHASE.C);
        if (creditC > 0) {
          await addToSaldo(uidC, creditC, "C", buyerUid, product.id);
        }
      }
    }
  } catch (e) {
    console.error("Erro ao pagar comissões de rede:", e);
  }
}

async function addToSaldo(uid, amount, level, fromUid, productId) {
  const uRef = ref(db, `usuarios/${uid}`);
  const snap = await get(uRef);
  if (!snap.exists()) return;
  const saldoAtual = snap.val().saldo || 0;
  const novoSaldo = saldoAtual + amount;
  await update(uRef, { saldo: novoSaldo });

  // ===== NOVO: registrar movimento de bónus de referência
  await pushMovement(uid, {
    type: "ref_bonus",
    direction: "in",
    amount,
    balanceAfter: novoSaldo,
    meta: {
      level: level || null,
      from: fromUid || null,
      productId: productId || null
    },
    createdAt: Date.now()
  });
  await incrementRefTotal(uid, level, amount);
}

async function incrementRefTotal(uid, level, amount) {
  if (!amount) return;
  const uRef = ref(db, `usuarios/${uid}/refTotals/${level}/amount`);
  const snap = await get(uRef);
  const prev = snap.exists() ? snap.val() : 0;
  const novo = prev + amount;
  await update(ref(db, `usuarios/${uid}/refTotals`), {
    [`${level}/amount`]: novo
  });
}

/** Helpers */
function calcTotalInvestido(userData) {
  let total = 0;
  const compras = userData.compras || {};
  Object.values(compras).forEach((prod) => {
    if (!prod?.items) return;
    Object.values(prod.items).forEach((item) => {
      total += item.preco || 0;
    });
  });
  return total;
}

function calcTotalComissaoDiaria(userData) {
  let total = 0;
  const compras = userData.compras || {};
  Object.values(compras).forEach((prod) => {
    if (!prod?.items) return;
    Object.values(prod.items).forEach((item) => {
      total += item.comissao || 0;
    });
  });
  return total;
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
    }
