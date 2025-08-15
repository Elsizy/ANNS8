// apagarUsuarios.js

import admin from "firebase-admin";

// ======== CONFIGURAÇÃO ========
// Baixe o arquivo de credenciais JSON do seu Firebase Admin SDK
// (Console do Firebase → Configurações do Projeto → Contas de Serviço → Gerar nova chave privada)
const serviceAccount = JSON.parse(
  // Troque pelo caminho do seu arquivo JSON
  JSON.stringify({
    // Cole aqui o conteúdo do seu arquivo JSON
  })
);

const ADMIN_UID = "QoyshcJnpUT0C3amYbVDQATUZz83";
const DATABASE_URL = "https://SEU-PROJETO.firebaseio.com"; // Troque para o seu URL exato do RTDB

// Inicializa o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: DATABASE_URL
});

// Função principal
async function apagarTudoMenosAdmin() {
  const db = admin.database();

  console.log("🔍 Lendo usuários...");
  const snapshot = await db.ref("usuarios").once("value");

  if (!snapshot.exists()) {
    console.log("❌ Nenhum usuário encontrado.");
    return;
  }

  const updates = {};
  snapshot.forEach(child => {
    if (child.key !== ADMIN_UID) {
      updates[child.key] = null; // marcar para exclusão
    }
  });

  if (Object.keys(updates).length === 0) {
    console.log("✅ Só existe o admin, nada para apagar.");
    return;
  }

  console.log("🗑 Apagando usuários não-admin...");
  await db.ref("usuarios").update(updates);
  console.log("✅ Exclusão concluída!");
}

apagarTudoMenosAdmin()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("⚠ Erro:", err);
    process.exit(1);
  });
