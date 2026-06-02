/* ============================================================
   TARKOV MAP — app.js
   ============================================================ */

import { initializeApp }                      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue,
         update, remove }                      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, GoogleAuthProvider,
         signInWithPopup, onAuthStateChanged,
         signOut }                             from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


/* ── Firebase ───────────────────────────────────────────────── */
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

const markersRef = ref(db, "markers");

/* ── DOM refs ──────────────────────────────────────────────── */
const mapWrapper  = document.getElementById("mapWrapper");
const mapEl       = document.getElementById("map");
const mapImg      = document.getElementById("mapImage");
const loginBtn    = document.getElementById("loginBtn");
const logoutBtn   = document.getElementById("logoutBtn");
const adminBadge  = document.getElementById("adminBadge");
const filterSel   = document.getElementById("filter");
const addModeBtn  = document.getElementById("addModeBtn");
const statusBar   = document.getElementById("statusBar");
const toastCont   = document.getElementById("toastContainer");

/* Modal elements */
const modal       = document.getElementById("modal");
const modalTitle  = document.getElementById("modalTitle");
const modalBadge  = document.getElementById("modalBadge");
const modalPhoto  = document.getElementById("modalPhoto");
const modalDesc   = document.getElementById("modalDesc");
const modalCoords = document.getElementById("modalCoords");
const editBtn     = document.getElementById("editBtn");
const delBtn      = document.getElementById("delBtn");
const modalClose  = document.getElementById("modalClose");

/* Edit form */
const editForm    = document.getElementById("editForm");
const editText    = document.getElementById("editText");
const editType    = document.getElementById("editType");
const editImgUrl  = document.getElementById("editImgUrl");
const editIcon    = document.getElementById("editIcon");
const saveBtn     = document.getElementById("saveBtn");
const cancelEdit  = document.getElementById("cancelEdit");

/* Add form */
const addForm     = document.getElementById("addForm");
const addText     = document.getElementById("addText");
const addType     = document.getElementById("addType");
const addImgUrl   = document.getElementById("addImgUrl");
const addIcon     = document.getElementById("addIcon");
const addConfirm  = document.getElementById("addConfirm");
const addCancel   = document.getElementById("addCancel");

/* ── State ─────────────────────────────────────────────────── */
let isAdmin    = false;
let current    = null;
let addMode    = false;
let pendingPos = null;

let scale = 1;
let pos   = { x: 0, y: 0 };

let allMarkers = {};

/* ── Type icons ────────────────────────────────────────────── */
const TYPE_EMOJI = { loot: '📦', boss: '💀', quest: '📋', custom: '⭐', bot: '🎯', exit: '🚪', structure: '🧩' };
const TYPE_LABEL = { loot: 'Loot', boss: 'Boss', quest: 'Quest', custom: 'Custom', bot: 'Снайпер', exit: 'Выход', structure: 'Точка интереса' };

/* ── Toast ─────────────────────────────────────────────────── */
function toast(msg, err = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  toastCont.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ── Auth ──────────────────────────────────────────────────── */
const ADMIN_UID = "7AvuSzEGvwQYPLowdsI5mKUZEFG2";

loginBtn.onclick  = () => signInWithPopup(auth, provider).catch(err => toast(err.message, true));
logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  if (user) {
    console.log("EMAIL:", user.email);
    console.log("UID:", user.uid);
  }
  const loggedIn = !!user;
  isAdmin = loggedIn && user.uid === ADMIN_UID;

  console.log("isAdmin:", isAdmin);

  loginBtn.style.display   = loggedIn ? "none" : "";
  logoutBtn.style.display  = loggedIn ? "" : "none";
  adminBadge.style.display = isAdmin ? "" : "none";
  addModeBtn.style.display = isAdmin ? "" : "none";

  if (!isAdmin) exitAddMode();
  renderAllMarkers();
  toast(loggedIn ? `Вошёл как ${user.email}` : "Выход");
});


/* ── MAP ───────────────────────────────────────────────────── */
function fitMap() {
  const iw = mapImg.naturalWidth;
  const ih = mapImg.naturalHeight;
  if (!iw || !ih) return;

  mapEl.style.width  = iw + 'px';
  mapEl.style.height = ih + 'px';

  const scaleX = window.innerWidth  / iw;
  const scaleY = window.innerHeight / ih;
  scale = Math.min(scaleX, scaleY, 1);

  pos.x = (window.innerWidth  - iw * scale) / 2;
  pos.y = (window.innerHeight - ih * scale) / 2;

  applyTransform();
}

mapImg.onload = fitMap;

function applyTransform() {
  mapEl.style.transform = `translate(${pos.x}px,${pos.y}px) scale(${scale})`;
  updateStatus();
}

/* ── DRAG ──────────────────────────────────────────────────── */
let drag      = false;
let dragMoved = false;
let dragStart = { x: 0, y: 0 };
let posStart  = { x: 0, y: 0 };

mapWrapper.addEventListener("pointerdown", e => {
  drag      = true;
  dragMoved = false;
  dragStart = { x: e.clientX, y: e.clientY };
  posStart  = { ...pos };
  mapWrapper.setPointerCapture(e.pointerId);
  mapWrapper.classList.add('dragging');
});

mapWrapper.addEventListener("pointermove", e => {
  if (!drag) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  if (Math.hypot(dx, dy) > 4) dragMoved = true;
  pos.x = posStart.x + dx;
  pos.y = posStart.y + dy;
  applyTransform();
});

mapWrapper.addEventListener("pointerup", () => {
  drag = false;
  mapWrapper.classList.remove('dragging');
});

/* ── ZOOM ──────────────────────────────────────────────────── */
mapWrapper.addEventListener("wheel", e => {
  e.preventDefault();
  const delta    = e.deltaY < 0 ? 0.12 : -0.12;
  const newScale = Math.min(Math.max(scale + delta, 0.3), 5);
  const cx = e.clientX, cy = e.clientY;
  pos.x = cx - (cx - pos.x) * (newScale / scale);
  pos.y = cy - (cy - pos.y) * (newScale / scale);
  scale = newScale;
  applyTransform();
}, { passive: false });

let lastDist = 0;
mapWrapper.addEventListener("touchmove", e => {
  if (e.touches.length !== 2) return;
  e.preventDefault();
  const dx   = e.touches[0].clientX - e.touches[1].clientX;
  const dy   = e.touches[0].clientY - e.touches[1].clientY;
  const dist = Math.hypot(dx, dy);
  if (lastDist) {
    const factor = dist / lastDist;
    scale = Math.min(Math.max(scale * factor, 0.3), 5);
    applyTransform();
  }
  lastDist = dist;
}, { passive: false });
mapWrapper.addEventListener("touchend", () => { lastDist = 0; });

document.getElementById("zoomIn").onclick    = () => zoom(1);
document.getElementById("zoomOut").onclick   = () => zoom(-1);
document.getElementById("zoomReset").onclick = fitMap;

function zoom(dir) {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const newScale = Math.min(Math.max(scale + dir * 0.25, 0.3), 5);
  pos.x = cx - (cx - pos.x) * (newScale / scale);
  pos.y = cy - (cy - pos.y) * (newScale / scale);
  scale = newScale;
  applyTransform();
}

function updateStatus() {
  const count = Object.keys(allMarkers).length;
  statusBar.textContent = `ZOOM ${(scale * 100).toFixed(0)}% · ${count} маркеров`;
}

/* ── ADD MODE ──────────────────────────────────────────────── */
addModeBtn.onclick = () => {
  if (addMode) exitAddMode();
  else enterAddMode();
};

function enterAddMode() {
  if (!isAdmin) return;
  addMode = true;
  mapWrapper.classList.add('adding');
  addModeBtn.textContent = '✕ Отмена';
  addModeBtn.classList.add('btn-danger');
  toast('Нажмите на карту для добавления маркера');
}

function exitAddMode() {
  addMode    = false;
  pendingPos = null;
  mapWrapper.classList.remove('adding');
  addModeBtn.textContent = '+ Маркер';
  addModeBtn.classList.remove('btn-danger');
  hideAddForm();
}

mapWrapper.addEventListener("click", e => {
  if (!addMode || !isAdmin) return;
  if (e.target.closest('.marker')) return;

  const rect = mapEl.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width)  * 100;
  const y = ((e.clientY - rect.top)  / rect.height) * 100;

  pendingPos = { x, y };
  showAddForm();
});

function showAddForm() {
  addForm.style.display = 'flex';
  addText.value   = '';
  addImgUrl.value = '';
  addIcon.value   = '';
  addType.value   = 'loot';
}

function hideAddForm() {
  addForm.style.display = 'none';
}

addConfirm.onclick = () => {
  if (!pendingPos) return;
  const text = addText.value.trim();
  if (!text) { toast('Введите описание', true); return; }

  push(markersRef, {
    x:       pendingPos.x,
    y:       pendingPos.y,
    text:    text,
    type:    addType.value,
    imgUrl:  addImgUrl.value.trim() || null,
    iconUrl: addIcon.value.trim()   || null,
  }).then(() => {
    toast('Маркер добавлен');
    exitAddMode();
  }).catch(err => toast(err.message, true));
};

addCancel.onclick = () => exitAddMode();

/* ── RENDER ────────────────────────────────────────────────── */
onValue(markersRef, snap => {
  allMarkers = {};
  snap.forEach(i => { allMarkers[i.key] = i.val(); });
  renderAllMarkers();
});

function renderAllMarkers() {
  document.querySelectorAll('.marker').forEach(m => m.remove());

  const f = filterSel.value;

  Object.entries(allMarkers).forEach(([id, m]) => {
    if (f !== 'all' && m.type !== f) return;
    createMarkerEl(id, m);
  });

  updateStatus();
}

filterSel.addEventListener("change", renderAllMarkers);

function createMarkerEl(id, m) {
  const div = document.createElement('div');
  div.className  = 'marker';
  div.dataset.id = id;

  div.style.left = m.x + '%';
  div.style.top  = m.y + '%';

  const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Crect width='36' height='36' fill='%23444'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='18'%3E%3F%3C/text%3E%3C/svg%3E";

  if (m.imgUrl) {
    div.innerHTML = `
      <div class="marker-photo">
        <img src="${esc(m.imgUrl)}" alt="" onerror="this.src='${fallbackImg}'">
      </div>
      <div class="marker-preview">
        <img src="${esc(m.imgUrl)}" alt="">
      </div>
      <div class="marker-tooltip">${esc(m.text)}</div>
    `;
  } else if (m.iconUrl) {
    div.innerHTML = `
      <div class="marker-photo" style="border-color:var(--${m.type}-color,var(--accent))">
        <img src="${esc(m.iconUrl)}" alt="" onerror="this.src='${fallbackImg}'">
      </div>
      <div class="marker-tooltip">${esc(m.text)}</div>
    `;
  } else {
    const emoji = TYPE_EMOJI[m.type] || '📍';
    div.innerHTML = `
      <div class="marker-icon ${m.type}">
        <span>${emoji}</span>
      </div>
      <div class="marker-tooltip">${esc(m.text)}</div>
    `;
  }

  /* ── ИСПРАВЛЕНИЕ: pointerup вместо click, проверяем dragMoved ── */
  div.addEventListener('pointerup', e => {
    e.stopPropagation();
    if (addMode)    return;
    if (dragMoved)  return;
    openModal(id, m);
  });

  mapEl.appendChild(div);
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── MODAL: VIEW ───────────────────────────────────────────── */
function openModal(id, m) {
  current = { id, ...m };

  modalTitle.textContent = TYPE_LABEL[m.type] || m.type;
  modalBadge.textContent = m.type;
  modalBadge.className   = `modal-type-badge badge-${m.type}`;

  modalPhoto.style.display = m.imgUrl ? '' : 'none';
  if (m.imgUrl) modalPhoto.src = m.imgUrl;

  modalDesc.textContent   = m.text;
  modalCoords.textContent = `x:${m.x.toFixed(2)}% y:${m.y.toFixed(2)}%`;

  editBtn.style.display  = isAdmin ? '' : 'none';
  delBtn.style.display   = isAdmin ? '' : 'none';
  editForm.style.display = 'none';

  modal.classList.add('open');
}

modalClose.onclick = closeModal;
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

function closeModal() {
  modal.classList.remove('open');
  current = null;
  editForm.style.display = 'none';
}

/* ── MODAL: EDIT ───────────────────────────────────────────── */
editBtn.onclick = () => {
  if (!current) return;
  editText.value   = current.text    || '';
  editType.value   = current.type    || 'loot';
  editImgUrl.value = current.imgUrl  || '';
  editIcon.value   = current.iconUrl || '';
  editForm.style.display = 'flex';
  editBtn.style.display  = 'none';
};

cancelEdit.onclick = () => {
  editForm.style.display = 'none';
  editBtn.style.display  = 'inline-block';
};

saveBtn.onclick = () => {
  if (!current) return;
  const text = editText.value.trim();
  if (!text) { toast('Введите описание', true); return; }

  const updated = {
    x:       current.x,
    y:       current.y,
    text:    text,
    type:    editType.value,
    imgUrl:  editImgUrl.value.trim() || null,
    iconUrl: editIcon.value.trim()   || null,
  };

  update(ref(db, "markers/" + current.id), updated)
    .then(() => { toast('Сохранено'); closeModal(); })
    .catch(err => toast(err.message, true));
};

/* ── MODAL: DELETE ─────────────────────────────────────────── */
delBtn.onclick = () => {
  if (!current) return;
  if (!confirm('Удалить маркер?')) return;
  remove(ref(db, "markers/" + current.id))
    .then(() => { toast('Удалено'); closeModal(); })
    .catch(err => toast(err.message, true));
};
