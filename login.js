// login.js
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  child
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  if (btn) btn.addEventListener("click", login);

  // Se já está logado, manda para a página principal
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = "pagina-principal.html";
  });
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
    const user = cred.user;

    const snap = await get(child(ref(db), `usuarios/${user.uid}`));
    if (snap.exists()) {
      alert("Login feito com sucesso!");
      window.location.href = "pagina-principal.html";
    } else {
      alert("Usuário não encontrado no banco de dados.");
    }
  } catch (err) {
    console.error("LOGIN ERROR =>", err);
    alert("Erro ao fazer login: " + err.message);
  }
}
