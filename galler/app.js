import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase, ref, push, onValue, update, remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, onAuthStateChanged,
  signOut
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/* ── Maps ── */
const MAPS = {
  woods: {
    label: "Лес",
    imgUrl: "https://i.imgur.com/IvAlf2V.jpeg"
  },
  customs: {
    label: "Таможня",
    imgUrl: "https://i.imgur.com/FKY4S2W.jpg"
  },
  interchange: {
    label: "Развязка",
    imgUrl: "https://gspics.org/images/2026/06/03/IDrVtJ.webp"
  }
};

/* ── DOM ── */
const mapWrapper = document.getElementById("mapWrapper");
const mapEl = document.getElementById("map");
const mapImg = document.getElementById("mapImage");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const adminBadge = document.getElementById("adminBadge");

const mapSelect = document.getElementById("mapSelect");
const filterSel = document.getElementById("filter");
const addModeBtn = document.getElementById("addModeBtn");

const statusBar = document.getElementById("statusBar");
const toastCont = document.getElementById("toastContainer");

/* Modal */
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBadge = document.getElementById("modalBadge");
const modalPhoto = document.getElementById("modalPhoto");
const modalDesc = document.getElementById("modalDesc");
const modalCoords = document.getElementById("modalCoords");
const editBtn = document.getElementById("editBtn");
const delBtn = document.getElementById("delBtn");
const modalClose = document.getElementById("modalClose");

const editForm = document.getElementById("editForm");
const editText = document.getElementById("editText");
const editType = document.getElementById("editType");
const editImgUrl = document.getElementById("editImgUrl");
const editIcon = document.getElementById("editIcon");
const saveBtn = document.getElementById("saveBtn");
const cancelEdit = document.getElementById("cancelEdit");

/* Add */
const addForm = document.getElementById("addForm");
const addText = document.getElementById("addText");
const addType = document.getElementById("addType");
const addImgUrl = document.getElementById("addImgUrl");
const addIcon = document.getElementById("addIcon");
const addConfirm = document.getElementById("addConfirm");
const addCancel = document.getElementById("addCancel");

/* ── State ── */
const ADMIN_UID = "7AvuSzEGvwQYPLowdsI5mKUZEFG2";

let isAdmin = false;
let current = null;

let addMode = false;
let pendingPos = null;

let allMarkers = {};
let pz = null;

let currentMap = "woods";
let currentRef = null;
let offFn = null;

/* ── Toast ── */
function toast(msg, err = false) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " err" : "");
  t.textContent = msg;
  toastCont.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ── AUTH ── */
loginBtn.onclick = () => signInWithPopup(auth, provider).catch(e => toast(e.message, true));
logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  const logged = !!user;
  isAdmin = logged && user.uid === ADMIN_UID;

  loginBtn.style.display = logged ? "none" : "";
  logoutBtn.style.display = logged ? "" : "none";
  adminBadge.style.display = isAdmin ? "" : "none";
  addModeBtn.style.display = isAdmin ? "" : "none";

  if (!isAdmin) exitAddMode();
});

/* ── ADD MODE FIX (MISSING FUNCTION FIXED) ── */
function exitAddMode() {
  addMode = false;
  pendingPos = null;
  addForm.style.display = "none";
  addModeBtn.textContent = "+ Маркер";
  addModeBtn.classList.remove("btn-danger");
  mapWrapper.style.cursor = "grab";
}

/* ── PANZOOM ── */
function initPanzoom() {
  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;
  if (!iw || !ih) return;

  if (pz) pz.destroy();

  mapEl.style.width = iw + "px";
  mapEl.style.height = ih + "px";

  pz = Panzoom(mapEl, {
    maxScale: 8,
    minScale: 0.05,
    contain: "outside",
    canvas: false,
    excludeClass: "marker"
  });

  requestAnimationFrame(() => {
    const scale = Math.min(
      window.innerWidth / iw,
      window.innerHeight / ih
    ) * 0.95;

    const x = (window.innerWidth - iw * scale) / 2;
    const y = (window.innerHeight - ih * scale) / 2;

    requestAnimationFrame(() => {
      pz.zoom(scale, { animate: false });

      requestAnimationFrame(() => {
        pz.pan(x, y, { animate: false });
        updateStatus();
      });
    });
  });
}

/* ── START FIX (CRITICAL) ── */
function startSystem() {
  initPanzoom();

  if (!currentRef) {
    currentRef = ref(db, `maps/${currentMap}/markers`);
  }

  subscribeMarkers();
}

/* image load safe */
mapImg.addEventListener("load", () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(startSystem);
  });
});

if (mapImg.complete && mapImg.naturalWidth) {
  requestAnimationFrame(startSystem);
}

/* ── SWITCH MAP (FIXED SAFETY) ── */
function switchMap(mapId) {
  if (!MAPS[mapId] || mapId === currentMap) return;

  exitAddMode();

  if (offFn) offFn();

  allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());

  currentMap = mapId;
  currentRef = ref(db, `maps/${mapId}/markers`);

  mapImg.src = MAPS[mapId].imgUrl;

  toast(`Карта: ${MAPS[mapId].label}`);
}

mapSelect.onchange = e => switchMap(e.target.value);

/* ── FIREBASE ── */
function subscribeMarkers() {
  if (!currentRef) return;

  offFn = onValue(currentRef, snap => {
    allMarkers = {};
    snap.forEach(i => (allMarkers[i.key] = i.val()));
    renderAllMarkers();
  });
}

/* ── MARKERS ── */
function renderAllMarkers() {
  document.querySelectorAll(".marker").forEach(m => m.remove());

  const f = filterSel.value;

  Object.entries(allMarkers).forEach(([id, m]) => {
    if (f !== "all" && m.type !== f) return;
    createMarker(id, m);
  });

  updateStatus();
}

function createMarker(id, m) {
  const div = document.createElement("div");
  div.className = "marker";

  div.style.left = m.x + "%";
  div.style.top = m.y + "%";

  div.innerHTML = `<div class="marker-icon ${m.type}"><span>📍</span></div>`;

  div.onclick = e => {
    e.stopPropagation();
    openModal(id, m);
  };

  mapEl.appendChild(div);
}

/* ── MODAL ── */
function openModal(id, m) {
  current = { id, ...m };

  modalTitle.textContent = m.type;
  modalBadge.textContent = m.type;

  modalPhoto.style.display = m.imgUrl ? "" : "none";
  if (m.imgUrl) modalPhoto.src = m.imgUrl;

  modalDesc.textContent = m.text;
  modalCoords.textContent = `${m.x.toFixed(2)}% / ${m.y.toFixed(2)}%`;

  modal.classList.add("open");
}

function closeModal() {
  modal.classList.remove("open");
  current = null;
}

modalClose.onclick = closeModal;
modal.onclick = e => {
  if (e.target === modal) closeModal();
};

/* ── ADD MARKER CLICK ── */
mapEl.addEventListener("click", e => {
  if (!addMode || !isAdmin) return;

  const rect = mapEl.getBoundingClientRect();

  pendingPos = {
    x: ((e.clientX - rect.left) / rect.width) * 100,
    y: ((e.clientY - rect.top) / rect.height) * 100
  };

  addForm.style.display = "flex";
});

/* ── INIT ── */
switchMap("woods");
