// registrodeposito.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    // Busca todos os depósitos
    const snap = await get(ref(db, "depositRequests"));
    if (!snap.exists()) return showEmpty();

    // Filtra do usuário e ordena (mais recentes primeiro)
    const data = snap.val();
    const arr = Object.values(data)
      .filter(d => (d?.uid === user.uid))
      .map(d => ({
        ...d,
        status: normalizeStatus(d.status)
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (!arr.length) return showEmpty();

    emptyEl.style.display = "none";
    listEl.innerHTML = "";
    arr.forEach(renderItem);
  } catch (e) {
    console.error("Erro ao carregar depósitos:", e);
    showEmpty("Falha ao carregar os registos.");
  }
});


  


/** function renderItem(dep) {

  const item = document.createElement("div");
  item.className = "item";

  /* ==========================
     COLUNA STATUS
  ========================== */

  /**const statusColumn = document.createElement("div");
  statusColumn.className = "status-column";

  const statusIcon = document.createElement("div");
  statusIcon.className = "status-icon " + statusClass(dep.status);

  statusIcon.innerHTML = `
  <svg viewBox="0 0 24 24" fill="none">
      ${
        dep.status === "done"
        ? `<path d="M5 13L10 18L19 7"/>`
        : dep.status === "rejected"
        ? `<path d="M7 7L17 17M17 7L7 17"/>`
        : `<path d="M12 6V12L16 15"/>`
      }
  </svg>
  `;

  const statusText = document.createElement("div");
  statusText.className = "status-text";
  statusText.textContent = statusLabel(dep.status);

  statusColumn.appendChild(statusIcon);
  statusColumn.appendChild(statusText);

  /* ==========================
     DIVISOR
  ========================== */

 /** const divider = document.createElement("div");
  divider.className = "divider";

  /* ==========================
     GRID DIREITA
  ========================== */

  /** const infoGrid = document.createElement("div");
  infoGrid.className = "info-grid";

  /* ---------- ENVIADO ---------- */

 /** const sentColumn = document.createElement("div");
  sentColumn.className = "sent-column";

  const sentTitle = document.createElement("div");
  sentTitle.className = "title";
  sentTitle.textContent = "Enviado em";

  const sentDate = document.createElement("div");
  sentDate.className = "date";
  sentDate.textContent = formatDateOnly(dep.createdAt);

  const sentTime = document.createElement("div");
  sentTime.className = "time";
  sentTime.textContent = formatTimeOnly(dep.createdAt);

  sentColumn.append(
      sentTitle,
      sentDate,
      sentTime
  );

  /* ---------- CONFIRMADO ---------- */

  /**const confirmColumn = document.createElement("div");
  confirmColumn.className = "confirm-column";

  const confirmTitle = document.createElement("div");
  confirmTitle.className = "title";
  confirmTitle.textContent = "Confirmado em";

  const confirmDate = document.createElement("div");
  confirmDate.className = "date";

  const confirmTime = document.createElement("div");
  confirmTime.className = "time";

  const confirmedAt = chooseConfirmDate(dep);

  if (confirmedAt) {

      confirmDate.textContent = formatDateOnly(confirmedAt);
      confirmTime.textContent = formatTimeOnly(confirmedAt);

  } else {

      confirmDate.textContent = "--/--/----";
      confirmTime.textContent = "--:--";

  }

  confirmColumn.append(
      confirmTitle,
      confirmDate,
      confirmTime
  );

  /* ---------- VALOR ---------- */

  /**const valueColumn = document.createElement("div");
  valueColumn.className = "value-column";

  const valueTitle = document.createElement("div");
  valueTitle.className = "title";
  valueTitle.textContent = "Valor depositado";

  const amount = document.createElement("div");
  amount.className = "amount";

  amount.innerHTML =
      `<span class="currency">KZ</span> ${formatNumber(chooseAmount(dep))}`;

  valueColumn.append(
      valueTitle,
      amount
  );

  /* ==========================
     MONTAGEM
  ========================== */

  /**infoGrid.append(
      sentColumn,
      confirmColumn,
      valueColumn
  );

  item.append(
      statusColumn,
      divider,
      infoGrid
  );

  listEl.appendChild(item);

} */

/** function renderItem(dep) {

  const item = document.createElement("div");
  item.className = "item";
  

  //=========================
  // COLUNA 1 - STATUS
  //=========================

  const statusCol = document.createElement("div");
  statusCol.className = "status-col";

  const dot = document.createElement("span");
  dot.className = "status-dot " + statusClass(dep.status);

  const status = document.createElement("span");
  status.className = "status-text";
  status.textContent = statusLabel(dep.status);

  statusCol.append(dot, status);

  //=========================
  // COLUNA 2 - ENVIADO
  //=========================

  const sentCol = document.createElement("div");
  sentCol.className = "sent-col";

  const sentTitle = document.createElement("span");
  sentTitle.className = "col-title";
  sentTitle.textContent = "Enviado em";

  const sent = formatDateParts(dep.createdAt);

  const sentDate = document.createElement("span");
  sentDate.className = "col-date";
  sentDate.textContent = sent.date;

  const sentHour = document.createElement("span");
  sentHour.className = "col-hour";
  sentHour.textContent = sent.time;

  sentCol.append(sentTitle, sentDate, sentHour);

  //=========================
  // COLUNA 3 - CONFIRMADO
  //=========================

  const confirmCol = document.createElement("div");
  confirmCol.className = "confirm-col";

  const confirmTitle = document.createElement("span");
  confirmTitle.className = "col-title";
  confirmTitle.textContent = "Confirmado em";

  confirmCol.appendChild(confirmTitle);

  const confirmedAt = chooseConfirmDate(dep);

  if (confirmedAt) {

      const confirm = formatDateParts(confirmedAt);

      const confirmDate = document.createElement("span");
      confirmDate.className = "col-date";
      confirmDate.textContent = confirm.date;

      const confirmHour = document.createElement("span");
      confirmHour.className = "col-hour";
      confirmHour.textContent = confirm.time;

      confirmCol.append(confirmDate, confirmHour);

  } else {

      const dash = document.createElement("span");
      dash.className = "col-date";
      dash.textContent = "—";

      confirmCol.appendChild(dash);

  }

  //=========================
  // COLUNA 4 - VALOR
  //=========================

  const valueCol = document.createElement("div");
  valueCol.className = "value-col";

  const valueTitle = document.createElement("span");
  valueTitle.className = "col-title";
  valueTitle.textContent = "Valor depositado";

  const amount = document.createElement("div");
  amount.className = "amount";

  const kz = document.createElement("span");
  kz.className = "currency";
  kz.textContent = "KZ";

  const number = document.createElement("span");
  number.className = "value";
  number.textContent = formatNumber(chooseAmount(dep));

  amount.append(kz, number);

  valueCol.append(valueTitle, amount);

  //=========================
  // MONTA O CARD
  //=========================

  item.append(
      statusCol,
      sentCol,
      confirmCol,
      valueCol
  );

  listEl.appendChild(item);

} */

function renderItem(dep){

    const confirmedAt = chooseConfirmDate(dep);

    const sent = formatDateParts(dep.createdAt);

    const confirm = confirmedAt
        ? formatDateParts(confirmedAt)
        : {date:"—",time:"—"};

    const item = document.createElement("div");
    item.className="item";



    /* ===========================
       COLUNA ESQUERDA
    =========================== */

    const left=document.createElement("div");
    left.className="status-col";

    const dot=document.createElement("span");
    dot.className="status-dot "+statusClass(dep.status);

    const status=document.createElement("span");
    status.className="status-text";
    status.textContent=statusLabel(dep.status);

    //left.append(dot,status);
    left.append(dot);



    /* ===========================
       CORPO
    =========================== */

    const body=document.createElement("div");
    body.className="item-body";



    /* GRID PRINCIPAL */

    const grid=document.createElement("div");
    grid.className="deposit-grid";



    /* ===========================
       COLUNA 1
       ESTADO
    =========================== */

    const colStatus=document.createElement("div");
    colStatus.className="grid-col";

    const stTitle=document.createElement("span");
    stTitle.className="grid-title";
    stTitle.textContent="Estado";

    const stValue=document.createElement("span");
    stValue.className="grid-value status-"+dep.status;
    stValue.textContent=statusLabel(dep.status);

    colStatus.append(
        stTitle,
        stValue
    );



    /* ===========================
       COLUNA 2
       ENVIADO
    =========================== */

    const colSent=document.createElement("div");
    colSent.className="grid-col";

    const sentTitle=document.createElement("span");
    sentTitle.className="grid-title";
    sentTitle.textContent="Enviado em";

    const sentDate=document.createElement("span");
    sentDate.className="grid-date";
    sentDate.textContent=sent.date;

    const sentTime=document.createElement("span");
    sentTime.className="grid-time";
    sentTime.textContent=sent.time;

    colSent.append(
        sentTitle,
        sentDate,
        sentTime
    );



    /* ===========================
       COLUNA 3
       CONFIRMADO
    =========================== */

    const colConfirm=document.createElement("div");
    colConfirm.className="grid-col";

    const confirmTitle=document.createElement("span");
    confirmTitle.className="grid-title";
    confirmTitle.textContent="Confirmado em";

    const confirmDate=document.createElement("span");
    confirmDate.className="grid-date";
    confirmDate.textContent=confirm.date;

    const confirmTime=document.createElement("span");
    confirmTime.className="grid-time";
    confirmTime.textContent=confirm.time;

    colConfirm.append(
        confirmTitle,
        confirmDate,
        confirmTime
    );



    /* ===========================
       COLUNA 4
       VALOR
    =========================== */

    const colAmount=document.createElement("div");
    colAmount.className="grid-col amount-col";

    const amountTitle=document.createElement("span");
    amountTitle.className="grid-title";
    amountTitle.textContent="Valor";

    const amountValue=document.createElement("span");
    amountValue.className="amount-value";
    amountValue.textContent=formatNumber(
        chooseAmount(dep)
    );

    const kz=document.createElement("span");
    kz.className="amount-unit";
    kz.textContent="Kz";

    colAmount.append(
        amountTitle,
        amountValue,
        kz
    );



    grid.append(
        colStatus,
        colSent,
        colConfirm,
        colAmount
    );



    body.appendChild(grid);

    item.append(
        left,
        body
    );

    listEl.appendChild(item);

}

/** date */

function formatDateOnly(ts){

    if(!ts) return "--/--/----";

    const d=new Date(Number(ts)||ts);

    const dd=String(d.getDate()).padStart(2,"0");

    const mm=String(d.getMonth()+1).padStart(2,"0");

    const yyyy=d.getFullYear();

    return `${dd}/${mm}/${yyyy}`;

}

function formatTimeOnly(ts){

    if(!ts) return "--:--";

    const d=new Date(Number(ts)||ts);

    const hh=String(d.getHours()).padStart(2,"0");

    const mi=String(d.getMinutes()).padStart(2,"0");

    return `${hh}:${mi}`;

}
/* fim do novo código*/ 
/** Valor a exibir (preferências + *fallbacks*) */
function chooseAmount(d) {
  return Number(
    d.amountExact ?? d.amountBase ?? d.amount ?? d.valor ?? d.total ?? 0
  );
}

/** Data de confirmação (vários nomes possíveis no seu backoffice) */
function chooseConfirmDate(d) {
  return d.approvedAt ?? d.confirmedAt ?? d.verifiedAt ?? d.paidAt ?? null;
}

/** Linha de detalhes (banco + IBAN mascarado ou método) */
/** Linha de detalhes (banco + IBAN SEM máscara ou método) */
/* function buildDetails(d) {
  const bank = d.bank || d.bankName;
  const method = d.method;
  const iban = d?.bankData?.iban ?? null; // <-- sem máscara

  const hasSomething = bank || method || iban;
  if (!hasSomething) return null;

  const wrap = document.createElement("div");
  wrap.className = "meta-top"; // reaproveita o estilo (mesmo tamanho de fonte)
  
  const left = document.createElement("span");
  left.className = "ref";
  left.textContent = bank ? `Banco: ${bank}` : (method ? `Método: ${method}` : "");

  const right = document.createElement("div");
  right.className = "dates";
  right.textContent = iban ? `IBAN: ${iban}` : (method && bank ? `Método: ${method}` : "");

  wrap.appendChild(left);
  wrap.appendChild(right);
  return wrap;
}  */

function normalizeStatus(st) {
  if (!st) return "pending";
  const s = String(st).toLowerCase();
  if (["pending","processando","processing","done","concluido","concluído","rejected","rejeitado"].includes(s)) {
    if (s.startsWith("conc") || s === "done") return "done";
    if (s.startsWith("rej")) return "rejected";
    if (s.startsWith("proc")) return "pending"; // exibimos como "Pendente"
    return s;
  }
  if (s.startsWith("conc")) return "done";
  if (s.startsWith("rej")) return "rejected";
  return "pending";
}

function statusLabel(st) {
  switch (st) {
    case "done": return "Concluído";
    case "rejected": return "Rejeitado";
    default: return "Pendente";
  }
}
function statusClass(st) {
  switch (st) {
    case "done": return "status-done";
    case "rejected": return "status-rejected";
    default: return "status-pending";
  }
}

function showEmpty(msg) {
  if (emptyEl) {
    emptyEl.style.display = "block";
    emptyEl.textContent = msg || "Nenhum registo de depósito.";
  }
  if (listEl) listEl.innerHTML = "";
}

function formatNumber(v){
  return Number(v || 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(Number(ts) || ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

function formatDateParts(ts) {
  if (!ts) {
    return {
      date: "—",
      time: "—"
    };
  }

  const d = new Date(Number(ts) || ts);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");

  return {
    date: `${dd}/${mm}/${yyyy}`,
    time: `${hh}:${mi}`
  };
    }
