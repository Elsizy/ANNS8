import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Função de login
async function login() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  if (!email || !senha) {
    alert("Preencha todos os campos");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    alert("Login realizado com sucesso!");
    window.location.href = "pagina-principal.html";
  } catch (error) {
    console.error(error);
    alert("Erro ao fazer login: " + error.message);
  }
}

// ✅ Associar evento ao botão de forma segura (boa prática em módulo)
document.getElementById("loginBtn").addEventListener("click", login);
