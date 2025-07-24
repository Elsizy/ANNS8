// login.js
import { auth, db } from "./firebase-config.js";
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  child
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("loginBtn");
  if (!btn) {
    console.error("loginBtn não encontrado no DOM.");
    return;
  }

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    console.warn("Não foi possível configurar persistência LOCAL:", e);
  }

  btn.addEventListener("click", login);
  // fallback para testes no console
  window.login = login;
});

async function login() {
  const email = document.getElementById("email")?.value.trim();
  const senha = document.getElementById("senha")?.value.trim();

  if (!email || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    console.log("Tentando autenticar:", email);
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;
    console.log("Autenticado. UID:", user.uid);

    const snapshot = await get(child(ref(db), `usuarios/${user.uid}`));
    console.log("Snapshot existe?", snapshot.exists());

    if (snapshot.exists()) {
      alert("Login feito com sucesso!");
      window.location.href = "home.html"; // <<< ALTERADO AQUI
    } else {
      alert("Usuário não encontrado no banco de dados.");
    }
  } catch (error) {
    console.error("LOGIN ERROR =>", error.code, error.message);
    alert("Erro ao fazer login: " + error.message);
  }
}
