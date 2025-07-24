// pagina-principal.js (Firebase v8)
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userId = user.uid;
  const userRef = db.ref("usuarios/" + userId);

  userRef.get().then((snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.val();

    document.getElementById("saldo").textContent = "Kz " + (data.saldo || 0).toFixed(2);
    document.getElementById("nex-nome").textContent = data.produto || "Nenhum produto";
    document.getElementById("nex-valor").textContent = "Kz " + (data.investimento || 0).toFixed(2);
    document.getElementById("comissao").textContent = "Kz " + (data.comissao || 0).toFixed(2);

    renderProdutos(data.saldo || 0, userId);
  });
});

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

  document.querySelectorAll(".comprar-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const i = parseInt(e.target.getAttribute("data-index"));
      const p = produtos[i];

      if (saldo < p.preco) {
        alert("Saldo insuficiente para esta compra.");
        window.location.href = "deposito.html";
        return;
      }

      const confirma = confirm(`Vai usar Kz ${p.preco.toLocaleString()} para comprar ${p.nome}. Confirmar?`);
      if (!confirma) return;

      const novoSaldo = saldo - p.preco;

      db.ref("usuarios/" + userId).update({
        saldo: novoSaldo,
        produto: p.nome,
        investimento: p.preco,
        comissao: p.comissao,
        tempoCompra: Date.now()
      })
      .then(() => {
        alert("Produto comprado com sucesso!");
        window.location.reload();
      })
      .catch((err) => {
        console.error("Erro ao comprar produto:", err);
        alert("Erro ao comprar produto.");
      });
    });
  });
        }
