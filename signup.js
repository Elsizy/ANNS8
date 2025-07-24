// signup.js
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  set,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/**
 * Timeout helper – se o set() demorar demais (ex.: regra do DB ou rede),
 * a gente não trava a UI; avisa e redireciona mesmo assim.
 */
function withTimeout(promise, ms, onTimeoutMessage = "Timeout") {
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

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  if (!form) {
    console.error("[SIGNUP] Form não encontrado no DOM.");
    return;
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
  const referral = document.getElementById("referral").value.trim();
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

    // Dá no máx. 5s para escrever no DB; se estourar, seguimos a vida.
    await withTimeout(
      set(ref(db, `usuarios/${user.uid}`), {
        uid: user.uid,
        email,
        codigoConvite: referral || null,
        saldo: 0,
        comissao: 0,
        investimento: 0,
        produto: null,
        criadoEm: new Date().toISOString(),
      }),
      5000,
      "Timeout ao gravar no Realtime Database (5s)"
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
    // Se por algum motivo não redirecionar (ex.: bloqueio do navegador),
    // o botão volta ao normal.
    enableBtn(btn);
  }
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
