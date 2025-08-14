// conta.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  push,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* =========================
   CONSTANTES / BANCOS
========================= */
const BANKS = ["BAI", "BFA", "BIC", "Atlântico", "BPC"];
const IBAN_MAX = 21;

/* =========================
   ESTADO
========================= */
let currentUid = null;
let selectedBank = null;
let editingId = null; // se estiver a editar um item existente

/* =========================
   DOM
========================= */
const bankBtn        = document.getElementById("open-bank-picker");
const bankNameEl     = document.getElementById("bank-name");
const holderEl       = document.getElementById("holder");
const ibanEl         = document.getElementById("iban");
const saveBtn        = document.getElementById("save-account");
const listEl         = document.getElementById("accounts-list");

const bankModal      = document.getElementById("bank-modal");
const bankListEl     = document.getElementById("bank-list");
const closeBankBtn   = document.getElementById("close-bank-modal");

const accountsModal  = document.getElementById("accounts-modal");
const openAccountsBtn= document.getElementById("open-accounts-btn");
const closeAccountsBtn = document.getElementById("close-accounts-modal");
// ----- feedback modal -----
const feedbackModal = document.getElementById("feedback-modal");
const feedbackText  = document.getElementById("feedback-text");
const feedbackClose = document.getElementById("feedback-close");

/* =========================
   INICIALIZAÇÃO
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUid = user.uid;

  buildBankList();         // repovoa a lista de bancos
  await renderAccounts();  // prepara a lista (será mostrada no modal)
});

/* =========================
   EVENTOS
========================= */
bankBtn?.addEventListener("click", () => {
  bankModal?.classList.remove("hidden");
});

closeBankBtn?.addEventListener("click", () => {
  bankModal?.classList.add("hidden");
});

openAccountsBtn?.addEventListener("click", async () => {
  await renderAccounts(); // garante dados atualizados antes de abrir
  accountsModal?.classList.remove("hidden");
});

closeAccountsBtn?.addEventListener("click", () => {
  accountsModal?.classList.add("hidden");
});

ibanEl?.addEventListener("input", () => {
  // Mantém apenas números e limita a 21 dígitos (sem “comer” números)
  let v = (ibanEl.value || "").replace(/\D+/g, "");
  if (v.length > IBAN_MAX) v = v.slice(0, IBAN_MAX);
  ibanEl.value = v;
});

saveBtn?.addEventListener("click", onSave);

/* =========================
   FUNÇÕES
========================= */
function buildBankList() {
  if (!bankListEl) return;
  bankListEl.innerHTML = "";
  BANKS.forEach((bank) => {
    const li = document.createElement("li");
    li.textContent = bank;
    li.dataset.bank = bank;
    li.addEventListener("click", () => {
      selectedBank = bank;
      if (bankNameEl) bankNameEl.textContent = bank;
      bankModal?.classList.add("hidden");
    });
    bankListEl.appendChild(li);
  });
}

// Modal de feedback (success | error)
let feedbackTimer = null;

function showFeedback(type, message, { autoclose = 2000 } = {}) {
  if (!feedbackModal) return alert(message); // fallback
  // limpa estado
  feedbackModal.classList.remove("success","error","hidden","show");
  // aplica tipo + mensagem
  feedbackModal.classList.add(type); // "success" ou "error"
  feedbackText.textContent = message;

  // mostra
  requestAnimationFrame(() => feedbackModal.classList.add("show"));

  // foco e acessibilidade
  feedbackClose?.focus();

  // autoclose
  if (feedbackTimer) clearTimeout(feedbackTimer);
  if (autoclose) {
    feedbackTimer = setTimeout(hideFeedback, autoclose);
  }
}
function hideFeedback() {
  if (!feedbackModal) return;
  feedbackModal.classList.remove("show");
  // opcional: esconder totalmente após a animação
  setTimeout(() => feedbackModal.classList.add("hidden"), 180);
  if (feedbackTimer) { clearTimeout(feedbackTimer); feedbackTimer = null; }
}
// interações
feedbackClose?.addEventListener("click", hideFeedback);
feedbackModal?.addEventListener("click", (e) => { if (e.target === feedbackModal) hideFeedback(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") hideFeedback(); });

async function renderAccounts() {
  if (!listEl) return;
  listEl.innerHTML = "";
  listEl.classList.add("empty");

  try {
    const snap = await get(ref(db, `usuarios/${currentUid}/bankAccounts`));
    if (!snap.exists()) {
      listEl.innerHTML = `<p class="empty-text">Nenhuma conta cadastrada.</p>`;
      return;
    }

    const accounts = snap.val();
    const entries = Object.entries(accounts);
    if (entries.length === 0) {
      listEl.innerHTML = `<p class="empty-text">Nenhuma conta cadastrada.</p>`;
      return;
    }

    listEl.classList.remove("empty");
    // grid container (accounts-list já tem display:grid via CSS)
    entries.forEach(([id, acc]) => {
      const div = document.createElement("div");
      div.className = "account";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.gap = "10px";
      left.style.alignItems = "center";
      left.style.minWidth = "0";

      // bank badge (iniciais)
      const badge = document.createElement("div");
      badge.className = "bank-badge";
      // pega até 3 letras do nome do banco
      badge.textContent = String(acc.bank || "").slice(0,3).toUpperCase();

      const meta = document.createElement("div");
      meta.style.minWidth = "0";

      const title = document.createElement("div");
      title.className = "acc-title";
      title.textContent = acc.bank || "—";

      const ibanText = document.createElement("div");
      ibanText.className = "acc-iban";
      ibanText.textContent = acc.iban || "";

      meta.appendChild(title);
      meta.appendChild(ibanText);

      left.appendChild(badge);
      left.appendChild(meta);

      // actions (editar / remover)
      const actions = document.createElement("div");
      actions.className = "acc-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", () => {
       onEdit(id, acc);
        // fecha modal para mostrar o formulário (ux)
        accountsModal?.classList.add("hidden");
      });

      //const delBtn = document.createElement("button");
      //delBtn.type = "button";
      //delBtn.textContent = "Remover";
      //delBtn.addEventListener("click", async () => {
       // await onDelete(id);
     // });

      actions.appendChild(editBtn);
      //actions.appendChild(delBtn);

      div.appendChild(left);
      div.appendChild(actions);

      listEl.appendChild(div);
    });

  } catch (e) {
    console.error("Erro ao carregar contas:", e);
    listEl.innerHTML = `<p class="empty-text">Erro ao carregar contas.</p>`;
  }
}

function maskIban(iban) {
  const digits = (iban || "").replace(/\D+/g, "");
  if (digits.length <= 7) return digits;
  const visible = digits.slice(0, 7);
  const hiddenCount = Math.max(0, digits.length - 7);
  const hidden = "•".repeat(hiddenCount);
  return `${visible}${hidden}`;
}

async function onSave() {
  if (!currentUid) return;

  const bank = selectedBank;
  const holder = holderEl?.value.trim() || "";
  const iban = (ibanEl?.value || "").replace(/\D+/g, "");

  if (!bank) return alert("Selecione o banco.");
  if (!holder) return alert("Informe o nome do titular.");
  if (!iban || iban.length !== IBAN_MAX) {
    return alert(`O IBAN deve ter exatamente ${IBAN_MAX} dígitos.`);
  }

  saveBtn.disabled = true;
  try {
    if (editingId) {
      // update
      await update(ref(db, `usuarios/${currentUid}/bankAccounts/${editingId}`), {
        bank,
        holder,
        iban,
        updatedAt: Date.now()
      });
      editingId = null;
    } else {
      // create
      const p = push(ref(db, `usuarios/${currentUid}/bankAccounts`));
      await update(p, {
        id: p.key,
        bank,
        holder,
        iban,
        createdAt: Date.now()
      });
    }

    // limpa formulário
    clearForm();
    // ...
await renderAccounts(); // atualiza lista
showFeedback("success", "Conta salva com sucesso.");
// ...
  } catch (e) {
    console.error("Erro salvando conta:", e);
    alert("Erro ao salvar a conta bancária.");
  } finally {
    saveBtn.disabled = false;
  }
}

function clearForm() {
  selectedBank = null;
  if (bankNameEl) bankNameEl.textContent = "Selecionar banco";
  if (holderEl) holderEl.value = "";
  if (ibanEl) ibanEl.value = "";
  editingId = null;
}

async function onDelete(id) {
  const ok = confirm("Deseja remover esta conta?");
  if (!ok) return;
  try {
    await remove(ref(db, `usuarios/${currentUid}/bankAccounts/${id}`));
    await renderAccounts();
  } catch (e) {
    console.error("Erro ao remover:", e);
    alert("Falha ao remover a conta.");
  }
}

function onEdit(id, acc) {
  editingId = id;
  selectedBank = acc.bank;
  if (bankNameEl) bankNameEl.textContent = acc.bank;
  if (holderEl) holderEl.value = acc.holder;
  if (ibanEl) ibanEl.value = (acc.iban || "").replace(/\D+/g, "").slice(0, IBAN_MAX);
  window.scrollTo({ top: 0, behavior: "smooth" });
      }
