// signup.js
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  set,
  get,
  update,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* =========================
   CONFIG
========================= */
const SAVE_TIMEOUT_MS = 15000; // aumentamos para 15s. Coloque null para desativar.
const LOCK_REFERRAL_IF_URL = true; // travar o input se veio via URL

/* =========================
   HELPERS GERAIS
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
   HELPERS DE REFERÊNCIA
========================= */

// pega ?ref=... ou ?codigo=...
function getReferralFromURL() {
  const qs = new URLSearchParams(window.location.search);
  return qs.get("ref") || qs.get("codigo") || "";
}

// gera um código curto aleatório (8 chars)
function genRefCode(len = 8) {
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
  await set(ref(db, `codes/${code}`), { uid });
  return code;
}

// pega shortId incremental (612334, 612335, ...)
async function getNextShortId() {
  const counterRef = ref(db, "counters/shortIdNext");
  const res = await runTransaction(counterRef, (current) => {
    if (!current || current < 612334) return 612334;
    return current + 1;
  });
  return res.snapshot.val();
}

// resolve o "ref" vindo da URL (pode ser UID antigo ou refCode novo) para UID
async function resolveInviterUid(refParam) {
  if (!refParam) return null;

  // 1) tenta como código curto (codes/{code} -> uid)
  try {
    const codeSnap = await get(ref(db, `codes/${refParam}`));
    if (codeSnap.exists() && codeSnap.val()?.uid) {
      return codeSnap.val().uid;
    }
  } catch (e) {
    console.warn("Erro lendo codes/<refCode>:", e);
  }

  // 2) fallback: talvez seja um UID antigo
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
    referralInput.value = refFromURL; // mostra o que veio (código curto ou uid)
    if (LOCK_REFERRAL_IF_URL) referralInput.readOnly = true;
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
  const referralRaw = document.getElementById("referral").value.trim(); // pode ser code curto OU uid
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
    console.log("[SIGNUP] Resolvendo inviter (se houver)...");
    const inviterUid = await resolveInviterUid(referralRaw);

    console.log("[SIGNUP] Gerando shortId & refCode…");
    const shortId = await getNextShortId();
    const refCode  = await createUniqueRefCode(user.uid);

    console.log("[SIGNUP] Gravando no RTDB em usuarios/" + user.uid);

    const payload = {
      uid: user.uid,
      shortId,                 // novo
      refCode,                 // novo
      invitedBy: inviterUid || null, // sempre UID real
      email,

      // saldos e totais
      saldo: 0,
      totalInvestido: 0,
      totalComissaoDiaria: 0,

      // controle de cálculo diário
      lastDailyCheckAt: Date.now(),

      // compras
      compras: {},

      // totais de indicação (opcional iniciar zerado)
      refTotals: {
        A: { amount: 0 },
        B: { amount: 0 },
        C: { amount: 0 },
      },

      // LEGADO para não quebrar nada
      codigoConvite: referralRaw || null, // mantém como você já usava
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
