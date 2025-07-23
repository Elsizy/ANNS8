// ✅ IMPORTS no topo
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ EVENTO DE CADASTRO
document.getElementById("signupForm").addEventListener("submit", async function (event) {
  event.preventDefault();

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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "usuarios", user.uid), {
      uid: user.uid,
      email: email,
      codigoConvite: referral || null,
      saldo: 0,
      criadoEm: new Date().toISOString()
    });

    alert("Conta criada com sucesso!");
    document.getElementById("signupForm").reset();
    window.location.href = "login.html";
  } catch (error) {
    console.error(error);
    alert("Erro ao criar conta: " + error.message);
  }
});
