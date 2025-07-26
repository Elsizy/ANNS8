// sf-pay-set-in.js
import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref, push, set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const DRAFT_KEY = "deposit_draft_v1";

const summaryEl      = document.getElementById("summary");
const depositorInput = document.getElementById("depositor-name");
const proofInput     = document.getElementById("proof");
const sendBtn        = document.getElementById("send");

let currentUser = null;
let draft = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
  if (!draft?.amountBase || !draft?.bank || !draft?.amountExact || !draft?.method) {
    alert("Fluxo de depósito inválido. Recomece.");
    window.location.href = "deposito.html";
    return;
  }

  // Mostra um resumo
  const bankData = draft.bankData || {};
  summaryEl.innerHTML = `
    <p><strong>Banco:</strong> ${bankData.name || draft.bank}</p>
    <p><strong>Titular:</strong> ${bankData.holder || "—"}</p>
    <p><strong>IBAN:</strong> ${bankData.iban || "—"}</p>
    <p><strong>Valor exato:</strong> ${formatKz(draft.amountExact)}</p>
  `;
});

sendBtn.addEventListener("click", async () => {
  const depositorName = (depositorInput.value || "").trim();
  if (!depositorName) {
    alert("Informe o nome do depositante.");
    return;
  }
  if (!proofInput.files.length) {
    alert("Envie o comprovativo.");
    return;
  }

  sendBtn.disabled = true;

  try {
    // Faz upload da imagem
    const file = proofInput.files[0];
    const path = `proofs/${currentUser.uid}/${Date.now()}_${file.name}`;
    const storageRef = sRef(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    // Salva o pedido no RTDB: depositRequests/ e usuarios/<uid>/deposits/
    const reqRef = push(ref(db, `depositRequests`));
    const reqId = reqRef.key;

    const payload = {
      id: reqId,
      uid: currentUser.uid,
      method: draft.method,
      bank: draft.bank,
      bankData: draft.bankData || null,
      amountBase: draft.amountBase,
      amountExact: draft.amountExact,
      depositorName,
      proofUrl: url,
      status: "pending",
      createdAt: Date.now()
    };

    await set(reqRef, payload);
    await set(ref(db, `usuarios/${currentUser.uid}/deposits/${reqId}`), payload);

    // Limpa o draft
    sessionStorage.removeItem(DRAFT_KEY);

    alert("Depósito enviado! Aguarde a confirmação.");
    window.location.href = "registrodeposito.html";
  } catch (e) {
    console.error(e);
    alert("Erro ao enviar o comprovativo.");
  } finally {
    sendBtn.disabled = false;
  }
});

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
    }
