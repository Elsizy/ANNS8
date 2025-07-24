function comprarProduto(id) {
  const produto = produtos.find(p => p.id === id);
  if (!produto) return;

  const confirmar = confirm(`Você vai usar ${produto.preco.toLocaleString()} Kz para comprar o produto ${produto.nome}. Deseja continuar?`);
  if (confirmar) {
    // Aqui vai a lógica de compra real (verificar saldo, subtrair, atualizar banco de dados etc.)
    alert(`Produto ${produto.nome} comprado com sucesso!`);
  }
}
