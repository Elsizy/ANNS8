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
      alert("Erro ao criar conta: " + err.message);
    }
  });
});
