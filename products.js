// products.js
export const PRODUTOS = [
  { id: "nex-1",  
   nome: "BetterHash",  
   preco: 6500,    
   duracao: 90,
   percentage: 0.08,
   get comissao() {
    return this.preco * this.percentage;
   }, 
   imagem:"bot1.png" 
  },
  
  { id: "nex-2",  
   nome: "Kryptex",  
   preco: 12750,   
   duracao: 90,
   percentage: 0.08,
   get comissao() {
    return this.preco * this.percentage;
   }, 
   imagem:"bot2.png"
  },
  { id: "nex-3",  
   nome: "NiceHash",  
   preco: 34000,    
   duracao: 90,
   percentage: 0.09,
   get comissao() {
   return this.preco * this.percentage;
   }, 
   imagem:"bot3.png"
  },
  { id: "nex-4",  
   nome: "XMRig",  
   preco: 56850,   
   duracao: 90,
   percentage: 0.095,
   get comissao() {
   return this.preco * this.percentage;
  }, 
   imagem:"bot4.png"
  },
  { id: "nex-5",  
   nome: "AutoHash",  
   preco: 118800,  
   duracao: 90,
   percentage: 0.095,
   get comissao() {
   return this.preco * this.percentage;
      }, 
   imagem:"bot5.png"
  },
  { id: "nex-6",  
   nome: "BinancePool",  
   preco: 324000,  
   duracao: 60,
   percentage: 0.098,
   get comissao() {
   return this.preco * this.percentage;
    }, 
   imagem:"bot6.png"
  },
  { id: "nex-7",  
   nome: "Minerstat BTC", 
   preco: 816500,  
   duracao: 60,
   percentage: 0.098,
   get comissao() {
   return this.preco * this.percentage;
  }, 
   imagem:"bot7.png"
  },
  { id: "nex-8",  
   nome: "Antminer S21",  
   preco: 1899000, 
   duracao: 60, 
   percentage: 0.10,
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
