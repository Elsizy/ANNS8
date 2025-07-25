// equipa.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* ===== CACHE ===== */
const CACHE_MAX_AGE = 60_000;
const CACHE_KEY = (uid) => `equipa_user_${uid}`;

function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), data }));
  } catch (_) {}
}
function loadCache(key, maxAge = CACHE_MAX_AGE) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj?.t || Date.now() - obj.t > maxAge) return null;
    return obj.data;
  } catch {
    return null;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;
  const key = CACHE_KEY(uid);

  // 1) tentar cache
  const cached = loadCache(key);
  if (cached) {
    const myCode = cached.refCode || uid;
    const link = `${location.origin}/index.html?ref=${myCode}`;
    const linkInput = document.getElementById("affiliate-link");
    linkInput.value = link;

    document.getElementById("earned-A").textContent = formatKz(cached?.refTotals?.A?.amount || 0);
    document.getElementById("earned-B").textContent = formatKz(cached?.refTotals?.B?.amount || 0);
    document.getElementById("earned-C").textContent = formatKz(cached?.refTotals?.C?.amount || 0);

    document.getElementById("count-A").textContent = cached.countA || 0;
    document.getElementById("count-B").textContent = cached.countB || 0;
    document.getElementById("count-C").textContent = cached.countC || 0;

    attachCopyHandler();
  }

  // 2) dados frescos
  const meSnap = await get(ref(db, `usuarios/${uid}`));
  if (!meSnap.exists()) return;
  const me = meSnap.val();

  const myCode = me.refCode || uid;
  const link = `${location.origin}/index.html?ref=${myCode}`;
  const linkInput = document.getElementById("affiliate-link");
  linkInput.value = link;

  attachCopyHandler();

  // Totais de ganhos por nível
  document.getElementById("earned-A").textContent = formatKz(me?.refTotals?.A?.amount || 0);
  document.getElementById("earned-B").textContent = formatKz(me?.refTotals?.B?.amount || 0);
  document.getElementById("earned-C").textContent = formatKz(me?.refTotals?.C?.amount || 0);

  // Contagem da rede por UID
  const { countA, countB, countC } = await countNetworkByUid(uid);
  document.getElementById("count-A").textContent = countA;
  document.getElementById("count-B").textContent = countB;
  document.getElementById("count-C").textContent = countC;

  // cacheia tudo
  saveCache(key, { ...me, countA, countB, countC });
});

function attachCopyHandler() {
  const copyBtn = document.getElementById("copy-link");
  const feedback = document.getElementById("copy-feedback");
  if (!copyBtn || !feedback) return;
  const linkInput = document.getElementById("affiliate-link");
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(linkInput.value);
      feedback.classList.remove("hide");
      setTimeout(() => feedback.classList.add("hide"), 2000);
    } catch (e) {
      console.error("Falha ao copiar:", e);
    }
  };
}

/**
 * Conta níveis A/B/C usando invitedBy == UID.
 */
async function countNetworkByUid(rootUid) {
  const allUsersSnap = await get(ref(db, "usuarios"));
  if (!allUsersSnap.exists()) return { countA: 0, countB: 0, countC: 0 };

  const users = allUsersSnap.val();

  const levelA = Object.keys(users).filter(uid => users[uid]?.invitedBy === rootUid);
  const levelB = Object.keys(users).filter(uid => levelA.includes(users[uid]?.invitedBy));
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
