// firebase-config.js (Firebase v8)
const firebaseConfig = {
  apiKey: "AIzaSyBj-MK1oOk6lIJZT8KrSsllwSqoMHfUkzQ",
  authDomain: "anns8-5fc26.firebaseapp.com",
  databaseURL: "https://anns8-5fc26-default-rtdb.firebaseio.com",
  projectId: "anns8-5fc26",
  storageBucket: "anns8-5fc26.appspot.com",
  messagingSenderId: "259361189676",
  appId: "1:259361189676:web:a9d54cee391b9f0f468689"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();
