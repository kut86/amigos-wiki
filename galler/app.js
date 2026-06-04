/* ============================================================
   TARKOV MAP — app.js (FULL FIXED STABLE VERSION)
   ============================================================ */

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

/* ── MAPS ── */
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
const mapWrapper  = document.getElementById("mapWrapper");
const mapEl       = document.getElementById("map");
const mapImg      = document.getElementById("mapImage");

const loginBtn    = document.getElementById("loginBtn");
const logoutBtn   = document.getElementById("logoutBtn");
const adminBadge  = document.getElementById("adminBadge");

const filterSel   = document.getElementById("filter");
const mapSelect   = document.getElementById("mapSelect");

const addModeBtn  = document.getElementById("addModeBtn");
const statusBar   = document.getElementById("statusBar");
const toastCont   = document.getElementById("toastContainer");

/* MODAL */
const modal       = document.getElementById("modal");
const modalTitle  = document.getElementById("modalTitle");
const modalBadge  = document.getElementById("modalBadge");
const modalPhoto  = document.getElementById("modalPhoto");
const modalDesc   = document.getElementById("modalDesc");
const modalCoords = document.getElementById("modalCoords");

const editBtn     = document.getElementById("editBtn");
const delBtn      = document.getElementById("delBtn");
const modalClose  = document.getElementById("modalClose");

const editForm    = document.getElementById("editForm");
const editText    = document.getElementById("editText");
const editType    = document.getElementById("editType");
const editImgUrl  = document.getElementById("editImgUrl");
const editIcon    = document.getElementById("editIcon");

const saveBtn     = document.getElementById("saveBtn");
const cancelEdit  = document.getElementById("cancelEdit");

/* ADD */
const addForm     = document.getElementById("addForm");
const addText     = document.getElementById("addText");
const addType     = document.getElementById("addType");
const addImgUrl   = document.getElementById("addImgUrl");
const addIcon     = document.getElementById("addIcon");
const addConfirm  = document.getElementById("addConfirm");
const addCancel   = document.getElementById("addCancel");

/* ── STATE ── */
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

/* ── HELPERS ── */
function toast(msg, err = false) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " err" : "");
  t.textContent = msg;
  toastCont.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

const isMobile = () =>
  window.matchMedia("(hover: none) and (pointer: coarse)").matches;

/* ── AUTH ── */
loginBtn.onclick = () =>
  signInWithPopup(auth, provider).catch(e => toast(e.message, true));

logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  const logged = !!user;
  isAdmin = logged && user.uid === ADMIN_UID;

  loginBtn.style.display = logged ? "none" : "";
  logoutBtn.style.display = logged ? "" : "none";
  adminBadge.style.display = isAdmin ? "" : "none";
  addModeBtn.style.display = isAdmin ? "" : "none";

  if (!isAdmin) exitAddMode();

  toast(logged ? `Вошёл как ${user.email}` : "Выход");
});

/* ── PANZOOM FIXED CORE ── */
function initPanzoom() {
  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;

  if (!iw || !ih) return;

  if (pz) {
    pz.destroy();
    pz = null;
  }

  mapEl.style.width = iw + "px";
  mapEl.style.height = ih + "px";

  pz = Panzoom(mapEl, {
    maxScale: 8,
    minScale: 0.02,
    canvas: false,
    contain: false,
    panOnlyWhenZoomed: false,
    excludeClass: "marker"
  });

  pz.reset();

  requestAnimationFrame(() => {
    const scale = Math.min(
      window.innerWidth / iw,
      window.innerHeight / ih
    ) * 0.95;

    pz.zoom(scale, { animate: false });

    const x = (window.innerWidth - iw * scale) / 2;
    const y = (window.innerHeight - ih * scale) / 2;

    pz.pan(x, y, { animate: false });

    updateStatus();
  });
}

/* ── MAP LOADING ── */
function switchMap(mapId) {
  if (!MAPS[mapId] || mapId === currentMap) return;

  exitAddMode();
  closeModal();

  if (offFn) offFn();

  allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());

  currentMap = mapId;
  currentRef = ref(db, `maps/${mapId}/markers`);

  subscribeMarkers();

  mapImg.src = MAPS[mapId].imgUrl;

  toast(`Карта: ${MAPS[mapId].label}`);
}

/* ── LOAD EVENT FIX ── */
mapImg.addEventListener("load", () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initPanzoom();
    });
  });
});

/* ── ZOOM UI ── */
document.getElementById("zoomIn").onclick = () => {
  if (!pz) return;
  pz.zoom(pz.getScale() * 1.3);
  updateStatus();
};

document.getElementById("zoomOut").onclick = () => {
  if (!pz) return;
  pz.zoom(pz.getScale() / 1.3);
  updateStatus();
};

document.getElementById("zoomReset").onclick = () => {
  if (!pz) return;

  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;

  const scale = Math.min(
    window.innerWidth / iw,
    window.innerHeight / ih
  ) * 0.95;

  pz.zoom(scale, { animate: false });

  const x = (window.innerWidth - iw * scale) / 2;
  const y = (window.innerHeight - ih * scale) / 2;

  pz.pan(x, y, { animate: false });

  updateStatus();
};

/* ── FIREBASE MARKERS ── */
function subscribeMarkers() {
  if (!currentRef)
    currentRef = ref(db, `maps/${currentMap}/markers`);

  offFn = onValue(currentRef, snap => {
    allMarkers = {};
    snap.forEach(i => {
      allMarkers[i.key] = i.val();
    });
    renderAllMarkers();
  });
}

/* ── RENDER ── */
function renderAllMarkers() {
  document.querySelectorAll(".marker").forEach(m => m.remove());

  const f = filterSel.value;

  Object.entries(allMarkers).forEach(([id, m]) => {
    if (f !== "all" && m.type !== f) return;

    createMarker(id, m);
  });

  updateStatus();
}

/* ── MARKER CREATION ── */
function createMarker(id, m) {
  const div = document.createElement("div");
  div.className = "marker";
  div.dataset.id = id;

  div.style.left = m.x + "%";
  div.style.top = m.y + "%";

  const fallback =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Crect width='36' height='36' fill='%23444'/%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' fill='%23aaa'%3E?%3C/text%3E%3C/svg%3E";

  div.innerHTML = `
    <div class="marker-icon ${m.type}">
      <span>${m.type}</span>
    </div>
  `;

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
  modalBadge.className = `modal-type-badge badge-${m.type}`;

  modalPhoto.style.display = m.imgUrl ? "" : "none";
  if (m.imgUrl) modalPhoto.src = m.imgUrl;

  modalDesc.textContent = m.text;
  modalCoords.textContent = `x:${m.x.toFixed(2)} y:${m.y.toFixed(2)}`;

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

/* ── ADD MODE ── */
addModeBtn.onclick = () => {
  addMode ? exitAddMode() : enterAddMode();
};

function enterAddMode() {
  if (!isAdmin) return;
  addMode = true;
  toast("Нажмите на карту");
}

function exitAddMode() {
  addMode = false;
  pendingPos = null;
  addForm.style.display = "none";
}

mapEl.addEventListener("click", e => {
  if (!addMode || !isAdmin) return;

  const rect = mapEl.getBoundingClientRect();

  pendingPos = {
    x: ((e.clientX - rect.left) / rect.width) * 100,
    y: ((e.clientY - rect.top) / rect.height) * 100
  };

  addForm.style.display = "flex";
});

/* ── FIREBASE ADD ── */
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

/* ── STATUS ── */
function updateStatus() {
  if (!pz) return;

  const s = pz.getScale();

  statusBar.textContent =
    `${MAPS[currentMap].label} · ZOOM ${(s * 100).toFixed(0)}% · ${Object.keys(allMarkers).length}`;
}

/* ── INIT ── */
mapSelect.onchange = e => switchMap(e.target.value);

switchMap("woods");
subscribeMarkers();
