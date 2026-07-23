// equipa-total.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

function toggleLoading(showSkeleton) {
  document.getElementById("skeleton").classList.toggle("hidden", !showSkeleton);
  document.getElementById("teams").classList.toggle("hidden", showSkeleton);
}
function abrirAbaPeloNivel() {
  const params = new URLSearchParams(window.location.search);
  const level = params.get("level");

  let target = "list-a";

  if (level === "B") target = "list-b";
  if (level === "C") target = "list-c";

  // Atualiza as abas
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.remove("active");

    if (tab.dataset.target === target) {
      tab.classList.add("active");
    }
  });

  // Atualiza as listas
  document.querySelectorAll(".list").forEach(list => {
    list.classList.add("hidden");
  });

  document.getElementById(target).classList.remove("hidden");
}


onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  toggleLoading(true);
  const myUid = user.uid;

  try {
    const snap = await get(ref(db, "usuarios"));
    const users = snap.exists() ? snap.val() : {};

    const { levelA, levelB, levelC } = splitLevelsByUid(myUid, users);

    fillList("list-a", levelA, users, 1); // nível 1
    fillList("list-b", levelB, users, 2); // nível 2
    fillList("list-c", levelC, users, 3); // nível 3
  } catch (err) {
  console.error("Erro ao carregar equipa:", err);
  alert("Erro ao carregar a equipa.");
} finally {
  toggleLoading(false);
  abrirAbaPeloNivel();
}
});

/**
 * Divide por níveis usando invitedBy (apenas UID).
 */
function splitLevelsByUid(myUid, users) {
  const levelA = Object.keys(users).filter(uid => users[uid]?.invitedBy === myUid);

  const levelB = Object.keys(users).filter(uid =>
    levelA.includes(users[uid]?.invitedBy)
  );

  const levelC = Object.keys(users).filter(uid =>
    levelB.includes(users[uid]?.invitedBy)
  );

  return { levelA, levelB, levelC };
}

function fillList(containerId, uids, users, nivel) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!uids.length) {
    container.innerHTML = "<p style='opacity:0.7; padding: 12px;'>Nenhum usuário neste nível.</p>";
    return;
  }

  uids.forEach((uid) => {
    const u = users[uid];
    if (!u) return;

   // const idDisplay = u.email || u.nome || "(Sem nome)";
    const idDisplay = ocultarEmail(u.email || u.nome || "(Sem nome)");
    const firstDeposit = getFirstDeposit(u);
    const comissao = calcularComissao(firstDeposit, nivel);

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="id">${idDisplay}</div>
      <div class="meta">Primeira recarga: ${formatKz(firstDeposit)}</div>
      <div class="meta">Comissão: ${formatKz(comissao)}</div>
    `;
    container.appendChild(div);
  });
}

function getFirstDeposit(userObj) {
  if (!userObj) return 0;
  if (typeof userObj.firstDeposit === "number") return userObj.firstDeposit;
  if (typeof userObj.firstDepositAmount === "number") return userObj.firstDepositAmount;

  if (userObj.depositos) {
    const items = Object.values(userObj.depositos);
    if (items.length > 0) {
      items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      return items[0].amount || 0;
    }
  }
  return 0;
}

function calcularComissao(valorDeposito, nivel) {
  let percentual = 0;
  if (nivel === 1) percentual = 0.17; // 25%
  if (nivel === 2) percentual = 0.02; // 3%
  if (nivel === 3) percentual = 0.01; // 1%
  return valorDeposito * percentual;
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
  }

function ocultarEmail(email) {
  if (!email) return "(Sem nome)";

  const partes = email.split("@");

  if (partes.length !== 2) return email;

  const nome = partes[0];
  const dominio = partes[1];

  const visivel = nome.substring(0, 4);

  return `${visivel}***@${dominio}`;
      }
