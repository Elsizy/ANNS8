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

/* ------------------------------------------------------------------
   Config
------------------------------------------------------------------- */
const IBAN_MAX = 21;

/* ------------------------------------------------------------------
   DOM
------------------------------------------------------------------- */
const bankSelectBtn   = document.getElementById("bank-select-btn");
const bankSelectModal = document.getElementById("bank-select-modal");
const bankOptions     = document.querySelectorAll(".bank-option");
const bankSelectedEl  = document.getElementById("bank-selected");

const formEl          = document.getElementById("bank-form");
const holderEl        = document.getElementById("holder");
const ibanEl          = document.getElementById("iban");

const saveBtn         = document.getElementById("save-account");
const cancelBtn       = document.getElementById("cancel");
const listEl          = document.getElementById("accounts-list");

const backBtn         = document.getElementById("back");

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------- */
function maskIban(iban) {
  if (!iban) return "";
  const visible = iban.slice(0, 7);
  return visible + "•".repeat(Math.max(0, iban.length - 7));
}

function clearForm() {
  formEl.dataset.editing = ""; // vazio => criando novo
  holderEl.value = "";
  ibanEl.value = "";
  bankSelectedEl.textContent = "Escolher banco";
  bankSelectedEl.dataset.bank = "";
}

/**
 * *** ÚNICA MUDANÇA IMPORTANTE ***
 * Garante que ao colar (com pontos, espaços etc.) o campo
 * fique somente com números e com no máximo 21 dígitos.
 */
function sanitizeIbanInput() {
  let v = (ibanEl.value || "").replace(/\D+/g, "");
  if (v.length > IBAN_MAX) v = v.slice(0, IBAN_MAX);
  ibanEl.value = v;
}

/* ------------------------------------------------------------------
   Events
------------------------------------------------------------------- */

// voltar
backBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  window.history.back();
});

// abre modal de seleção de banco
bankSelectBtn?.addEventListener("click", () => {
  bankSelectModal?.classList.add("show");
});

// escolhe banco
bankOptions.forEach(opt => {
  opt.addEventListener("click", () => {
    const bank = opt.dataset.bank;
    bankSelectedEl.textContent = bank;
    bankSelectedEl.dataset.bank = bank;
    bankSelectModal?.classList.remove("show");
  });
});

// fecha modal ao clicar no overlay (se houver)
bankSelectModal?.addEventListener("click", (e) => {
  if (e.target === bankSelectModal) {
    bankSelectModal.classList.remove("show");
  }
});

// *** aplica sanitização no input e no paste ***
ibanEl?.addEventListener("input", sanitizeIbanInput);
ibanEl?.addEventListener("paste", () => setTimeout(sanitizeIbanInput, 0));

// cancelar
cancelBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  clearForm();
});

// salvar/atualizar
let currentUid = null;
saveBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  if (!currentUid) return;

  const bank = bankSelectedEl.dataset.bank || "";
  const holder = holderEl.value.trim();
  const iban = ibanEl.value.trim();

  if (!bank) {
    alert("Selecione um banco.");
    return;
  }
  if (!holder) {
    alert("Informe o nome do titular.");
    return;
  }
  if (!iban || iban.length !== IBAN_MAX) {
    alert(`O IBAN deve conter exatamente ${IBAN_MAX} dígitos numéricos.`);
    return;
  }

  const editingId = formEl.dataset.editing;
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
      await set(newRef, {
        bank,
        holder,
        iban,
        createdAt: Date.now()
      });
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
   Render
------------------------------------------------------------------- */
async function loadAccounts(uid) {
  const snap = await get(ref(db, `usuarios/${uid}/bankAccounts`));
  const data = snap.exists() ? snap.val() : {};

  listEl.innerHTML = "";

  const keys = Object.keys(data);
  if (!keys.length) {
    listEl.innerHTML = `<p style="opacity:.7">Nenhuma conta cadastrada ainda.</p>`;
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
      const ok = confirm("Tem certeza que deseja excluir esta conta?");
      if (!ok) return;
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
