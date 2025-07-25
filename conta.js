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
const bankBtn = document.getElementById("open-bank-picker");
const bankNameEl = document.getElementById("bank-name");
const holderEl = document.getElementById("holder");
const ibanEl = document.getElementById("iban");
const saveBtn = document.getElementById("save-account");
const listEl = document.getElementById("accounts-list");

const modal = document.getElementById("bank-modal");
const bankListEl = document.getElementById("bank-list");
const closeModalBtn = document.getElementById("close-bank-modal");

/* =========================
   INICIALIZAÇÃO
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUid = user.uid;

  buildBankList();
  await renderAccounts();
});

/* =========================
   EVENTOS
========================= */
bankBtn.addEventListener("click", () => {
  modal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

ibanEl.addEventListener("input", () => {
  // Mantém apenas números e limita a 21 dígitos
  let v = ibanEl.value.replace(/\D+/g, "");
  if (v.length > IBAN_MAX) v = v.slice(0, IBAN_MAX);
  ibanEl.value = v;
});

saveBtn.addEventListener("click", onSave);

/* =========================
   FUNÇÕES
========================= */
function buildBankList() {
  bankListEl.innerHTML = "";
  BANKS.forEach((bank) => {
    const li = document.createElement("li");
    li.textContent = bank;
    li.addEventListener("click", () => {
      selectedBank = bank;
      bankNameEl.textContent = bank;
      modal.classList.add("hidden");
    });
    bankListEl.appendChild(li);
  });
}

async function renderAccounts() {
  listEl.innerHTML = "";
  listEl.classList.add("empty");

  const snap = await get(ref(db, `usuarios/${currentUid}/bankAccounts`));
  if (!snap.exists()) {
    listEl.innerHTML = `<p class="empty-text">Nenhuma conta cadastrada.</p>`;
    return;
  }

  listEl.classList.remove("empty");
  const accounts = snap.val();

  Object.entries(accounts).forEach(([id, acc]) => {
    const div = document.createElement("div");
    div.className = "account";

    const left = document.createElement("div");
    const right = document.createElement("div");
    right.className = "acc-actions";

    const title = document.createElement("div");
    title.className = "acc-title";
    title.textContent = `${acc.bank} • ${acc.holder}`;

    const ibanText = document.createElement("div");
    ibanText.className = "acc-iban";
    ibanText.textContent = maskIban(acc.iban || "");

    left.appendChild(title);
    left.appendChild(ibanText);

    // Botões
    const btnDel = document.createElement("button");
    btnDel.title = "Remover";
    btnDel.innerHTML = "🗑️";
    btnDel.addEventListener("click", () => onDelete(id));

    const btnEdit = document.createElement("button");
    btnEdit.title = "Editar";
    btnEdit.style.color = "#8759e3";
    btnEdit.innerHTML = "✎";
    btnEdit.addEventListener("click", () => onEdit(id, acc));

    right.appendChild(btnEdit);
    right.appendChild(btnDel);

    div.appendChild(left);
    div.appendChild(right);
    listEl.appendChild(div);
  });
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
  const holder = holderEl.value.trim();
  const iban = ibanEl.value.trim().replace(/\D+/g, "");

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
    await renderAccounts();
    alert("Conta salva com sucesso.");
  } catch (e) {
    console.error("Erro salvando conta:", e);
    alert("Erro ao salvar a conta bancária.");
  } finally {
    saveBtn.disabled = false;
  }
}

function clearForm() {
  selectedBank = null;
  bankNameEl.textContent = "Selecionar banco";
  holderEl.value = "";
  ibanEl.value = "";
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
  bankNameEl.textContent = acc.bank;
  holderEl.value = acc.holder;
  ibanEl.value = (acc.iban || "").replace(/\D+/g, "").slice(0, IBAN_MAX);
  window.scrollTo({ top: 0, behavior: "smooth" });
  }
