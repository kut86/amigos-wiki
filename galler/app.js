/* ============================================================
   TARKOV MAP — CLEAN STABLE VERSION
   Panzoom + Firebase + markers (% only)
============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase, ref, push, onValue, update, remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ───────────────── Firebase ───────────────── */

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

/* ───────────────── MAPS ───────────────── */

const MAPS = {
  woods: { label: "Лес", imgUrl: "https://i.imgur.com/IvAlf2V.jpeg" },
  customs: { label: "Таможня", imgUrl: "https://i.imgur.com/FKY4S2W.jpg" },
  interchange: { label: "Развязка", imgUrl: "https://gspics.org/images/2026/06/03/IDrVtJ.webp" }
};

/* ───────────────── DOM ───────────────── */

const mapEl = document.getElementById("map");
const mapImg = document.getElementById("mapImage");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const adminBadge = document.getElementById("adminBadge");

const filterSel = document.getElementById("filter");
const mapSelect = document.getElementById("mapSelect");

const addForm = document.getElementById("addForm");
const addText = document.getElementById("addText");
const addType = document.getElementById("addType");
const addImgUrl = document.getElementById("addImgUrl");
const addIcon = document.getElementById("addIcon");
const addConfirm = document.getElementById("addConfirm");
const addCancel = document.getElementById("addCancel");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBadge = document.getElementById("modalBadge");
const modalPhoto = document.getElementById("modalPhoto");
const modalDesc = document.getElementById("modalDesc");
const modalCoords = document.getElementById("modalCoords");
const editForm = document.getElementById("editForm");
const editText = document.getElementById("editText");
const editType = document.getElementById("editType");
const editImgUrl = document.getElementById("editImgUrl");
const editIcon = document.getElementById("editIcon");
const saveBtn = document.getElementById("saveBtn");
const cancelEdit = document.getElementById("cancelEdit");
const editBtn = document.getElementById("editBtn");
const delBtn = document.getElementById("delBtn");
const modalClose = document.getElementById("modalClose");

/* ───────────────── STATE ───────────────── */

const ADMIN_UID = "7AvuSzEGvwQYPLowdsI5mKUZEFG2";

let isAdmin = false;
let currentMap = "woods";
let current = null;
let addMode = false;
let pendingPos = null;
let allMarkers = {};

let currentRef = null;
let offFn = null;

/* ───────────────── UTILS ───────────────── */

const isMobile = () =>
  window.matchMedia("(hover: none) and (pointer: coarse)").matches;

const TYPE_EMOJI = {
  loot: "📦",
  boss: "💀",
  quest: "📋",
  custom: "⭐",
  bot: "🎯",
  exit: "🚪",
  structure: "🧩"
};

function toast(msg) {
  console.log(msg);
}

/* ───────────────── AUTH ───────────────── */

loginBtn.onclick = () =>
  signInWithPopup(auth, provider).catch(e => toast(e.message));

logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  isAdmin = user && user.uid === ADMIN_UID;

  loginBtn.style.display = user ? "none" : "";
  logoutBtn.style.display = user ? "" : "none";
  adminBadge.style.display = isAdmin ? "" : "none";

  if (!isAdmin) exitAddMode();
});

/* ───────────────── PANZOOM (SIMPLE) ───────────────── */

let pz = null;

function initPanzoom() {
  if (pz) {
    pz.destroy();
    pz = null;
  }

  pz = Panzoom(mapEl, {
    maxScale: 6,
    minScale: 0.5,
    contain: "outside"
  });

  mapEl.parentElement.addEventListener("wheel", pz.zoomWithWheel);

  requestAnimationFrame(() => {
    const scale = Math.min(
      window.innerWidth / mapImg.width,
      window.innerHeight / mapImg.height
    ) * 0.4;

    pz.zoom(scale, { animate: false });
    pz.pan(0, 0, { animate: false });
  });
}

/* ───────────────── MAP SWITCH ───────────────── */

mapSelect.addEventListener("change", e => switchMap(e.target.value));

function switchMap(id) {
  currentMap = id;

  if (offFn) offFn();

  allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());

  mapImg.src = MAPS[id].imgUrl;

  mapImg.onload = () => {
    initPanzoom();
    subscribe();
  };
}

/* ───────────────── FIREBASE ───────────────── */

function subscribe() {
  currentRef = ref(db, `maps/${currentMap}/markers`);

  offFn = onValue(currentRef, snap => {
    allMarkers = {};
    snap.forEach(i => allMarkers[i.key] = i.val());
    render();
  });
}

/* ───────────────── ADD MODE ───────────────── */

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

function exitAddMode() {
  addMode = false;
  addForm.style.display = "none";
}

/* ───────────────── SAVE MARKER ───────────────── */

addConfirm.onclick = () => {
  if (!pendingPos) return;

  push(currentRef, {
    x: pendingPos.x,
    y: pendingPos.y,
    text: addText.value,
    type: addType.value,
    imgUrl: addImgUrl.value || null,
    iconUrl: addIcon.value || null
  });

  exitAddMode();
};

addCancel.onclick = exitAddMode;

/* ───────────────── RENDER ───────────────── */

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

  div.innerHTML = `
    <div class="marker-icon">
      ${TYPE_EMOJI[m.type] || "📍"}
    </div>
    <div class="tooltip">${m.text}</div>
  `;

  div.onmouseenter = () => {
    if (!isMobile()) div.classList.add("show");
  };

  div.onmouseleave = () => {
    div.classList.remove("show");
  };

  div.onclick = () => openModal(m);

  mapEl.appendChild(div);
}

/* ───────────────── MODAL ───────────────── */

function openModal(m) {
  current = m;

  modalTitle.textContent = m.type;
  modalDesc.textContent = m.text;

  modalPhoto.style.display = m.imgUrl ? "" : "none";
  if (m.imgUrl) modalPhoto.src = m.imgUrl;

  modal.classList.add("open");
}

modalClose.onclick = () => modal.classList.remove("open");

/* ───────────────── INIT ───────────────── */

switchMap("woods");
