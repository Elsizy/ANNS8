import { ref, get, child } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { auth, db } from './firebase-config.js'; // agora também importa `db`
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Evento de clique no botão login
document.getElementById("loginBtn").addEventListener("click", login);

async function login() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  if (!email || !senha) {
    alert("Preencha todos os campos");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `usuarios/${user.uid}`));

    if (snapshot.exists()) {
      window.location.href = "pagina-principal.html";
    } else {
      alert("Usuário não encontrado no banco de dados.");
    }
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    alert("Erro ao fazer login: " + error.message);
  }
}
