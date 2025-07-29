// user.js
import { getDatabase, ref, onValue, remove } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getAuth, deleteUser } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { app } from "./firebase-config.js";

// Referências do Firebase
const db = getDatabase(app);
const auth = getAuth(app);

// Elemento onde a lista de usuários será exibida
const userTable = document.getElementById("user-table-body");

// Função para carregar os usuários ativos
function carregarUsuarios() {
  const usersRef = ref(db, "usuarios/");
  onValue(usersRef, (snapshot) => {
    userTable.innerHTML = "";

    snapshot.forEach((childSnapshot) => {
      const uid = childSnapshot.key;
      const userData = childSnapshot.val();
      
      const nome = userData.nome || "N/A";
      const deposito = userData.depositoTotal || 0;
      const retirada = userData.retiradaTotal || 0;
      const saldo = userData.saldo || 0;

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${nome}</td>
        <td>${deposito} kz</td>
        <td>${retirada} kz</td>
        <td>${saldo} kz</td>
        <td>
          <button class="btn-delete" data-uid="${uid}">Deletar</button>
        </td>
      `;

      userTable.appendChild(row);
    });

    // Adiciona eventos aos botões de deletar
    document.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const uid = e.target.getAttribute("data-uid");

        // Remove do RTDB
        await remove(ref(db, `usuarios/${uid}`));

        // Remove da Auth (necessário logar como admin com privilégio ou usar cloud function segura)
        try {
          const user = auth.currentUser;
          if (user && user.uid === uid) {
            await deleteUser(user);
            alert("Usuário deletado com sucesso da Auth.");
          } else {
            alert("Removido do banco de dados. Para remover da Auth, é necessário ser o próprio usuário logado ou usar funções administrativas.");
          }
        } catch (error) {
          console.error("Erro ao deletar da Auth:", error.message);
        }
      });
    });
  });
}

// Executa ao carregar
carregarUsuarios();
