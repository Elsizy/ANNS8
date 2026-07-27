// products.js
export const PRODUTOS = [
  { id: "nex-1",  
   nome: "TANK 1",  
   preco: 5000,    
   duracao: 90,
   percentage: 0.08,
   get comissao() {
    return this.preco * this.percentage;
   }, 
   imagem:"bot1.png" 
  },
  
  { id: "nex-2",  
   nome: "TANK 2",  
   preco: 12000,   
   duracao: 90,
   percentage: 0.08,
   get comissao() {
    return this.preco * this.percentage;
   }, 
   imagem:"bot2.png"
  },
  { id: "nex-3",  
   nome: "TANK 3",  
   preco: 32000,    
   duracao: 60,
   percentage: 0.10,
   get comissao() {
   return this.preco * this.percentage;
   }, 
   imagem:"bot3.png"
  },
  { id: "nex-4",  
   nome: "TANK 4",  
   preco: 53000,   
   duracao: 90,
   percentage: 0.08,
   get comissao() {
   return this.preco * this.percentage;
  }, 
   imagem:"bot4.png"
  },
  { id: "nex-5",  
   nome: "TANK 5",  
   preco: 112000,  
   duracao: 90,
   percentage: 0.08,
   get comissao() {
   return this.preco * this.percentage;
      }, 
   imagem:"bot5.png"
  },
  { id: "nex-6",  
   nome: "TANK 6",  
   preco: 300000,  
   duracao: 90,
   percentage: 0.08,
   get comissao() {
   return this.preco * this.percentage;
    }, 
   imagem:"bot6.png"
  },
  { id: "nex-7",  
   nome: "TANK 7", 
   preco: 750000,  
   duracao: 90,
   percentage: 0.08,
   get comissao() {
   return this.preco * this.percentage;
  }, 
   imagem:"bot7.png"
  },
  { id: "nex-8",  
   nome: "TANK 8",  
   preco: 1650000, 
   duracao: 90, 
   percentage: 0.08,
   get comissao() {
   return this.preco * this.percentage;
    }, 
   imagem:"bot8.png"
  }
];

// limites
export const MAX_COMPRAS_POR_PRODUTO = 6;

// comissões de rede (% da comissão diária do produto)
export const REF_PERC = {
  A: 0.15,
  B: 0.03,
  C: 0.02
};
