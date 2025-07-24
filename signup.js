// signup.js
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  set,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  if (!form) {
    console.error("signupForm não encontrado no DOM.");
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

  try {
    btn.disabled = true;
    btn.textContent = "Criando conta...";

    console.log("Criando usuário…");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    console.log("Gravando usuário no Realtime Database…");
    await set(ref(db, `usuarios/${user.uid}`), {
      uid: user.uid,
      email,
      codigoConvite: referral || null,
      saldo: 0,
      comissao: 0,
      investimento: 0,
      produto: null,
      criadoEm: new Date().toISOString(),
    });

    alert("Conta criada com sucesso!");
    window.location.href = "login.html";
  } catch (err) {
    console.error("Erro ao criar conta:", err);
    alert(mapFirebaseError(err));
  } finally {
    // Se não redirecionou ainda, reabilita o botão
    btn.disabled = false;
    btn.textContent = "Criar Conta";
  }
}

function mapFirebaseError(error) {
  if (!error?.code) return "Erro desconhecido ao criar conta.";
  switch (error.code) {
    case "auth/email-already-in-use":
      return "Este email já está em uso.";
    case "auth/invalid-email":
      return "Email inválido.";
    case "auth/weak-password":
      return "A senha é muito fraca (mínimo 6 caracteres).";
    case "auth/network-request-failed":
      return "Falha de rede. Verifique sua conexão e tente novamente.";
    default:
      return "Erro ao criar conta: " + (error.message || error.code);
  }
}
