import { getApps, initializeApp } from "firebase/app";

export function initAppIfNeeded() {
  const firebaseConfig = require("../../../firebase-config");
  if (getApps().length > 0) {
    return;
  }
  initializeApp(firebaseConfig);
}
