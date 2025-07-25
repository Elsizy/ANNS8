// admin.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  set,
  update,
  push,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/**
 * ===========================
 * CONFIG
 * ===========================
 */
const TAXA_RETIRADA = 0.15; // já usada no front do usuário
let ADMIN_UID = null;       // uid do admin logado
let editingBankId = null;

/**
 * ===========================
 * UTILS
 * ===========================
 */
function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}
function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return [...document.querySelectorAll(sel)]; }

/**
 * ===========================
 * NAV
 * ===========================
 */
qsa(".sidebar nav a").forEach(a => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const sec = a.dataset.section;
    qsa(".sidebar nav a").forEach(x => x.classList.remove("active"));
    a.classList.add("active");

    qsa(".section").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(sec);
    if (target) target.classList.add("active");
  });
});

/**
 * ===========================
 * AUTH
 * ===========================
 */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Confirma se o user é admin
  const meSnap = await get(ref(db, `usuarios/${user.uid}`));
  if (!meSnap.exists() || meSnap.val().role !== "admin") {
    alert("Acesso negado.");
    window.location.href = "login.html";
    return;
  }

  ADMIN_UID = user.uid;

  // Listeners
  attachDashboardListeners();
  attachDepositListeners();
  attachWithdrawalListeners();
  attachBankListeners();

  // Logout
  qs("#logout")?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
});

/**
 * ===========================
 * DASHBOARD
 * ===========================
 */
function attachDashboardListeners() {
  // usuários
  onValue(ref(db, "usuarios"), (snap) => {
    const users = snap.exists() ? snap.val() : {};
    setText("stat-users", Object.keys(users).length);
  });

  // depósitos
  onValue(ref(db, "depositRequests"), (snap) => {
    let pending = 0;
    let totalDone = 0;
    if (snap.exists()) {
      const data = snap.val();
      Object.values(data).forEach(d => {
        if (d.status === "pending" || d.status === "processing") pending++;
        if (d.status === "done") totalDone += (d.amount || 0);
      });
    }
    setText("stat-dep-pending", pending);
    setText("stat-dep-done", formatKz(totalDone));
  });

  // retiradas
  onValue(ref(db, "withdrawRequests"), (snap) => {
    let pending = 0;
    let totalDone = 0;
    if (snap.exists()) {
      const data = snap.val();
      Object.values(data).forEach(w => {
        if (w.status === "pending" || w.status === "processing") pending++;
        if (w.status === "done") totalDone += (w.amountNet || 0);
      });
    }
    setText("stat-wd-pending", pending);
    setText("stat-wd-done", formatKz(totalDone));
  });
}

/**
 * ===========================
 * DEPÓSITOS
 * ===========================
 */
function attachDepositListeners() {
  const listEl = document.getElementById("deposits-list");
  onValue(ref(db, "depositRequests"), async (snap) => {
    listEl.innerHTML = "";
    if (!snap.exists()) {
      listEl.innerHTML = `<div class="item"><p>Sem depósitos.</p></div>`;
      return;
    }
    const data = snap.val();
    const entries = Object.entries(data)
      .filter(([id, d]) => d.status === "pending" || d.status === "processing")
      .sort((a,b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));

    if (!entries.length) {
      listEl.innerHTML = `<div class="item"><p>Nenhum depósito pendente.</p></div>`;
      return;
    }

    for (const [id, dep] of entries) {
      const userSnap = await get(ref(db, `usuarios/${dep.uid}`));
      const userEmail = userSnap.exists() ? (userSnap.val().email || dep.uid) : dep.uid;

      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div>
          <h4>${userEmail}</h4>
          <p class="meta">
            Valor: <strong>${formatKz(dep.amount)}</strong> • 
            Banco: ${dep.bank || "-"} • Titular: ${dep.holder || "-"}
          </p>
          <p class="meta">
            IBAN: ${dep.iban || "-"}
          </p>
          <p class="meta">
            Enviado em: ${new Date(dep.createdAt || Date.now()).toLocaleString("pt-PT")}
          </p>
          ${dep.proofUrl ? `<p class="meta">Comprovativo: <a href="${dep.proofUrl}" target="_blank">ver</a></p>` : ""}
          <span class="status ${dep.status}">${dep.status}</span>
        </div>
        <div class="actions">
          <button class="btn-approve" data-id="${id}">Aprovar</button>
          <button class="btn-reject" data-id="${id}">Rejeitar</button>
        </div>
      `;
      listEl.appendChild(div);
    }

    // actions
    listEl.querySelectorAll(".btn-approve").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        await approveDeposit(id);
      });
    });
    listEl.querySelectorAll(".btn-reject").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        await rejectDeposit(id);
      });
    });
  });
}

async function approveDeposit(id) {
  const reqRef = ref(db, `depositRequests/${id}`);
  const snap = await get(reqRef);
  if (!snap.exists()) return alert("Depósito não encontrado.");
  const dep = snap.val();
  if (dep.status !== "pending" && dep.status !== "processing") {
    return alert("Este depósito não está mais pendente.");
  }

  const userRef = ref(db, `usuarios/${dep.uid}`);
  const userSnap = await get(userRef);
  if (!userSnap.exists()) return alert("Usuário não encontrado.");

  const saldoAtual = userSnap.val().saldo || 0;
  const updates = {};

  // saldo do usuário
  const novoSaldo = saldoAtual + (dep.amount || 0);
  updates[`usuarios/${dep.uid}/saldo`] = novoSaldo;

  // marcar request
  updates[`depositRequests/${id}/status`] = "done";
  updates[`depositRequests/${id}/approvedAt`] = Date.now();
  updates[`depositRequests/${id}/approvedBy`] = ADMIN_UID;

  // registra no histórico do usuário (caso você tenha a página registrodeposito.html)
  const regId = push(ref(db, `usuarios/${dep.uid}/depositos`)).key;
  updates[`usuarios/${dep.uid}/depositos/${regId}`] = {
    amount: dep.amount,
    bank: dep.bank || null,
    iban: dep.iban || null,
    createdAt: dep.createdAt || Date.now(),
    approvedAt: Date.now(),
    status: "done"
  };

  // se for o primeiro depósito, gravar em firstDeposit/firstDepositAmount (usado na total-equipa.html)
  const u = userSnap.val();
  if (typeof u.firstDepositAmount === "undefined") {
    updates[`usuarios/${dep.uid}/firstDepositAmount`] = dep.amount || 0;
  }
  if (typeof u.firstDeposit === "undefined") {
    updates[`usuarios/${dep.uid}/firstDeposit`] = dep.amount || 0;
  }

  await update(ref(db), updates);
  alert("Depósito aprovado com sucesso!");
}

async function rejectDeposit(id) {
  const reqRef = ref(db, `depositRequests/${id}`);
  const snap = await get(reqRef);
  if (!snap.exists()) return alert("Depósito não encontrado.");
  const dep = snap.val();
  if (dep.status !== "pending" && dep.status !== "processing") {
    return alert("Este depósito não está mais pendente.");
  }

  await update(reqRef, {
    status: "rejected",
    rejectedAt: Date.now(),
    rejectedBy: ADMIN_UID
  });
  alert("Depósito rejeitado.");
}

/**
 * ===========================
 * RETIRADAS
 * ===========================
 */
function attachWithdrawalListeners() {
  const listEl = document.getElementById("withdrawals-list");
  onValue(ref(db, "withdrawRequests"), async (snap) => {
    listEl.innerHTML = "";
    if (!snap.exists()) {
      listEl.innerHTML = `<div class="item"><p>Sem retiradas.</p></div>`;
      return;
    }
    const data = snap.val();
    const entries = Object.entries(data)
      .filter(([id, w]) => w.status === "pending" || w.status === "processing")
      .sort((a,b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));

    if (!entries.length) {
      listEl.innerHTML = `<div class="item"><p>Nenhuma retirada pendente.</p></div>`;
      return;
    }

    for (const [id, wd] of entries) {
      const userSnap = await get(ref(db, `usuarios/${wd.uid}`));
      const userEmail = userSnap.exists() ? (userSnap.val().email || wd.uid) : wd.uid;

      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div>
          <h4>${userEmail}</h4>
          <p class="meta">
            Banco: ${wd.bank || "-"} • Titular: ${wd.holder || "-"} • IBAN: ${wd.iban || "-"}
          </p>
          <p class="meta">
            Valor bruto: <strong>${formatKz(wd.amountGross)}</strong> •
            Valor líquido ( -15% ): <strong>${formatKz(wd.amountNet)}</strong>
          </p>
          <p class="meta">Solicitado em: ${new Date(wd.createdAt || Date.now()).toLocaleString("pt-PT")}</p>
          <span class="status ${wd.status}">${wd.status}</span>
        </div>
        <div class="actions">
          <button class="btn-approve" data-id="${id}">Concluir</button>
          <button class="btn-reject" data-id="${id}">Rejeitar</button>
        </div>
      `;
      listEl.appendChild(div);
    }

    listEl.querySelectorAll(".btn-approve").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        await approveWithdrawal(id);
      });
    });
    listEl.querySelectorAll(".btn-reject").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        await rejectWithdrawal(id);
      });
    });
  });
}

async function approveWithdrawal(id) {
  const reqRef = ref(db, `withdrawRequests/${id}`);
  const snap = await get(reqRef);
  if (!snap.exists()) return alert("Retirada não encontrada.");
  const wd = snap.val();
  if (wd.status !== "pending" && wd.status !== "processing") {
    return alert("Esta retirada não está mais pendente.");
  }

  const updates = {};
  // marca request
  updates[`withdrawRequests/${id}/status`]  = "done";
  updates[`withdrawRequests/${id}/paidAt`]  = Date.now();
  updates[`withdrawRequests/${id}/approvedBy`] = ADMIN_UID;

  // salva registro do usuário
  const regId = push(ref(db, `usuarios/${wd.uid}/retiradas`)).key;
  updates[`usuarios/${wd.uid}/retiradas/${regId}`] = {
    amountGross: wd.amountGross,
    amountNet: wd.amountNet,
    bank: wd.bank,
    iban: wd.iban,
    holder: wd.holder,
    createdAt: wd.createdAt,
    paidAt: Date.now(),
    status: "done"
  };

  // Atualiza retiradaTotal no usuário (opcional)
  const uSnap = await get(ref(db, `usuarios/${wd.uid}/retiradaTotal`));
  const prev = uSnap.exists() ? (uSnap.val() || 0) : 0;
  updates[`usuarios/${wd.uid}/retiradaTotal`] = prev + (wd.amountGross || 0);

  await update(ref(db), updates);
  alert("Retirada concluída!");
}

async function rejectWithdrawal(id) {
  const reqRef = ref(db, `withdrawRequests/${id}`);
  const snap = await get(reqRef);
  if (!snap.exists()) return alert("Retirada não encontrada.");
  const wd = snap.val();
  if (wd.status !== "pending" && wd.status !== "processing") {
    return alert("Esta retirada não está mais pendente.");
  }

  // devolve dinheiro ao saldo do usuário
  const userRef = ref(db, `usuarios/${wd.uid}`);
  const userSnap = await get(userRef);
  if (userSnap.exists()) {
    const saldo = userSnap.val().saldo || 0;
    await update(userRef, { saldo: saldo + (wd.amountGross || 0) });
  }

  // marca request como rejeitado
  await update(reqRef, {
    status: "rejected",
    rejectedAt: Date.now(),
    rejectedBy: ADMIN_UID
  });

  alert("Retirada rejeitada e valor devolvido ao usuário.");
}

/**
 * ===========================
 * BANCOS
 * ===========================
 */
function attachBankListeners() {
  const listEl = document.getElementById("banks-list");
  const form = document.getElementById("bank-form");
  const nameEl = document.getElementById("bank-name");
  const holderEl = document.getElementById("bank-holder");
  const ibanEl = document.getElementById("bank-iban");
  const cancelBtn = document.getElementById("bank-cancel");

  // listar
  onValue(ref(db, "adminBanks"), (snap) => {
    listEl.innerHTML = "";
    if (!snap.exists()) {
      listEl.innerHTML = `<div class="item"><p>Nenhum banco cadastrado.</p></div>`;
      return;
    }
    const data = snap.val();
    const entries = Object.entries(data);

    entries.forEach(([id, bank]) => {
      const row = document.createElement("div");
      row.className = "bank-row";
      row.innerHTML = `
        <div>
          <div class="name">${bank.name}</div>
          <div class="holder">${bank.holder}</div>
          <div class="iban">IBAN: ${bank.iban}</div>
        </div>
        <div class="row-actions">
          <button class="edit" data-id="${id}">Editar</button>
          <button class="del" data-id="${id}">Excluir</button>
        </div>
      `;
      listEl.appendChild(row);
    });

    // editar
    listEl.querySelectorAll(".edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const bank = data[id];
        editingBankId = id;
        nameEl.value = bank.name || "";
        holderEl.value = bank.holder || "";
        ibanEl.value = bank.iban || "";
        cancelBtn.classList.remove("hidden");
      });
    });

    // excluir
    listEl.querySelectorAll(".del").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const ok = confirm("Excluir este banco?");
        if (!ok) return;
        await set(ref(db, `adminBanks/${id}`), null);
      });
    });
  });

  cancelBtn.addEventListener("click", () => {
    editingBankId = null;
    cancelBtn.classList.add("hidden");
    form.reset();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameEl.value.trim();
    const holder = holderEl.value.trim();
    const iban = ibanEl.value.trim();
    if (!name || !holder || !iban) {
      alert("Preencha todos os campos.");
      return;
    }

    if (editingBankId) {
      await update(ref(db, `adminBanks/${editingBankId}`), {
        name, holder, iban, updatedAt: Date.now()
      });
    } else {
      const newRef = push(ref(db, "adminBanks"));
      await set(newRef, {
        name, holder, iban,
        createdAt: Date.now()
      });
    }
    form.reset();
    editingBankId = null;
    cancelBtn.classList.add("hidden");
    alert("Banco salvo!");
  });
      }
