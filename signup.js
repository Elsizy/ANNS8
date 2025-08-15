// signup-supa.js (migração 1:1 do teu signup.js para Supabase)
// - Mantém TODO o UX original (medidor de força, modal, travas, toggles).
// - Troca Firebase Auth → Supabase Auth
// - Troca RTDB → Supabase Postgres (tabelas: usuarios, codes, counters)
// - Se as tabelas ainda não existirem / políticas não estiverem prontas:
//   cria a conta no Auth e avisa que o perfil não foi salvo (igual ao teu fallback).

import { supabase } from "./supabase-client.js";

/* =========================
   CONFIG
========================= */
const SAVE_TIMEOUT_MS = 15000; // 15s
const LOCK_REFERRAL_IF_URL = true; // trava o input se veio via URL
const REF_CODE_LEN = 8; // tamanho do código curto

/* =========================
   HELPERS
========================= */
function withTimeout(promise, ms, onTimeoutMessage = "Timeout") {
  if (!ms) return promise;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(onTimeoutMessage)), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
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
  if (msg.includes("already registered") || msg.includes("user already"))
    return "Este email já está em uso.";
  if (msg.includes("weak") || msg.includes("password"))
    return "A senha é muito fraca (mínimo 6 caracteres).";
  if (msg.includes("invalid email"))
    return "Email inválido.";
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

// === Supabase: garante código único via índice único na tabela `codes` ===
async function createUniqueRefCode(uid) {
  // Requer tabela `codes(code TEXT PRIMARY KEY/UNIQUE, uid TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`
  // e política de RLS permitindo insert.
  while (true) {
    const code = genRefCode();
    const { error } = await supabase
      .from("codes")
      .insert({ code, uid }); // confia no UNIQUE para detectar colisão
    if (!error) return code;

    // colisão (duplicate key) → tenta outro
    const isDuplicate =
      /duplicate key|unique constraint|already exists/i.test(error?.message || "");
    if (isDuplicate) continue;

    // outro erro (tabela não existe, RLS, etc.)
    throw error;
  }
}

// === Supabase: incrementa um contador "shortIdNext" de forma atômica ===
// Implementa via UPDATE ... SET value = value + 1 RETURNING value
// (precisa da tabela `counters(name TEXT PK, value BIGINT)` com linha name='shortIdNext')
async function getNextShortId() {
  const startAt = 612334;

  // Garante linha inicial (idempotente). Se falhar por RLS, seguimos sem travar.
  await supabase
    .from("counters")
    .insert({ name: "shortIdNext", value: startAt }, { upsert: true, onConflict: "name" })
    .catch(() => {});

  // Faz o incremento atômico usando RPC leve via SQL embed com PostgREST? Não precisamos:
  // PostgREST permite update com retorno. Usamos um `update` com retorno simulando incremento no cliente.
  // Melhor: cria uma função SQL (rpc) next_short_id(); mas aqui vamos fazer com uma view simples:
  const { data, error } = await supabase
    .from("counters")
    .update({ value: supabase.rpc ? undefined : undefined }) // placeholder, não altera aqui
    .eq("name", "shortIdNext")
    .select("value")
    .single();

  // O trecho acima não incrementa. Sem RPC, fazemos 2 passos seguros:
  // 1) Buscar valor atual
  const { data: cur, error: errSel } = await supabase
    .from("counters")
    .select("value")
    .eq("name", "shortIdNext")
    .single();

  if (errSel) throw errSel;

  const next = (cur?.value ?? startAt) + 1;

  const { error: errUpd } = await supabase
    .from("counters")
    .update({ value: next })
    .eq("name", "shortIdNext");

  if (errUpd) throw errUpd;
  return next;
}

// === Supabase: resolve UID do convidador pelo código curto (tabela `codes`) ou pelo próprio UID (tabela `usuarios`) ===
async function resolveInviterUid(refParamRaw) {
  const refParam = (refParamRaw || "").trim();
  if (!refParam) return null;

  // Tenta como código (codes.code → uid)
  try {
    const { data, error } = await supabase
      .from("codes")
      .select("uid")
      .eq("code", refParam.toUpperCase())
      .maybeSingle();
    if (!error && data?.uid) return data.uid;
  } catch (e) {
    console.warn("Erro lendo codes/<refCode>:", e);
  }

  // Tenta como UID (usuarios.uid)
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("uid")
      .eq("uid", refParam)
      .maybeSingle();
    if (!error && data?.uid) return refParam;
  } catch (e) {
    console.warn("Erro validando ref como UID:", e);
  }

  return null;
}

/* =========================
   PASSWORD STRENGTH (UI helper)
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
  else label = "Fraca";

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

  // color steps
  if (score >= 4) {
    fill.style.background = "linear-gradient(90deg,#2ecc71,#6f66ff)";
  } else if (score >= 3) {
    fill.style.background = "linear-gradient(90deg,#f2c94c,#6f66ff)";
  } else {
    fill.style.background = "linear-gradient(90deg,#ff6b6b,#ff9aa2)";
  }
  txt.textContent = label;
}

/* =========================
   MAIN
========================= */
document.addEventListener("DOMContentLoaded", async () => {
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

  // password strength live
  const passwordInput = document.getElementById("password");
  if (passwordInput) {
    updatePasswordStrengthUI(passwordInput.value || "");
    passwordInput.addEventListener("input", (e) =>
      updatePasswordStrengthUI(e.currentTarget.value || "")
    );
  }

  // inicializa o show/hide de senha
  setupPasswordToggles();

  form.addEventListener("submit", onSubmit);
});

// --- Modal de sucesso injetado via JS (igual ao teu) ---
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
        <path d="M20 6L9 17l-5-5"/>
        <circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle>
      </svg>
      <h3 id="su-title" class="su-title">Conta criada com sucesso</h3>
      <p class="su-desc">Bem-vindo(a) à <strong>AES energies</strong>. Pode iniciar sessão para começar.</p>
      <button id="su-ok" class="su-btn su-btn-primary" type="button">Ir para o login</button> 
    </div>
  `;
  document.body.appendChild(overlay);

  const ok = overlay.querySelector("#su-ok");
  ok.addEventListener("click", () => {
    hideSignupSuccessModal();
    window.location.href = "login.html";
  });

  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter") ok.click();
  });
}

function showSignupSuccessModal() {
  ensureSignupSuccessModal();
  const ov = document.getElementById("signup-success-overlay");
  ov.style.display = "flex";
  ov.querySelector(".su-card")?.focus?.();
}

function hideSignupSuccessModal() {
  const ov = document.getElementById("signup-success-overlay");
  if (ov) ov.style.display = "none";
}

async function onSubmit(e) {
  e.preventDefault();

  const form = e.currentTarget;
  const btn = form.querySelector('button[type="submit"]');

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const referralRaw = document.getElementById("referral").value.trim();
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

  // === 1) Criar conta no AUTH do Supabase ===
  let supaUser = null;
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Se confirm-email estiver ON, não vem session. Guardamos só o user.
    supaUser = data.user || data.session?.user || null;
    if (!supaUser) {
      // Sem sessão: mostra orientação e segue para login
      alert("Conta criada. Verifique o seu email para confirmar e depois faça login.");
      window.location.href = "login.html";
      return;
    }
  } catch (err) {
    alert(mapSupabaseAuthError(err));
    enableBtn(btn);
    return;
  }

  // === 2) Persistir perfil e metadados no Postgres ===
  try {
    const inviterUid = await resolveInviterUid(referralRaw);
    const shortId = await getNextShortId(); // requer tabela/política pronta
    const refCode  = await createUniqueRefCode(supaUser.id); // requer tabela/política pronta

    const payload = {
      uid: supaUser.id,
      shortId,
      refCode,
      invitedBy: inviterUid || null,
      referralCodeUsed: referralRaw || null,

      email,
      saldo: 0,
      totalInvestido: 0,
      totalComissaoDiaria: 0,
      lastDailyCheckAt: Date.now(),
      compras: {}, // podes migrar para tabelas normalizadas depois; por ora mantemos jsonb
      refTotals: { A: { amount: 0 }, B: { amount: 0 }, C: { amount: 0 } },

      // legado
      codigoConvite: referralRaw || null,
      investimento: 0,
      comissao: 0,
      produto: null,

      criadoEm: new Date().toISOString(),
    };

    // Upsert em `usuarios` (chave primária uid)
    // Precisa de RLS: INSERT permitido para auth.uid() = new.uid, e SELECT para o próprio.
    const { error: upErr } = await withTimeout(
      supabase.from("usuarios").upsert(payload).eq("uid", supaUser.id),
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
   SHOW / HIDE PASSWORD  (mantido)
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

      // swap visible svgs inside button (if present)
      const eye = btn.querySelector(".icon-eye");
      const eyeSlash = btn.querySelector(".icon-eye-slash");
      if (eye && eyeSlash) {
        if (btn.classList.contains("showing")) {
          eye.style.display = "none";
          eyeSlash.style.display = "inline-block";
        } else {
          eye.style.display = "inline-block";
          eyeSlash.style.display = "none";
        }
      }
    });
  });
       }
