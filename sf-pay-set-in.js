// === SF-PAY – Passo 3 (Enviar comprovativo) ===
// Redireciona para sf-pay-sucess.html somente se upload+gravação derem certo.

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref as dbRef, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Upload do comprovativo (Supabase)
import { uploadProof } from "./supabase-upload.js";

const DRAFT_KEY = "deposit_draft_v1";

// === DOM (mantém IDs do seu HTML atual) ===
const fileInput = document.getElementById("proof-file");       // (antes: proof-input)
const nameInput = document.getElementById("depositant-name");  // (antes: payer-name)
const sendBtn   = document.getElementById("send");

let user  = null;
let draft = null;

// Habilita o botão se nome + arquivo estiverem preenchidos
function refreshButtonState() {
  const hasName = !!(nameInput?.value || "").trim();
  const hasFile = !!(fileInput?.files && fileInput.files[0]);
  if (sendBtn) sendBtn.disabled = !(hasName && hasFile);
}

// listeners
nameInput?.addEventListener("input", refreshButtonState);
fileInput?.addEventListener("change", refreshButtonState);

// estado inicial
refreshButtonState();

onAuthStateChanged(auth, async (u) => {
  if (!u) { window.location.href = "login.html"; return; }
  user = u;

  // carrega rascunho
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) { alert("Fluxo de depósito não encontrado. Recomece."); window.location.href = "deposito.html"; return; }

  try {
    draft = JSON.parse(raw);
  } catch {
    alert("Rascunho inválido. Recomece."); window.location.href = "deposito.html"; return;
  }

  // valida fluxo essencial
  if (!draft?.uid || !draft?.amountBase || !draft?.method || !draft?.bank || !draft?.bankData) {
    alert("Informações do depósito incompletas. Recomece.");
    window.location.href = "deposito.html"; 
    return;
  }

  // garante amountExact
  if (typeof draft.amountExact !== "number" || Number.isNaN(draft.amountExact)) {
    draft.amountExact = draft.amountBase;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  // registra o click somente depois de tudo validado
  sendBtn?.addEventListener("click", onSend);
});

async function onSend() {
  const depositantName = (nameInput.value || "").trim();
  const file = fileInput.files?.[0];

  if (!depositantName) { alert("Informe o nome do pagador."); return; }
  if (!file) { alert("Anexe o comprovativo (imagem ou PDF)."); return; }

  // (opcional) checar tamanho: ex. 10MB
  // if (file.size > 10 * 1024 * 1024) { alert("Arquivo muito grande (máx. 10MB)."); return; }

  sendBtn.disabled = true;
  const originalText = sendBtn.textContent;
  sendBtn.textContent = "Enviando...";

  try {
    // 1) Sobe o comprovativo para a Supabase
    const proofUrl = await uploadProof(file, user.uid);

    // 2) Gera ID e grava em /depositRequests e /usuarios/{uid}/deposits/{id}
    const reqRef = push(dbRef(db, "depositRequests"));
    const id = reqRef.key;

    const payload = {
      id,
      uid: user.uid,
      method: draft.method,        // "SF-PAY" (garantir que veio setado dos passos anteriores)
      amountBase: draft.amountBase,
      amountExact: draft.amountExact,
      bank: draft.bank,
      bankData: draft.bankData,    // { id, name, holder, iban }
      depositantName,
      proofUrl,
      status: "pending",
      createdAt: Date.now()
    };

    const updates = {};
    updates[`depositRequests/${id}`] = payload;
    updates[`usuarios/${user.uid}/deposits/${id}`] = payload;
    await update(dbRef(db), updates);

    // 3) limpa rascunho e redireciona SOMENTE no sucesso
    sessionStorage.removeItem(DRAFT_KEY);
    window.location.href = "sf-pay-sucess.html";
  } catch (err) {
    console.error("[sf-pay-set-in] falha no envio:", err);
    alert("Falha ao enviar o depósito: " + (err?.message || "tente novamente."));
    sendBtn.disabled = false;
    sendBtn.textContent = originalText;
  }
}
