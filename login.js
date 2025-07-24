// login.js
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  if (btn) {
    btn.addEventListener("click", login);
  } else {
    console.error("loginBtn não encontrado!");
  }
});

function login() {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!email || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  firebase.auth().signInWithEmailAndPassword(email, senha)
    .then(userCredential => {
      const user = userCredential.user;
      return firebase.database().ref('usuarios/' + user.uid).once('value');
    })
    .then(snapshot => {
      if (snapshot.exists()) {
        alert("Login feito com sucesso!");
        window.location.href = "pagina-principal.html";
      } else {
        alert("Usuário não encontrado no banco de dados.");
      }
    })
    .catch(error => {
      alert("Erro ao fazer login: " + error.message);
      console.error(error);
    });
}
