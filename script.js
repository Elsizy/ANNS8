// script.js (Cadastro - Firebase v8)
document.getElementById("signupForm").addEventListener("submit", (event) => {
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

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      return db.ref("usuarios/" + user.uid).set({
        uid: user.uid,
        email,
        codigoConvite: referral || null,
        saldo: 0,
        comissao: 0,
        investimento: 0,
        produto: null,
        criadoEm: new Date().toISOString()
      });
    })
    .then(() => {
      alert("Conta criada com sucesso!");
      document.getElementById("signupForm").reset();
      window.location.href = "login.html";
    })
    .catch((error) => {
      console.error(error);
      alert("Erro ao criar conta: " + error.message);
    });
});
