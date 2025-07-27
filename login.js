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
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("loginBtn");
  if (!btn) {
    alert("Erro: Botão não encontrado.");
    return;
  }

  // aplica o toggle de senha (NOVA LINHA)
  setupPasswordToggles();

  // Persistência local
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    console.warn("Persistência não aplicada:", e);
  }

  // Se o usuário já estiver logado, decide o redirect aqui também
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      const roleSnap = await get(ref(db, `usuarios/${user.uid}/role`));
      const role = roleSnap.exists() ? roleSnap.val() : null;
      if (role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "home.html";
      }
    } catch (e) {
      console.warn("Falha ao ler role do usuário logado:", e);
      // fallback seguro
      window.location.href = "home.html";
    }
  });

  btn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();

    if (!email || !senha) {
      alert("Preencha todos os campos!");
      return;
    }

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, senha);

      // Descobre se é admin
      let role = null;
      try {
        const roleSnap = await get(ref(db, `usuarios/${user.uid}/role`));
        role = roleSnap.exists() ? roleSnap.val() : null;
      } catch (e) {
        console.warn("Falha ao consultar role:", e);
      }

      alert("Login feito com sucesso!");
      window.location.href = role === "admin" ? "admin.html" : "home.html";
    } catch (err) {
      console.error("Erro de login:", err);
      alert("Erro ao fazer login: " + (err?.message || err));
    }
  });
});

/* ======== APENAS ADIÇÃO ======== */
function setupPasswordToggles() {
  const toggles = document.querySelectorAll(".toggle-pass[data-target]");
  if (!toggles.length) return;

  toggles.forEach((btn) => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;

    // Inicial: escondido -> sem .showing (ícone "esconder")
    btn.classList.remove("showing");

    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";

      // Visível => .showing (ícone mostrar); Escondido => remove .showing
      btn.classList.toggle("showing", !isHidden);
    });
  });
}
