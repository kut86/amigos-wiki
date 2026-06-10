import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ─────────────────────────
   FIREBASE
───────────────────────── */

const firebaseConfig = {
  apiKey: "AIzaSyA7GnUlFkDcDKAv4ntXC6UZDjAkpaEgPMs",
  authDomain: "tarkovmap-376d0.firebaseapp.com",
  projectId: "tarkovmap-376d0",
  storageBucket: "tarkovmap-376d0.firebasestorage.app",
  messagingSenderId: "693794844907",
  appId: "1:693794844907:web:bb020ca896ae7b07acceae",
  databaseURL: "https://tarkovmap-376d0-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/* ─────────────────────────
   FIXED MAP (woods.html)
───────────────────────── */

const MAP_ID = "woods";

/* ─────────────────────────
   STATE
───────────────────────── */

let isAdmin = false;
let user = null;

let currentRef = null;
let allMarkers = {};

let addMode = false;
let pendingPos = null;

/* ─────────────────────────
   ADMIN ID (твоя логика)
───────────────────────── */

const ADMIN_UID = "7AvuSzEGvwQYPLowdsI5mKUZEFG2";

/* ─────────────────────────
   AUTH
───────────────────────── */

document.getElementById("loginBtn").onclick = () =>
  signInWithPopup(auth, provider);

document.getElementById("logoutBtn").onclick = () =>
  signOut(auth);

onAuthStateChanged(auth, (u) => {
  user = u;
  isAdmin = !!(u && u.uid === ADMIN_UID);

  document.getElementById("loginBtn").style.display = u ? "none" : "";
  document.getElementById("logoutBtn").style.display = u ? "" : "none";
  document.getElementById("adminBadge").style.display = isAdmin ? "" : "none";
  document.getElementById("addModeBtn").style.display = isAdmin ? "" : "none";

  subscribe();
});

/* ─────────────────────────
   FIREBASE PATH (ВАЖНО)
───────────────────────── */

function subscribe() {
  currentRef = ref(db, `maps/${MAP_ID}/markers`);

  onValue(currentRef, (snap) => {
    allMarkers = {};

    snap.forEach((i) => {
      allMarkers[i.key] = i.val();
    });

    render();
  });
}

/* ─────────────────────────
   ADD MODE
───────────────────────── */

document.getElementById("addModeBtn").onclick = () => {
  addMode = !addMode;
};

/* ─────────────────────────
   CLICK MAP → CREATE MARKER
───────────────────────── */

const mapEl = document.getElementById("map");

mapEl.addEventListener("click", (e) => {
  if (!addMode || !isAdmin) return;

  const rect = mapEl.getBoundingClientRect();

  pendingPos = {
    x: ((e.clientX - rect.left) / rect.width) * 100,
    y: ((e.clientY - rect.top) / rect.height) * 100
  };

  const text = prompt("Название маркера:");

  if (!text) return;

  push(currentRef, {
    x: pendingPos.x,
    y: pendingPos.y,
    text,
    type: "loot",
    imgUrl: null,
    iconUrl: null
  });
});

/* ─────────────────────────
   RENDER
───────────────────────── */

function render() {
  document.querySelectorAll(".marker").forEach((m) => m.remove());

  for (const [id, m] of Object.entries(allMarkers)) {
    createMarker(id, m);
  }
}

function createMarker(id, m) {
  const div = document.createElement("div");
  div.className = "marker";

  div.dataset.id = id;

  div.style.left = m.x + "%";
  div.style.top = m.y + "%";

  div.innerHTML = `
    <div class="marker-icon">📍</div>
    <div class="marker-tooltip">${escapeHtml(m.text || "")}</div>
  `;

  mapEl.appendChild(div);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ─────────────────────────
   INIT
───────────────────────── */

console.log("[APP] woods.html loaded");
