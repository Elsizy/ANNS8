// conta.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  push,
  set,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const IBAN_MAX = 21;

/* ------------------------------------------------------------------
   DOM
------------------------------------------------------------------- */
const bankSelectBtn   = document.getElementById("open-bank-picker");
const bankSelectModal = document.getElementById("bank-modal");
const bankSelectedEl  = document.getElementById("bank-name");
const closeBankModal  = document.getElementById("close-bank-modal");

const formEl          = document.getElementById("bank-form");
const holderEl        = document.getElementById("holder");
const ibanEl          = document.getElementById("iban");

const saveBtn         = document.getElementById("save-account");
const listEl          = document.getElementById("accounts-list");

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------- */
function maskIban(iban) {
  if (!iban) return "";
  const visible = iban.slice(0, 7);
  return visible + "•".repeat(Math.max(0, iban.length - 7));
}

function clearForm() {
  if (formEl) formEl.dataset.editing = "";
  if (holderEl) holderEl.value = "";
  if (ibanEl) ibanEl.value = "";
  if (bankSelectedEl) {
    bankSelectedEl.textContent = "Selecionar banco";
    bankSelectedEl.dataset.bank = "";
  }
}

function sanitizeIbanInput() {
  if (!ibanEl) return;
  let v = (ibanEl.value || "").replace(/\D+/g, "");
  if (v.length > IBAN_MAX) v = v.slice(0, IBAN_MAX);
  ibanEl.value = v;
}

/* ------------------------------------------------------------------
   Events - Modal Banco
------------------------------------------------------------------- */
bankSelectBtn?.addEventListener("click", () => {
  bankSelectModal?.classList.remove("hidden");
});

closeBankModal?.addEventListener("click", () => {
  bankSelectModal?.classList.add("hidden");
});

document.getElementById("bank-list")?.addEventListener("click", (e) => {
  const item = e.target.closest("li");
  if (item && item.dataset.bank) {
    bankSelectedEl.textContent = item.dataset.bank;
    bankSelectedEl.dataset.bank = item.dataset.bank;
    bankSelectModal?.classList.add("hidden");
  }
});

/* ------------------------------------------------------------------
   Events gerais
------------------------------------------------------------------- */
ibanEl?.addEventListener("input", sanitizeIbanInput);
ibanEl?.addEventListener("paste", () => setTimeout(sanitizeIbanInput, 0));

let currentUid = null;
saveBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  if (!currentUid) return;

  const bank = bankSelectedEl?.dataset.bank || "";
  const holder = holderEl?.value.trim() || "";
  const iban = ibanEl?.value.trim() || "";

  if (!bank) return alert("Selecione um banco.");
  if (!holder) return alert("Informe o nome do titular.");
  if (!iban || iban.length !== IBAN_MAX)
    return alert(`O IBAN deve conter exatamente ${IBAN_MAX} dígitos numéricos.`);

  const editingId = formEl?.dataset.editing;
  const baseRef = ref(db, `usuarios/${currentUid}/bankAccounts`);

  try {
    if (editingId) {
      await update(ref(db, `usuarios/${currentUid}/bankAccounts/${editingId}`), {
        bank,
        holder,
        iban
      });
    } else {
      const newRef = push(baseRef);
      await set(newRef, { bank, holder, iban, createdAt: Date.now() });
    }
    clearForm();
    await loadAccounts(currentUid);
    alert("Conta bancária salva com sucesso!");
  } catch (err) {
    console.error("Erro ao salvar conta:", err);
    alert("Erro ao salvar conta bancária.");
  }
});

/* ------------------------------------------------------------------
   Render contas
------------------------------------------------------------------- */
async function loadAccounts(uid) {
  const snap = await get(ref(db, `usuarios/${uid}/bankAccounts`));
  const data = snap.exists() ? snap.val() : {};
  listEl.innerHTML = "";

  const keys = Object.keys(data);
  if (!keys.length) {
    listEl.innerHTML = `<p class="empty-text">Nenhuma conta cadastrada.</p>`;
    return;
  }

  keys.forEach((id) => {
    const acc = data[id];
    const div = document.createElement("div");
    div.className = "account-item";
    div.innerHTML = `
      <div class="info">
        <p class="bank">${acc.bank || "-"}</p>
        <p class="holder">${acc.holder || "-"}</p>
        <p class="iban">${maskIban(acc.iban || "")}</p>
      </div>
      <div class="actions">
        <button class="btn-edit" data-id="${id}">Editar</button>
        <button class="btn-del" data-id="${id}">Excluir</button>
      </div>
    `;
    listEl.appendChild(div);
  });

  // editar
  listEl.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const acc = data[id];
      if (!acc) return;
      formEl.dataset.editing = id;
      bankSelectedEl.textContent = acc.bank;
      bankSelectedEl.dataset.bank = acc.bank;
      holderEl.value = acc.holder || "";
      ibanEl.value = acc.iban || "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // excluir
  listEl.querySelectorAll(".btn-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("Tem certeza que deseja excluir esta conta?")) return;
      try {
        await remove(ref(db, `usuarios/${uid}/bankAccounts/${id}`));
        await loadAccounts(uid);
      } catch (err) {
        console.error("Erro ao excluir conta:", err);
        alert("Erro ao excluir conta bancária.");
      }
    });
  });
}

/* ------------------------------------------------------------------
   Auth
------------------------------------------------------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUid = user.uid;
  await loadAccounts(currentUid);
});
