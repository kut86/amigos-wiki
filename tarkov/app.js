import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase, ref, push, onValue, update, remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { openModal, setAdmin } from "./modal.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/* ── PAGE ID (изоляция карт) ── */
const PAGE_ID = location.pathname.split("/").pop().replace(".html", "");

/* ── STATE ── */
const ADMIN_UID = "7AvuSzEGvwQYPLowdsI5mKUZEFG2";

let isAdmin = false;
let currentMap = "woods";

let currentRef = null;
let offFn = null;

let allMarkers = {};
let addMode = false;
let pendingPos = null;

/* ── DOM ── */
const mapEl = document.getElementById("map");
const mapImg = document.getElementById("mapImage");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const addModeBtn = document.getElementById("addModeBtn");
const addForm = document.getElementById("addForm");

const addTitle = document.getElementById("addTitle");
const addType = document.getElementById("addType");
const addIconUrl = document.getElementById("addIconUrl");
const addDescription = document.getElementById("addDescription");

const addConfirm = document.getElementById("addConfirm");
const addCancel = document.getElementById("addCancel");

/* ── AUTH ── */
loginBtn.onclick = () => signInWithPopup(auth, provider);
logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  isAdmin = !!(user && user.uid === ADMIN_UID);

  setAdmin(isAdmin);

  loginBtn.style.display = user ? "none" : "";
  logoutBtn.style.display = user ? "" : "";

  addModeBtn.style.display = isAdmin ? "" : "none";

  if (!isAdmin) exitAddMode();
});

/* ── MAP ── */
function switchMap(id) {
  currentMap = id;

  if (offFn) offFn();

  allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());

  mapImg.onload = () => subscribe();
  mapImg.src = mapImg.src;
}

/* ── FIREBASE ── */
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
addModeBtn.onclick = () => {
  addMode ? exitAddMode() : enterAddMode();
};

function enterAddMode() {
  if (!isAdmin) return;

  addMode = true;
  addModeBtn.textContent = "✕ Отмена";
}

function exitAddMode() {
  addMode = false;
  pendingPos = null;
  addForm.style.display = "none";
  addModeBtn.textContent = "+ Маркер";
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

  addForm.style.display = "block";
});

/* ── ADD MARKER ── */
addConfirm.onclick = () => {
  if (!pendingPos) return;

  push(currentRef, {
    x: pendingPos.x,
    y: pendingPos.y,
    title: addTitle.value.trim(),
    type: addType.value,
    iconUrl: addIconUrl.value.trim() || null,
    description: addDescription.value.trim() || ""
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
  div.style.top = m.y + "%";

  div.onclick = (e) => {
    e.stopPropagation();

    openModal(
      { id, ...m },
      updateMarker,
      deleteMarker,
      saveMarker
    );
  };

  mapEl.appendChild(div);
}

/* ── CRUD ── */
function updateMarker(id, data) {
  update(ref(db, `maps/${PAGE_ID}/${currentMap}/markers/${id}`), data);
}

function saveMarker(id, data) {
  updateMarker(id, data);
}

function deleteMarker(id) {
  remove(ref(db, `maps/${PAGE_ID}/${currentMap}/markers/${id}`));
}

/* ── INIT ── */
switchMap("woods");
