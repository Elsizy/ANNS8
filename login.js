// login.js
import { auth, db, ref, get, child } from "./firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Se já estiver logado, manda direto pra home
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "pagina-principal.html";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  if (!btn) {
    console.error("loginBtn não encontrado no DOM.");
    return;
  }
  btn.addEventListener("click", login);

  // útil para testar via console
  window.login = login;
});

async function login() {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!email || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    const uid = cred.user.uid;

    const snapshot = await get(child(ref(db), `usuarios/${uid}`));
    if (snapshot.exists()) {
      alert("Login realizado com sucesso!");
      window.location.href = "pagina-principal.html";
    } else {
      alert("Usuário não encontrado no banco de dados.");
    }
  } catch (err) {
    console.error("LOGIN ERROR =>", err.code, err.message);
    alert("Erro ao fazer login: " + err.message);
  }
}
