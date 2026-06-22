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

/* =========================
   FORMAT
========================= */
function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/* =========================
   RENDER PRODUTOS
========================= */
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
      <div class="produto-info">
        <p><strong>${p.nome}</strong></p>
        <p>Preço: ${formatKz(p.preco)}</p>
        <p>Renda diária: ${formatKz(p.preco * 0.12)}</p>
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
      const product = PRODUTOS.find((x) => x.id === productId);
      if (!product) return;

      const uSnap = await get(ref(db, `usuarios/${uid}`));
      if (!uSnap.exists()) return;

      const userData = uSnap.val();

      const saldoAtual = userData.saldo || 0;
      const comprasAtuais = userData.compras || {};
      const countAtual = comprasAtuais[productId]?.count || 0;

      if (countAtual >= MAX_COMPRAS_POR_PRODUTO) return;
      if (saldoAtual < product.preco) {
        alert("Saldo insuficiente");
        return;
      }

      try {
        const compraRef = ref(db, `usuarios/${uid}/compras/${productId}/items`);
        const newItemRef = push(compraRef);
        const now = Date.now();

        const updates = {};

        updates[`usuarios/${uid}/saldo`] = saldoAtual - product.preco;

        updates[`usuarios/${uid}/compras/${productId}/count`] = countAtual + 1;

        updates[`usuarios/${uid}/compras/${productId}/items/${newItemRef.key}`] = {
          preco: product.preco,
          comissao: product.comissao,
          compradoEm: now,
          lastPayAt: now,
        };

        await update(ref(db), updates);

        alert("Compra realizada com sucesso!");
      } catch (err) {
        console.error(err);
      }
    });
  });
}

/* =========================
   INIT LOJA
========================= */
(async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {}

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

    renderProdutos({
      uid,
      saldo: data.saldo || 0,
      compras: data.compras || {},
    });
  });
})();
