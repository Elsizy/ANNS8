// pessoal.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const CACHE_KEY = (uid) => `pessoal_cache_${uid}`;
const CACHE_MAX_AGE = 60_000;

function loadCache(key, maxAge = CACHE_MAX_AGE) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o?.t || Date.now() - o.t > maxAge) return null;
    return o.data;
  } catch {
    return null;
  }
}
function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), data }));
  } catch (_) {}
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;
  const key = CACHE_KEY(uid);

  // Mostra cache se houver
  const cached = loadCache(key);
  if (cached) {
    paint(cached);
  }

  // Busca dados do RTDB
  const snap = await get(ref(db, `usuarios/${uid}`));
  if (!snap.exists()) return;
  const u = snap.val();

  const data = {
    email: u.email || user.email || "",
    phone: u.phone || u.telefone || "",
    shortId: u.shortId || uid,
    saldo: u.saldo || 0, // saldo disponível
    retiradaTotal: u.retiradaTotal || 0 // valor total de retiradas
  };

  paint(data);
  saveCache(key, data);
});

function paint({ email, phone, shortId, saldo, retiradaTotal }) {
  const main = phone || email || "(sem email)";
  setText("user-main", main);
  setText("user-shortid", shortId || "—");
  setText("saldo", formatKz(saldo || 0));
  setText("retirada-total", formatKz(retiradaTotal || 0));

  const avatar = document.getElementById("avatar-letter");
  if (avatar && main) {
    avatar.textContent = (main[0] || "U").toUpperCase();
  }
}

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/* logout */
document.getElementById("logout")?.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (err) {
    console.error("Erro ao sair:", err);
  }
});
