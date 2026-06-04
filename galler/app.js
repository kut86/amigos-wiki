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
const mapWrapper = document.getElementById("mapWrapper");
const mapEl = document.getElementById("map");
const mapImg = document.getElementById("mapImage");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const adminBadge = document.getElementById("adminBadge");

const filterSel = document.getElementById("filter");
const mapSelect = document.getElementById("mapSelect");
const addModeBtn = document.getElementById("addModeBtn");
const statusBar = document.getElementById("statusBar");
const toastCont = document.getElementById("toastContainer");

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

const addForm = document.getElementById("addForm");
const addText = document.getElementById("addText");
const addType = document.getElementById("addType");
const addImgUrl = document.getElementById("addImgUrl");
const addIcon = document.getElementById("addIcon");
const addConfirm = document.getElementById("addConfirm");
const addCancel = document.getElementById("addCancel");

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

/* ── TOAST ── */
function toast(msg, err = false) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " err" : "");
  t.textContent = msg;
  toastCont.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

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

/* ─────────────────────────────────────────
   PANZOOM (НЕ ТРОГАЕМ ЛОГИКУ, ТОЛЬКО СТАБИЛИЗАЦИЯ СТАРТА)
───────────────────────────────────────── */
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
  mapEl.style.transformOrigin = "0 0";

  pz = Panzoom(mapEl, {
    maxScale: 8,
    minScale: 0.05,
    canvas: false,
    contain: "outside",
    panOnlyWhenZoomed: false,
    excludeClass: "marker"
  });

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

/* ─────────────────────────────────────────
   🔥 FIX СТАРТА КАРТЫ (ГЛАВНЫЙ БАГ)
───────────────────────────────────────── */

let firstInitDone = false;

function safeInit() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initPanzoom();

      if (!firstInitDone) {
        subscribeMarkers();
        firstInitDone = true;
      }
    });
  });
}

/* load карты */
mapImg.addEventListener("load", () => {
  setTimeout(safeInit, 50);
});

/* FIX CACHE (ВАЖНО) */
if (mapImg.complete && mapImg.naturalWidth) {
  setTimeout(safeInit, 50);
}

/* ─────────────────────────────────────────
   SWITCH MAP (БЕЗ subscribeMarkers — ЭТО ВАЖНО)
───────────────────────────────────────── */
function switchMap(mapId) {
  if (!MAPS[mapId] || mapId === currentMap) return;

  exitAddMode();
  closeModal();

  if (offFn) offFn();

  allMarkers = {};
  document.querySelectorAll(".marker").forEach(m => m.remove());

  currentMap = mapId;
  currentRef = ref(db, `maps/${mapId}/markers`);

  mapImg.src = MAPS[mapId].imgUrl;

  toast(`Карта: ${MAPS[mapId].label}`);
}

/* ─────────────────────────────────────────
   FIREBASE
───────────────────────────────────────── */
function subscribeMarkers() {
  if (!currentRef)
    currentRef = ref(db, `maps/${currentMap}/markers`);

  offFn = onValue(currentRef, snap => {
    allMarkers = {};
    snap.forEach(i => allMarkers[i.key] = i.val());
    renderAllMarkers();
  });
}

/* ─────────────────────────────────────────
   MARKERS
───────────────────────────────────────── */
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

/* ─────────────────────────────────────────
   MODAL
───────────────────────────────────────── */
function openModal(id, m) {
  current = { id, ...m };

  modalTitle.textContent = m.type;
  modalBadge.textContent = m.type;
  modalBadge.className = `modal-type-badge badge-${m.type}`;

  modalPhoto.style.display = m.imgUrl ? "" : "none";
  if (m.imgUrl) modalPhoto.src = m.imgUrl;

  modalDesc.textContent = m.text;
  modalCoords.textContent = `x:${m.x.toFixed(2)} y:${m.y.toFixed(2)}`;

  editBtn.style.display = isAdmin ? "" : "none";
  delBtn.style.display = isAdmin ? "" : "none";

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

/* ─────────────────────────────────────────
   ADMIN LOCK
───────────────────────────────────────── */
editBtn.onclick = () => {
  if (!isAdmin || !current) return;

  editText.value = current.text || "";
  editType.value = current.type || "loot";
  editImgUrl.value = current.imgUrl || "";
  editIcon.value = current.iconUrl || "";

  editForm.style.display = "flex";
};

saveBtn.onclick = () => {
  if (!isAdmin || !current) return;

  update(ref(db, `maps/${currentMap}/markers/${current.id}`), {
    ...current,
    text: editText.value,
    type: editType.value,
    imgUrl: editImgUrl.value || null,
    iconUrl: editIcon.value || null
  });

  closeModal();
};

delBtn.onclick = () => {
  if (!isAdmin || !current) return;
  remove(ref(db, `maps/${currentMap}/markers/${current.id}`));
  closeModal();
};

/* ─────────────────────────────────────────
   ADD MODE
───────────────────────────────────────── */
mapSelect.onchange = e => switchMap(e.target.value);

switchMap("woods");   // 🔥 теперь безопасно (через load/cached init)
subscribeMarkers();
