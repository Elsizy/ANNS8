export function renderProdutos(saldo, userId, db, produtos) {
  const container = document.getElementById("produtos-container");
  container.innerHTML = ""; // Limpa antes de renderizar

  produtos.forEach(prod => {
    const div = document.createElement("div");
    div.className = "produto";
    div.innerHTML = `
      <img src="https://via.placeholder.com/50x50?text=Tech" alt="Nex"/>
      <div class="produto-info">
        <p><strong>${prod.nome}</strong></p>
        <p>Comissão diária: Kz${prod.comissao} (15%)</p>
        <p style="color: orange">Kz${prod.preco}</p>
      </div>
      <button class="comprar">Comprar</button>
    `;

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
        window.location.href = "deposito.html";
      }
    });

    container.appendChild(div);
  });
}
