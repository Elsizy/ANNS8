
function fazerLogin() {
  const numero = document.getElementById('numero').value;
  const senha = document.getElementById('senha').value;

  if (!numero || !senha) {
    alert("Preencha todos os campos");
    return;
  }

  const emailFake = numero + "@anns8.com"; // login por número (simulação)

  firebase.auth().signInWithEmailAndPassword(emailFake, senha)
    .then((userCredential) => {
      // Login bem-sucedido
      alert("Login realizado com sucesso!");
      window.location.href = "pagina-principal.html"; // Redirecionar para a página principal
    })
    .catch((error) => {
      console.error(error);
      alert("Número ou senha incorretos");
    });
}
