// retirada.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  push,
  update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const TAXA = 0.15;

let uid = null;
let saldoAtual = 0;
let accounts = {};
let pickedAccountId = null;

// DOM
const saldoEl        = document.getElementById("saldo-total");
const bankBtn        = document.getElementById("bank-btn");
const bankPickedEl   = document.getElementById("bank-picked");
const valorInput     = document.getElementById("valor");
const taxaEl         = document.getElementById("taxa");
const liquidoEl      = document.getElementById("valor-liquido");
const enviarBtn      = document.getElementById("btn-enviar");

const modal          = document.getElementById("bank-modal");
const bankListEl     = document.getElementById("bank-list");
const closeModalBtn  = document.getElementById("close-modal");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  uid = user.uid;
  const uSnap = await get(ref(db, `usuarios/${uid}`));
  if (!uSnap.exists()) {
    alert("Usuário não encontrado.");
    window.location.href = "login.html";
    return;
  }

  const u = uSnap.val();
  saldoAtual = u.saldo || 0;

  // Carrega contas bancárias (se não tiver, manda criar)
  const accSnap = await get(ref(db, `usuarios/${uid}/bankAccounts`));
  if (!accSnap.exists()) {
    alert("Você precisa cadastrar uma conta bancária antes de retirar.");
    window.location.href = "conta.html";
    return;
  }

  accounts = accSnap.val();

  // mostra saldo
  saldoEl.textContent = formatKz(saldoAtual);

  // monta lista de bancos
  buildBankList(accounts);

  // listeners
  bankBtn.addEventListener("click", () => modal.classList.remove("hidden"));
  closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
  valorInput.addEventListener("input", calcResumo);
  enviarBtn.addEventListener("click", onSubmit);
});

function buildBankList(accs) {
  bankListEl.innerHTML = "";
  Object.entries(accs).forEach(([id, acc]) => {
    const li = document.createElement("li");
    li.textContent = `${acc.bank} • ${acc.holder}`;
    li.addEventListener("click", () => {
      pickedAccountId = id;
      bankPickedEl.textContent = acc.bank;
      modal.classList.add("hidden");
    });
    bankListEl.appendChild(li);
  });
}

function calcResumo() {
  const v = parseFloat(valorInput.value || "0");
  const taxa = Math.max(0, v * TAXA);
  const liquido = Math.max(0, v - taxa);

  taxaEl.textContent = formatKz(taxa);
  liquidoEl.textContent = formatKz(liquido);
}

async function onSubmit() {
  const v = parseFloat(valorInput.value || "0");
  if (!pickedAccountId) {
    alert("Escolha um banco.");
    return;
  }
  if (!v || v <= 0) {
    alert("Digite um valor válido.");
    return;
  }
  if (v > saldoAtual) {
    alert("Saldo insuficiente.");
    return;
  }

  const acc = accounts[pickedAccountId];
  if (!acc) {
    alert("Conta bancária inválida.");
    return;
  }

  const taxa = Math.floor(v * TAXA);
  const liquido = v - taxa;

  const ok = confirm(
    `Confirmar retirada de ${formatKz(v)}?\n` +
    `Taxa: ${formatKz(taxa)}\n` +
    `Receberá: ${formatKz(liquido)}`
  );
  if (!ok) return;

  enviarBtn.disabled = true;

  try {
    // debita saldo do usuário agora
    const novoSaldo = saldoAtual - v;

    const reqRef = push(ref(db, `withdrawRequests`));
    const reqId = reqRef.key;

    const payload = {
      id: reqId,
      uid,
      bank: acc.bank,
      holder: acc.holder,
      iban: acc.iban,
      amountGross: v,
      fee: taxa,
      amountNet: liquido,
      status: "pending", // admin vai mudar para processing / done / rejected
      createdAt: Date.now()
    };

    const updates = {};
    // salva request global (para o admin)
    updates[`withdrawRequests/${reqId}`] = payload;
    // salva também na pasta do usuário (histórico)
    updates[`usuarios/${uid}/withdrawals/${reqId}`] = payload;
    // debita saldo
    updates[`usuarios/${uid}/saldo`] = novoSaldo;

    // opcional: acumular retiradaTotal do usuário (para mostrar em pessoal.html)
    const retiradaTotal = (await get(ref(db, `usuarios/${uid}/retiradaTotal`))).val() || 0;
    updates[`usuarios/${uid}/retiradaTotal`] = retiradaTotal + v;

    await update(ref(db), updates);

    alert("Pedido de retirada enviado com sucesso! Aguarde o processamento.");
    window.location.href = "registroretirada.html";
  } catch (e) {
    console.error(e);
    alert("Erro ao enviar o pedido de retirada.");
  } finally {
    enviarBtn.disabled = false;
  }
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
