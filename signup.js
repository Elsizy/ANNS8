// signup.js — SUPABASE (final)
// Mantém UX (medidor, modal, toggles) e corrige: RPC shortId, upsert, metadata referral.

import { supabase } from "./supabase-client.js";

/* =========================
   CONFIG
========================= */
const SAVE_TIMEOUT_MS = 15000; // 15s
const LOCK_REFERRAL_IF_URL = true;
const REF_CODE_LEN = 8;

/* =========================
   HELPERS
========================= */
function withTimeout(promise, ms, onTimeoutMessage = "Timeout") {
  if (!ms) return promise;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(onTimeoutMessage)), ms);
    promise.then((v)=>{clearTimeout(t);resolve(v);})
           .catch((e)=>{clearTimeout(t);reject(e);});
  });
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
function mapSupabaseAuthError(error) {
  const msg = (error?.message || "").toLowerCase();
  if (msg.includes("already") && msg.includes("registered")) return "Este email já está em uso.";
  if (msg.includes("password")) return "A senha é muito fraca (mínimo 6 caracteres).";
  if (msg.includes("invalid") && msg.includes("email")) return "Email inválido.";
  return "Erro ao criar conta: " + (error?.message || "desconhecido");
}
function getReferralFromURL() {
  const qs = new URLSearchParams(window.location.search);
  return (qs.get("ref") || qs.get("codigo") || "").trim();
}
function genRefCode(len = REF_CODE_LEN) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** Gera código único na tabela `codes` (constraint UNIQUE/PK em codes.code). */
async function createUniqueRefCode(uid) {
  while (true) {
    const code = genRefCode();
    const { error } = await supabase.from("codes").insert({ code, uid });
    if (!error) return code;
    // colisão → tenta outro
    if (/duplicate|unique|already exists/i.test(error?.message || "")) continue;
    throw error;
  }
}

/** Incrementa contador via RPC (atômico). */
async function getNextShortId() {
  const { data, error } = await supabase.rpc("next_short_id");
  if (error) throw error;
  return data;
}

/** Resolve convidador via codes.code → uid ou usuarios.uid */
async function resolveInviterUid(refParamRaw) {
  const refParam = (refParamRaw || "").trim();
  if (!refParam) return null;

  try {
    const { data, error } = await supabase
      .from("codes")
      .select("uid")
      .eq("code", refParam.toUpperCase())
      .maybeSingle();
    if (!error && data?.uid) return data.uid;
  } catch (e) { console.warn("codes lookup:", e); }

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("uid")
      .eq("uid", refParam)
      .maybeSingle();
    if (!error && data?.uid) return refParam;
  } catch (e) { console.warn("usuarios lookup:", e); }

  return null;
}

/* =========================
   PASSWORD STRENGTH (UI)
========================= */
function calcPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "—" };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  let label = "Fraca";
  if (score >= 4) label = "Forte";
  else if (score >= 3) label = "Boa";
  return { score, label };
}
function updatePasswordStrengthUI(pw) {
  const el = document.getElementById("password-strength");
  const fill = el?.querySelector(".bar-fill");
  const txt = document.getElementById("password-strength-text");
  if (!el || !fill || !txt) return;
  const { score, label } = calcPasswordStrength(pw);
  const pct = Math.min(100, Math.round((score / 5) * 100));
  fill.style.width = `${pct}%`;
  if (score >= 4) fill.style.background = "linear-gradient(90deg,#2ecc71,#6f66ff)";
  else if (score >= 3) fill.style.background = "linear-gradient(90deg,#f2c94c,#6f66ff)";
  else fill.style.background = "linear-gradient(90deg,#ff6b6b,#ff9aa2)";
  txt.textContent = label;
}

/* =========================
   MAIN
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  if (!form) {
    console.error("[SIGNUP] Form não encontrado no DOM.");
    return;
  }
  const referralInput = document.getElementById("referral");
  const refFromURL = getReferralFromURL();
  if (refFromURL) {
    referralInput.value = refFromURL;
    if (LOCK_REFERRAL_IF_URL) referralInput.readOnly = true;
  }
  const passwordInput = document.getElementById("password");
  if (passwordInput) {
    updatePasswordStrengthUI(passwordInput.value || "");
    passwordInput.addEventListener("input", (e) =>
      updatePasswordStrengthUI(e.currentTarget.value || "")
    );
  }
  setupPasswordToggles();
  form.addEventListener("submit", onSubmit);
});

/* === Modal de sucesso (inalterado) === */
function ensureSignupSuccessModal() {
  if (document.getElementById("signup-success-overlay")) return;
  const style = document.createElement("style");
  style.id = "signup-success-style";
  style.textContent = `
    .su-overlay{position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.6); z-index:9999}
    .su-card{background:#fff; border-radius:14px; padding:24px 20px; max-width:360px; width:92%; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,.18)}
    .su-title{font-size:18px; margin:8px 0 6px; color:#111}
    .su-desc{font-size:14px; color:#555; margin:0 0 18px}
    .su-btn{display:inline-flex; align-items:center; gap:8px; padding:10px 16px; border-radius:10px; border:0; cursor:pointer; font-weight:600}
    .su-btn-primary{background:#3da5ff; color:#fff}
    .su-icon{width:44px; height:44px}
  `;
  document.head.appendChild(style);
  const overlay = document.createElement("div");
  overlay.id = "signup-success-overlay";
  overlay.className = "su-overlay";
  overlay.innerHTML = `
    <div class="su-card" role="dialog" aria-modal="true" aria-labelledby="su-title">
      <svg class="su-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:#2ecc71">
        <path d="M20 6L9 17l-5-5"/><circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle>
      </svg>
      <h3 id="su-title" class="su-title">Conta criada com sucesso</h3>
      <p class="su-desc">Bem-vindo(a) à <strong>AES energies</strong>. Pode iniciar sessão para começar.</p>
      <button id="su-ok" class="su-btn su-btn-primary" type="button">Ir para o login</button> 
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#su-ok").addEventListener("click", () => {
    hideSignupSuccessModal();
    window.location.href = "login.html";
  });
  overlay.addEventListener("keydown", (e) => { if (e.key === "Enter") overlay.querySelector("#su-ok").click(); });
}
function showSignupSuccessModal() { ensureSignupSuccessModal(); const ov = document.getElementById("signup-success-overlay"); ov.style.display = "flex"; ov.querySelector(".su-card")?.focus?.(); }
function hideSignupSuccessModal() { const ov = document.getElementById("signup-success-overlay"); if (ov) ov.style.display = "none"; }

/* === SUBMIT === */
async function onSubmit(e) {
  e.preventDefault();

  const form = e.currentTarget;
  const btn = form.querySelector('button[type="submit"]');

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const referralRaw = document.getElementById("referral").value.trim();
  const termsAccepted = document.getElementById("terms").checked;

  if (!termsAccepted) { alert("Você precisa aceitar os termos e condições."); return; }
  if (password !== confirmPassword) { alert("As senhas não coincidem."); return; }

  disableBtn(btn, "Criando conta...");

  // 1) Auth
  let supaUser = null;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Captura referral mesmo se email-confirm ON
        data: { referral_code_used: referralRaw || null }
      }
    });
    if (error) throw error;
    supaUser = data.user || data.session?.user || null;

    // Se confirmação de e-mail estiver ativa, não teremos sessão agora:
    if (!supaUser) {
      alert("Conta criada. Verifique seu email para confirmar e depois faça login.");
      window.location.href = "login.html";
      return;
    }
  } catch (err) {
    alert(mapSupabaseAuthError(err));
    enableBtn(btn);
    return;
  }

  // 2) DB
  try {
    const inviterUid = await resolveInviterUid(referralRaw);
    const shortId = await getNextShortId();                 // RPC atômico
    const refCode  = await createUniqueRefCode(supaUser.id);

    const payload = {
      uid: supaUser.id,
      short_id: shortId,            // usar snake_case na tabela (recomendado)
      ref_code: refCode,
      invited_by: inviterUid || null,
      referral_code_used: referralRaw || null,

      email,
      saldo: 0,
      total_investido: 0,
      total_comissao_diaria: 0,
      last_daily_check_at: new Date().toISOString(),
      compras: {},                  // jsonb
      ref_totals: { A:{amount:0}, B:{amount:0}, C:{amount:0} },

      codigo_convite: referralRaw || null, // legado (jsonb ou text opcional)
      investimento: 0,
      comissao: 0,
      produto: null,

      criado_em: new Date().toISOString()
    };

    const { error: upErr } = await withTimeout(
      supabase.from("usuarios").upsert(payload, { onConflict: "uid" }),
      SAVE_TIMEOUT_MS,
      `Timeout ao gravar no Postgres (${SAVE_TIMEOUT_MS / 1000}s)`
    );
    if (upErr) throw upErr;

    showSignupSuccessModal();
    setTimeout(() => (window.location.href = "login.html"), 3000);
  } catch (err) {
    console.error("[SIGNUP][DB ERROR]", err);
    alert(
      "Sua conta foi criada no Auth, mas houve um problema ao salvar seus dados.\n" +
      "Você poderá tentar fazer login agora.\n\n" +
      "Detalhes: " + (err?.message || err)
    );
    window.location.href = "login.html";
  } finally {
    enableBtn(btn);
  }
}

/* =========================
   SHOW / HIDE PASSWORD
========================= */
function setupPasswordToggles() {
  const toggles = document.querySelectorAll(".toggle-pass[data-target]");
  if (!toggles.length) return;
  toggles.forEach((btn) => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    btn.classList.remove("showing");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.classList.toggle("showing", !isHidden);
      const eye = btn.querySelector(".icon-eye");
      const eyeSlash = btn.querySelector(".icon-eye-slash");
      if (eye && eyeSlash) {
        if (btn.classList.contains("showing")) { eye.style.display = "none"; eyeSlash.style.display = "inline-block"; }
        else { eye.style.display = "inline-block"; eyeSlash.style.display = "none"; }
      }
    });
  });
     }
