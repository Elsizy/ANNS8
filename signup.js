// signup.js
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  set,
  get,          // NEW
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* =========================
   CONFIG
========================= */
const SAVE_TIMEOUT_MS = 15000; // aumentamos para 15s. Coloque null para desativar.
const LOCK_REFERRAL_IF_URL = true; // NEW: travar o input se veio via URL

/* =========================
   HELPERS
========================= */
function withTimeout(promise, ms, onTimeoutMessage = "Timeout") {
  if (!ms) return promise; // se ms for null/0, não aplica timeout
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

/* =========================
   NEW: referral helpers
========================= */
function getReferralFromURL() {
  const qs = new URLSearchParams(window.location.search);
  // aceitamos ?ref=... ou ?codigo=...
  return qs.get("ref") || qs.get("codigo") || "";
}

/**
 * (Opcional) Valida se o UID informado realmente existe em /usuarios.
 * Se não existir, limpamos o campo.
 */
async function validateReferral(uid) {
  if (!uid) return null;
  try {
    const snap = await get(ref(db, `usuarios/${uid}`));
    return snap.exists() ? uid : null;
  } catch (e) {
    console.warn("Falha validando referral:", e);
    return null;
  }
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

  // NEW: pré-preenche o referral a partir da URL (se existir)
  const referralInput = document.getElementById("referral");
  const refFromURL = getReferralFromURL();
  if (refFromURL) {
    const valid = await validateReferral(refFromURL);
    if (valid) {
      referralInput.value = valid;
      if (LOCK_REFERRAL_IF_URL) referralInput.readOnly = true;
    } else {
      console.warn("Referral da URL não é válido (usuário não encontrado).");
    }
  }

  form.addEventListener("submit", onSubmit);
});

async function onSubmit(e) {
  e.preventDefault();

  const form = e.currentTarget;
  const btn = form.querySelector('button[type="submit"]');

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const referral = document.getElementById("referral").value.trim(); // <- usado como invitedBy
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
    console.log("[SIGNUP] Criando usuário no Auth…");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    user = cred.user;
    console.log("[SIGNUP] Auth OK. UID:", user.uid);
  } catch (err) {
    console.error("[SIGNUP][AUTH ERROR]", err.code, err.message);
    alert(mapFirebaseError(err));
    enableBtn(btn);
    return;
  }

  try {
    console.log("[SIGNUP] Gravando no RTDB em usuarios/" + user.uid);

    // Estrutura NOVA + campos legados para não quebrar nada do projeto atual
    const payload = {
      // básicos
      uid: user.uid,
      email,
      invitedBy: referral || null,          // <- novo
      codigoConvite: referral || null,      // mantém o que você já tinha

      // saldos e totais
      saldo: 0,
      totalInvestido: 0,                    // <- novo
      totalComissaoDiaria: 0,               // <- novo

      // controle de cálculo diário
      lastDailyCheckAt: Date.now(),         // <- novo

      // compras de Nex (estrutura flexível p/ múltiplas compras)
      compras: {},                          // <- novo

      // *** LEGADO (para não quebrar nada que ainda use estes nomes) ***
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

    console.log("[SIGNUP] Dados gravados com sucesso.");
    alert("Conta criada com sucesso!");
    window.location.href = "login.html";
  } catch (err) {
    console.error("[SIGNUP][DB ERROR]", err);
    alert(
      "Sua conta foi criada no Auth, mas houve um problema ao salvar seus dados.\n" +
        "Você poderá tentar fazer login agora.\n\n" +
        "Detalhes: " +
        (err?.message || err)
    );
    window.location.href = "login.html";
  } finally {
    enableBtn(btn);
  }
}
