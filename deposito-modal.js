// deposito-modal.js
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const DRAFT_KEY = "deposit_draft_v1";
const DEFAULT_METHOD_ID = "sf-pay-in";

let currentUser = null;

// regras
const DEPOSIT_START_H = 9;   // 09h
const DEPOSIT_END_H   = 21;  // 21h (exclusivo)
const MIN_DEPOSIT     = 5000;

// DOM
const openBtn   = document.getElementById("open-deposito");
const overlay   = document.getElementById("deposit-modal");
const closeBtn  = document.getElementById("dep-close");
const saldoBig  = document.getElementById("saldo");
const saldoDep  = document.getElementById("dep-saldo");
const amountEl  = document.getElementById("deposit-amount");
const confirmEl = document.getElementById("continue");
const errBox    = document.getElementById("deposit-error");

// auth
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
});

// helpers
function lockScroll(lock) {
  const cls = "no-scroll";
  document.documentElement.classList.toggle(cls, lock);
  document.body.classList.toggle(cls, lock);
}
function openModal(){
  // copia saldo visível para o modal
  const txt = (saldoBig?.textContent || "").replace(/[^\d,.\s]/g,"").trim();
  saldoDep.textContent = txt || "0";

  // restaura rascunho (se houver)
  try {
    const old = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
    amountEl.value = old?.amountBase ? String(old.amountBase) : "";
  } catch {}

  hideError();
  overlay.hidden = false;
  lockScroll(true);
  // garante centralização mesmo se a página estiver rolada
  window.requestAnimationFrame(() => amountEl?.focus());
}
function closeModal(){
  overlay.hidden = true;
  lockScroll(false);
  hideError();
}

function isWithinWindow(d = new Date()){
  const h = d.getHours();
  return h >= DEPOSIT_START_H && h < DEPOSIT_END_H;
}
function showError(html){ if(errBox){ errBox.innerHTML = html; errBox.hidden = false; } }
function hideError(){ if(errBox){ errBox.hidden = true; } }

// eventos
openBtn?.addEventListener("click", (e)=>{ e.preventDefault(); openModal(); });
closeBtn?.addEventListener("click", closeModal);
overlay?.addEventListener("click", (e)=>{ if(e.target === overlay) closeModal(); });
document.addEventListener("keydown", (e)=>{ if(!overlay.hidden && e.key === "Escape") closeModal(); });

confirmEl?.addEventListener("click", ()=>{
  hideError();
  const raw = Number((amountEl.value || "").replace(/\s/g,""));
  if(!raw || raw <= 0){ showError("Informe um valor válido."); return; }
  if(raw < MIN_DEPOSIT){
    showError(`O depósito mínimo é <strong>Kz ${MIN_DEPOSIT.toLocaleString("pt-PT")}</strong>.`);
    return;
  }
  if(!isWithinWindow()){
    showError(`Depósitos disponíveis entre <strong>${DEPOSIT_START_H}h</strong> e <strong>${DEPOSIT_END_H}h</strong>.`);
    return;
  }

  const draft = {
    uid: currentUser?.uid || null,
    amountBase: Math.floor(raw),
    method: DEFAULT_METHOD_ID,
    bank: null, bankData: null, amountExact: null,
  };
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));

  window.location.href = "sf-pay-in.html";
});
