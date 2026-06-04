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
  woods: { label: "Лес", imgUrl: "https://i.imgur.com/FKY4S2W.jpg" },
  customs: { label: "Таможня", imgUrl: "https://i.imgur.com/FKY4S2W.jpg" },
  interchange: { label: "Развязка", imgUrl: "https://i.imgur.com/FKY4S2W.jpg" }
};

/* ───────────────── DOM ───────────────── */

const mapEl      = document.getElementById("map");
const mapImg     = document.getElementById("mapImage");

const loginBtn   = document.getElementById("loginBtn");
const logoutBtn  = document.getElementById("logoutBtn");
const adminBadge = document.getElementById("adminBadge");
const addModeBtn = document.getElementById("addModeBtn");

const filterSel  = document.getElementById("filter");
const mapSelect  = document.getElementById("mapSelect");

const addForm    = document.getElementById("addForm");
const addText    = document.getElementById("addText");
const addType    = document.getElementById("addType");
const addImgUrl  = document.getElementById("addImgUrl");
const addIcon    = document.getElementById("addIcon");
const addConfirm = document.getElementById("addConfirm");
const addCancel  = document.getElementById("addCancel");

const modal      = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBadge = document.getElementById("modalBadge");
const modalPhoto = document.getElementById("modalPhoto");
const modalDesc  = document.getElementById("modalDesc");
const modalCoords= document.getElementById("modalCoords");
const editForm   = document.getElementById("editForm");
const editText   = document.getElementById("editText");
const editType   = document.getElementById("editType");
const editImgUrl = document.getElementById("editImgUrl");
const editIcon   = document.getElementById("editIcon");
const saveBtn    = document.getElementById("saveBtn");
const cancelEdit = document.getElementById("cancelEdit");
const editBtn    = document.getElementById("editBtn");
const delBtn     = document.getElementById("delBtn");
const modalClose = document.getElementById("modalClose");

/* ───────────────── STATE ───────────────── */

const ADMIN_UID = "7AvuSzEGvwQYPLowdsI5mKUZEFG2";

let isAdmin    = false;
let currentMap = "woods";
let current    = null;
let addMode    = false;
let pendingPos = null;
let allMarkers = {};

let currentRef = null;
let offFn      = null;

/* ───────────────── UTILS ───────────────── */

const isMobile = () =>
  window.matchMedia("(hover: none) and (pointer: coarse)").matches;

const TYPE_EMOJI = {
  loot: "📦", boss: "💀", quest: "📋",
  custom: "⭐", bot: "🎯", exit: "🚪", structure: "🧩"
};

const TYPE_LABEL = {
  loot: "Loot", boss: "Boss", quest: "Quest",
  custom: "Custom", bot: "Снайпер", exit: "Выход", structure: "Точка интереса"
};

function toast(msg, err = false) {
  const toastCont = document.getElementById("toastContainer");
  const t = document.createElement("div");
  t.className   = "toast" + (err ? " err" : "");
  t.textContent = msg;
  toastCont.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ───────────────── AUTH ───────────────── */

loginBtn.onclick  = () => signInWithPopup(auth, provider).catch(e => toast(e.message, true));
logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  isAdmin = !!(user && user.uid === ADMIN_UID);

  loginBtn.style.display   = user   ? "none" : "";
  logoutBtn.style.display  = user   ? ""     : "none";
  adminBadge.style.display = isAdmin ? ""    : "none";
  addModeBtn.style.display = isAdmin ? ""    : "none";

  if (!isAdmin) exitAddMode();
});

/* ───────────────── PANZOOM ───────────────── */

let pz = null;

function initPanzoom() {
  if (pz) { pz.destroy(); pz = null; }

  pz = Panzoom(mapEl, {
    maxScale: 5,
    minScale: -1.0,
    contain:  "outside"
  });

  mapEl.parentElement.addEventListener("wheel", pz.zoomWithWheel);

  requestAnimationFrame(() => {
    const scale = Math.min(
      window.innerWidth  / mapImg.width,
      window.innerHeight / mapImg.height
    ) * 0.1;

    pz.zoom(scale, { animate: false });
    pz.pan(0, 0, { animate: false });
  });
}
/*function initPanzoom() {
  if (pz) { pz.destroy(); pz = null; }

  pz = Panzoom(mapEl, {
    maxScale: 8,
    minScale: 0.1,
  });

  mapEl.parentElement.addEventListener("wheel", pz.zoomWithWheel);

  /* ждём пока браузер отрендерит картинку и только потом центрируем */
  /*const doCenter = () => {
    const iw = mapImg.naturalWidth;
    const ih = mapImg.naturalHeight;
    if (!iw || !ih) { requestAnimationFrame(doCenter); return; }

    mapEl.style.width  = iw + "px";
    mapEl.style.height = ih + "px";

    const s = Math.min(window.innerWidth / iw, window.innerHeight / ih);
    pz.zoom(s, { animate: false });
    pz.pan(
      (window.innerWidth  - iw * s) / 2,
      (window.innerHeight - ih * s) / 2,
      { animate: false }
    );
  };

  requestAnimationFrame(doCenter);
}*/

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
    snap.forEach(i => { allMarkers[i.key] = i.val(); });
    render();
  });
}

/* ───────────────── ADD MODE ───────────────── */

addModeBtn.onclick = () => addMode ? exitAddMode() : enterAddMode();

function enterAddMode() {
  if (!isAdmin) return;
  addMode = true;
  addModeBtn.textContent = "✕ Отмена";
  addModeBtn.classList.add("btn-danger");
  toast("Нажмите на карту для добавления маркера");
}

function exitAddMode() {
  addMode    = false;
  pendingPos = null;
  addModeBtn.textContent = "+ Маркер";
  addModeBtn.classList.remove("btn-danger");
  addForm.style.display  = "none";
}

mapEl.addEventListener("click", e => {
  if (!addMode || !isAdmin) return;
  if (e.target.closest(".marker")) return;

  const r = mapEl.getBoundingClientRect();
  pendingPos = {
    x: ((e.clientX - r.left) / r.width)  * 100,
    y: ((e.clientY - r.top)  / r.height) * 100
  };

  addForm.style.display = "flex";
  addText.value = addImgUrl.value = addIcon.value = "";
  addType.value = "loot";
});

addConfirm.onclick = () => {
  if (!pendingPos) return;
  const text = addText.value.trim();
  if (!text) { toast("Введите описание", true); return; }

  push(currentRef, {
    x: pendingPos.x, y: pendingPos.y,
    text,
    type:    addType.value,
    imgUrl:  addImgUrl.value.trim()  || null,
    iconUrl: addIcon.value.trim()    || null,
  }).then(() => { toast("Маркер добавлен"); exitAddMode(); })
    .catch(e => toast(e.message, true));
};

addCancel.onclick = exitAddMode;

/* ───────────────── RENDER ───────────────── */

function render() {
  document.querySelectorAll(".marker").forEach(m => m.remove());

  const f = filterSel.value;
  Object.entries(allMarkers).forEach(([id, m]) => {
    if (f !== "all" && m.type !== f) return;
    createMarker(id, m);
  });
}

filterSel.addEventListener("change", render);

function createMarker(id, m) {
  const div      = document.createElement("div");
  div.className  = "marker";
  div.dataset.id = id;
  div.style.left = m.x + "%";
  div.style.top  = m.y + "%";

  if (isMobile()) div.classList.add("no-hover");

  const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Crect width='36' height='36' fill='%23444'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='18'%3E%3F%3C/text%3E%3C/svg%3E";

  if (m.imgUrl) {
    div.innerHTML = `
      <div class="marker-photo"><img src="${esc(m.imgUrl)}" alt="" onerror="this.src='${fallback}'"></div>
      ${isMobile() ? "" : `<div class="marker-preview"><img src="${esc(m.imgUrl)}" alt=""></div>`}
      <div class="marker-tooltip">${esc(m.text)}</div>`;
  } else if (m.iconUrl) {
    div.innerHTML = `
      <div class="marker-photo" style="border-color:var(--${m.type}-color,var(--accent))">
        <img src="${esc(m.iconUrl)}" alt="" onerror="this.src='${fallback}'">
      </div>
      <div class="marker-tooltip">${esc(m.text)}</div>`;
  } else {
    div.innerHTML = `
      <div class="marker-icon ${m.type}"><span>${TYPE_EMOJI[m.type] || "📍"}</span></div>
      <div class="marker-tooltip">${esc(m.text)}</div>`;
  }

  div.addEventListener("click", e => {
    e.stopPropagation();
    if (addMode) return;
    openModal(id, m);
  });

  mapEl.appendChild(div);
}

function esc(s) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ───────────────── MODAL ───────────────── */

function openModal(id, m) {
  current = { id, ...m };

  modalTitle.textContent   = TYPE_LABEL[m.type] || m.type;
  modalBadge.textContent   = TYPE_LABEL[m.type] || m.type;
  modalBadge.className     = `modal-type-badge badge-${m.type}`;
  modalDesc.textContent    = m.text;
  modalPhoto.style.display = m.imgUrl ? "" : "none";
  if (m.imgUrl) modalPhoto.src = m.imgUrl;

  /* кнопки только для админа */
  editBtn.style.display  = isAdmin ? "" : "none";
  delBtn.style.display   = isAdmin ? "" : "none";
  editForm.style.display = "none";

  modal.classList.add("open");
}

modalClose.onclick = () => closeModal();
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

function closeModal() {
  modal.classList.remove("open");
  current = null;
  editForm.style.display = "none";
}

/* ───────────────── EDIT ───────────────── */

editBtn.onclick = () => {
  if (!current) return;
  editText.value   = current.text    || "";
  editType.value   = current.type    || "loot";
  editImgUrl.value = current.imgUrl  || "";
  editIcon.value   = current.iconUrl || "";
  editForm.style.display = "flex";
  editBtn.style.display  = "none";
};

cancelEdit.onclick = () => {
  editForm.style.display = "none";
  editBtn.style.display  = isAdmin ? "" : "none";
};

saveBtn.onclick = () => {
  if (!current) return;
  const text = editText.value.trim();
  if (!text) { toast("Введите описание", true); return; }
  update(ref(db, `maps/${currentMap}/markers/${current.id}`), {
    x: current.x, y: current.y,
    text,
    type:    editType.value,
    imgUrl:  editImgUrl.value.trim()  || null,
    iconUrl: editIcon.value.trim()    || null,
  }).then(() => { toast("Сохранено"); closeModal(); })
    .catch(e => toast(e.message, true));
};

/* ───────────────── DELETE ───────────────── */

delBtn.onclick = () => {
  if (!current) return;
  if (!confirm("Удалить маркер?")) return;
  remove(ref(db, `maps/${currentMap}/markers/${current.id}`))
    .then(() => { toast("Удалено"); closeModal(); })
    .catch(e => toast(e.message, true));
};

/* ───────────────── INIT ───────────────── */


/* ───────────────── ZOOM BUTTONS ───────────────── */

/*document.getElementById("zoomIn").onclick    = () => pz && pz.zoomIn();
document.getElementById("zoomOut").onclick   = () => pz && pz.zoomOut();
document.getElementById("zoomReset").onclick = () => {
  if (!pz) return;
  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;
  const s  = Math.min(window.innerWidth / iw, window.innerHeight / ih);
  pz.zoom(s, { animate: true });
  pz.pan(
    (window.innerWidth  - iw * s) / 0.1,
    (window.innerHeight - ih * s) / 0.1,
    { animate: true }
  );
};*/

/* ───────────────── INIT ───────────────── */

switchMap("woods");
              

