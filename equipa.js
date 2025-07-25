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

  // Monta link de afiliado (pode continuar usando refCode para ficar curto)
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

  // Seus totais de ganhos por nível (gravados no home.js)
  const earnedA = me?.refTotals?.A?.amount || 0;
  const earnedB = me?.refTotals?.B?.amount || 0;
  const earnedC = me?.refTotals?.C?.amount || 0;

  document.getElementById("earned-A").textContent = formatKz(earnedA);
  document.getElementById("earned-B").textContent = formatKz(earnedB);
  document.getElementById("earned-C").textContent = formatKz(earnedC);

  // >>> Agora contamos por UID, que é o que está salvo em invitedBy <<<
  const { countA, countB, countC } = await countNetworkByUid(uid);
  document.getElementById("count-A").textContent = countA;
  document.getElementById("count-B").textContent = countB;
  document.getElementById("count-C").textContent = countC;
});

/**
 * Conta níveis A/B/C usando invitedBy como UID (compatível com o que o signup salva hoje).
 *
 * - A: quem tem invitedBy == uid
 * - B: quem tem invitedBy == qualquer A.uid
 * - C: quem tem invitedBy == qualquer B.uid
 */
async function countNetworkByUid(rootUid) {
  const levelA = await getUsersByInvitedByUid(rootUid);
  const countA = levelA.length;

  let levelB = [];
  for (const a of levelA) {
    const b = await getUsersByInvitedByUid(a.uid);
    levelB = levelB.concat(b);
  }
  const countB = levelB.length;

  let levelC = [];
  for (const b of levelB) {
    const c = await getUsersByInvitedByUid(b.uid);
    levelC = levelC.concat(c);
  }
  const countC = levelC.length;

  return { countA, countB, countC };
}

/**
 * Busca usuários cujo invitedBy == someUid
 */
async function getUsersByInvitedByUid(someUid) {
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
