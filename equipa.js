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

  // Monta link de afiliado
  const link = `${location.origin}/index.html?ref=${uid}`;
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

  // Lê seus totais de ganhos por nível (que estamos gravando no home.js com o PATCH)
  const meSnap = await get(ref(db, `usuarios/${uid}`));
  const me = meSnap.exists() ? meSnap.val() : null;

  const earnedA = me?.refTotals?.A?.amount || 0;
  const earnedB = me?.refTotals?.B?.amount || 0;
  const earnedC = me?.refTotals?.C?.amount || 0;

  document.getElementById("earned-A").textContent = formatKz(earnedA);
  document.getElementById("earned-B").textContent = formatKz(earnedB);
  document.getElementById("earned-C").textContent = formatKz(earnedC);

  // Contar A, B, C
  const { countA, countB, countC } = await countNetwork(uid);
  document.getElementById("count-A").textContent = countA;
  document.getElementById("count-B").textContent = countB;
  document.getElementById("count-C").textContent = countC;
});

/**
 * Conta:
 * - A: direto de uid
 * - B: quem foi convidado pelos A
 * - C: quem foi convidado pelos B
 */
async function countNetwork(uid) {
  const levelA = await getUsersByInvitedBy(uid); // A
  const countA = levelA.length;

  let levelB = [];
  for (const a of levelA) {
    const b = await getUsersByInvitedBy(a.uid);
    levelB = levelB.concat(b);
  }
  const countB = levelB.length;

  let levelC = [];
  for (const b of levelB) {
    const c = await getUsersByInvitedBy(b.uid);
    levelC = levelC.concat(c);
  }
  const countC = levelC.length;

  return { countA, countB, countC };
}

/**
 * Busca usuários cujo invitedBy == someUid
 */
async function getUsersByInvitedBy(someUid) {
  const q = query(
    ref(db, "usuarios"),
    orderByChild("invitedBy"),
    equalTo(someUid)
  );
  const snap = await get(q);
  if (!snap.exists()) return [];
  const list = [];
  snap.forEach(child => {
    const val = child.val();
    list.push({ uid: val.uid, email: val.email });
  });
  return list;
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
