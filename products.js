// products.js
export const PRODUTOS = [
  { id: "nex-1",  
   nome: "TANK 1",  
   preco: 5000,    
   comissao: 600,
   imagem:"images/bot1.png"
  },
  { id: "nex-2",  
   nome: "TANK 2",  
   preco: 12000,   
   comissao: 1440, 
   imagem:"images/bot2.png"
  },
  { id: "nex-3",  
   nome: "TANK 3",  
   preco: 32000,   
   comissao: 3440, 
   imagem:"images/bot3.png"
  },
  { id: "nex-4",  
   nome: "TANK 4",  
   preco: 53000,   
   comissao: 6360, 
   imagem:"images/bot4.png"
  },
  { id: "nex-5",  
   nome: "TANK 5",  
   preco: 112000,  
   comissao: 14400, 
   imagem:"images/bot5.png"
  },
  { id: "nex-6",  
   nome: "TANK 6",  
   preco: 300000,  
   comissao: 36000, 
   imagem:"images/bot6.png"
  },
  { id: "nex-7",  
   nome: "TANK 7", 
   preco: 750000, 
   comissao: 90000, 
   imagem:"images/bot7.png"
  },
  { id: "nex-8",  
   nome: "TANK 8",  
   preco: 1650000, 
   comissao: 198000,
   imagem:"images/bot8.png"
  }
];

// limites
export const MAX_COMPRAS_POR_PRODUTO = 6;

// comissões de rede (% da comissão diária do produto)
export const REF_PERC = {
  A: 0.25,
  B: 0.03,
  C: 0.01
};
