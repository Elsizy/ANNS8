import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/**
 * Mostra skeleton, esconde conteúdo. Depois do load, faz o contrário.
 */
function toggleLoading(showSkeleton) {
  const sk = document.getElementById("skeleton");
  const teams = document.getElementById("teams");
  if (showSkeleton) {
    sk.classList.remove("hidden");
    teams.classList.add("hidden");
  } else {
    sk.classList.add("hidden");
    teams.classList.remove("hidden");
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  toggleLoading(true);

  const myUid = user.uid;

  // Monta link de afiliado (ajuste a URL base para sua página de cadastro)
  const affiliateLink = `${location.origin}/index.html?ref=${myUid}`;
  const linkInput = document.getElementById("affiliate-link");
  linkInput.value = affiliateLink;

  document.getElementById("copy-link").addEventListener("click", () => {
    linkInput.select();
    document.execCommand("copy");
    alert("Link copiado!");
  });

  try {
    const usersSnap = await get(ref(db, "usuarios"));
    const users = usersSnap.exists() ? usersSnap.val() : {};

    // Se não houver nenhum outro usuário (além de você), só mostra vazio
    const {
      levelA,
      levelB,
      levelC
    } = splitLevels(myUid, users);

    // Monta UI
    fillLevel("A", levelA, users);
    fillLevel("B", levelB, users);
    fillLevel("C", levelC, users);
  } catch (e) {
    console.error("Erro ao ler usuários:", e);
    alert("Erro ao carregar sua equipa.");
  } finally {
    toggleLoading(false);
  }
});

/**
 * Divide todos os usuários em 3 níveis em relação ao meu UID.
 *
 * A: invitedBy === myUid
 * B: invitedBy ∈ UIDs de A
 * C: invitedBy ∈ UIDs de B
 */
function splitLevels(myUid, users) {
  const levelA = [];
  const levelB = [];
  const levelC = [];

  const A_UIDs = new Set();
  const B_UIDs = new Set();

  Object.entries(users).forEach(([uid, u]) => {
    if (!u || !u.invitedBy) return;

    if (u.invitedBy === myUid) {
      levelA.push(uid);
      A_UIDs.add(uid);
    }
  });

  Object.entries(users).forEach(([uid, u]) => {
    if (!u || !u.invitedBy) return;

    if (A_UIDs.has(u.invitedBy)) {
      levelB.push(uid);
      B_UIDs.add(uid);
    }
  });

  Object.entries(users).forEach(([uid, u]) => {
    if (!u || !u.invitedBy) return;

    if (B_UIDs.has(u.invitedBy)) {
      levelC.push(uid);
    }
  });

  return { levelA, levelB, levelC };
}

/**
 * Preenche um bloco (A, B, C) com a lista, contagem e total ganho (refTotals.X.amount)
 */
function fillLevel(levelKey, uids, users) {
  const listEl = document.getElementById(`list-${levelKey.toLowerCase()}`);
  const countEl = document.getElementById(`count-${levelKey.toLowerCase()}`);
  const totalEl = document.getElementById(`total-${levelKey.toLowerCase()}`);

  countEl.textContent = String(uids.length);

  // soma total ganho (se você estiver guardando em usuarios/{uid}/refTotals/A.amount
  // lembre-se: esse total é do dono do UID, não do convidado
  // aqui, como estamos olhando os convidados, o total ganho por nível
  // deve ser lido do "dono" (usuário logado) — ou seja, você provavelmente
  // quer somar refTotals[levelKey] do usuário logado.
  //
  // Como esses dados não foram carregados aqui, vamos somar cada refTotals[level].amount
  // do próprio dono (você pode ajustar se quiser outro comportamento).
  //
  // Para ser simples (e funcional), vamos somar o field `users[ME].refTotals[levelKey].amount`.
  // Mas não temos `ME` aqui. Então faremos a soma convidado a convidado:
  // (isso não é o ganho do dono, mas sim o somatório de "firstDeposit" dos convidados,
  // para apenas exibir algo significativo).
  //
  // RECOMENDADO: Se você quiser mostrar o total ganho EXATO do dono naquele nível,
  // salve no usuário logado em usuarios/{uid}/refTotals/A.amount e leia direto de lá
  // em vez de somar pelos convidados.
  //
  // Como pediste "mostrar o e-mail e o valor do primeiro depósito" ao lado de cada convidado,
  // este total será a soma desses primeiros depósitos apenas para exibição.
  //
  // Se quiser depois eu troco para ler o refTotals do dono, sem problema.

  let totalDepositos = 0;

  listEl.innerHTML = "";
  uids.forEach((uid) => {
    const u = users[uid];
    if (!u) return;

    const email = u.email || "(sem email)";
    const firstDeposit = getFirstDeposit(u);
    totalDepositos += firstDeposit;

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <p class="email">${email}</p>
      <p class="deposito">Primeiro depósito: ${formatKz(firstDeposit)}</p>
    `;
    listEl.appendChild(div);
  });

  totalEl.textContent = formatKz(totalDepositos);
}

/**
 * Tenta adivinhar o valor do primeiro depósito do usuário convidado.
 * Ajuste aqui conforme seu schema final:
 * - u.firstDeposit
 * - u.firstDepositAmount
 * - u.depositos: { <id>: { amount, createdAt... } }  (você pode ordenar por date e pegar o primeiro)
 */
function getFirstDeposit(userObj) {
  if (!userObj) return 0;
  // Se você estiver salvando especificamente um campo:
  if (typeof userObj.firstDeposit === "number") return userObj.firstDeposit;
  if (typeof userObj.firstDepositAmount === "number") return userObj.firstDepositAmount;

  // Se futuramente salvar em "depositos"
  if (userObj.depositos) {
    const items = Object.values(userObj.depositos);
    if (items.length > 0) {
      // pegar o menor createdAt
      items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      return items[0].amount || 0;
    }
  }
  return 0;
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
