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
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/** Onde guardamos o rascunho desde deposito.js */
const DRAFT_KEY = "deposit_draft_v1";

const storage = getStorage();

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
    // segurança extra: se não tiver uid ou amountBase, volta
    if (!draft?.uid || !draft?.amountBase || !draft?.method || !draft?.bank || !draft?.bankData) {
      alert("Informações do depósito incompletas. Recomece.");
      window.location.href = "deposito.html";
      return;
    }
  } catch {
    alert("Rascunho inválido. Recomece.");
    window.location.href = "deposito.html";
    return;
  }
});

sendBtn?.addEventListener("click", onSend);

async function onSend() {
  if (!currentUser || !draft) return;

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
    // 1) sobe o comprovativo
    const path = `depositProofs/${currentUser.uid}/${Date.now()}_${sanitizeFilename(file.name)}`;
    const sRef = storageRef(storage, path);
    await uploadBytes(sRef, file);
    const proofUrl = await getDownloadURL(sRef);

    // 2) gera um id e grava requisição global + histórico do usuário
    const reqRef = push(dbRef(db, "depositRequests"));
    const id = reqRef.key;

    // garanta amountExact (se ainda não foi definido, usa base)
    const amountExact = typeof draft.amountExact === "number" && !Number.isNaN(draft.amountExact)
      ? draft.amountExact
      : draft.amountBase;

    const payload = {
      id,
      uid: currentUser.uid,
      method: draft.method,
      amountBase: draft.amountBase,
      amountExact,
      bank: draft.bank,
      bankData: draft.bankData, // { holder, iban }
      depositantName,
      proofUrl,
      status: "pending",
      createdAt: Date.now()
    };

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
