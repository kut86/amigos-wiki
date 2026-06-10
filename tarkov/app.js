import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase, ref, push, onValue, update, remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ── Firebase ── */
const firebaseConfig = {
  apiKey: "AIzaSyA7GnUlFkDcDKAv4ntXC6UZDjAkpaEgPMs",
  authDomain: "tarkovmap-376d0.firebaseapp.com",
  projectId: "tarkovmap-376d0",
  storageBucket: "tarkovmap-376d0.firebasestorage.app",
  messagingSenderId: "693794844907",
  appId: "1:693794844907:web:bb020ca896ae7b07acceae",
  databaseURL: "https://tarkovmap-376d0-default-rtdb.europe-west1.firebasedatabase.app"
};

const app      = initializeApp(firebaseConfig);
const db       = getDatabase(app);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();

/* ── 🧠 ВАЖНО: ID страницы (изоляция карт) ── */
const PAGE_ID = location.pathname
  .split("/")
  .pop()
  .replace(".html", ""); // woods.html → woods

/* ── Карты (локально в каждой странице) ── */
const MAPS = {
  woods: {
    label: "Лес",
    imgUrl: "images/woods.png",
    fallback: "https://gspics.org/images/2026/06/03/IDigvX.jpg"
  },
  customs: {
    label: "Таможня",
    imgUrl: "images/customs.jpg",
    fallback: "https://i.imgur.com/FKY4S2W.jpg"
  },
  interchange: {
    label: "Развязка",
    imgUrl: "images/interchange.jpg",
    fallback: "https://i.imgur.com/FKY4S2W.jpg"
  }
};

/* ── DOM ── */
const mapEl      = document.getElementById("map");
const mapImg     = document.getElementById("mapImage");
const loginBtn   = document.getElementById("loginBtn");
const logoutBtn  = document.getElementById("logoutBtn");
const adminBadge = document.getElementById("adminBadge");
const addModeBtn = document.getElementById("addModeBtn");
const filterSel  = document.getElementById("filter");
const mapSelect  = document.getElementById("mapSelect");
const mapWrapper = document.getElementById("mapWrapper");

const addForm    = document.getElementById("addForm");
const addText    = document.getElementById("addText");
const addType    = document.getElementById("addType");
const addImgUrl  = document.getElementById("addImgUrl");
const addIcon    = document.getElementById("addIcon");
const addConfirm = document.getElementById("addConfirm");
const addCancel  = document.getElementById("addCancel");

/* ── State ── */
const ADMIN_UID = "7AvuSzEGvwQYPLowdsI5mKUZEFG2";
let isAdmin = false;

let currentMap = "woods";
let currentRef  = null;
let offFn       = null;

let addMode = false;
let pendingPos = null;
let allMarkers = {};

/* ── AUTH (как у тебя было) ── */
loginBtn.onclick  = () => signInWithPopup(auth, provider);
logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  isAdmin = !!(user && user.uid === ADMIN_UID);

  loginBtn.style.display   = user ? "none" : "";
  logoutBtn.style.display  = user ? "" : "none";
  adminBadge.style.display = isAdmin ? "" : "none";
  addModeBtn.style.display = isAdmin ? "" : "none";

  if (!isAdmin) exitAddMode();
});

/* ── MAP SWITCH ── */
mapSelect.addEventListener("change", e => switchMap(e.target.value));

function switchMap(id) {
  currentMap = id;

  if (offFn) offFn();

  allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());

  mapImg.onload = () => {
    subscribe();
  };

  mapImg.onerror = () => {
    mapImg.src = MAPS[id].fallback;
  };

  mapImg.src = MAPS[id].imgUrl;
}

/* ── FIREBASE PATH (ГЛАВНОЕ ИЗМЕНЕНИЕ) ── */
function subscribe() {
  const path = `maps/${PAGE_ID}/${currentMap}/markers`;

  currentRef = ref(db, path);

  offFn = onValue(currentRef, snap => {
    allMarkers = {};
    snap.forEach(i => {
      allMarkers[i.key] = i.val();
    });
    render();
  });
}

/* ── ADD MODE ── */
addModeBtn.onclick = () => addMode ? exitAddMode() : enterAddMode();

function enterAddMode() {
  if (!isAdmin) return;

  addMode = true;
  addModeBtn.textContent = "✕ Отмена";
  mapWrapper.style.cursor = "crosshair";
}

function exitAddMode() {
  addMode = false;
  pendingPos = null;
  addForm.style.display = "none";
  addModeBtn.textContent = "+ Маркер";
  mapWrapper.style.cursor = "default";
}

/* ── CLICK MAP ── */
mapEl.addEventListener("click", e => {
  if (!addMode || !isAdmin) return;
  if (e.target.closest(".marker")) return;

  const r = mapEl.getBoundingClientRect();

  pendingPos = {
    x: ((e.clientX - r.left) / r.width) * 100,
    y: ((e.clientY - r.top) / r.height) * 100
  };

  addForm.style.display = "flex";
});

/* ── SAVE MARKER ── */
addConfirm.onclick = () => {
  if (!pendingPos) return;

  const text = addText.value.trim();
  if (!text) return;

  push(currentRef, {
    x: pendingPos.x,
    y: pendingPos.y,
    text,
    type: addType.value,
    imgUrl: addImgUrl.value.trim() || null,
    iconUrl: addIcon.value.trim() || null
  });

  exitAddMode();
};

addCancel.onclick = exitAddMode;

/* ── RENDER ── */
function render() {
  document.querySelectorAll(".marker").forEach(m => m.remove());

  Object.entries(allMarkers).forEach(([id, m]) => {
    createMarker(id, m);
  });
}

function createMarker(id, m) {
  const div = document.createElement("div");

  div.className = "marker";
  div.style.left = m.x + "%";
  div.style.top  = m.y + "%";

  div.innerHTML = `
    <div class="marker-tooltip">${m.text}</div>
  `;

  mapEl.appendChild(div);
}

/* ── INIT ── */
switchMap("woods");
