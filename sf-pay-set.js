// sf-pay-set.js
const DRAFT_KEY = "deposit_draft_v1";

const titularEl = document.getElementById("titular");
const ibanEl = document.getElementById("iban");
const amountExactEl = document.getElementById("amount-exact");
const copyBtns = document.querySelectorAll(".copy-btn");
const goNextBtn = document.getElementById("go-next");

let draft = null;

(function init() {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) {
    alert("Sessão expirada. Recomece o depósito.");
    window.location.href = "deposito.html";
    return;
  }
  draft = JSON.parse(raw);

  // gera os "centavos" aleatórios (0.01 a 0.99)
  const cents = (Math.floor(Math.random() * 90) + 10) / 100;
  const amountExact = draft.amountBase + cents;

  // popula UI
  titularEl.textContent = draft.bankData?.titular || "xxxx";
  ibanEl.textContent = draft.bankData?.iban || "xxxxxxxxxxxxxxxxxxxxx";
  amountExactEl.textContent = formatKz(amountExact);

  // salva no draft
  draft.amountExact = amountExact;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));

  copyBtns.forEach(btn => {
    btn.addEventListener("click", async () => {
      const selector = btn.dataset.copy;
      const el = document.querySelector(selector);
      if (!el) return;
      try {
        await navigator.clipboard.writeText(el.textContent.trim());
        btn.textContent = "Copiado!";
        setTimeout(() => (btn.textContent = "Copiar"), 1500);
      } catch (e) {
        console.error("Falha ao copiar:", e);
      }
    });
  });

  goNextBtn.addEventListener("click", () => {
    window.location.href = "sf-pay-set-in.html";
  });
})();

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
