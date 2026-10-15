// shared/firebase-init.js
// Firebase ka config AB SIRF YAHAN hai (pehle 32 files me copy tha).
// Domain/project badalna ho to sirf yeh file edit karein.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export const ADMIN_UID = "xB1E48oIdvN7jruPCIp7tzlH9lA2";

export const firebaseConfig = {
  apiKey: "AIzaSyDhPuyX0y1gb3uXoIRcdcQPkd5Q4KJFgl0",
  authDomain: "data-f15ab.firebaseapp.com",
  projectId: "data-f15ab",
  storageBucket: "data-f15ab.firebasestorage.app",
  messagingSenderId: "449137002393",
  appId: "1:449137002393:web:6a23721d00b1b0daeb3508",
  measurementId: "G-1PHNJQWNPZ"
};

export const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
