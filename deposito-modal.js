// deposito-modal.js
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/** Mantemos a mesma chave de rascunho */
export const DRAFT_KEY = "deposit_draft_v1";

/** Canal único (pode crescer no futuro) */
const DEFAULT_METHOD_ID = "sf-pay-in";

/** Mantemos regra de mínimo para não quebrar fluxo posterior */
const MIN_DEPOSIT = 5000;

let currentUser = null;

// DOM (IDs compatíveis com o modal novo)
const openBtn       = document.getElementById("open-deposito");
const modalOverlay  = document.getElementById("deposit-modal");
const closeBtn      = document.getElementById("dep-close");
const amountInput   = document.getElementById("deposit-amount");
const confirmBtn    = document.getElementById("continue");
const errorBox      = document.getElementById("deposit-error");
const saldoCardEl   = document.getElementById("saldo");     // existente no painel
const saldoModalEl  = document.getElementById("dep-saldo"); // valor dentro do modal

// ===== Auth (essência preservada) =====
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
});

// ===== Abrir / Fechar modal =====
if (openBtn) {
  openBtn.addEventListener("click", (e) => {
    e.preventDefault();
    hydrateSaldoInModal();
    amountInput.value = "";
    hideError();
    showModal();
  });
}

if (closeBtn) {
  closeBtn.addEventListener("click", () => hideModal());
}

function showModal() {
  if (!modalOverlay) return;
  modalOverlay.removeAttribute("hidden");
  setTimeout(() => amountInput?.focus(), 0);
}
function hideModal() {
  if (!modalOverlay) return;
  modalOverlay.setAttribute("hidden", "");
}

// ===== Confirmar (essência do fluxo original + validações mínimas) =====
if (confirmBtn) {
  confirmBtn.addEventListener("click", () => {
    hideError();

    const raw = parseFloat((amountInput?.value || "0").replace(",", "."));
    if (!raw || raw <= 0) {
      return showError("Informe um valor válido.");
    }
    if (raw < MIN_DEPOSIT) {
      return showError(`O depósito mínimo é <strong>Kz ${MIN_DEPOSIT.toLocaleString("pt-PT")}</strong>.`);
    }

    // método/canal (único por enquanto)
    const checked = document.querySelector('input[name="deposit-channel"]:checked');
    const methodId = checked?.value || DEFAULT_METHOD_ID;

    // Guarda rascunho como no projeto original
    const draft = {
      uid: currentUser?.uid || null,
      amountBase: Math.floor(raw),
      method: methodId,
      bank: null,
      bankData: null,
      amountExact: null,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));

    // Avança para o fluxo do canal (pedido do cliente)
    window.location.href = "sf-pay-in.html";
  });
}

// ===== Utilidades =====
function hydrateSaldoInModal() {
  // lê do painel "Saldo da conta" (ex.: "Kz 0,00") e joga no modal
  if (!saldoCardEl || !saldoModalEl) return;
  const rawText = (saldoCardEl.textContent || "").replace(/[^\d,.-]/g, "");
  // tenta converter (pt) "0,00" -> 0
  const normalized = rawText.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(normalized);
  saldoModalEl.textContent = Number.isFinite(num) ? num.toLocaleString("pt-PT") : "0";
}

function showError(htmlMsg) {
  if (!errorBox) return;
  errorBox.innerHTML = htmlMsg;
  errorBox.removeAttribute("hidden");
  errorBox.classList.add("show");
}
function hideError() {
  if (!errorBox) return;
  errorBox.setAttribute("hidden", "");
  errorBox.classList.remove("show");
}
