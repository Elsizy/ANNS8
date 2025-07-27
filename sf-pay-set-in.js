// sf-pay-set-in.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref as dbRef,
  push,
  update,
  get,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// === ALTERAÇÃO: usamos Supabase em vez de Firebase Storage ===
import { uploadProof } from "./supabase-upload.js";

/** Onde guardamos o rascunho desde deposito.js */
const DRAFT_KEY = "deposit_draft_v1";

/* DOM */
const nameInput = document.getElementById("depositant-name");
const fileInput = document.getElementById("proof-file");
const sendBtn   = document.getElementById("send");

let currentUser = null;
let draft = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  // carrega o draft
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) {
    alert("Fluxo de depósito não encontrado. Recomece.");
    window.location.href = "deposito.html";
    return;
  }

  try {
    draft = JSON.parse(raw);
    console.log("[sf-pay-set-in] draft carregado:", draft);

    // segurança extra
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

    // garante amountExact
    if (typeof draft.amountExact !== "number" || Number.isNaN(draft.amountExact)) {
      draft.amountExact = draft.amountBase;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }

    // **Registra o click aqui, só depois que tudo está validado**
    sendBtn?.addEventListener("click", onSend);

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

  const depositantName = (nameInput.value || "").trim();
  const file = fileInput.files?.[0];

  if (!depositantName) {
    alert("Informe o nome do depositante.");
    return;
  }
  if (!file) {
    alert("Anexe o comprovativo (imagem ou PDF).");
    return;
  }

  sendBtn.disabled = true;

  try {
    // 1) sobe o comprovativo (AGORA VIA SUPABASE)
    const proofUrl = await uploadProof(file, currentUser.uid);

    // 2) gera um id e grava requisição global + histórico do usuário
    const reqRef = push(dbRef(db, "depositRequests"));
    const id = reqRef.key;

    const payload = {
      id,
      uid: currentUser.uid,
      method: draft.method,
      amountBase: draft.amountBase,
      amountExact: draft.amountExact,
      bank: draft.bank,
      bankData: draft.bankData, // { name, holder, iban }
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

    // limpa o draft
    sessionStorage.removeItem(DRAFT_KEY);

    alert("Depósito enviado com sucesso! Aguarde a validação.");
    window.location.href = "registrodeposito.html";
  } catch (err) {
    console.error("Erro ao enviar comprovativo:", err);
    alert("Falha ao enviar o depósito. Tente novamente.");
  } finally {
    sendBtn.disabled = false;
  }
}

function sanitizeFilename(name) {
  return name.replace(/[^\w.\-]+/g, "_");
}
