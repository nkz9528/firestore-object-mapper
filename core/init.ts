import { getApps, initializeApp } from "firebase/app";

export function initAppIfNeeded() {
  // const firebaseConfig = require("../../../firebase-config");
  if (getApps().length > 0) {
    return;
  }
  const firebaseConfig = {
    apiKey: "AIzaSyB7zEY1CAbiUPVTomZcOuVuIosBe0alXEQ",
    authDomain: "fire-wrapper2.firebaseapp.com",
    projectId: "fire-wrapper2",
    storageBucket: "fire-wrapper2.appspot.com",
    messagingSenderId: "47280289969",
    appId: "1:47280289969:web:7c79968012beeff1da0a90",
  };
  initializeApp(firebaseConfig);
}
