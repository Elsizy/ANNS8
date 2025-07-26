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

import { PRODUTOS, MAX_COMPRAS_POR_PRODUTO } from "./products.js";

const ICON_EYE = `
  <svg class="icon-eye" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
`;
const ICON_EYE_OFF = `
  <svg class="icon-eye-off" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.87 21.87 0 0 1 5.06-6.94"></path>
    <path d="M1 1l22 22"></path>
  </svg>
`;

/** 24h em ms */
const DAY_MS = 24 * 60 * 60 * 1000;
/** Percentuais de rede aplicados SOBRE O PREÇO do produto */
const REF_PERC_ON_PURCHASE = { A: 0.30, B: 0.03, C: 0.01 };

/* =========================
   CACHE (TTL = 60s)
========================= */
const CACHE_MAX_AGE = 60_000; // 60s
const CACHE_KEY_HOME = (uid) => `home_user_${uid}`;

function saveCache(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ t: Date.now(), data })
    );
  } catch (_) {}
}
function loadCache(key, maxAge = CACHE_MAX_AGE) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.t || Date.now() - obj.t > maxAge) return null;
    return obj.data;
  } catch {
    return null;
  }
}

/* ======= HELPERS para mostrar/ocultar ======= */
const MASKED_TEXT = "Kz ••••";

function setFieldValue(id, formatted) {
  const el = document.getElementById(id);
  if (!el) return;
  el.dataset.formatted = formatted;
  if (isHidden(id)) {
    el.textContent = MASKED_TEXT;
  } else {
    el.textContent = formatted;
  }
}

function toggleField(id, btn) {
  const hidden = isHidden(id);
  localStorage.setItem(`hide_${id}`, hidden ? "0" : "1");
  applyVisibility(id, btn);
}

function isHidden(id) {
  return localStorage.getItem(`hide_${id}`) === "1";
}

function applyVisibility(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const hidden = isHidden(id);
  el.textContent = hidden ? MASKED_TEXT : (el.dataset.formatted || el.textContent);
  if (btn) btn.innerHTML = hidden ? ICON_EYE_OFF : ICON_EYE;
}

function setupEyes() {
  document.querySelectorAll(".eye-btn").forEach(btn => {
    const targetId = btn.dataset.target;
    applyVisibility(targetId, btn);
    btn.onclick = () => toggleField(targetId, btn);
  });
}

function hideProductsSkeleton() {
  const sk = document.getElementById("produtos-skeleton");
  if (sk) sk.style.display = "none";
}

/* ------------------------------------------------------------------
   1) Render do cache
-------------------------------------------------------------------*/
(function renderFromCacheIfAny() {
  let newest = null;
  let newestKey = null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith("home_user_")) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = JSON.parse(raw);
      if (!obj?.t) continue;
      if (!newest || obj.t > newest.t) {
        newest = obj;
        newestKey = k;
      }
    }
  } catch (_) {}

  if (!newest || Date.now() - newest.t > CACHE_MAX_AGE) return;

  const data = newest.data;
  if (!data) return;

  setFieldValue("saldo", formatKz(data.saldo || 0));
  setFieldValue("investimento-total", formatKz(data.totalInvestido || 0));
  setFieldValue("comissao-total", formatKz(data.totalComissaoDiaria || 0));
  setupEyes();

  renderProdutos({
    uid: data.uid,
    saldo: data.saldo || 0,
    compras: data.compras || {}
  });

  hideProductsSkeleton();
})();

/* ------------------------------------------------------------------
   2) Fluxo normal com Firebase
-------------------------------------------------------------------*/
(async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    console.warn("Não foi possível configurar persistência LOCAL:", e);
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const uid = user.uid;
    const cacheKey = CACHE_KEY_HOME(uid);
    const userRef = ref(db, `usuarios/${uid}`);

    await creditDailyCommissionIfNeeded(uid);

    const snap = await get(userRef);
    if (!snap.exists()) return;
    const data = snap.val();

    const needsBackfill =
      typeof data.totalInvestido === "undefined" ||
      typeof data.totalComissaoDiaria === "undefined";

    let totalInvestido = data.totalInvestido;
    let totalComissaoDiaria = data.totalComissaoDiaria;

    if (needsBackfill) {
      totalInvestido = calcTotalInvestido(data);
      totalComissaoDiaria = calcTotalComissaoDiaria(data);
      try {
        await update(userRef, {
          totalInvestido,
          totalComissaoDiaria,
        });
      } catch (e) {
        console.warn("Falha ao fazer backfill dos totais:", e);
      }
    }

    setFieldValue("saldo", formatKz(data.saldo || 0));
    setFieldValue("investimento-total", formatKz(totalInvestido || 0));
    setFieldValue("comissao-total", formatKz(totalComissaoDiaria || 0));

    setupEyes();

    renderProdutos({
      uid,
      saldo: data.saldo || 0,
      compras: data.compras || {}
    });

    saveCache(cacheKey, {
      uid,
      ...data,
      totalInvestido,
      totalComissaoDiaria
    });

    hideProductsSkeleton();
  });
})();

/* ------------------------------------------------------------------
   Funções auxiliares (renderProdutos, creditDailyCommission, etc.)
-------------------------------------------------------------------*/
// (restante código permanece idêntico ao enviado antes, sem alterações)
