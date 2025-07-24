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

const HOME_PAGE = "home.html"; // <- troque para "pagina-principal.html" se for o seu caso
const REDIRECIONAR_MESMO_SE_NAO_EXISTIR_NO_DB = true; // fallback

document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("loginBtn");
  if (!btn) {
    console.error("loginBtn não encontrado no DOM.");
    return;
  }

  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log("[login] Persistência LOCAL configurada.");
  } catch (e) {
    console.warn("[login] Não foi possível configurar persistência LOCAL:", e);
  }

  btn.addEventListener("click", login);

  // fallback para você poder chamar manualmente no console
  window.login = login;
});

async function login() {
  const email = document.getElementById("email")?.value.trim();
  const senha = document.getElementById("senha")?.value.trim();

  console.log("[login] Clique no botão. Email digitado:", email);

  if (!email || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;
    console.log("[login] Autenticado com sucesso. UID:", user.uid);

    const path = `usuarios/${user.uid}`;
    const snapshot = await get(child(ref(db), path));
    console.log("[login] Buscando no RTDB em:", path, "exists?", snapshot.exists());

    if (snapshot.exists()) {
      alert("Login feito com sucesso!");
      window.location.href = HOME_PAGE;
    } else {
      const msg = "Usuário autenticado, mas não encontrado no banco de dados.";
      console.warn("[login]", msg);

      if (REDIRECIONAR_MESMO_SE_NAO_EXISTIR_NO_DB) {
        alert(msg + "\nVocê será redirecionado mesmo assim.");
        window.location.href = HOME_PAGE;
      } else {
        alert(msg);
      }
    }
  } catch (error) {
    console.error("[login] ERROR =>", error.code, error.message);
    alert("Erro ao fazer login: " + error.message);
  }
}
