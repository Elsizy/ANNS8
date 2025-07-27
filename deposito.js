// deposito.js
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/**
 * Guardamos o rascunho do depósito em sessionStorage
 * para reaproveitar nas próximas telas (sf-pay.html, sf-pay-set.html, etc).
 */
export const DRAFT_KEY = "deposit_draft_v1";

const METHODS = [{ id: "sf.pay-set", label: "sf.pay-set" }];

let currentUser = null;

// ==== NOVO: janela de horário permitida ====
const DEPOSIT_START_H = 9;   // 09h
const DEPOSIT_END_H   = 21;  // 21h (exclusivo)

// ==== NOVO: depósito mínimo ====
const MIN_DEPOSIT = 5000; // ajuste aqui o valor mínimo desejado

// DOM
const amountInput   = document.getElementById("deposit-amount");
const presets       = document.querySelectorAll(".preset");
const pickMethodBtn = document.getElementById("pick-method");
const methodLabelEl = document.getElementById("method-label");
const continueBtn   = document.getElementById("continue");

// NOVO: caixa de erro estilizada
const errorBox = document.getElementById("deposit-error");

// Modal
const methodModal = document.getElementById("method-modal");
const methodList  = document.getElementById("method-list");
const closeMethod = document.getElementById("close-method");

// ----- Auth -----
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  buildMethodList();
});

// ----- UI -----
presets.forEach((btn) => {
  btn.addEventListener("click", () => {
    presets.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    amountInput.value = btn.dataset.value;
  });
});

pickMethodBtn.addEventListener("click", () => {
  methodModal.classList.remove("hidden");
});

closeMethod.addEventListener("click", () => {
  methodModal.classList.add("hidden");
});

continueBtn.addEventListener("click", () => {
  // limpa o erro visual (se estiver visível)
  hideError();

  const raw = parseFloat(amountInput.value || "0");
  if (!raw || raw <= 0) {
    alert("Informe um valor válido.");
    return;
  }

  // ==== NOVO: validação do depósito mínimo ====
  if (raw < MIN_DEPOSIT) {
    showError(`O depósito mínimo é <strong>Kz ${MIN_DEPOSIT.toLocaleString("pt-PT")}</strong>.`);
    return;
  }

  const methodId = pickMethodBtn.dataset.method || "";
  if (!methodId) {
    alert("Selecione o método.");
    return;
  }

  // ==== NOVO: validação de horário usando a caixa estilizada ====
  if (!isWithinDepositWindow()) {
    showError(`Depósitos só estão disponíveis entre <strong>${DEPOSIT_START_H}h</strong> e <strong>${DEPOSIT_END_H}h</strong>.`);
    return;
  }

  // Guarda rascunho
  const draft = {
    uid: currentUser.uid,
    amountBase: Math.floor(raw),
    method: methodId,
    bank: null,        // será definido em sf-pay.html
    bankData: null,    // será definido em sf-pay.html (adminBanks)
    amountExact: null, // será definido em sf-pay-set.html (ou onde fizer sentido)
  };
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));

  window.location.href = "sf-pay.html";
});

// ----- functions -----
function buildMethodList() {
  methodList.innerHTML = "";
  METHODS.forEach((m) => {
    const li = document.createElement("li");
    li.textContent = m.label;
    li.addEventListener("click", () => {
      pickMethodBtn.dataset.method = m.id;
      methodLabelEl.textContent = m.label;
      methodModal.classList.add("hidden");
    });
    methodList.appendChild(li);
  });
}

// ==== NOVO utilitário: erro dinâmico ====
function showError(htmlMsg) {
  if (!errorBox) return;
  errorBox.innerHTML = htmlMsg;
  errorBox.style.display = "block";
}
function hideError() {
  if (!errorBox) return;
  errorBox.style.display = "none";
}

// ==== NOVO ====
function isWithinDepositWindow(date = new Date()) {
  const h = date.getHours();
  // permitido entre 09:00 (inclusive) e 21:00 (exclusivo)
  return h >= DEPOSIT_START_H && h < DEPOSIT_END_H;
    }
