// makeAdmin.js
import { db } from "./firebase-config.js";
import {
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// >>> ALTERE AQUI <<<
const UID   = "QoyshcJnpUT0C3amYbVDQATUZz83";
const EMAIL = "Elsizy@gmal.com";

async function makeAdmin() {
  try {
    const uRef = ref(db, `usuarios/${UID}`);
    const snap = await get(uRef);

    if (!snap.exists()) {
      // não existe ainda -> cria com o mínimo necessário
      await set(uRef, {
        uid: UID,
        email: EMAIL,
        role: "admin",
        criadoEm: new Date().toISOString()
      });
      console.log("Usuário criado e marcado como admin!");
    } else {
      // já existe -> só atualiza o role
      await update(uRef, { role: "admin" });
      console.log("Usuário já existia. Campo 'role' atualizado para 'admin'.");
    }

    alert("Pronto! Este usuário agora é ADMIN.");
  } catch (err) {
    console.error("Erro ao promover admin:", err);
    alert("Erro ao promover admin. Veja o console.");
  }
}

makeAdmin();
