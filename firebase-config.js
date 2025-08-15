// firebase-config.js (CDN, modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDnd53WofoxaKUfTtQiyA6B3KkCYicUFVE",
  authDomain: "aesinc-1b8a9.firebaseapp.com",
  databaseURL: "https://aesinc-1b8a9-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "aesinc-1b8a9",
  storageBucket: "aesinc-1b8a9.appspot.com", // ← bucket correto
  messagingSenderId: "241657630880",
  appId: "1:241657630880:web:3342e177b87480427fb9c5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { auth, db };
