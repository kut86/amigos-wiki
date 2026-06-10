import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ─────────────────────
   FIREBASE
───────────────────── */

const firebaseConfig = {
  apiKey: "AIzaSyA7GnUlFkDcDKAv4ntXC6UZDjAkpaEgPMs",
  authDomain: "tarkovmap-376d0.firebaseapp.com",
  projectId: "tarkovmap-376d0",
  storageBucket: "tarkovmap-376d0.firebasestorage.app",
  messagingSenderId: "693794844907",
  appId: "1:693794844907:web:bb020ca896ae7b07acceae",
  databaseURL: "https://tarkovmap-376d0-default-rtdb.europe-west1.firebasedatabase.app"
};

const app  = initializeApp(firebaseConfig);
const db   = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/* ─────────────────────
   MAP ID (ВАЖНО)
───────────────────── */

const MAP_ID = document.body.dataset.map || "woods";
const markersRef = ref(db, `maps/${MAP_ID}/markers`);

/* ─────────────────────
   STATE
───────────────────── */

let isAdmin = false;
let markers = {};

/* ─────────────────────
   DOM
───────────────────── */

const mapStage  = document.getElementById("mapStage");
const mapImage  = document.getElementById("mapImage");

const loginBtn  = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const addBtn    = document.getElementById("addBtn") || null;

/* ─────────────────────
   AUTH
───────────────────── */

loginBtn?.addEventListener("click", () => {
  signInWithPopup(auth, provider);
});

logoutBtn?.addEventListener("click", () => {
  signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  isAdmin = !!user;

  if (loginBtn) loginBtn.style.display = user ? "none" : "";
  if (logoutBtn) logoutBtn.style.display = user ? "" : "none";
});

/* ─────────────────────
   LOAD MARKERS
───────────────────── */

onValue(markersRef, (snap) => {
  markers = {};

  snap.forEach((item) => {
    markers[item.key] = item.val();
  });

  render();
});

/* ─────────────────────
   RENDER
───────────────────── */

function render() {
  document.querySelectorAll(".marker").forEach(m => m.remove());

  for (const [id, m] of Object.entries(markers)) {
    createMarker(id, m);
  }
}

function createMarker(id, m) {
  const div = document.createElement("div");
  div.className = "marker";

  div.style.left = m.x + "%";
  div.style.top  = m.y + "%";

  div.innerHTML = `
    <div class="marker-dot">${getEmoji(m.type)}</div>
    <div class="marker-label">${escapeHtml(m.text || "")}</div>
  `;

  div.addEventListener("click", () => {
    openMarker(m);
  });

  mapStage.appendChild(div);
}

/* ─────────────────────
   ADD MARKER (admin)
───────────────────── */

mapStage.addEventListener("click", (e) => {
  if (!isAdmin) return;
  if (e.target.closest(".marker")) return;

  const rect = mapStage.getBoundingClientRect();

  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  const text = prompt("Название маркера:");
  if (!text) return;

  const type = prompt("Тип (loot/boss/quest/exit/bot/structure):", "loot");

  push(markersRef, {
    x, y,
    text,
    type: type || "loot"
  });
});

/* ─────────────────────
   OPEN MARKER
───────────────────── */

function openMarker(m) {
  alert(`${m.text}\nТип: ${m.type}`);
}

/* ─────────────────────
   UTILS
───────────────────── */

function getEmoji(type) {
  const map = {
    loot: "📦",
    boss: "💀",
    quest: "📋",
    exit: "🚪",
    bot: "🎯",
    structure: "🧩"
  };
  return map[type] || "📍";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
