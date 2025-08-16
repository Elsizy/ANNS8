// login.js — corrigido (apenas 1 DOMContentLoaded)
import { auth, db } from "./firebase-config.js";
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  reload,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


const feedbackModal = document.getElementById("feedback-modal");
const feedbackText  = document.getElementById("feedback-text");
const feedbackClose = document.getElementById("feedback-close");


// Modal de feedback (success | error)
let feedbackTimer = null;

function showFeedback(type, message, { autoclose = 2000 } = {}) {
  if (!feedbackModal) return alert(message); // fallback
  // limpa estado
  feedbackModal.classList.remove("success","error","hidden","show");
  // aplica tipo + mensagem
  feedbackModal.classList.add(type); // "success" ou "error"
  feedbackText.textContent = message;

  // mostra
  requestAnimationFrame(() => feedbackModal.classList.add("show"));

  // foco e acessibilidade
  feedbackClose?.focus();

  // autoclose
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (autoclose) {
    feedbackTimer = setTimeout(hideFeedback, autoclose);
  }
}
function hideFeedback() {
  if (!feedbackModal) return;
  feedbackModal.classList.remove("show");
  // opcional: esconder totalmente após a animação
  setTimeout(() => feedbackModal.classList.add("hidden"), 180);
  if (feedbackTimer) { clearTimeout(feedbackTimer); feedbackTimer = null; }
}
// interações
feedbackClose?.addEventListener("click", hideFeedback);
feedbackModal?.addEventListener("click", (e) => { if (e.target === feedbackModal) hideFeedback(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") hideFeedback(); });
// Modal de feedback (success | error)
let feedbackTimer = null;

function showFeedback(type, message, { autoclose = 3000 } = {}) {
  if (!feedbackModal) return alert(message); // fallback
  // limpa estado
  feedbackModal.classList.remove("success","error","hidden","show");
  // aplica tipo + mensagem
  feedbackModal.classList.add(type); // "success" ou "error"
  feedbackText.textContent = message;

  // mostra
  requestAnimationFrame(() => feedbackModal.classList.add("show"));

  // foco e acessibilidade
  feedbackClose?.focus();

  // autoclose
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (autoclose) {
    feedbackTimer = setTimeout(hideFeedback, autoclose);
  }
}
function hideFeedback() {
  if (!feedbackModal) return;
  feedbackModal.classList.remove("show");
  // opcional: esconder totalmente após a animação
  setTimeout(() => feedbackModal.classList.add("hidden"), 180);
  if (feedbackTimer) { clearTimeout(feedbackTimer); feedbackTimer = null; }
}
// interações
feedbackClose?.addEventListener("click", hideFeedback);
feedbackModal?.addEventListener("click", (e) => { if (e.target === feedbackModal) hideFeedback(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") hideFeedback(); });


/* ========= Modal de sucesso ========= */
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

/* ========= Helpers admin ========= */
async function isAdminViaClaims(user, { forceRefresh = false } = {}) {
  try {
    const token = await user.getIdTokenResult(forceRefresh);
    return !!token.claims?.admin;
  } catch (e) {
    console.warn("[LOGIN] Falha ao ler claims:", e);
    return false;
  }
}
async function isAdminFallbackRTDB(uid) {
  try {
    const [roleSnap, flagSnap] = await Promise.all([
      get(ref(db, `usuarios/${uid}/role`)),
      get(ref(db, `admin/${uid}`)),
    ]);
    const role = roleSnap.exists() ? roleSnap.val() : null;
    const flag = flagSnap.exists() ? flagSnap.val() : null;
    return role === "admin" || flag === true;
  } catch (e) {
    console.warn("[LOGIN] Falha no fallback RTDB:", e);
    return false;
  }
}
async function isAdmin(user) {
  if (!user) return false;
  const hasClaim = await isAdminViaClaims(user, { forceRefresh: true });
  if (hasClaim) return true;
  return await isAdminFallbackRTDB(user.uid);
}

/* ========= Main ========= */
document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("loginBtn");
  if (!btn) {
    showFeedback("error", "Erro: Botão não encontrado.");
    return;
  }

  // 1) persistência
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    console.warn("Persistência não aplicada:", e);
  }

  // 2) detectar logout e silenciar auto-redirect
  const params = new URLSearchParams(location.search);
  const cameFromLogout =
    params.get("logout") === "1" ||
    sessionStorage.getItem("forceFreshLogin") === "1";

  if (cameFromLogout) {
    sessionStorage.removeItem("forceFreshLogin");
    try { await auth.signOut(); } catch (_) {}
    // limpa ?logout=1 da URL para não “preso” no estado
    try { history.replaceState(null, "", location.pathname); } catch (_) {}
  }

  // 3) auto-redirect apenas se não viemos do logout
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    if (cameFromLogout) return;
    try {
      const admin = await isAdmin(user);
      window.location.replace(admin ? "admin.html" : "home.html");
    } catch (e) {
      console.warn("Falha ao decidir redirect do usuário logado:", e);
      window.location.replace("home.html");
    }
  });

  // 4) clique no botão (login manual)
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();

    if (!email || !senha) {
      showFeedback("error", "Preencha todos os campos!");
      return;
    }

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, senha);
      try { await reload(user); } catch (_) {}
      const admin = await isAdmin(user);
      showLoginSuccessModal();
      setTimeout(() => {
        window.location.replace(admin ? "admin.html" : "home.html");
      }, 4000);
    } catch (err) {
      console.error("Erro de login:", err);
      showFeedback("error", "Erro ao fazer login: " + (err?.message || err));
    }
  });

  // 5) Enter para submeter
  document.getElementById("senha")?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") btn.click();
  });
});
