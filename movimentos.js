// movimentos.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/** Cache simples (60s) */
const CACHE_MAX_AGE = 60_000;
const cacheKey = (uid) => `movimentos_cache_${uid}`;

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

const skeleton = document.getElementById("skeleton");
const listEl = document.getElementById("list");
const filterBtns = document.querySelectorAll(".filter-btn");

let currentFilter = "all";
let allMovs = [];

// filtros
filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.type;
    render(allMovs, currentFilter);
  });
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  const uid = user.uid;
  const key = cacheKey(uid);

  // Render do cache (instantâneo)
  const cached = loadCache(key);
  if (cached) {
    allMovs = cached;
    skeleton.style.display = "none";
    render(allMovs, currentFilter);
  } else {
    skeleton.style.display = "block";
  }

  // Listener em tempo real (ou pode trocar para get + refresh manual)
  onValue(ref(db, `usuarios/${uid}/movimentos`), (snap) => {
    skeleton.style.display = "none";
    if (!snap.exists()) {
      allMovs = [];
      render(allMovs, currentFilter);
      saveCache(key, allMovs);
      return;
    }
    const data = snap.val();
    const arr = Object.values(data).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    allMovs = arr;
    render(allMovs, currentFilter);
    saveCache(key, arr);
  }, (err) => {
    console.error("Erro ao carregar movimentos:", err);
    skeleton.style.display = "none";
  });
});

function render(list, filter) {
  listEl.innerHTML = "";
  const filtered = filter === "all"
    ? list
    : list.filter(m => m.type === filter);

  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty">Sem movimentos.</div>`;
    return;
  }

  filtered.forEach(m => {
    const div = document.createElement("div");
    div.className = "mov-card";

    const title = movementTitle(m);
    const dir = (m.direction === "out") ? "out" : "in";
    const amountFmt = formatKz(m.amount || 0);
    const when = tsToPt(m.createdAt);
    const meta = movementMeta(m);

    div.innerHTML = `
      <div class="mov-info">
        <span class="mov-type">${title}</span>
        <span class="mov-meta">${when}${meta ? " • " + meta : ""}</span>
      </div>
      <div class="mov-amount ${dir}">${dir === "out" ? "-" : "+"} ${amountFmt}</div>
    `;

    listEl.appendChild(div);
  });
}

function movementTitle(m) {
  switch (m.type) {
    case "deposit":    return "Depósito aprovado";
    case "withdraw":   return "Retirada concluída";
    case "commission": return "Comissão de produto";
    case "ref_bonus":  return "Bónus de convite";
    default:           return "Movimento";
  }
}

function movementMeta(m) {
  // Você pode personalizar conforme queira mostrar mais coisas
  if (m.type === "ref_bonus") {
    const lvl = m?.meta?.level ? `Nível ${m.meta.level}` : "";
    return lvl ? `(${lvl})` : "";
  }
  return "";
}

function tsToPt(ts) {
  return new Date(ts || Date.now()).toLocaleString("pt-PT");
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
