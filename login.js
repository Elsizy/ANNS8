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

// --- Modal de sucesso para LOGIN (injetado via JS, sem alterar HTML) ---
function ensureLoginSuccessModal() {
  if (document.getElementById("login-success-overlay")) return;

  const style = document.createElement("style");
  style.id = "login-success-style";
  style.textContent = `
    .lg-overlay{position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.6); z-index:9999}
    .lg-card{background:#fff; border-radius:14px; padding:24px 20px; max-width:360px; width:92%; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,.18)}
    .lg-title{font-size:18px; margin:8px 0 6px; color:#111}
    .lg-desc{font-size:14px; color:#555; margin:0 0 4px}
    .lg-hint{font-size:12px; color:#777}
    .lg-icon{width:44px; height:44px}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "login-success-overlay";
  overlay.className = "lg-overlay";
  overlay.innerHTML = `
    <div class="lg-card" role="dialog" aria-modal="true" aria-labelledby="lg-title" tabindex="-1">
      <svg class="lg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:#2ecc71">
        <path d="M20 6L9 17l-5-5"/>
        <circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle>
      </svg>
      <h3 id="lg-title" class="lg-title">Sessão iniciada com sucesso</h3>
      <p class="lg-desc">Bem-vindo(a) de volta à <strong>AES energies</strong>.</p>
      <p class="lg-hint">Você será redirecionado automaticamente…</p>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showLoginSuccessModal() {
  ensureLoginSuccessModal();
  const ov = document.getElementById("login-success-overlay");
  ov.style.display = "flex";
  ov.querySelector(".lg-card")?.focus?.();
}

function hideLoginSuccessModal() {
  const ov = document.getElementById("login-success-overlay");
  if (ov) ov.style.display = "none";
}

document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("loginBtn");
  if (!btn) {
    alert("Erro: Botão não encontrado.");
    return;
  }

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

      showLoginSuccessModal();
      setTimeout(() => {
        window.location.href = role === "admin" ? "admin.html" : "home.html";
      }, 3000); // mesmo padrão que você usou no signup
    } catch (err) {
      console.error("Erro de login:", err);
      alert("Erro ao fazer login: " + (err?.message || err));
    }
  });
});
