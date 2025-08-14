// sf-pay-set-in.js (versão compatível e final)
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref as dbRef, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { uploadProof } from "./supabase-upload.js";

const DRAFT_KEY = "deposit_draft_v1";

// Compat: aceita IDs novos OU antigos (não quebra o HTML existente)
const nameInput = document.getElementById("payer-name") || document.getElementById("depositant-name");
const fileInput = document.getElementById("proof-input") || document.getElementById("proof-file");
const sendBtn   = document.getElementById("send");

// Se algum elemento essencial não existir, falha cedo:
if (!nameInput || !fileInput || !sendBtn) {
  console.error("[sf-pay-set-in] Elementos do DOM não encontrados. Verifique IDs.");
}

let currentUser = null;
let draft = null;

// Habilita o botão apenas quando nome + arquivo estiverem ok
function refreshButtonState() {
  const hasName = !!(nameInput && nameInput.value.trim());
  const hasFile = !!(fileInput && fileInput.files && fileInput.files[0]);
  if (sendBtn) sendBtn.disabled = !(hasName && hasFile);
}
nameInput?.addEventListener("input", refreshButtonState);
fileInput?.addEventListener("change", refreshButtonState);

// Inicia botão desabilitado (UX)
if (sendBtn) sendBtn.disabled = true;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) {
    alert("Fluxo de depósito não encontrado. Recomece.");
    window.location.href = "deposito.html";
    return;
  }

  try {
    draft = JSON.parse(raw);
    console.log("[sf-pay-set-in] draft carregado:", draft);

    if (
      !draft?.uid ||
      !draft?.amountBase ||
      !draft?.method ||
      !draft?.bank ||
      !draft?.bankData
    ) {
      alert("Informações do depósito incompletas. Recomece.");
      window.location.href = "deposito.html";
      return;
    }

    if (typeof draft.amountExact !== "number" || Number.isNaN(draft.amountExact)) {
      draft.amountExact = draft.amountBase;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }

    sendBtn?.addEventListener("click", onSend);
    refreshButtonState();
  } catch (e) {
    console.error("[sf-pay-set-in] erro ao parsear draft:", e);
    alert("Rascunho inválido. Recomece.");
    window.location.href = "deposito.html";
    return;
  }
});

async function onSend() {
  if (!currentUser || !draft) {
    console.warn("[sf-pay-set-in] Sem user ou draft, abortando.");
    return;
  }

  const depositantName = (nameInput?.value || "").trim();
  const file = fileInput?.files?.[0];

  if (!depositantName) { alert("Informe o nome do pagador."); return; }
  if (!file) { alert("Anexe o comprovativo (imagem ou PDF)."); return; }

  // UX: trava botão e mostra progresso
  const originalText = sendBtn.textContent;
  sendBtn.disabled = true;
  sendBtn.textContent = "Enviando...";

  try {
    // 1) Upload do comprovativo (Supabase) – deve retornar a URL pública
    const proofUrl = await uploadProof(file, currentUser.uid);

    // 2) Registra pedido em 2 paths
    const reqRef = push(dbRef(db, "depositRequests"));
    const id = reqRef.key;

    const payload = {
      id,
      uid: currentUser.uid,
      method: draft.method,            // "SF-PAY"
      amountBase: draft.amountBase,
      amountExact: draft.amountExact,
      bank: draft.bank,
      bankData: draft.bankData,        // { id, name, holder, iban }
      depositantName,
      proofUrl,
      status: "pending",
      createdAt: Date.now()
    };

    console.log("[sf-pay-set-in] payload que será salvo:", payload);

    const updates = {};
    updates[`depositRequests/${id}`] = payload;
    updates[`usuarios/${currentUser.uid}/deposits/${id}`] = payload;

    await update(dbRef(db), updates);

    // 3) Sucesso total ⇒ limpa rascunho e redireciona
    sessionStorage.removeItem(DRAFT_KEY);
    // Opcional: alert de sucesso (se quiser manter)
    // alert("Depósito enviado com sucesso! Aguarde a validação.");
    window.location.href = "sf-pay-sucess.html";
  } catch (err) {
    console.error("[sf-pay-set-in] Falha ao enviar depósito:", err);
    alert("Falha ao enviar o depósito: " + (err?.message || "tente novamente."));
    sendBtn.disabled = false;
    sendBtn.textContent = originalText;
  }
}
