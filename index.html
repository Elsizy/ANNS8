// signup.js
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

// ?ref=... ou ?codigo=...
function getReferralFromURL() {
  const qs = new URLSearchParams(window.location.search);
  return (qs.get("ref") || qs.get("codigo") || "").trim();
}

// gera um código curto aleatório (8 chars)
function genRefCode(len = REF_CODE_LEN) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem I, l, 1, O, 0
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// cria refCode único e grava /codes/{refCode} -> { uid }
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

// gera shortId incremental (612334, 612335, ...)
async function getNextShortId() {
  const counterRef = ref(db, "counters/shortIdNext");
  const res = await runTransaction(counterRef, (current) => {
    if (!current || current < 612334) return 612334;
    return current + 1;
  });
  return res.snapshot.val();
}

// resolve o código digitado/URL (refCode ou uid antigo) para o UID real do patrocinador
async function resolveInviterUid(refParamRaw) {
  const refParam = (refParamRaw || "").trim();
  if (!refParam) return null;

  // 1) tenta como código curto
  try {
    const codeSnap = await get(ref(db, `codes/${refParam.toUpperCase()}`));
    if (codeSnap.exists() && codeSnap.val()?.uid) {
      return codeSnap.val().uid;
    }
  } catch (e) {
    console.warn("Erro lendo codes/<refCode>:", e);
  }

  // 2) fallback: talvez seja UID
  try {
    const userSnap = await get(ref(db, `usuarios/${refParam}`));
    if (userSnap.exists()) return refParam;
  } catch (e) {
    console.warn("Erro validando ref como UID:", e);
  }

  return null;
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

  // Pré-preenche o referral vindo por URL (se houver)
  const refFromURL = getReferralFromURL();
  if (refFromURL) {
    referralInput.value = refFromURL; // pode ser code curto OU uid
    if (LOCK_REFERRAL_IF_URL) referralInput.readOnly = true;
  }

  // inicializa o show/hide de senha
  setupPasswordToggles();

  form.addEventListener("submit", onSubmit);
});

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
    alert("Você precisa aceitar os termos e condições.");
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
    const inviterUid = await resolveInviterUid(referralRaw); // sempre UID real (ou null)
    const shortId = await getNextShortId();
    const refCode  = await createUniqueRefCode(user.uid);

    const payload = {
      uid: user.uid,
      shortId,
      refCode,
      invitedBy: inviterUid || null,       // <-- SEMPRE UID
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

    alert("Conta criada com sucesso!");
    window.location.href = "login.html";
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

/* =========================
   SHOW / HIDE PASSWORD  (ADIÇÃO)
========================= */
function setupPasswordToggles() {
  const toggles = document.querySelectorAll(".toggle-pass[data-target]");
  if (!toggles.length) return;

  toggles.forEach((btn) => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;

    // Estado inicial: senha escondida => ícone "esconder" (sem .showing)
    btn.classList.remove("showing");

    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";

      // Se está visível => .showing (ícone "mostrar")
      // Se está escondido => remove .showing (ícone "esconder")
      btn.classList.toggle("showing", !isHidden);
    });
  });
}
