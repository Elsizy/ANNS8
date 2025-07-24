// products.js
export const PRODUTOS = [
  { id: "nex-1",  nome: "Nex 1",  preco: 5000,    comissao: 750  },
  { id: "nex-2",  nome: "Nex 2",  preco: 15000,   comissao: 2250 },
  { id: "nex-3",  nome: "Nex 3",  preco: 40000,   comissao: 6000 },
  { id: "nex-4",  nome: "Nex 4",  preco: 90000,   comissao: 13500},
  { id: "nex-5",  nome: "Nex 5",  preco: 200000,  comissao: 30000},
  { id: "nex-6",  nome: "Nex 6",  preco: 600000,  comissao: 90000},
  { id: "nex-7",  nome: "Nex 7",  preco: 1400000, comissao: 210000},
  { id: "nex-8",  nome: "Nex 8",  preco: 3200000, comissao: 480000}
];

// limites
export const MAX_COMPRAS_POR_PRODUTO = 3;

// comissões de rede (% da comissão diária do produto)
export const REF_PERC = {
  A: 0.30,
  B: 0.03,
  C: 0.01
};
