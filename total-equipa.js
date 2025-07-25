// total-equipa.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

function toggleLoading(showSkeleton) {
  document.getElementById("skeleton").classList.toggle("hidden", !showSkeleton);
  document.getElementById("teams").classList.toggle("hidden", showSkeleton);
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

    const { levelA, levelB, levelC } = splitLevels(myUid, users);

    fillList("list-a", levelA, users);
    fillList("list-b", levelB, users);
    fillList("list-c", levelC, users);
  } catch (err) {
    console.error("Erro ao carregar equipa:", err);
    alert("Erro ao carregar a equipa.");
  } finally {
    toggleLoading(false);
  }
});

function splitLevels(myUid, users) {
  const levelA = [], levelB = [], levelC = [];
  const A_UIDs = new Set(), B_UIDs = new Set();

  for (const [uid, u] of Object.entries(users)) {
    if (u?.invitedBy === myUid) {
      levelA.push(uid);
      A_UIDs.add(uid);
    }
  }

  for (const [uid, u] of Object.entries(users)) {
    if (A_UIDs.has(u?.invitedBy)) {
      levelB.push(uid);
      B_UIDs.add(uid);
    }
  }

  for (const [uid, u] of Object.entries(users)) {
    if (B_UIDs.has(u?.invitedBy)) {
      levelC.push(uid);
    }
  }

  return { levelA, levelB, levelC };
}

function fillList(containerId, uids, users) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!uids.length) {
    container.innerHTML = "<p style='opacity:0.7'>Nenhum usuário neste nível.</p>";
    return;
  }

  uids.forEach((uid) => {
    const u = users[uid];
    if (!u) return;

    const nome = u.nome || u.email || "(Sem nome)";
    const firstDeposit = getFirstDeposit(u);

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <span class="name">${nome}</span>
      <span class="deposito">${formatKz(firstDeposit)}</span>
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

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
  }
