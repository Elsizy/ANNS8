import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
  databaseURL: "SUA_DB_URL"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const produtos = [
  { nome: "Nex-1", preco: 5000, comissao: 750 },
  { nome: "Nex-2", preco: 15000, comissao: 2250 },
  { nome: "Nex-3", preco: 40000, comissao: 6000 },
  { nome: "Nex-4", preco: 90000, comissao: 13500 },
  { nome: "Nex-5", preco: 200000, comissao: 30000 },
  { nome: "Nex-6", preco: 600000, comissao: 90000 },
  { nome: "Nex-7", preco: 1400000, comissao: 210000 },
  { nome: "Nex-8", preco: 3200000, comissao: 480000 }
];

const userId = "usuario1";

function renderProdutos(saldo) {
  const container = document.getElementById("produtos-container");
  produtos.forEach(prod => {
    const div = document.createElement("div");
    div.className = "produto";
    div.innerHTML = \`
      <img src="https://via.placeholder.com/50x50?text=Tech" alt="Nex"/>
      <div class="produto-info">
        <p><strong>\${prod.nome}</strong></p>
        <p>Comissão diária: Kz\${prod.comissao} (15%)</p>
        <p style="color: orange">Kz\${prod.preco}</p>
      </div>
      <button class="comprar">Comprar</button>
    \`;

    const btn = div.querySelector(".comprar");
    btn.addEventListener("click", () => {
      if (saldo >= prod.preco) {
        update(ref(db, 'usuarios/' + userId), {
          saldo: saldo - prod.preco,
          produto: prod.nome,
          comissao: prod.comissao,
          investimento: prod.preco
        }).then(() => {
          alert("Produto comprado com sucesso!");
          location.reload();
        });
      } else {
        alert("Saldo insuficiente!");
        location.href = "deposito.html";
      }
    });

    container.appendChild(div);
  });
}

get(ref(db, 'usuarios/' + userId)).then(snapshot => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    document.getElementById("saldo").textContent = "Kz" + data.saldo.toFixed(2);
    document.getElementById("nex-nome").textContent = data.produto || "Nenhum produto";
    document.getElementById("nex-valor").textContent = "Kz" + (data.investimento || 0).toFixed(2);
    document.getElementById("comissao").textContent = "Kz" + (data.comissao || 0).toFixed(2);
    renderProdutos(data.saldo);
  }
});
