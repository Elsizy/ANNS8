// sf-pay-set-in.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  push,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const DRAFT_KEY = "deposit_draft_v1";

const nameEl = document.getElementById("depositant-name");
const proofEl = document.getElementById("proof-file");
const sendBtn = document.getElementById("send");

let currentUser = null;
let draft = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) {
    alert("Sessão expirada. Recomece o depósito.");
    window.location.href = "deposito.html";
    return;
  }
  draft = JSON.parse(raw);
});

sendBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  const depositantName = nameEl.value.trim();
  if (!depositantName) {
    alert("Informe o nome do depositante.");
    return;
  }
  const file = proofEl.files?.[0] || null;
  if (!file) {
    alert("Selecione o comprovativo.");
    return;
  }

  sendBtn.disabled = true;

  try {
    // 1) cria o registro no deposits (pendente)
    const depRef = push(ref(db, "deposits"));
    const depId = depRef.key;

    // 2) Faz upload do comprovativo
    const storage = getStorage();
    const proofPath = `proofs/${currentUser.uid}/${depId}_${file.name}`;
    const fileRef = sRef(storage, proofPath);
    await uploadBytes(fileRef, file);
    const proofUrl = await getDownloadURL(fileRef);

    const payload = {
      id: depId,
      userId: currentUser.uid,
      method: draft.method,
      bank: draft.bank,
      bankData: draft.bankData || {},
      amountBase: draft.amountBase,
      amountExact: draft.amountExact,
      depositantName,
      proofUrl,
      status: "pendente",   // pendente -> processando -> concluído/rejeitado
      createdAt: Date.now()
    };

    await set(depRef, payload);

    // 3) também cria um espelho no nó do usuário
    await set(ref(db, `usuarios/${currentUser.uid}/deposits/${depId}`), {
      ...payload
    });

    // limpeza de rascunho
    sessionStorage.removeItem(DRAFT_KEY);

    alert("Depósito enviado. Aguarde aprovação.");
    window.location.href = "registrodeposito.html";
  } catch (e) {
    console.error("Erro ao enviar depósito:", e);
    alert("Erro ao enviar o depósito. Tente novamente.");
  } finally {
    sendBtn.disabled = false;
  }
});
