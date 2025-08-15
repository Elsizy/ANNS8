// Importa funções principais do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBj-MK1oOk6lIJZT8KrSsllwSqoMHfUkzQ",
  authDomain: "anns8-5fc26.firebaseapp.com",
  databaseURL: "https://anns8-5fc26-default-rtdb.firebaseio.com",
  projectId: "anns8-5fc26",
  storageBucket: "anns8-5fc26.firebasestorage.app",
  messagingSenderId: "259361189676",
  appId: "1:259361189676:web:a9d54cee391b9f0f468689"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
