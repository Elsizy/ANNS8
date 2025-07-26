// sf-pay-set.js (corrigido)
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const DRAFT_KEY = "deposit_draft_v1";

const titularEl     = document.getElementById("titular");
const ibanEl        = document.getElementById("iban");
const amountExactEl = document.getElementById("amount-exact");
const goNextBtn     = document.getElementById("go-next");

let draft = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
  if (!draft?.amountBase || !draft?.method) {
    alert("Fluxo de depósito inválido. Recomece.");
    window.location.href = "deposito.html";
    return;
  }

  // >>> AQUI ESTAVA O ERRO: usar o ID salvo em draft.bankData.id <<<
  const bankId = draft?.bankData?.id;
  if (bankId) {
    const bankSnap = await get(ref(db, `adminBanks/${bankId}`));
    if (bankSnap.exists()) {
      const b = bankSnap.val();
      titularEl.textContent = b.holder || "—";
      ibanEl.textContent = b.iban || "—";
      draft.bank = b.name || draft.bank || "";
      draft.bankData = {
        id: bankId,
        name: b.name || "",
        iban: b.iban || "",
        holder: b.holder || ""
      };
    } else {
      // fallback se o ID não existir mais
      titularEl.textContent = "—";
      ibanEl.textContent = "—";
      draft.bankData = { id: bankId, name: draft.bank || "", iban: "", holder: "" };
    }
  } else {
    // fallback extremo (usuário veio direto pra cá sem passar pelo sf-pay.html)
    titularEl.textContent = "—";
    ibanEl.textContent = "—";
    draft.bankData = { id: null, name: draft.bank || "", iban: "", holder: "" };
  }

  // 2) Gera valor exato se ainda não existir
  if (!draft.amountExact) {
    draft.amountExact = gerarValorExato(draft.amountBase);
  }
  amountExactEl.textContent = formatKz(draft.amountExact);

  // salva o draft atualizado
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));

  // 3) Botão copiar
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    const sel = btn.getAttribute("data-copy");
    btn.addEventListener("click", async () => {
      try {
        const val = document.querySelector(sel)?.textContent || "";
        await navigator.clipboard.writeText(val);
        const old = btn.textContent;
        btn.textContent = "Copiado!";
        setTimeout(() => (btn.textContent = old), 1200);
      } catch (_) {}
    });
  });

  // 4) Avançar
  goNextBtn.addEventListener("click", () => {
    window.location.href = "sf-pay-set-in.html";
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
