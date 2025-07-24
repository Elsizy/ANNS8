// home.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  set,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { PRODUCTS } from "./products.js";

const MS_DAY = 24 * 60 * 60 * 1000;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;

  try {
    let snap = await get(ref(db, `usuarios/${uid}`));
    if (!snap.exists()) {
      // inicializa estrutura pensada para múltiplos Nex
      await set(ref(db, `usuarios/${uid}`), {
        saldo: 0,
        compras: {},                 // { "1": { id, quantidade, firstBuyAt, lastCommissionAt } ... }
        totalComissoesRecebidas: 0,
        lastSettlementAt: null       // opcional: quando fizemos o último settlement global
      });
      snap = await get(ref(db, `usuarios/${uid}`));
    }

    let data = snap.val();

    // 1) Liquidar comissões pendentes (todas as compras)
    data = await settleAllCommissions(uid, data);

    // 2) Renderizar
    renderTopCards(data);
    renderProducts(uid, data);
    wireLogout();
  } catch (err) {
    console.error("Erro ao carregar home:", err);
    alert("Erro ao carregar dados. Tente novamente.");
  }
});

/**
 * Faz o settlement de TODAS as compras do usuário (múltiplos Nex),
 * somando as comissões pendentes (por dia completo) ao saldo.
 */
async function settleAllCommissions(uid, data) {
  const compras = data.compras || {};
  if (!Object.keys(compras).length) return data;

  const now = Date.now();
  let saldo = data.saldo || 0;
  let totalRecebidas = data.totalComissoesRecebidas || 0;

  // vamos acumular os updates para dar 1 update só no final
  const updates = {};
  let houveCredito = false;

  for (const idStr of Object.keys(compras)) {
    const compra = compras[idStr]; // { id, quantidade, firstBuyAt, lastCommissionAt }
    const produto = PRODUCTS.find(p => p.id === compra.id);
    if (!produto) continue;

    const last = compra.lastCommissionAt || compra.firstBuyAt || now;
    const diffDays = Math.floor((now - last) / MS_DAY);
    if (diffDays <= 0) continue;

    const diaria = produto.comissao * compra.quantidade;
    const credit = diaria * diffDays;

    saldo += credit;
    totalRecebidas += credit;
    houveCredito = true;

    // prepara update específico desta compra
    updates[`usuarios/${uid}/compras/${idStr}/lastCommissionAt`] = last + diffDays * MS_DAY;
  }

  if (houveCredito) {
    updates[`usuarios/${uid}/saldo`] = saldo;
    updates[`usuarios/${uid}/totalComissoesRecebidas`] = totalRecebidas;
    updates[`usuarios/${uid}/lastSettlementAt`] = now;
    await update(ref(db), updates);

    // devolve data ajustada
    return {
      ...data,
      saldo,
      totalComissoesRecebidas: totalRecebidas,
      lastSettlementAt: now,
      compras: {
        ...data.compras,
        ...Object.keys(compras).reduce((acc, idStr) => {
          acc[idStr] = {
            ...compras[idStr],
            lastCommissionAt:
              updates[`usuarios/${uid}/compras/${idStr}/lastCommissionAt`] ??
              compras[idStr].lastCommissionAt
          };
          return acc;
        }, {})
      }
    };
  }

  return data;
}

// ======= Renderização dos cards superiores =======
function renderTopCards(data) {
  const saldoEl = document.getElementById("saldo");
  const invEl = document.getElementById("investimento-total");
  const comissaoTotEl = document.getElementById("comissao-total");

  const compras = data.compras || {};
  let totalInvest = 0;
  let comissaoTotal = 0;

  for (const idStr of Object.keys(compras)) {
    const c = compras[idStr];
    const p = PRODUCTS.find(x => x.id === c.id);
    if (!p) continue;
    totalInvest += p.preco * c.quantidade;
    comissaoTotal += p.comissao * c.quantidade;
  }

  saldoEl.textContent = "Kz " + (data.saldo || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
  invEl.textContent   = "Kz " + totalInvest.toLocaleString();
  comissaoTotEl.textContent = "Kz " + comissaoTotal.toLocaleString();
}

// ======= Lista de produtos =======
function renderProducts(uid, data) {
  const container = document.getElementById("produtos-container");
  container.innerHTML = "";

  const compras = data.compras || {};
  const saldo = data.saldo || 0;

  PRODUCTS.forEach((prod) => {
    const compraAtual = compras[prod.id]?.quantidade || 0; // 0..3
    const disabled = compraAtual >= 3;

    const div = document.createElement("div");
    div.className = "produto";

    const comissaoTxt = `Comissão diária: Kz ${prod.comissao.toLocaleString()} (15%)`;
    const precoTxt = `Kz ${prod.preco.toLocaleString()}`;

    let statusMsg = "";
    if (disabled) statusMsg = "Limite de 3 compras atingido para este Nex.";

    div.innerHTML = `
      <div class="produto-info">
        <p><strong>${prod.nome}</strong> ${compraAtual ? `(x${compraAtual})` : ""}</p>
        <p>${comissaoTxt}</p>
        <p style="color: orange">${precoTxt}</p>
        ${statusMsg ? `<p class="status">${statusMsg}</p>` : ""}
      </div>
      <button ${disabled ? "disabled" : ""} data-id="${prod.id}">Comprar</button>
    `;

    const btn = div.querySelector("button");
    btn.addEventListener("click", () => handleBuy(uid, data, prod, saldo, compraAtual));
    container.appendChild(div);
  });
}

// ======= Fluxo de compra =======
async function handleBuy(uid, data, produto, saldoAtual, quantidadeAtual) {
  if (quantidadeAtual >= 3) {
    alert("Você já atingiu o limite de 3 compras para este Nex.");
    return;
  }

  if (saldoAtual < produto.preco) {
    alert("Saldo insuficiente!");
    window.location.href = "deposito.html";
    return;
  }

  const ok = confirm(`Vai usar Kz ${produto.preco.toLocaleString()} para comprar ${produto.nome}. Confirmar?`);
  if (!ok) return;

  const novaQuantidade = quantidadeAtual + 1;
  const novoSaldo = saldoAtual - produto.preco;

  const compras = data.compras || {};
  const compraAnterior = compras[produto.id] || null;

  const payloadCompra = {
    id: produto.id,
    quantidade: novaQuantidade,
    firstBuyAt: compraAnterior?.firstBuyAt || Date.now(),
    lastCommissionAt: compraAnterior?.lastCommissionAt || Date.now(),
  };

  const updates = {};
  updates[`usuarios/${uid}/saldo`] = novoSaldo;
  updates[`usuarios/${uid}/compras/${produto.id}`] = payloadCompra;

  try {
    await update(ref(db), updates);
    alert("Produto comprado com sucesso!");
    window.location.reload();
  } catch (err) {
    console.error("Erro ao comprar produto:", err);
    alert("Erro ao comprar produto.");
  }
}

// ======= Logout =======
function wireLogout() {
  const btn = document.getElementById("logout");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
      }
