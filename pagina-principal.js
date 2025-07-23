import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const auth = getAuth();
const db = getDatabase();

onAuthStateChanged(auth, (user) => {
  if (user) {
    const userId = user.uid;
    const userRef = ref(db, 'usuarios/' + userId);

    get(userRef).then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        document.getElementById("saldo").textContent = "Kz " + data.saldo.toFixed(2);
        document.getElementById("nex-nome").textContent = data.produto || "Nenhum produto";
        document.getElementById("nex-valor").textContent = "Kz " + (data.investimento || 0).toFixed(2);
        document.getElementById("comissao").textContent = "Kz " + (data.comissao || 0).toFixed(2);
        renderProdutos(data.saldo, userId);
      }
    });
  } else {
    // Sem sessão ativa, redireciona para o login
    window.location.href = "login.html";
  }
});

// Função para renderizar os produtos
function renderProdutos(saldo, userId) {
  const produtos = [
    { nome: "Nex 1", preco: 5000, comissao: 750 },
    { nome: "Nex 2", preco: 15000, comissao: 2250 },
    { nome: "Nex 3", preco: 40000, comissao: 6000 },
    { nome: "Nex 4", preco: 90000, comissao: 13500 },
    { nome: "Nex 5", preco: 200000, comissao: 30000 },
    { nome: "Nex 6", preco: 600000, comissao: 90000 },
    { nome: "Nex 7", preco: 1400000, comissao: 210000 },
    { nome: "Nex 8", preco: 3200000, comissao: 480000 },
  ];

  const container = document.getElementById("produtos-container");
  container.innerHTML = "";

  produtos.forEach((produto, index) => {
    const div = document.createElement("div");
    div.classList.add("produto");
    div.innerHTML = `
      <h3>${produto.nome}</h3>
      <p>Comissão diária: Kz ${produto.comissao.toLocaleString()}</p>
      <p>Preço: Kz ${produto.preco.toLocaleString()}</p>
      <button class="comprar-btn" data-index="${index}">Comprar</button>
    `;
    container.appendChild(div);
  });

  // Evento de compra
  const botoes = document.querySelectorAll(".comprar-btn");
  botoes.forEach(btn => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.getAttribute("data-index"));
      const produtoSelecionado = produtos[i];

      if (saldo >= produtoSelecionado.preco) {
        const confirmacao = confirm(`Você vai usar Kz ${produtoSelecionado.preco.toLocaleString()} para comprar o ${produtoSelecionado.nome}. Confirmar?`);
        if (!confirmacao) return;

        const novoSaldo = saldo - produtoSelecionado.preco;
        const updates = {
          saldo: novoSaldo,
          produto: produtoSelecionado.nome,
          investimento: produtoSelecionado.preco,
          comissao: produtoSelecionado.comissao,
          tempoCompra: Date.now()
        };

        const userRef = ref(db, 'usuarios/' + userId);
        update(userRef, updates)
          .then(() => {
            alert("Produto comprado com sucesso!");
            window.location.reload();
          })
          .catch(error => {
            console.error("Erro ao comprar produto:", error);
          });
      } else {
        alert("Saldo insuficiente para esta compra.");
      }
    });
  });
      }
