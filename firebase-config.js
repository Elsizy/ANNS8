import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBj-MK1oOk6lIJZT8KrSsllwSqoMHfUkzQ",
  authDomain: "anns8-5fc26.firebaseapp.com",
  projectId: "anns8-5fc26",
  storageBucket: "anns8-5fc26.appspot.com", // corrigido aqui o domínio
  messagingSenderId: "259361189676",
  appId: "1:259361189676:web:a9d54cee391b9f0f468689"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
