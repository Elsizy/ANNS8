// equipa.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;

  // Lê seus dados
  const meSnap = await get(ref(db, `usuarios/${uid}`));
  if (!meSnap.exists()) return;
  const me = meSnap.val();

  // Link curto (refCode) para compartilhamento
  const myCode = me.refCode || uid;
  const link = `${location.origin}/index.html?ref=${myCode}`;
  const linkInput = document.getElementById("affiliate-link");
  linkInput.value = link;

  const copyBtn = document.getElementById("copy-link");
  const feedback = document.getElementById("copy-feedback");
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(linkInput.value);
      feedback.classList.remove("hide");
      setTimeout(() => feedback.classList.add("hide"), 2000);
    } catch (e) {
      console.error("Falha ao copiar:", e);
    }
  });

  // Totais de ganhos por nível
  document.getElementById("earned-A").textContent = formatKz(me?.refTotals?.A?.amount || 0);
  document.getElementById("earned-B").textContent = formatKz(me?.refTotals?.B?.amount || 0);
  document.getElementById("earned-C").textContent = formatKz(me?.refTotals?.C?.amount || 0);

  // Contagem da rede por UID
  const { countA, countB, countC } = await countNetworkByUid(uid);
  document.getElementById("count-A").textContent = countA;
  document.getElementById("count-B").textContent = countB;
  document.getElementById("count-C").textContent = countC;
});

/**
 * Conta níveis A/B/C usando invitedBy == UID.
 */
async function countNetworkByUid(rootUid) {
  const allUsersSnap = await get(ref(db, "usuarios"));
  if (!allUsersSnap.exists()) return { countA: 0, countB: 0, countC: 0 };

  const users = allUsersSnap.val();

  // Nível A
  const levelA = Object.keys(users).filter(uid => users[uid]?.invitedBy === rootUid);

  // Nível B
  const levelB = Object.keys(users).filter(uid => levelA.includes(users[uid]?.invitedBy));

  // Nível C
  const levelC = Object.keys(users).filter(uid => levelB.includes(users[uid]?.invitedBy));

  return {
    countA: levelA.length,
    countB: levelB.length,
    countC: levelC.length
  };
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
    }
