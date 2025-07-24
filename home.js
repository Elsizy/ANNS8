// home.js
import { auth, db, ref, get, update } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { PRODUTOS } from "./products.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;
  const userRef = ref(db, `usuarios/${uid}`);
  const snapshot = await get(userRef);
  if (!snapshot.exists()) return;

  const data = snapshot.val();

  document.getElementById("saldo").textContent = "Kz" + (data.saldo || 0).toFixed(2);
  document.getElementById("nex-nome").textContent = data.produto || "Nenhum produto";
  document.getElementById("nex-valor").textContent = "Kz" + (data.investimento || 0).toFixed(2);
  document.getElementById("comissao").textContent = "Kz" + (data.comissao || 0).toFixed(2);

  renderProdutos(data.saldo || 0, uid);
});

function renderProdutos(saldo, uid) {
  const container = document.getElementById("produtos-container");
  container.innerHTML = "";

  PRODUTOS.forEach((p, i) => {
    const div = document.createElement("div");
    div.classList.add("produto");
    div.innerHTML = `
      <h3>${p.nome}</h3>
      <p>Comissão diária: Kz ${p.comissao.toLocaleString()} (15%)</p>
      <p style="color: orange;">Kz ${p.preco.toLocaleString()}</p>
      <button class="comprar-btn" data-index="${i}">Comprar</button>
    `;
    container.appendChild(div);
  });

  document.querySelectorAll(".comprar-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const index = parseInt(e.target.getAttribute("data-index"));
      const produto = PRODUTOS[index];

      if (saldo < produto.preco) {
        alert("Saldo insuficiente para esta compra.");
        window.location.href = "deposito.html";
        return;
      }

      const ok = confirm(`Vai usar Kz ${produto.preco.toLocaleString()} para comprar ${produto.nome}. Confirmar?`);
      if (!ok) return;

      try {
        await update(ref(db, `usuarios/${uid}`), {
          saldo: saldo - produto.preco,
          produto: produto.nome,
          investimento: produto.preco,
          comissao: produto.comissao,
          tempoCompra: Date.now()
        });
        alert("Produto comprado com sucesso!");
        window.location.reload();
      } catch (err) {
        console.error("Erro ao comprar produto:", err);
        alert("Erro ao comprar produto.");
      }
    });
  });
                 }
