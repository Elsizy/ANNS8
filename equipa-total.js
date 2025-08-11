// equipa-total.js
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

    const { levelA, levelB, levelC } = splitLevelsByUid(myUid, users);

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

function fillList(containerId, uids, users) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!uids.length) {
    container.innerHTML = "<p style='opacity:0.7; padding: 12px;'>Nenhum usuário neste nível.</p>";
    return;
  }

  uids.forEach((uid) => {
    const u = users[uid];
    if (!u) return;

    // Email será o ID mostrado
    const idDisplay = u.email || u.nome || "(Sem nome)";
    const firstDeposit = getFirstDeposit(u);
    const comissao = u.comissao || 0;

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="id">ID: ${idDisplay}</div>
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

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
                                         }
