
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBj-MK1oOk6lIJZT8KrSsllwSqoMHfUkzQ",
  authDomain: "anns8-5fc26.firebaseapp.com",
  projectId: "anns8-5fc26",
  storageBucket: "anns8-5fc26.firebasestorage.app",
  messagingSenderId: "259361189676",
  appId: "1:259361189676:web:a9d54cee391b9f0f468689"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.getElementById("signupForm").addEventListener("submit", async function(event) {
  event.preventDefault();

  const phone = document.getElementById("phone").value.trim();
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

  const email = `${phone.replace(/\s+/g, "")}@anns8.com`;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "usuarios", user.uid), {
      uid: user.uid,
      telefone: phone,
      codigoConvite: referral || null,
      saldo: 0,
      criadoEm: new Date().toISOString()
    });

    alert("Conta criada com sucesso!");
    document.getElementById("signupForm").reset();
  } catch (error) {
    console.error(error);
    alert("Erro ao criar conta: " + error.message);
  }
});
