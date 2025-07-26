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

// DOM
const amountInput = document.getElementById("deposit-amount");
const presets = document.querySelectorAll(".preset");
const pickMethodBtn = document.getElementById("pick-method");
const methodLabelEl = document.getElementById("method-label");
const continueBtn = document.getElementById("continue");

// Modal
const methodModal = document.getElementById("method-modal");
const methodList = document.getElementById("method-list");
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
  const raw = parseFloat(amountInput.value || "0");
  if (!raw || raw <= 0) {
    alert("Informe um valor válido.");
    return;
  }
  const methodId = pickMethodBtn.dataset.method || "";
  if (!methodId) {
    alert("Selecione o método.");
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
