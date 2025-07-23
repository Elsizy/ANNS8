
// Substitua com as tuas credenciais do Firebase
const firebaseConfig = {
  apiKey: "TUA_API_KEY",
  authDomain: "TEU_DOMINIO.firebaseapp.com",
  projectId: "TEU_PROJECT_ID",
  storageBucket: "TEU_BUCKET.appspot.com",
  messagingSenderId: "TUA_MESSAGING_ID",
  appId: "TEU_APP_ID",
  databaseURL: "https://TEU_PROJECT_ID.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
