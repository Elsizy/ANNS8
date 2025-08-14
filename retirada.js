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

const TAXA = 0.10;
const MIN_WITHDRAW = 2500; // <<< mantém

let uid = null;
let saldoAtual = 0;
let accounts = {};
let pickedAccountId = null;
let hasAnyProduct = false;     // mantém
let hasOpenWithdrawal = false; // mantém

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

  try {
    const uSnap = await get(ref(db, `usuarios/${uid}`));
    if (!uSnap.exists()) {
      alert("Usuário não encontrado.");
      window.location.href = "login.html";
      return;
    }

    const u = uSnap.val();
    saldoAtual = u.saldo || 0;

    // 1) Verifica se o usuário tem pelo menos um produto comprado
    const comprasSnap = await get(ref(db, `usuarios/${uid}/compras`));
    hasAnyProduct = comprasSnap.exists();

    // 2) Verifica se há retiradas pendentes/processing
    const wSnap = await get(ref(db, `usuarios/${uid}/withdrawals`));
    if (wSnap.exists()) {
      const vals = Object.values(wSnap.val() || {});
      hasOpenWithdrawal = vals.some(w => w.status === "pending" || w.status === "processing");
    }

    // 3) Carrega contas bancárias (se não tiver, manda criar)
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
  } catch (e) {
    console.error("Erro ao carregar dados de retirada:", e);
    alert("Falha ao carregar dados. Tente novamente.");
  }
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

// ---- NOVO: função para exibir erro estilizado ----
function showError(msg) {
  const box = document.getElementById("withdraw-error");
  if (!box) {
    alert(msg);
    return;
  }
  box.textContent = msg;
  box.classList.remove("hidden");
  setTimeout(() => {
    box.classList.add("hidden");
  }, 4000);
}

async function onSubmit() {
  // Bloqueio de horário (somente das 9h às 18h)  <<< NOVO
  const now = new Date();
  const hora = now.getHours();
  if (hora < 9 || hora >= 18) {
    showError("Os saques só estão disponíveis das 9h às 18h.");
    return;
  }

  // Bloqueios adicionais (mantidos)
  if (!hasAnyProduct) {
    alert("Para retirar fundos é necessário ter comprado pelo menos 1 produto.");
    return;
  }
  if (hasOpenWithdrawal) {
    alert("Você já possui um pedido de retirada pendente. Aguarde a conclusão para solicitar outro.");
    return;
  }

  const v = parseFloat(valorInput.value || "0");
  if (!pickedAccountId) {
    alert("Escolha um banco.");
    return;
  }
  if (!v || v <= 0) {
    alert("Digite um valor válido.");
    return;
  }
  if (v < MIN_WITHDRAW) {
    alert(`O valor mínimo para retirada é ${formatKz(MIN_WITHDRAW)}.`);
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

    // >>>>>> CONTINUA SEM atualizar retiradaTotal aqui! <<<<<<
    // Somente quando o admin concluir no admin.js

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
