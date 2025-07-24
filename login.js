// js/login.js
import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  child
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const db = getDatabase();

// garante que o botão existe antes de associar o evento
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  if (!btn) {
    console.error("loginBtn não encontrado no DOM.");
    return;
  }
  btn.addEventListener("click", login);
});

async function login() {
  const email = document.getElementById("email")?.value.trim();
  const senha = document.getElementById("senha")?.value.trim();

  console.log("Clique no login…");
  console.log("Email:", email);

  if (!email || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    console.log("Auth OK:", userCredential.user.uid);

    const user = userCredential.user;
    const snapshot = await get(child(ref(db), `usuarios/${user.uid}`));
    console.log("DB snapshot exists?", snapshot.exists());

    if (snapshot.exists()) {
      console.log("Redirecionando…");
      window.location.href = "pagina-principal.html";
    } else {
      alert("Usuário não encontrado no banco de dados.");
    }
  } catch (error) {
    console.error("LOGIN ERROR =>", error.code, error.message);
    alert("Erro ao fazer login: " + error.message);
  }
}
