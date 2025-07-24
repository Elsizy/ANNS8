// login.js
import { auth } from "./firebase-config.js";
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  if (!btn) {
    alert("Erro: Botão não encontrado.");
    return;
  }

  setPersistence(auth, browserLocalPersistence).catch((e) =>
    console.warn("Persistência não aplicada:", e)
  );

  btn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();

    if (!email || !senha) {
      alert("Preencha todos os campos!");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      alert("Login feito com sucesso!");
      console.log("Usuário logado:", userCredential.user);
      window.location.href = "home.html"; // Troque para pagina-principal.html se for o seu arquivo
    } catch (err) {
      console.error("Erro de login:", err);
      alert("Erro ao fazer login: " + err.message);
    }
  });
});
