// signup.js
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("[SIGNUP] DOM pronto. db?", db);
  const form = document.getElementById("signupForm");
  if (!form) {
    console.error("[SIGNUP] Form #signupForm não encontrado.");
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

  let user = null;

  try {
    console.log("[SIGNUP] Criando usuário no Auth…", email);
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
    console.log("[SIGNUP] Salvando no RTDB em usuarios/" + user.uid);
    await set(ref(db, `usuarios/${user.uid}`), {
      uid: user.uid,
      email,
      codigoConvite: referral || null,
      saldo: 0,
      comissao: 0,
      investimento: 0,
      produto: null,
      criadoEm: new Date().toISOString()
    });
    console.log("[SIGNUP] Salvo com sucesso no RTDB");
    alert("Conta criada com sucesso!");
    window.location.href = "login.html";
  } catch (err) {
    console.error("[SIGNUP][DB ERROR]", err.code, err.message);
    alert(
      "Conta criada no Auth, mas falhou ao salvar no banco de dados.\n" +
      "Detalhes: " + (err?.message || err)
    );
  } finally {
    // Se por algum motivo não redirecionar, reabilita o botão
    enableBtn(btn);
  }
}

function disableBtn(btn, text) {
  if (!btn) return;
  btn.disabled = true;
  btn.dataset.originalText = btn.textContent;
  btn.textContent = text || "Processando...";
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
