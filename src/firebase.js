
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAPjLVvkjb1fDk75GyGScb6C-csclM5xbQ",
  authDomain: "sakany10.firebaseapp.com",
  databaseURL: "https://sakany10-default-rtdb.firebaseio.com",
  projectId: "sakany10",
  storageBucket: "sakany10.firebasestorage.app",
  messagingSenderId: "894759727168",
  appId: "1:894759727168:web:28add29944f36f4f6d6fa5",
  measurementId: "G-0DL7TMSE7P"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
