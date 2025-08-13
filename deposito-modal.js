// deposito-modal.js
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const DRAFT_KEY = "deposit_draft_v1";

// Canal único exibido no modal (rótulo fica no HTML)
const DEFAULT_METHOD_ID = "sf-pay-in";

let currentUser = null;

// Janela de horário e depósito mínimo (mantidos)
const DEPOSIT_START_H = 9;    // 09h
const DEPOSIT_END_H   = 21;   // 21h (exclusivo)
const MIN_DEPOSIT     = 5000; // ajuste se necessário

// DOM (pessoal.html)
const openBtn   = document.getElementById("open-deposito");
const overlay   = document.getElementById("deposit-modal");
const closeBtn  = document.getElementById("dep-close");
const saldoBig  = document.getElementById("saldo");      // do cartão grande
const saldoDep  = document.getElementById("dep-saldo");  // dentro do modal
const amountEl  = document.getElementById("deposit-amount");
const confirmEl = document.getElementById("continue");
const errBox    = document.getElementById("deposit-error");

// ----- Auth -----
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
});

// ----- Abrir / Fechar -----
function openModal() {
  // copiar o saldo do painel grande para o modal
  const txt = (saldoBig?.textContent || "").replace(/[^0-9,.\s]/g,"").trim();
  saldoDep.textContent = txt || "0";

  // rascunho anterior (se existir)
  try {
    const old = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
    amountEl.value = old?.amountBase ? String(old.amountBase) : "";
  } catch { /* noop */ }

  hideError();
  overlay.hidden = false;
  // foco no input
  setTimeout(()=> amountEl?.focus(), 50);
}
function closeModal() { overlay.hidden = true; hideError(); }

openBtn?.addEventListener("click", (e) => { e.preventDefault(); openModal(); });
closeBtn?.addEventListener("click", closeModal);
overlay?.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal(); // fecha ao tocar fora
});

// ----- Validações / Navegação -----
confirmEl?.addEventListener("click", () => {
  hideError();

  const raw = Number((amountEl.value || "").replace(/\s/g,""));
  if (!raw || raw <= 0) {
    showError("Informe um valor válido.");
    return;
  }
  if (raw < MIN_DEPOSIT) {
    showError(`O depósito mínimo é <strong>Kz ${MIN_DEPOSIT.toLocaleString("pt-PT")}</strong>.`);
    return;
  }
  if (!isWithinWindow()) {
    showError(`Depósitos disponíveis entre <strong>${DEPOSIT_START_H}h</strong> e <strong>${DEPOSIT_END_H}h</strong>.`);
    return;
  }

  const draft = {
    uid: currentUser?.uid || null,
    amountBase: Math.floor(raw),
    method: DEFAULT_METHOD_ID, // canal único
    bank: null,
    bankData: null,
    amountExact: null,
  };
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));

  window.location.href = "sf-pay-in.html";
});

// ----- helpers -----
function isWithinWindow(d = new Date()) {
  const h = d.getHours();
  return h >= DEPOSIT_START_H && h < DEPOSIT_END_H;
}
function showError(html) {
  if (!errBox) return;
  errBox.innerHTML = html;
  errBox.hidden = false;
}
function hideError() {
  if (!errBox) return;
  errBox.hidden = true;
  }
