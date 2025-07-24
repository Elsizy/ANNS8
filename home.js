// home.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { renderProdutos } from "./produtos.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userRef = ref(db, `usuarios/${user.uid}`);
  const snap = await get(userRef);

  if (!snap.exists()) return;

  const data = snap.val();

  document.getElementById("saldo").textContent = "Kz " + (data.saldo || 0).toFixed(2);
  document.getElementById("nex-nome").textContent = data.produto || "Nenhum produto";
  document.getElementById("nex-valor").textContent = "Kz " + (data.investimento || 0).toFixed(2);
  document.getElementById("comissao").textContent = "Kz " + (data.comissao || 0).toFixed(2);

  renderProdutos({
    saldo: data.saldo || 0,
    userId: user.uid,
    db,
    onCompraOk: async ({ novoSaldo, produto }) => {
      await update(userRef, {
        saldo: novoSaldo,
        produto: produto.nome,
        investimento: produto.preco,
        comissao: produto.comissao,
        tempoCompra: Date.now()
      });
      alert("Produto comprado com sucesso!");
      window.location.reload();
    }
  });

  // Botão logout (opcional)
  const btnLogout = document.getElementById("logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });
  }
});
