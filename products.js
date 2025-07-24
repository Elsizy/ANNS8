// produtos.js
export function renderProdutos({ saldo, userId, db, onCompraOk }) {
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

  produtos.forEach((p, index) => {
    const div = document.createElement("div");
    div.className = "produto";
    div.innerHTML = `
      <img src="https://via.placeholder.com/50x50?text=Tech" alt="Nex"/>
      <div class="produto-info">
        <p><strong>${p.nome}</strong></p>
        <p>Comissão diária: Kz ${p.comissao.toLocaleString()} (15%)</p>
        <p style="color: orange">Kz ${p.preco.toLocaleString()}</p>
      </div>
      <button class="comprar" data-i="${index}">Comprar</button>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll(".comprar").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const i = +e.currentTarget.dataset.i;
      const produto = produtos[i];

      if (saldo < produto.preco) {
        alert("Saldo insuficiente!");
        window.location.href = "deposito.html";
        return;
      }

      const ok = confirm(`Você vai usar Kz ${produto.preco.toLocaleString()} para comprar ${produto.nome}. Confirmar?`);
      if (!ok) return;

      const novoSaldo = saldo - produto.preco;

      await onCompraOk({ novoSaldo, produto });
    });
  });
}
