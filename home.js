// login.js
import { auth, db } from "./firebase-config.js";
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  child
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const DESTINO = "home.html"; // troque para "home.html" se for o seu caso

document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("loginBtn");
  const emailEl = document.getElementById("email");
  const senhaEl = document.getElementById("senha");

  if (!btn) {
    console.error("loginBtn não encontrado no DOM.");
    return;
  }

  // Se já estiver autenticado, manda direto pra home
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = DESTINO;
    }
  });

  // Persistência LOCAL
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    console.warn("Não foi possível configurar persistência LOCAL:", e);
  }

  btn.addEventListener("click", login);

  // Enter para submeter
  [emailEl, senhaEl].forEach((el) =>
    el?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        login();
      }
    })
  );

  // fallback para debug no console
  window.login = login;
});

async function login() {
  const btn = document.getElementById("loginBtn");
  const email = document.getElementById("email")?.value.trim();
  const senha = document.getElementById("senha")?.value.trim();

  if (!email || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = "Entrando...";

    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    const snapshot = await get(child(ref(db), `usuarios/${user.uid}`));
    if (snapshot.exists()) {
      alert("Login feito com sucesso!");
      window.location.href = DESTINO;
    } else {
      alert("Usuário não encontrado no banco de dados.");
    }
  } catch (error) {
    console.error("LOGIN ERROR =>", error.code, error.message);
    alert("Erro ao fazer login: " + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
}
