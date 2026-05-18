import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCaduHQdeknkestReV2lgMsXyF_cluBHDE",
  authDomain: "amigos-a993b.firebaseapp.com",
  projectId: "amigos-a993b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
