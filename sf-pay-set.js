// sf-pay-set.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const DRAFT_KEY = "deposit_draft_v1";

const methodEl      = document.getElementById("bank-method");
const titularEl     = document.getElementById("titular");
const ibanEl        = document.getElementById("iban");
const amountExactEl = document.getElementById("amount-exact");
const goNextBtn     = document.getElementById("go-next");

let draft = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { location.href = "login.html"; return; }

  draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
  if (!draft?.amountBase || !draft?.method) {
    alert("Fluxo de depósito inválido. Recomece.");
    location.href = "deposito.html";
    return;
  }

  // carrega dados atualizados do banco pelo ID salvo
  const bankId = draft?.bankData?.id;
  if (bankId) {
    const bankSnap = await get(ref(db, `adminBanks/${bankId}`));
    if (bankSnap.exists()) {
      const b = bankSnap.val();
      draft.bank = b.name || draft.bank || "";
      draft.bankData = {
        id: bankId,
        name: b.name || "",
        iban: b.iban || "",
        holder: b.holder || ""
      };
    }
  }

  // preencher campos (usa draft, com fallback)
  methodEl.textContent  = draft?.bankData?.name || draft?.bank || "—";
  titularEl.textContent = draft?.bankData?.holder || "—";
  ibanEl.textContent    = draft?.bankData?.iban || "—";

  // gerar valor exato se não existir
  if (!draft.amountExact) draft.amountExact = gerarValorExato(draft.amountBase);
  amountExactEl.textContent = formatKz(draft.amountExact);

  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));

  // copiar (botões azuis da direita)
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sel = btn.getAttribute("data-copy");
      const val = document.querySelector(sel)?.textContent?.trim() || "";
      try {
        await navigator.clipboard.writeText(val);
        const svg = btn.querySelector("svg");
        const old = svg.outerHTML;
        // feedback rápido: vira um check
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';
        setTimeout(()=> btn.innerHTML = old, 1200);
      } catch {}
    });
  });

  goNextBtn.addEventListener("click", () => {
    location.href = "sf-pay-set-in.html";
  });
});

function gerarValorExato(base) {
  const cents = Math.floor(Math.random() * 99) + 1; // 1..99
  return Number(base) + Number((cents / 100).toFixed(2));
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
                      }
