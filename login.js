// login.js
import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get, child } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  if (!btn) {
    console.error("loginBtn não encontrado no DOM.");
    // alert("loginBtn não encontrado no DOM."); // descomente para testar no celular
    return;
  }
  console.log("login.js carregado. Conectando botão…");
  btn.addEventListener("click", login);

  // fallback: expõe globalmente para você poder testar no console: window.login()
  window.login = login;
});

async function login() {
  console.log("Clique no login…");
  const email = document.getElementById("email")?.value.trim();
  const senha = document.getElementById("senha")?.value.trim();
  console.log("Email digitado:", email);

  if (!email || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    console.log("Auth OK. UID:", userCredential.user.uid);

    const user = userCredential.user;
    const snapshot = await get(child(ref(db), `usuarios/${user.uid}`));
    console.log("Snapshot existe?", snapshot.exists());

    if (snapshot.exists()) {
      alert("Login feito com sucesso!");
      window.location.href = "pagina-principal.html";
    } else {
      alert("Usuário não encontrado no banco de dados.");
    }
  } catch (error) {
    console.error("LOGIN ERROR =>", error.code, error.message);
    alert("Erro ao fazer login: " + error.message);
  }
}
