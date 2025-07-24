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
  const form = document.getElementById("signupForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Criando conta...";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const referral = document.getElementById("referral").value.trim();
    const termsAccepted = document.getElementById("terms").checked;

    if (!termsAccepted) {
      alert("Você precisa aceitar os termos e condições.");
      resetBtn();
      return;
    }

    if (password !== confirmPassword) {
      alert("As senhas não coincidem.");
      resetBtn();
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

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

      alert("Conta criada com sucesso!");
      window.location.href = "login.html";
    } catch (err) {
      console.error("Erro ao criar conta:", err);
      alert(mapFirebaseError(err));
      resetBtn();
    }

    function resetBtn() {
      btn.disabled = false;
      btn.textContent = "Criar Conta";
    }
  });
});

function mapFirebaseError(error) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "Este email já está em uso.";
    case "auth/invalid-email":
      return "Email inválido.";
    case "auth/weak-password":
      return "A senha é muito fraca (mínimo 6 caracteres).";
    default:
      return "Erro ao
