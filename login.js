// login.js (Firebase v8)
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  if (!btn) {
    console.error("loginBtn não encontrado no DOM.");
    return;
  }
  btn.addEventListener("click", login);
});

function login() {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!email || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  auth.signInWithEmailAndPassword(email, senha)
    .then((userCredential) => {
      const user = userCredential.user;
      db.ref("usuarios/" + user.uid).once("value")
        .then((snapshot) => {
          if (snapshot.exists()) {
            window.location.href = "pagina-principal.html";
          } else {
            alert("Usuário não encontrado no banco de dados.");
          }
        });
    })
    .catch((error) => {
      console.error("LOGIN ERROR =>", error.code, error.message);
      alert("Erro ao fazer login: " + error.message);
    });
}
