import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  ref,
  get,
  update,
  push,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* =========================
   CACHE / HOME BASE
========================= */
const CACHE_MAX_AGE = 60_000;

const CACHE_KEY_HOME = (uid) => `home_user_${uid}`;

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
   HELPERS UI (HOME)
========================= */
function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/* =========================
   SET FIELD VALUE HOME
========================= */
function setFieldValue(id, formatted) {
  const el = document.getElementById(id);
  if (!el) return;
  el.dataset.formatted = formatted;
  el.textContent = formatted;
}

/* =========================
   RENDER CACHE (HOME ONLY)
========================= */
(function renderFromCacheIfAny() {
  let newest = null;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith("home_user_")) continue;

      const raw = localStorage.getItem(k);
      if (!raw) continue;

      const obj = JSON.parse(raw);
      if (!obj?.t) continue;

      if (!newest || obj.t > newest.t) newest = obj;
    }
  } catch (_) {}

  if (!newest || Date.now() - newest.t > CACHE_MAX_AGE) return;

  const data = newest.data;
  if (!data) return;

  setFieldValue("saldo", formatKz(data.saldo || 0));
})();

/* =========================
   AUTH + HOME INIT
========================= */
(async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    console.warn("Persistência falhou:", e);
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const uid = user.uid;
    const cacheKey = CACHE_KEY_HOME(uid);

    const userRef = ref(db, `usuarios/${uid}`);

    const snap = await get(userRef);
    if (!snap.exists()) return;

    const data = snap.val();

    setFieldValue("saldo", formatKz(data.saldo || 0));

    saveCache(cacheKey, {
      uid,
      saldo: data.saldo || 0,
    });
  });
})();
