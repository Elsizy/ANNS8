import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { auth } from './firebase-config.js';

const db = getDatabase();

// Ao clicar no botão "Entrar"
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!email || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // Verifica se o usuário existe no Realtime Database
    const snapshot = await get(child(ref(db), `usuarios/${user.uid}`));
    if (snapshot.exists()) {
      // Redireciona para a página principal
      window.location.href = "pagina-principal.html";
    } else {
      alert("Usuário não encontrado no banco de dados.");
    }
  } catch (error) {
    console.error(error);
    alert("Erro ao fazer login: " + error.message);
  }
});
