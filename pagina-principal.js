import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
const auth = getAuth();

onAuthStateChanged(auth, (user) => {
  if (user) {
    const userId = user.uid;
    const userRef = ref(db, 'usuarios/' + userId);

    get(userRef).then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        document.getElementById("saldo").textContent = "Kz" + data.saldo.toFixed(2);
        document.getElementById("nex-nome").textContent = data.produto || "Nenhum produto";
        document.getElementById("nex-valor").textContent = "Kz" + (data.investimento || 0).toFixed(2);
        document.getElementById("comissao").textContent = "Kz" + (data.comissao || 0).toFixed(2);
        renderProdutos(data.saldo, userId);
      }
    });
  } else {
    // Sem sessão ativa, redireciona para o login
    window.location.href = "login.html";
  }
});
