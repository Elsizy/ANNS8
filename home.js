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

import { PRODUTOS, MAX_COMPRAS_POR_PRODUTO, REF_PERC } from "./products.js";

/** 24h em ms */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Percentuais de rede aplicados SOBRE O PREÇO do produto */
const REF_PERC_ON_PURCHASE = { A: 0.30, B: 0.03, C: 0.01 };

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
  if (btn) btn.textContent = hidden ? "🙈" : "👁️";
}
/* =========================================== */

/* ------------------------------------------------------------------
   Inicialização de persistência (sem await solto no topo do módulo)
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

    // aplica estado dos olhos + listeners
    document.querySelectorAll(".eye-btn").forEach(btn => {
      const targetId = btn.dataset.target;
      applyVisibility(targetId, btn);
      btn.onclick = () => toggleField(targetId, btn);
    });

    renderProdutos({
      uid,
      saldo: data.saldo || 0,
      compras: data.compras || {}
    });

    // 🔹 esconder skeleton aqui
    const sk = document.getElementById("produtos-skeleton");
    if (sk) sk.style.display = "none";
  });
})();

/**
 * Renderiza cards de produtos,
 * mostra quantas vezes o usuário já comprou cada Nex
 * e limita a 3 compras por produto.
 */
function renderProdutos({ uid, saldo, compras }) {
  const container = document.getElementById("produtos-container");
  container.innerHTML = "";

  PRODUTOS.forEach((p) => {
    const infoCompra = compras?.[p.id];
    const count = infoCompra?.count || 0;
    const disabled = count >= MAX_COMPRAS_POR_PRODUTO;

    const div = document.createElement("div");
    div.className = "produto";
    div.innerHTML = `
      <div class="produto-info">
        <p><strong>${p.nome}</strong></p>
        <p>Comissão diária: ${formatKz(p.comissao)} (15%)</p>
        <p style="color: orange">${formatKz(p.preco)}</p>
        <p class="status">Compras: ${count}/${MAX_COMPRAS_POR_PRODUTO}</p>
      </div>
      <button class="btn-buy" ${disabled ? "disabled" : ""} data-id="${p.id}">
        ${disabled ? "Limite atingido" : "Comprar"}
      </button>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll(".btn-buy").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const productId = e.currentTarget.dataset.id;
      const product = PRODUTOS.find(x => x.id === productId);
      if (!product) return;

      // Atualiza dados do usuário do DB (evita usar 'saldo' antigo)
      const uSnap = await get(ref(db, `usuarios/${uid}`));
      if (!uSnap.exists()) return alert("Usuário não encontrado no DB.");

      const userData = uSnap.val();
      const saldoAtual = userData.saldo || 0;
      const comprasAtuais = userData.compras || {};
      const countAtual = comprasAtuais[productId]?.count || 0;

      if (countAtual >= MAX_COMPRAS_POR_PRODUTO) {
        alert("Você já atingiu o limite de 3 compras para este produto.");
        return;
      }

      if (saldoAtual < product.preco) {
        alert("Saldo insuficiente para esta compra.");
        window.location.href = "deposito.html";
        return;
      }

      const ok = confirm(`Vai usar ${formatKz(product.preco)} para comprar ${product.nome}. Confirmar?`);
      if (!ok) return;

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

        alert("Produto comprado com sucesso!");
        window.location.reload();
      } catch (err) {
        console.error("Erro ao comprar produto:", err);
        alert("Erro ao comprar produto.");
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

  const updates = {};
  const now = Date.now();

  Object.entries(compras).forEach(([prodId, prodData]) => {
    if (!prodData?.items) return;

    Object.entries(prodData.items).forEach(([itemId, item]) => {
      const lastPayAt = item.lastPayAt || item.compradoEm || now;
      const diff = now - lastPayAt;

      if (diff >= DAY_MS) {
        const dias = Math.floor(diff / DAY_MS);

        // Creditar dias * comissao
        const credit = (item.comissao || 0) * dias;
        if (credit > 0) {
          saldo += credit;
          anyCredit = true;

          // atualiza lastPayAt
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
  } else {
    await update(ref(db), { [`usuarios/${uid}/lastDailyCheckAt`]: now });
  }
}

/**
 * Paga comissão de rede (A/B/C) com base **no PREÇO do produto**.
 * - A: 30%
 * - B: 3%
 * - C: 1%
 */
async function payReferralCommissions(buyerUid, product) {
  try {
    const buyerSnap = await get(ref(db, `usuarios/${buyerUid}`));
    if (!buyerSnap.exists()) return;

    const buyer = buyerSnap.val();
    const base = product.preco || 0; // <--- AGORA usamos o PREÇO

    const uidA = buyer.invitedBy;
    if (!uidA) return; // sem A, sem B, sem C

    // Nível A
    const creditA = Math.floor(base * REF_PERC_ON_PURCHASE.A);
    if (creditA > 0) {
      await addToSaldo(uidA, creditA);
      await incrementRefTotal(uidA, "A", creditA);
    }

    // Nível B
    const snapA = await get(ref(db, `usuarios/${uidA}`));
    const userA = snapA.exists() ? snapA.val() : null;
    const uidB = userA?.invitedBy;
    if (uidB) {
      const creditB = Math.floor(base * REF_PERC_ON_PURCHASE.B);
      if (creditB > 0) {
        await addToSaldo(uidB, creditB);
        await incrementRefTotal(uidB, "B", creditB);
      }

      // Nível C
      const snapB = await get(ref(db, `usuarios/${uidB}`));
      const userB = snapB.exists() ? snapB.val() : null;
      const uidC = userB?.invitedBy;
      if (uidC) {
        const creditC = Math.floor(base * REF_PERC_ON_PURCHASE.C);
        if (creditC > 0) {
          await addToSaldo(uidC, creditC);
          await incrementRefTotal(uidC, "C", creditC);
        }
      }
    }
  } catch (e) {
    console.error("Erro ao pagar comissões de rede:", e);
  }
}

async function addToSaldo(uid, amount) {
  const uRef = ref(db, `usuarios/${uid}`);
  const snap = await get(uRef);
  if (!snap.exists()) return;
  const saldoAtual = snap.val().saldo || 0;
  await update(uRef, { saldo: saldoAtual + amount });
}

/** NOVO: acumula o total ganho por nível (A/B/C) no nó refTotals */
async function incrementRefTotal(uid, level, amount) {
  if (!amount) return;
  const uRef = ref(db, `usuarios/${uid}/refTotals/${level}/amount`);
  const snap = await get(uRef);
  const prev = snap.exists() ? snap.val() : 0;
  const novo = prev + amount;
  // atualiza nesse caminho
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
    }
