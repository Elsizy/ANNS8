// alterarpasse.js
import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const form = document.getElementById("changePassForm");
  const feedback = document.getElementById("feedback");
  const btn = document.getElementById("submitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const oldPassword = document.getElementById("oldPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
      showFeedback("As novas senhas não coincidem.", "err");
      return;
    }
    if (newPassword.length < 6) {
      showFeedback("A nova senha deve ter pelo menos 6 caracteres.", "err");
      return;
    }

    setLoading(true);
    try {
      // Reautenticar com a senha antiga
      const cred = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, cred);

      // Atualizar a senha
      await updatePassword(user, newPassword);

      showFeedback("Senha atualizada com sucesso!", "ok");
      form.reset();

      // Opcional: redirecionar após alguns segundos
      setTimeout(() => (window.location.href = "pessoal.html"), 1200);
    } catch (err) {
      showFeedback(mapAuthError(err), "err");
      console.error("Erro ao atualizar senha:", err);
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    if (!btn) return;
    btn.disabled = isLoading;
    btn.textContent = isLoading ? "Alterando..." : "Alterar palavra‑passe";
  }

  function showFeedback(msg, kind = "ok") {
    feedback.textContent = msg;
    feedback.classList.remove("hide", "ok", "err");
    feedback.classList.add(kind);
  }

  function mapAuthError(error) {
    switch (error?.code) {
      case "auth/wrong-password":
        return "Senha atual incorreta.";
      case "auth/weak-password":
        return "A nova senha é muito fraca (mínimo 6 caracteres).";
      case "auth/requires-recent-login":
        return "Por segurança, faça login novamente para alterar a senha.";
      default:
        return "Não foi possível alterar a senha. Tente novamente.";
    }
  }
});
