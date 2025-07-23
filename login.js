import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
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
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;
    
    // Verificar se o usuário existe no Realtime Database
    const db = getDatabase();
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `usuarios/${user.uid}`));

    if (snapshot.exists()) {
      // Usuário encontrado na base de dados
      window.location.href = "pagina-principal.html";
    } else {
      alert("Usuário não registrado no banco de dados.");
    }
  } catch (error) {
    console.error(error);
    alert("Erro ao fazer login: " + error.message);
  }
}
