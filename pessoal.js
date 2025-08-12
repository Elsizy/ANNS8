// pessoal.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* ---------------------------
   Cache local (localStorage)
   --------------------------- */
const CACHE_KEY = (uid) => `pessoal_cache_${uid}`;
const CACHE_MAX_AGE = 60_000; // 1 minuto

function loadCache(key, maxAge = CACHE_MAX_AGE) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o?.t || Date.now() - o.t > maxAge) return null;
    return o.data;
  } catch {
    return null;
  }
}
function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), data }));
  } catch (_) {}
}

/* ====== MODAL Alterar Palavra-passe ====== */
function openChangePassModal() {
  document.getElementById("change-pass-overlay")?.removeAttribute("hidden");
}
function closeChangePassModal() {
  document.getElementById("change-pass-overlay")?.setAttribute("hidden", "");
  resetChangePassForm();
}
function resetChangePassForm() {
  const form = document.getElementById("change-pass-form");
  if (!form) return;
  form.reset();
  setChangePassError("");
  setBtnLoading(false);
}
function setBtnLoading(loading) {
  const btn = document.getElementById("btn-save");
  if (!btn) return;
  btn.disabled = !!loading;
  btn.textContent = loading ? "Salvando..." : "Salvar";
}
function setChangePassError(msg) {
  const el = document.getElementById("change-pass-error");
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
  } else {
    el.hidden = false;
    el.textContent = msg;
  }
}
async function handleChangePassSubmit(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) {
    setChangePassError("Sessão expirada. Faça login novamente.");
    return;
  }

  const oldPass = document.getElementById("old-pass").value;
  const newPass = document.getElementById("new-pass").value;
  const newPass2 = document.getElementById("new-pass-2").value;

  if (!oldPass || !newPass || !newPass2) {
    setChangePassError("Preencha todos os campos.");
    return;
  }
  if (newPass !== newPass2) {
    setChangePassError("As novas palavras-passe não coincidem.");
    return;
  }
  if (newPass.length < 6) {
    setChangePassError("A nova palavra-passe deve ter ao menos 6 caracteres.");
    return;
  }

  setBtnLoading(true);
  setChangePassError("");

  try {
    // reautenticar
    const cred = EmailAuthProvider.credential(user.email, oldPass);
    await reauthenticateWithCredential(user, cred);

    // atualizar senha
    await updatePassword(user, newPass);

    alert("Palavra-passe alterada com sucesso!");
    closeChangePassModal();
  } catch (err) {
    console.error("Erro ao alterar palavra-passe:", err);
    let msg = "Erro ao alterar palavra-passe.";
    if (err?.code === "auth/wrong-password") {
      msg = "Palavra-passe atual incorreta.";
    } else if (err?.code === "auth/weak-password") {
      msg = "A nova palavra-passe é fraca (mínimo 6 caracteres).";
    } else if (err?.code === "auth/requires-recent-login") {
      msg = "Por segurança, faça login novamente e tente de novo.";
    }
    setChangePassError(msg);
  } finally {
    setBtnLoading(false);
  }
}

/* ====== FIM MODAL ====== */
/* === Suporte modal — delegação, a11y, prevenção de scroll por trás === */

function openSupportModal() {
  const o = document.getElementById('support-overlay');
  if (!o) {
    console.warn('support-overlay não encontrado no DOM.');
    return;
  }
  o.removeAttribute('hidden');
  // evitar scroll do body enquanto o modal está aberto
  document.body.style.overflow = 'hidden';
  // foco para acessibilidade
  const closeBtn = document.getElementById('support-close');
  if (closeBtn) closeBtn.focus();
}

function closeSupportModal() {
  const o = document.getElementById('support-overlay');
  if (!o) return;
  o.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

/* Observa: mantive onAuthStateChanged, obtenção do RTDB e cache exatamente como no seu código original */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;
  const key = CACHE_KEY(uid);

  // Mostra cache se houver (para UI rápida)
  const cached = loadCache(key);
  if (cached) {
    paint(cached);
  }

  // Busca dados do RTDB
  try {
    const snap = await get(ref(db, `usuarios/${uid}`));
    if (!snap.exists()) return;
    const u = snap.val();

    const data = {
      email: u.email || user.email || "",
      phone: u.phone || u.telefone || "",
      shortId: u.shortId || uid,
      saldo: u.saldo || 0,                 // saldo disponível (mostrado como Saldo da conta)
      retiradaTotal: u.retiradaTotal || 0  // total já retirado (mostrado como Conta de receita)
    };

    paint(data);
    saveCache(key, data);
  } catch (err) {
    console.error("Erro ao buscar dados do usuário:", err);
  }
});

/** Liga os eventos do modal depois que o DOM estiver pronto */
document.addEventListener("DOMContentLoaded", () => {
  /* === ALTERAR SENHA === */
  const linkChangePass = document.querySelector('.actions a[href="alterarpasse.html"]');
  if (linkChangePass) {
    linkChangePass.addEventListener("click", (e) => {
      e.preventDefault();
      openChangePassModal();
    });
  }

  const cancelBtn = document.getElementById("btn-cancel");
  cancelBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeChangePassModal();
  });

  const changeForm = document.getElementById("change-pass-form");
  changeForm?.addEventListener("submit", handleChangePassSubmit);

  // fechar se clicar fora do modal (overlay)
  const overlayChange = document.getElementById("change-pass-overlay");
  overlayChange?.addEventListener("click", (e) => {
    if (e.target === overlayChange) {
      closeChangePassModal();
    }
  });

  /* === SUPORTE === */
  // Intercepta todos os links que apontam para suporte.html e abre o modal em vez de navegar
  document.querySelectorAll('a[href="suporte.html"]').forEach(a => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      openSupportModal();
    });
  });

  // Botões do modal de suporte
  document.getElementById('support-close')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeSupportModal();
  });
  document.getElementById('support-cancel')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeSupportModal();
  });

  // fechar se clicar fora do modal (overlay)
  const overlaySupport = document.getElementById('support-overlay');
  overlaySupport?.addEventListener('click', (e) => {
    if (e.target === overlaySupport) closeSupportModal();
  });

  // ESC fecha modais (global)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // fecha suporte se aberto
      const sup = document.getElementById('support-overlay');
      if (sup && !sup.hasAttribute('hidden')) closeSupportModal();

      // fecha alterar senha se aberto
      const ch = document.getElementById('change-pass-overlay');
      if (ch && !ch.hasAttribute('hidden')) closeChangePassModal();
    }
  });

  // Ativar o item do bottom-nav correspondente (se existir bottom-nav.js no projeto)
  try {
    const active = document.querySelector('.bottom-nav .nav-item[data-key="pessoal"]');
    active?.classList.add('active');
  } catch(_) {}

});

/* Função para preencher os textos na UI - mantida fiel ao original */
function paint({ email, phone, shortId, saldo, retiradaTotal }) {
  const main = phone || email || "(sem email)";
  setText("user-main", main);
  setText("user-shortid", shortId || "—");
  setText("saldo", formatKz(saldo || 0));
  setText("retirada-total", formatKz(retiradaTotal || 0));

  // Avatar (inicial)
  const avatar = document.getElementById("avatar-letter");
  if (avatar) {
    const avatarSource = (email && email.trim()) || (phone && phone.trim()) || "A";
    avatar.textContent = avatarSource.charAt(0).toUpperCase();
  }
}

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/* logout (mantive id="logout" no HTML para este botão) */
document.getElementById("logout")?.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (err) {
    console.error("Erro ao sair:", err);
    alert("Erro ao sair. Tente novamente.");
  }
});
