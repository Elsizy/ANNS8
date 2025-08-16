// signup.js (mantém lógica original + medidor de força / melhorias UX)
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  set,
  get,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* =========================
   CONFIG
========================= */
const SAVE_TIMEOUT_MS = 15000; // 15s
const LOCK_REFERRAL_IF_URL = true; // trava o input se veio via URL
const REF_CODE_LEN = 8; // tamanho do código curto

const feedbackModal = document.getElementById("feedback-modal");
const feedbackText  = document.getElementById("feedback-text");
const feedbackClose = document.getElementById("feedback-close");
/* =========================
   HELPERS
========================= */
function withTimeout(promise, ms, onTimeoutMessage = "Timeout") {
  if (!ms) return promise;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(onTimeoutMessage)), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

function disableBtn(btn, text) {
  if (!btn) return;
  btn.disabled = true;
  btn.dataset.originalText = btn.textContent;
  btn.textContent = text || "Processando…";
}
function enableBtn(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = btn.dataset.originalText || "Criar Conta";
}

function mapFirebaseError(error) {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "Este email já está em uso.";
    case "auth/invalid-email":
      return "Email inválido.";
    case "auth/weak-password":
      return "A senha é muito fraca (mínimo 6 caracteres).";
    default:
      return "Erro ao criar conta: " + (error?.message || "desconhecido");
  }
}

function getReferralFromURL() {
  const qs = new URLSearchParams(window.location.search);
  return (qs.get("ref") || qs.get("codigo") || "").trim();
}

function genRefCode(len = REF_CODE_LEN) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function createUniqueRefCode(uid) {
  let code = genRefCode();
  let exists = await get(ref(db, `codes/${code}`));
  while (exists.exists()) {
    code = genRefCode();
    exists = await get(ref(db, `codes/${code}`));
  }
  await set(ref(db, `codes/${code}`), { uid, createdAt: Date.now() });
  return code;
}

async function getNextShortId() {
  const counterRef = ref(db, "counters/shortIdNext");
  const res = await runTransaction(counterRef, (current) => {
    if (!current || current < 612334) return 612334;
    return current + 1;
  });
  return res.snapshot.val();
}

async function resolveInviterUid(refParamRaw) {
  const refParam = (refParamRaw || "").trim();
  if (!refParam) return null;

  try {
    const codeSnap = await get(ref(db, `codes/${refParam.toUpperCase()}`));
    if (codeSnap.exists() && codeSnap.val()?.uid) {
      return codeSnap.val().uid;
    }
  } catch (e) {
    console.warn("Erro lendo codes/<refCode>:", e);
  }

  try {
    const userSnap = await get(ref(db, `usuarios/${refParam}`));
    if (userSnap.exists()) return refParam;
  } catch (e) {
    console.warn("Erro validando ref como UID:", e);
  }

  return null;
}

/* =========================
   PASSWORD STRENGTH (UI helper)
========================= */
function calcPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "—" };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  let label = "Fraca";
  if (score >= 4) label = "Forte";
  else if (score >= 3) label = "Boa";
  else label = "Fraca";

  return { score, label };
}

function updatePasswordStrengthUI(pw) {
  const el = document.getElementById("password-strength");
  const fill = el?.querySelector(".bar-fill");
  const txt = document.getElementById("password-strength-text");
  if (!el || !fill || !txt) return;
  const { score, label } = calcPasswordStrength(pw);
  const pct = Math.min(100, Math.round((score / 5) * 100));
  fill.style.width = `${pct}%`;

  // color steps
  if (score >= 4) {
    fill.style.background = "linear-gradient(90deg,#2ecc71,#6f66ff)";
  } else if (score >= 3) {
    fill.style.background = "linear-gradient(90deg,#f2c94c,#6f66ff)";
  } else {
    fill.style.background = "linear-gradient(90deg,#ff6b6b,#ff9aa2)";
  }
  txt.textContent = label;
}

/* =========================
   MAIN
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("signupForm");
  if (!form) {
    console.error("[SIGNUP] Form não encontrado no DOM.");
    return;
  }

  const referralInput = document.getElementById("referral");

  const refFromURL = getReferralFromURL();
  if (refFromURL) {
    referralInput.value = refFromURL;
    if (LOCK_REFERRAL_IF_URL) referralInput.readOnly = true;
  }

  // password strength live
  const passwordInput = document.getElementById("password");
  if (passwordInput) {
    updatePasswordStrengthUI(passwordInput.value || "");
    passwordInput.addEventListener("input", (e) => updatePasswordStrengthUI(e.currentTarget.value || ""));
  }

  // inicializa o show/hide de senha
  setupPasswordToggles();

  form.addEventListener("submit", onSubmit);
});

// --- Modal de sucesso injetado via JS (sem mexer no HTML) ---
function ensureSignupSuccessModal() {
  if (document.getElementById("signup-success-overlay")) return;

  // CSS inline do modal
  const style = document.createElement("style");
  style.id = "signup-success-style";
  style.textContent = `
    .su-overlay{position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.6); z-index:9999}
    .su-card{background:#fff; border-radius:14px; padding:24px 20px; max-width:360px; width:92%; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,.18)}
    .su-title{font-size:18px; margin:8px 0 6px; color:#111}
    .su-desc{font-size:14px; color:#555; margin:0 0 18px}
    .su-btn{display:inline-flex; align-items:center; gap:8px; padding:10px 16px; border-radius:10px; border:0; cursor:pointer; font-weight:600}
    .su-btn-primary{background:#3da5ff; color:#fff}
    .su-icon{width:44px; height:44px}
  `;
  document.head.appendChild(style);

  // HTML do modal
  const overlay = document.createElement("div");
  overlay.id = "signup-success-overlay";
  overlay.className = "su-overlay";
  overlay.innerHTML = `
    <div class="su-card" role="dialog" aria-modal="true" aria-labelledby="su-title">
      <svg class="su-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:#2ecc71">
        <path d="M20 6L9 17l-5-5"/>
        <circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle>
      </svg>
      <h3 id="su-title" class="su-title">Conta criada com sucesso</h3>
      <p class="su-desc">Bem-vindo(a) à <strong>AES energies</strong>. Pode iniciar sessão para começar.</p>
      <button id="su-ok" class="su-btn su-btn-primary" type="button">Ir para o login</button> 
    </div>
  `;
  document.body.appendChild(overlay);

  // Eventos
  const ok = overlay.querySelector("#su-ok");
  ok.addEventListener("click", () => {
    hideSignupSuccessModal();
    window.location.href = "login.html";
  });

  // Fechar com Enter
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter") ok.click();
  });
}

function showSignupSuccessModal() {
  ensureSignupSuccessModal();
  const ov = document.getElementById("signup-success-overlay");
  ov.style.display = "flex";
  // foco para acessibilidade
  ov.querySelector(".su-card")?.focus?.();
}

function hideSignupSuccessModal() {
  const ov = document.getElementById("signup-success-overlay");
  if (ov) ov.style.display = "none";
                          }

async function onSubmit(e) {
  e.preventDefault();

  const form = e.currentTarget;
  const btn = form.querySelector('button[type="submit"]');

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const referralRaw = document.getElementById("referral").value.trim();
  const termsAccepted = document.getElementById("terms").checked;

  if (!termsAccepted) {
    showFeedback("error", "Você precisa aceitar os termos e condições.");
    return;
  }

  if (password !== confirmPassword) {
    alert("As senhas não coincidem.");
    return;
  }

  disableBtn(btn, "Criando conta...");

  let user;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    user = cred.user;
  } catch (err) {
    alert(mapFirebaseError(err));
    enableBtn(btn);
    return;
  }

  try {
    const inviterUid = await resolveInviterUid(referralRaw);
    const shortId = await getNextShortId();
    const refCode  = await createUniqueRefCode(user.uid);

    const payload = {
      uid: user.uid,
      shortId,
      refCode,
      invitedBy: inviterUid || null,
      referralCodeUsed: referralRaw || null,

      email,
      saldo: 0,
      totalInvestido: 0,
      totalComissaoDiaria: 0,
      lastDailyCheckAt: Date.now(),
      compras: {},
      refTotals: {
        A: { amount: 0 },
        B: { amount: 0 },
        C: { amount: 0 },
      },

      // legado
      codigoConvite: referralRaw || null,
      investimento: 0,
      comissao: 0,
      produto: null,

      criadoEm: new Date().toISOString(),
    };

    await withTimeout(
      set(ref(db, `usuarios/${user.uid}`), payload),
      SAVE_TIMEOUT_MS,
      `Timeout ao gravar no Realtime Database (${SAVE_TIMEOUT_MS / 1000}s)`
    );

    showSignupSuccessModal();
    setTimeout(() => window.location.href = "login.html", 3000);
  } catch (err) {
    console.error("[SIGNUP][DB ERROR]", err);
    alert(
      "Sua conta foi criada no Auth, mas houve um problema ao salvar seus dados.\n" +
      "Você poderá tentar fazer login agora.\n\n" +
      "Detalhes: " + (err?.message || err)
    );
    window.location.href = "login.html";
  } finally {
    enableBtn(btn);
  }
}

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

/* =========================
   SHOW / HIDE PASSWORD  (mantive e integrei com os botões SVG)
========================= */
function setupPasswordToggles() {
  const toggles = document.querySelectorAll(".toggle-pass[data-target]");
  if (!toggles.length) return;

  toggles.forEach((btn) => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;

    btn.classList.remove("showing");

    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";

      btn.classList.toggle("showing", !isHidden);

      // swap visible svgs inside button (if present)
      const eye = btn.querySelector(".icon-eye");
      const eyeSlash = btn.querySelector(".icon-eye-slash");
      if (eye && eyeSlash) {
        if (btn.classList.contains("showing")) {
          eye.style.display = "none";
          eyeSlash.style.display = "inline-block";
        } else {
          eye.style.display = "inline-block";
          eyeSlash.style.display = "none";
        }
      }
    });
  });
     }
