// firebase-config.js (SDK modular v10)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBj-MK1oOk6lIJZT8KrSsllwSqoMHfUkzQ",
  authDomain: "anns8-5fc26.firebaseapp.com",
  databaseURL: "https://anns8-5fc26-default-rtdb.firebaseio.com",
  projectId: "anns8-5fc26",
  storageBucket: "anns8-5fc26.appspot.com",
  messagingSenderId: "259361189676",
  appId: "1:259361189676:web:a9d54cee391b9f0f468689"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence); // mantém o usuário logado
const db = getDatabase(app);

export { app, auth, db };
