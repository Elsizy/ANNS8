// retirada.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  push,
  update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const TAXA = 0.10;
const MIN_WITHDRAW = 2500; // <<< mantém
const WITHDRAW_SUCCESS_DELAY_MS = 3000; // tempo antes de redirecionar após sucesso

let uid = null;
let saldoAtual = 0;
let accounts = {};
let pickedAccountId = null;
let hasAnyProduct = false;     // mantém
let hasOpenWithdrawal = false; // mantém

// ===============================
//  MODAIS (Confirmar / Sucesso)
//  — estilo inspirado no home.js
// ===============================
function ensureWithdrawStyles() {
  if (document.getElementById("wd-style")) return;
  const style = document.createElement("style");
  style.id = "wd-style";
  style.textContent = `
    .wd-overlay{position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.6); z-index:9999}
    .wd-card{background:#fff; border-radius:14px; padding:22px 18px; max-width:380px; width:92%; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,.18)}
    .wd-title{font-size:18px; margin:6px 0 4px; color:#111}
    .wd-desc{font-size:14px; color:#555; margin:0}
    .wd-hint{font-size:12px; color:#777; margin-top:6px}
    .wd-actions{display:flex; gap:10px; margin-top:16px}
    .wd-btn{flex:1; border:0; border-radius:10px; padding:10px 14px; font-weight:600; cursor:pointer}
    .wd-btn-cancel{background:#f2f3f5; color:#333}
    .wd-btn-ok{background:#6f66ff; color:#fff}
    .wd-btn:focus{outline:2px solid rgba(111,102,255,.35); outline-offset:2px}
    .wd-icon{width:44px; height:44px; color:#6f66ff}
    .wd-icon-success{color:#2ecc71}
    .wd-small{font-size:12px; color:#666}
  `;
  document.head.appendChild(style);
}

function ensureWithdrawConfirmModal() {
  if (document.getElementById("withdraw-confirm-overlay")) return;
  ensureWithdrawStyles();

  const overlay = document.createElement("div");
  overlay.id = "withdraw-confirm-overlay";
  overlay.className = "wd-overlay";
  overlay.innerHTML = `
    <div class="wd-card" role="dialog" aria-modal="true" aria-labelledby="wd-confirm-title" tabindex="-1">
      <svg class="wd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle>
        <path d="M12 8v5"></path><circle cx="12" cy="16" r="1"></circle>
      </svg>
      <h3 id="wd-confirm-title" class="wd-title">Confirmar retirada</h3>
      <p id="wd-confirm-desc" class="wd-desc"></p>
      <div class="wd-actions">
        <button id="wd-confirm-cancel" class="wd-btn wd-btn-cancel" type="button">Cancelar</button>
        <button id="wd-confirm-ok" class="wd-btn wd-btn-ok" type="button">Confirmar</button>
      </div>
      <p class="wd-hint wd-small">Você poderá acompanhar em “Registros de retirada”.</p>
    </div>
  `;
  document.body.appendChild(overlay);
}

function confirmWithdrawUI({ gross, fee, net, bank, holder, iban }) {
  ensureWithdrawConfirmModal();

  const ov = document.getElementById("withdraw-confirm-overlay");
  const desc = document.getElementById("wd-confirm-desc");
  const btnCancel = document.getElementById("wd-confirm-cancel");
  const btnOk = document.getElementById("wd-confirm-ok");
  const card = ov.querySelector(".wd-card");

  desc.innerHTML =
    `Confirmar retirada de <strong>${formatKz(gross)}</strong>?<br>` +
    `Taxa: <strong>${formatKz(fee)}</strong> • Receberá: <strong>${formatKz(net)}</strong><br>` +
    `Conta: <strong>${bank}</strong> • ${holder}${iban ? ` • <span class="wd-small">${iban}</span>` : ""}`;

  ov.style.display = "flex";
  card?.focus?.();

  return new Promise((resolve) => {
    let done = false;
    const finish = (val) => {
      if (done) return;
      done = true;
      ov.style.display = "none";
      btnCancel.onclick = null;
      btnOk.onclick = null;
      ov.onclick = null;
      document.removeEventListener("keydown", onKey);
      resolve(val);
    };
    const onKey = (e) => {
      if (e.key === "Escape") finish(false);
      if (e.key === "Enter") finish(true);
    };

    btnCancel.onclick = () => finish(false);
    btnOk.onclick = () => finish(true);
    ov.onclick = (e) => { if (e.target === ov) finish(false); };
    document.addEventListener("keydown", onKey);
    btnOk.focus();
  });
}

function ensureWithdrawSuccessModal() {
  if (document.getElementById("withdraw-success-overlay")) return;
  ensureWithdrawStyles();

  const overlay = document.createElement("div");
  overlay.id = "withdraw-success-overlay";
  overlay.className = "wd-overlay";
  overlay.innerHTML = `
    <div class="wd-card" role="dialog" aria-modal="true" aria-labelledby="wd-success-title" tabindex="-1">
      <svg class="wd-icon wd-icon-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6L9 17l-5-5"></path>
        <circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle>
      </svg>
      <h3 id="wd-success-title" class="wd-title">Pedido enviado</h3>
      <p id="wd-success-desc" class="wd-desc"></p>
      <p class="wd-hint">Você será redirecionado(a) em instantes…</p>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showWithdrawSuccessModal({ gross, net, bank }) {
  ensureWithdrawSuccessModal();
  const ov = document.getElementById("withdraw-success-overlay");
  const desc = document.getElementById("wd-success-desc");
  desc.innerHTML = `Sua solicitação de retirada de <strong>${formatKz(gross)}</strong> foi enviada. Receberá <strong>${formatKz(net)}</strong> na conta <strong>${bank}</strong>.`;
  ov.style.display = "flex";
  ov.querySelector(".wd-card")?.focus?.();
}

function hideWithdrawSuccessModal() {
  const ov = document.getElementById("withdraw-success-overlay");
  if (ov) ov.style.display = "none";
}

// ===============================
// DOM
// ===============================
const saldoEl        = document.getElementById("saldo-total");
const bankBtn        = document.getElementById("bank-btn");
const bankPickedEl   = document.getElementById("bank-picked");
const valorInput     = document.getElementById("valor");
const taxaEl         = document.getElementById("taxa");
const liquidoEl      = document.getElementById("valor-liquido");
const enviarBtn      = document.getElementById("btn-enviar");

const modal          = document.getElementById("bank-modal");
const bankListEl     = document.getElementById("bank-list");
const closeModalBtn  = document.getElementById("close-modal");

// ----- feedback modal -----
const feedbackModal = document.getElementById("feedback-modal");
const feedbackText  = document.getElementById("feedback-text");
const feedbackClose = document.getElementById("feedback-close");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  uid = user.uid;

  try {
    const uSnap = await get(ref(db, `usuarios/${uid}`));
    if (!uSnap.exists()) {
      showFeedback("error", "Usuário não encontrado.");
      window.location.href = "login.html";
      return;
    }

    const u = uSnap.val();
    saldoAtual = u.saldo || 0;

    // 1) Verifica se o usuário tem pelo menos um produto comprado
    const comprasSnap = await get(ref(db, `usuarios/${uid}/compras`));
    hasAnyProduct = comprasSnap.exists();

    // 2) Verifica se há retiradas pendentes/processing
    const wSnap = await get(ref(db, `usuarios/${uid}/withdrawals`));
    if (wSnap.exists()) {
      const vals = Object.values(wSnap.val() || {});
      hasOpenWithdrawal = vals.some(w => w.status === "pending" || w.status === "processing");
    }

    // 3) Carrega contas bancárias (se não tiver, manda criar)
    const accSnap = await get(ref(db, `usuarios/${uid}/bankAccounts`));
    if (!accSnap.exists()) {
      showFeedback("error", "Você precisa cadastrar uma conta bancária antes de retirar.");
      window.location.href = "conta.html";
      return;
    }

    accounts = accSnap.val();

    // mostra saldo
    saldoEl.textContent = formatKz(saldoAtual);

    // monta lista de bancos
    buildBankList(accounts);

    // listeners
    bankBtn.addEventListener("click", () => modal.classList.remove("hidden"));
    closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
    valorInput.addEventListener("input", calcResumo);
    enviarBtn.addEventListener("click", onSubmit);
  } catch (e) {
    console.error("Erro ao carregar dados de retirada:", e);
    alert("Falha ao carregar dados. Tente novamente.");
  }
});

// Modal de feedback (success | error)
let feedbackTimer = null;

function showFeedback(type, message, { autoclose = 2000 } = {}) {
  if (!feedbackModal) return alert(message); // fallback
  // limpa estado
  feedbackModal.classList.remove("success","error","hidden","show");
  // aplica tipo + mensagem
  feedbackModal.classList.add(type); // "success" ou "error"
  feedbackText.textContent = message;

  // mostra
  requestAnimationFrame(() => feedbackModal.classList.add("show"));

  // foco e acessibilidade
  feedbackClose?.focus();

  // autoclose
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (autoclose) {
    feedbackTimer = setTimeout(hideFeedback, autoclose);
  }
}
function hideFeedback() {
  if (!feedbackModal) return;
  feedbackModal.classList.remove("show");
  setTimeout(() => feedbackModal.classList.add("hidden"), 180);
  if (feedbackTimer) { clearTimeout(feedbackTimer); feedbackTimer = null; }
}
// interações
feedbackClose?.addEventListener("click", hideFeedback);
feedbackModal?.addEventListener("click", (e) => { if (e.target === feedbackModal) hideFeedback(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") hideFeedback(); });

function buildBankList(accs) {
  bankListEl.innerHTML = "";
  Object.entries(accs).forEach(([id, acc]) => {
    const li = document.createElement("li");
    li.textContent = `${acc.bank} • ${acc.holder}`;
    li.addEventListener("click", () => {
      pickedAccountId = id;
      bankPickedEl.textContent = acc.bank;
      modal.classList.add("hidden");
      calcResumo(); // atualiza o resumo com o novo banco selecionado
    });
    bankListEl.appendChild(li);
  });
}

function calcResumo() {
  const v = parseFloat(valorInput.value || "0");
  const taxa = Math.max(0, v * TAXA);
  const liquido = Math.max(0, v - taxa);

  taxaEl.textContent = formatKz(taxa);
  liquidoEl.textContent = formatKz(liquido);
}

// ---- NOVO: função para exibir erro estilizado ----
function showError(msg) {
  const box = document.getElementById("withdraw-error");
  if (!box) {
    alert(msg);
    return;
  }
  box.textContent = msg;
  box.classList.remove("hidden");
  setTimeout(() => {
    box.classList.add("hidden");
  }, 4000);
}

async function onSubmit() {
  // Bloqueio de horário (somente das 9h às 21h)
  const now = new Date();
  const hora = now.getHours();
  if (hora < 9 || hora >= 21) {
    showError("Os saques só estão disponíveis das 9h às 21h.");
    return;
  }

  // Bloqueios adicionais (mantidos)
  if (!hasAnyProduct) {
    showFeedback("error", "Para retirar fundos é necessário ter comprado pelo menos 1 produto.");
    return;
  }
  if (hasOpenWithdrawal) {
    showFeedback("error", "Você já possui um pedido de retirada pendente. Aguarde a conclusão para solicitar outro.");
    return;
  }

  const v = parseFloat(valorInput.value || "0");
  if (!pickedAccountId) {
    showFeedback("error", "Escolha um banco.");
    return;
  }
  if (!v || v <= 0) {
    showFeedback("error", "Digite um valor válido.");
    return;
  }
  if (v < MIN_WITHDRAW) {
    showFeedback("error", `O valor mínimo para retirada é ${formatKz(MIN_WITHDRAW)}.`);
    return;
  }
  if (v > saldoAtual) {
    showFeedback("error", "Saldo insuficiente.");
    return;
  }

  const acc = accounts[pickedAccountId];
  if (!acc) {
    showFeedback("error", "Conta bancária inválida.");
    return;
  }

  // Cálculo padronizado (duas casas) — mantém consistência com o resumo
  const taxa = Math.max(0, v * TAXA);
  const liquido = Math.max(0, v - taxa);

  // >>> Modal ESTILIZADO de confirmação (substitui o confirm nativo)
  const ok = await confirmWithdrawUI({
    gross: v,
    fee: taxa,
    net: liquido,
    bank: acc.bank,
    holder: acc.holder,
    iban: acc.iban
  });
  if (!ok) return;

  enviarBtn.disabled = true;

  try {
    // debita saldo do usuário agora
    const novoSaldo = saldoAtual - v;

    const reqRef = push(ref(db, `withdrawRequests`));
    const reqId = reqRef.key;

    const payload = {
      id: reqId,
      uid,
      bank: acc.bank,
      holder: acc.holder,
      iban: acc.iban,
      amountGross: round2(v),
      fee: round2(taxa),
      amountNet: round2(liquido),
      status: "pending", // admin vai mudar para processing / done / rejected
      createdAt: Date.now()
    };

    const updates = {};
    // salva request global (para o admin)
    updates[`withdrawRequests/${reqId}`] = payload;
    // salva também na pasta do usuário (histórico)
    updates[`usuarios/${uid}/withdrawals/${reqId}`] = payload;
    // debita saldo
    updates[`usuarios/${uid}/saldo`] = round2(novoSaldo);

    // >>>>>> CONTINUA SEM atualizar retiradaTotal aqui! <<<<<<
    // Somente quando o admin concluir no admin.js

    await update(ref(db), updates);

    // Modal de SUCESSO (estilizado)
    showWithdrawSuccessModal({ gross: v, net: liquido, bank: acc.bank });
    setTimeout(() => {
      window.location.href = "registroretirada.html";
    }, WITHDRAW_SUCCESS_DELAY_MS);
  } catch (e) {
    console.error(e);
    showFeedback("error", "Erro ao enviar o pedido de retirada.");
  } finally {
    enviarBtn.disabled = false;
  }
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// ===============================
// Fim do arquivo
// ===============================
