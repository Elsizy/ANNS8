import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* =========================
   CACHE
========================= */
const CACHE_MAX_AGE = 60_000;
const cacheKey = (uid) => `equipa_cache_${uid}`;

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

/* =========================
   MAIN
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;
  const key = cacheKey(uid);

  const cached = loadCache(key);
  if (cached) {
    paintUIFromCache(cached);
  }

  try {
    const meSnap = await get(ref(db, `usuarios/${uid}`));
    if (!meSnap.exists()) return;
    const me = meSnap.val();

    const myCode = me.refCode || uid;
    const link = `${location.origin}/index.html?ref=${myCode}`;

    // NOVO: Lê ganhos de comissão refTotals
    const earnedA = me?.refTotals?.A?.amount || 0;
    const earnedB = me?.refTotals?.B?.amount || 0;
    const earnedC = me?.refTotals?.C?.amount || 0;

    // Totais de convidados
    const { countA, countB, countC } = await countNetworkByUid(uid);

    const data = { link, earnedA, earnedB, earnedC, countA, countB, countC };
    paintUI(data);
    saveCache(key, data);
  } catch (e) {
    console.error("Erro ao carregar equipa:", e);
  }
});

/* =========================
   FUNÇÕES DE CONTAGEM
========================= */
async function countNetworkByUid(rootUid) {
  const allUsersSnap = await get(ref(db, "usuarios"));
  if (!allUsersSnap.exists()) {
    return { countA: 0, countB: 0, countC: 0 };
  }
  const users = allUsersSnap.val();

  const levelA = Object.keys(users).filter(uid => users[uid]?.invitedBy === rootUid);
  const levelB = Object.keys(users).filter(uid => levelA.includes(users[uid]?.invitedBy));
  const levelC = Object.keys(users).filter(uid => levelB.includes(users[uid]?.invitedBy));

  return {
    countA: levelA.length,
    countB: levelB.length,
    countC: levelC.length,
  };
}

/* =========================
   RENDER
========================= */
function paintUIFromCache(cache) {
  const {
    link,
    earnedA = 0,
    earnedB = 0,
    earnedC = 0,
    countA = 0,
    countB = 0,
    countC = 0,
  } = cache || {};

  if (link) {
    const linkInput = document.getElementById("affiliate-link");
    if (linkInput) linkInput.value = link;

    const copyBtn = document.getElementById("copy-link");
    const feedback = document.getElementById("copy-feedback");
    if (copyBtn && feedback) {
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
  }

  setText("earned-A", formatKz(earnedA));
  setText("earned-B", formatKz(earnedB));
  setText("earned-C", formatKz(earnedC));

  setText("count-A", countA);
  setText("count-B", countB);
  setText("count-C", countC);
}

function paintUI(data) {
  paintUIFromCache(data);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* =========================
   UTILS
========================= */
function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
  }
